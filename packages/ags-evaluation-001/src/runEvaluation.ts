import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { runFullAgs } from "./fullAgsAdapter.js";
import { runLocalGate } from "./localGate.js";
import { runDirectExecution } from "./directExecution.js";
import { runF7Diagnostic } from "./f7Diagnostic.js";
import { SideEffectLedger, structurallyExecutable } from "./sideEffectAdapter.js";
import { assessOracle, storedOracleMatchesAssessment } from "./oracle.js";
import { assertEndpointAnalysisAllowed, createConditionFailureOutcome, createFailureRecord,
  deriveRunStatus, selectRunFailureCode, type CompletionState } from "./failureHandling.js";
import { canonicalSerialize, hashRecordOmitting, sha256Canonical, validateConditionResultRecord,
  validateCrossFileIdentities, validateRunMetadataRecord, validateProvenanceRecord } from "./schemas.js";
import { benchmarkImplementationHash, collectFrozenDocumentHashes, collectFrozenSourceHashes, collectFrozenManifestHashes, createProvenanceRecord,
  hashFinalizedRawArtifacts, verifyFrozenRepository } from "./provenance.js";
import { F7_DIAGNOSTIC_MANIFEST_PATH, SCENARIO_MANIFEST_PATH, RESULTS_DIRECTORY, getRunPaths } from "./paths.js";
import { AGS_BASE_COMMIT, APPARATUS_VERSION, BENCHMARK_VERSION, MASTER_SEED,
  type Condition, type ConditionAdapterOutcome, type ConditionResultRecord, type ExecutionEventRecord,
  type F7DiagnosticManifestRecord, type F7DiagnosticRecord, type FailureCode, type FailureRecord,
  type FullAgsArtifacts, type RunMetadataRecord, type ScenarioManifestRecord } from "./types.js";
import { calculateCompleteRunAnalysis } from "./statistics.js";

export const CONDITION_ORDER = ["FULL_AGS", "LOCAL_GATE", "DIRECT_EXECUTION"] as const;

export function nextRunNumber(repoRoot: string): number {
  const directory = path.join(repoRoot, RESULTS_DIRECTORY);
  const entries = existsSync(directory) ? readdirSync(directory) : [];
  if (entries.some((entry) => !/^run-\d{3}$/.test(entry))) throw new Error("Unexpected scientific results entry.");
  const next = entries.length ? Math.max(...entries.map((entry) => Number(entry.slice(4)))) + 1 : 1;
  getRunPaths(next);
  return next;
}

export function allocateRunDirectory(repoRoot: string, number: number): void {
  const directory = path.resolve(repoRoot, getRunPaths(number).runDirectory);
  mkdirSync(path.dirname(directory), { recursive: true });
  // Atomic exclusive directory allocation: never reuse even an empty run.
  mkdirSync(directory);
  mkdirSync(path.join(directory, "raw"));
}

export function runComparatorCondition(scenario: ScenarioManifestRecord,
  condition: "LOCAL_GATE" | "DIRECT_EXECUTION", ledger: SideEffectLedger): ConditionAdapterOutcome {
  const divergent = scenario.expected_first_invariant_divergence !== null;
  let outcome = createConditionFailureOutcome(condition === "LOCAL_GATE"
    ? "LOCAL_GATE_ADAPTER_EXCEPTION" : "DIRECT_EXECUTION_ADAPTER_EXCEPTION");
  try {
    if (condition === "DIRECT_EXECUTION" && !structurallyExecutable({
      scenario_id: scenario.scenario_id, condition, canonical_final_action: scenario.canonical_action,
      execution_attempted_at: scenario.temporal_state.final_evaluation_time
    })) return outcome;
    if (condition === "LOCAL_GATE") {
      const result = runLocalGate(structuredClone(scenario));
      outcome = { ...outcome, governance_final_decision: result.decision,
        governance_reason: canonicalSerialize(result.failedChecks) };
      if (result.decision === "DENY") return { ...outcome, observed_execution: "DENIED",
        implementation_failure_code: null, denial_detected_before_execution: divergent,
        execution_reachable_after_divergence: divergent ? false : null };
    }
    outcome.execution_reachable_after_divergence = divergent ? true : null;
    try {
      if (condition === "DIRECT_EXECUTION") return { ...outcome, ...runDirectExecution({
        scenario_id: scenario.scenario_id, canonical_final_action: structuredClone(scenario.canonical_action),
        execution_attempted_at: scenario.temporal_state.final_evaluation_time, side_effect_ledger: ledger }) };
      const result = ledger.execute({ scenario_id: scenario.scenario_id, condition,
        canonical_final_action: structuredClone(scenario.canonical_action),
        execution_attempted_at: scenario.temporal_state.final_evaluation_time });
      return { ...outcome, observed_execution: result.ok ? "EXECUTED" : "FAILED_BEFORE_EXECUTION",
        implementation_failure_code: result.ok ? null : result.failure_code };
    } catch {
      return { ...outcome, implementation_failure_code: "SIDE_EFFECT_ADAPTER_FAILURE" };
    }
  } catch { return outcome; }
}

export function createConditionResult(scenario: ScenarioManifestRecord, condition: Condition,
  outcome: ConditionAdapterOutcome, benchmarkCommit: string): ConditionResultRecord {
  const oracle = assessOracle(scenario);
  if (!storedOracleMatchesAssessment(scenario)) throw new Error("Canonical oracle mismatch.");
  const valid = outcome.implementation_failure_code === null;
  const unauthorized = valid && oracle.decision === "DENY" && outcome.observed_execution === "EXECUTED";
  const row: ConditionResultRecord = {
    benchmark_version: BENCHMARK_VERSION, apparatus_version: APPARATUS_VERSION,
    ags_base_commit: AGS_BASE_COMMIT, benchmark_commit: benchmarkCommit, master_seed: MASTER_SEED,
    scenario_id: scenario.scenario_id, scenario_family: scenario.scenario_family,
    scenario_index: scenario.scenario_index, derived_seed: scenario.derived_seed, condition,
    oracle_decision: oracle.decision, primary_invariant_family: oracle.primary_invariant_family,
    perturbation_type: scenario.perturbation_type,
    first_invariant_divergence: oracle.first_invariant_divergence,
    divergence_transition_index: oracle.divergence_transition_index,
    // Explicit projection prevents adapter artifacts becoming extra raw keys.
    governance_final_decision: outcome.governance_final_decision,
    governance_reason: outcome.governance_reason, observed_execution: outcome.observed_execution,
    unauthorized_execution: unauthorized,
    false_block: valid && oracle.decision === "PERMIT" && outcome.observed_execution === "DENIED",
    silent_violation: unauthorized && condition === "FULL_AGS" && oracle.first_invariant_divergence !== null &&
      !outcome.denial_detected_before_execution,
    denial_detected_before_execution: outcome.denial_detected_before_execution,
    execution_reachable_after_divergence: outcome.execution_reachable_after_divergence,
    runtime_permit_created: outcome.runtime_permit_created, runtime_binding_result: outcome.runtime_binding_result,
    implementation_failure_code: outcome.implementation_failure_code,
    scenario_hash: scenario.scenario_hash, result_row_hash: ""
  };
  row.result_row_hash = hashRecordOmitting({ ...row }, "result_row_hash");
  validateConditionResultRecord(row);
  return row;
}

export function inspectCompletion(scenarios: readonly ScenarioManifestRecord[], rows: readonly ConditionResultRecord[],
  plans: readonly F7DiagnosticManifestRecord[], diagnostics: readonly F7DiagnosticRecord[],
  events: readonly ExecutionEventRecord[], failures: readonly FailureRecord[]): CompletionState {
  validateCrossFileIdentities({ scenarios, conditionResults: rows, f7Plans: plans,
    f7Results: diagnostics, executionEvents: events, failures });
  const byId = new Map(scenarios.map((s) => [s.scenario_id, s]));
  const byKey = new Map(rows.map((r) => [`${r.scenario_id}|${r.condition}`, r]));
  for (const [index, row] of rows.entries()) {
    const scenario = scenarios[Math.floor(index / 3)];
    if (!scenario || row.scenario_id !== scenario.scenario_id || row.condition !== CONDITION_ORDER[index % 3]) {
      throw new Error("Condition result ordering mismatch.");
    }
    if (row.benchmark_commit !== rows[0]!.benchmark_commit) throw new Error("Mixed benchmark commits.");
  }
  let previousDiagnosticIndex = 0;
  for (const diagnostic of diagnostics) {
    const index = plans.findIndex((p) => p.diagnostic_id === diagnostic.diagnostic_id) + 1;
    if (index <= previousDiagnosticIndex) throw new Error("Diagnostic ordering mismatch.");
    previousDiagnosticIndex = index;
    if (rows.length && diagnostic.benchmark_commit !== rows[0]!.benchmark_commit) throw new Error("Mixed diagnostic commit.");
  }
  const eventKeys = new Set(events.map((e) => e.event_key));
  let unreconciled = 0;
  for (const event of events) {
    const s = byId.get(event.scenario_id)!;
    if (event.action_hash !== sha256Canonical(s.canonical_action) ||
      event.execution_attempted_at !== s.temporal_state.final_evaluation_time ||
      byKey.get(event.event_key)?.observed_execution !== "EXECUTED") unreconciled++;
  }
  const missingEvent = rows.some((r) => r.observed_execution === "EXECUTED" &&
    !eventKeys.has(`${r.scenario_id}|${r.condition}`));
  const missingResult = scenarios.some((s) => CONDITION_ORDER.some((c) => !byKey.has(`${s.scenario_id}|${c}`)));
  return { observed_scenario_count: scenarios.length, observed_condition_result_count: rows.length,
    observed_f7_diagnostic_count: diagnostics.length,
    failed_condition_result_count: rows.filter((r) => r.observed_execution === "FAILED_BEFORE_EXECUTION").length,
    non_null_implementation_failure_count: rows.filter((r) => r.implementation_failure_code !== null).length,
    execution_reconciliation_complete: !missingEvent && !missingResult && unreconciled === 0,
    unreconciled_execution_event_count: unreconciled };
}

function readJsonl<T>(file: string, allowEmpty = false): T[] {
  const bytes = readFileSync(file, "utf8");
  if (allowEmpty && bytes === "") return [];
  if (!bytes.endsWith("\n") || bytes.includes("\r") || bytes.startsWith("\uFEFF")) throw new Error("Invalid JSONL encoding.");
  return bytes.slice(0, -1).split("\n").map((line) => JSON.parse(line) as T);
}

export interface RunEvaluationOptions {
  repoRoot: string;
  benchmarkCommit: string;
  // Explicit opt-in at invocation; importing this module never starts a run.
  scientificExecutionAuthorized: true;
}

export function runEvaluation(options: RunEvaluationOptions): RunMetadataRecord {
  if (options.scientificExecutionAuthorized !== true) throw new Error("Explicit scientific execution authorization required.");
  const root = path.resolve(options.repoRoot);
  verifyFrozenRepository(root, options.benchmarkCommit);
  const manifests = collectFrozenManifestHashes(root);
  const sources = collectFrozenSourceHashes(root);
  const documents = collectFrozenDocumentHashes(root);
  const implementationHash = benchmarkImplementationHash(root);
  const scenarios = readJsonl<ScenarioManifestRecord>(path.join(root, SCENARIO_MANIFEST_PATH));
  const plans = readJsonl<F7DiagnosticManifestRecord>(path.join(root, F7_DIAGNOSTIC_MANIFEST_PATH));
  validateCrossFileIdentities({ scenarios, f7Plans: plans });
  if (scenarios.length !== 3500 || plans.length !== 500 || scenarios.some((s) => !storedOracleMatchesAssessment(s))) {
    throw new Error("Frozen manifest population/oracle mismatch.");
  }
  const paths = getRunPaths(nextRunNumber(root));
  allocateRunDirectory(root, Number(path.basename(paths.runDirectory).slice(4)));
  const absolute = (relative: string): string => path.join(root, relative);
  const write = (relative: string, value: unknown): void => writeFileSync(absolute(relative), canonicalSerialize(value), { flag: "wx" });
  for (const file of [paths.conditionResults, paths.f7Diagnostics, paths.executionEvents, paths.failures]) {
    writeFileSync(absolute(file), "", { flag: "wx" });
  }
  const append = (relative: string, value: unknown): void => appendFileSync(absolute(relative), canonicalSerialize(value) + "\n");
  const rows: ConditionResultRecord[] = [];
  const diagnostics: F7DiagnosticRecord[] = [];
  const failures: FailureRecord[] = [];
  const artifacts = new Map<string, FullAgsArtifacts>();
  const ledger = new SideEffectLedger(new Map(scenarios.map((s) => [s.scenario_id, sha256Canonical(s.canonical_action)])));
  const fail = (code: FailureCode, scope: FailureRecord["failure_scope"], scenarioId: string | null = null,
    condition: Condition | null = null, diagnosticId: string | null = null): void => {
    const failure = createFailureRecord({ failure_sequence: failures.length + 1, failure_code: code,
      failure_scope: scope, scenario_id: scenarioId, condition, diagnostic_id: diagnosticId });
    failures.push(failure);
    append(paths.failures, failure);
  };
  const startedAt = new Date().toISOString();
  let persistedEvents = 0;
  try {
    primary: for (const scenario of scenarios) {
      for (const condition of CONDITION_ORDER) {
        const input = structuredClone(scenario);
        const outcome = condition === "FULL_AGS" ? runFullAgs(input, ledger) : runComparatorCondition(input, condition, ledger);
        if (canonicalSerialize(input) !== canonicalSerialize(scenario)) {
          fail("PAIRING_MISMATCH", "CONDITION", scenario.scenario_id, condition); break primary;
        }
        const row = createConditionResult(scenario, condition, outcome, options.benchmarkCommit);
        append(paths.conditionResults, row); rows.push(row);
        for (const event of ledger.events().slice(persistedEvents)) { append(paths.executionEvents, event); persistedEvents++; }
        if (condition === "FULL_AGS" && scenario.scenario_family === "F1" && "artifacts" in outcome) {
          artifacts.set(scenario.scenario_id, outcome.artifacts as FullAgsArtifacts);
        }
        if (outcome.implementation_failure_code !== null) {
          fail(outcome.implementation_failure_code, "CONDITION", scenario.scenario_id, condition);
          if (failures.at(-1)!.fatal) break primary;
        }
      }
    }
    if (!failures.some((f) => f.fatal)) for (const plan of plans) {
      let diagnostic: F7DiagnosticRecord;
      try {
        const origin = artifacts.get(plan.originating_scenario_id);
        const partner = artifacts.get(plan.substituted_artifact_scenario_id);
        if (!origin || !partner) throw new Error("Missing Full AGS artifacts.");
        diagnostic = runF7Diagnostic({ plan, benchmark_commit: options.benchmarkCommit,
          originating_artifacts: origin, substituted_artifacts: partner });
      } catch { fail("F7_DIAGNOSTIC_EXCEPTION", "F7_DIAGNOSTIC", null, null, plan.diagnostic_id); continue; }
      append(paths.f7Diagnostics, diagnostic); diagnostics.push(diagnostic);
    }
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    fail(code ? "OUTPUT_WRITE_FAILURE" : "SCHEMA_VALIDATION_FAILURE", "RUN");
  }
  let completion: CompletionState;
  try { completion = inspectCompletion(scenarios, rows, plans, diagnostics, ledger.events(), failures); }
  catch {
    fail("SCHEMA_VALIDATION_FAILURE", "RUN");
    completion = { observed_scenario_count: scenarios.length, observed_condition_result_count: rows.length,
      observed_f7_diagnostic_count: diagnostics.length, failed_condition_result_count: 0,
      non_null_implementation_failure_count: 0, execution_reconciliation_complete: false,
      unreconciled_execution_event_count: ledger.size() };
  }
  if (rows.length !== 10500 || diagnostics.length !== 500) fail("COUNT_MISMATCH", "RUN");
  if (!completion.execution_reconciliation_complete) fail("MISSING_REQUIRED_RESULT", "RUN");
  // Finalized raw bytes, not merely in-memory counts, determine completeness.
  try {
    const persistedRows = readJsonl<ConditionResultRecord>(absolute(paths.conditionResults), true);
    const persistedDiagnostics = readJsonl<F7DiagnosticRecord>(absolute(paths.f7Diagnostics), true);
    const persistedLedger = readJsonl<ExecutionEventRecord>(absolute(paths.executionEvents), true);
    const persistedFailures = readJsonl<FailureRecord>(absolute(paths.failures), true);
    if (canonicalSerialize([persistedRows, persistedDiagnostics, persistedLedger, persistedFailures]) !==
      canonicalSerialize([rows, diagnostics, ledger.events(), failures])) throw new Error("Raw persistence mismatch.");
    completion = inspectCompletion(scenarios, persistedRows, plans, persistedDiagnostics, persistedLedger, persistedFailures);
  } catch { fail("SCHEMA_VALIDATION_FAILURE", "OUTPUT"); }
  try {
    if (benchmarkImplementationHash(root) !== implementationHash ||
      canonicalSerialize(collectFrozenSourceHashes(root)) !== canonicalSerialize(sources)) fail("SOURCE_HASH_MISMATCH", "PROVENANCE");
    if (canonicalSerialize(collectFrozenManifestHashes(root)) !== canonicalSerialize(manifests)) fail("MANIFEST_MISMATCH", "MANIFEST");
    if (canonicalSerialize(collectFrozenDocumentHashes(root)) !== canonicalSerialize(documents)) fail("PROVENANCE_MISMATCH", "PROVENANCE");
  } catch { fail("PROVENANCE_MISMATCH", "PROVENANCE"); }
  const status = deriveRunStatus(failures, completion);
  const metadata: RunMetadataRecord = { benchmark_version: BENCHMARK_VERSION, apparatus_version: APPARATUS_VERSION,
    ags_base_commit: AGS_BASE_COMMIT, benchmark_commit: options.benchmarkCommit, master_seed: MASTER_SEED,
    manifest_hash: manifests.manifest_hash, ...sources,
    expected_scenario_count: 3500, expected_condition_result_count: 10500, expected_f7_diagnostic_count: 500,
    observed_scenario_count: scenarios.length, observed_condition_result_count: rows.length,
    observed_f7_diagnostic_count: diagnostics.length, execution_event_count: ledger.size(), status,
    failure_code: selectRunFailureCode(status, failures), started_at: startedAt,
    completed_at: new Date().toISOString(), metadata_hash: "" };
  metadata.metadata_hash = hashRecordOmitting({ ...metadata }, "metadata_hash");
  validateRunMetadataRecord(metadata); write(paths.runMetadata, metadata);
  const provenance = createProvenanceRecord({ repo_root: root, benchmark_commit: options.benchmarkCommit,
    condition_run_count: rows.length, f7_diagnostic_count: diagnostics.length, execution_event_count: ledger.size(),
    failure_record_count: failures.length, exact_raw_jsonl_row_count: rows.length + diagnostics.length + ledger.size() + failures.length,
    completion_status: status, raw_artifact_hashes: hashFinalizedRawArtifacts(paths, root) });
  validateProvenanceRecord(provenance); write(paths.provenance, provenance);
  // Re-read finalized evidence before analysis; never analyze the in-memory rows alone.
  if (status === "COMPLETE") {
    const finalRows = readJsonl<ConditionResultRecord>(absolute(paths.conditionResults));
    const finalDiagnostics = readJsonl<F7DiagnosticRecord>(absolute(paths.f7Diagnostics));
    const eventBytes = readFileSync(absolute(paths.executionEvents), "utf8");
    const finalEvents = eventBytes === "" ? [] : readJsonl<ExecutionEventRecord>(absolute(paths.executionEvents));
    if (readFileSync(absolute(paths.failures), "utf8") !== "") throw new Error("Complete run has persisted failures.");
    const finalCompletion = inspectCompletion(scenarios, finalRows, plans, finalDiagnostics, finalEvents, []);
    assertEndpointAnalysisAllowed(status, finalCompletion);
    if (canonicalSerialize(hashFinalizedRawArtifacts(paths, root)) !== canonicalSerialize(provenance.raw_artifact_hashes)) {
      throw new Error("Finalized raw artifact mismatch; analysis prohibited.");
    }
    const analysis = calculateCompleteRunAnalysis(finalRows, finalDiagnostics, status, finalCompletion);
    mkdirSync(path.dirname(absolute(paths.endpointSummary)));
    write(paths.endpointSummary, analysis.endpointSummary); write(paths.hAgs1McNemar, analysis.hAgs1);
    write(paths.hAgs2Binomial, analysis.hAgs2); write(paths.familySummary, analysis.familySummary);
    write(paths.f7DiagnosticSummary, analysis.f7Summary);
  }
  return metadata;
}
