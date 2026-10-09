import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync
} from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { assessOracle, storedOracleMatchesAssessment } from "./oracle.js";
import { runFullAgs, normalizeFullAgsPacket, buildFullAgsRuntimeInput } from "./fullAgsAdapter.js";
import { runLocalGate } from "./localGate.js";
import { SideEffectLedger } from "./sideEffectAdapter.js";
import { runF7Diagnostic } from "./f7Diagnostic.js";
import { createConditionFailureOutcome, deriveRunStatus, assertEndpointAnalysisAllowed, createFailureRecord } from "./failureHandling.js";
import { allocateRunDirectory, nextRunNumber, createConditionResult, inspectCompletion, runComparatorCondition, CONDITION_ORDER } from "./runEvaluation.js";
import { exactBinomialLowerTail, exactBinomialUpperTail, evaluateHags1, evaluateHags2 } from "./statistics.js";
import { benchmarkImplementationHash, collectFrozenSourceHashes, collectFrozenDocumentHashes, createProvenanceRecord, readCurrentGitCommit } from "./provenance.js";
import { validateConditionResultRecord, validateProvenanceRecord } from "./schemas.js";
import { generateScenario } from "./scenarioGenerator.js";
import { AGS_BASE_COMMIT, type JsonObject, type JsonValue, type ScenarioFamily, type ConditionResultRecord } from "./types.js";
import {
  F7_DIAGNOSTIC_MANIFEST_PATH,
  MANIFEST_DIRECTORY,
  MANIFEST_METADATA_PATH,
  RESULTS_DIRECTORY,
  SCENARIO_MANIFEST_PATH,
  VALIDATION_DIRECTORY,
  VALIDATION_PATHS,
  formatRunDirectoryName
} from "./paths.js";
import {
  SCENARIO_FAMILIES,
  deriveScenarioSeed,
  generateAllScenarios,
  generateF7DiagnosticManifest,
  scenarioId
} from "./scenarioGenerator.js";
import {
  canonicalSerialize,
  hashRecordOmitting,
  sha256Bytes,
  sha256Canonical,
  validateCrossFileIdentities,
  validateF7DiagnosticManifestRecord,
  validateManifestMetadataRecord,
  validateScenarioManifestRecord
} from "./schemas.js";
import {
  APPARATUS_VERSION,
  BENCHMARK_VERSION,
  MASTER_SEED,
  type F7DiagnosticManifestRecord,
  type ManifestMetadataRecord,
  type ScenarioManifestRecord
} from "./types.js";

const EXPECTED_SCENARIO_COUNT = 3500;
const EXPECTED_F7_COUNT = 500;
const EXPECTED_CONDITION_RESULT_COUNT = 10500;

export interface ConfigurationValidationResult {
  validation_kind: "CONFIGURATION_ONLY";
  status: "PASS";
  scientific_condition_execution_invoked: false;
  scientific_endpoint_calculation_invoked: false;
  scenario_count: 3500;
  f7_diagnostic_count: 500;
  expected_condition_result_count: 10500;
  deterministic_replay: true;
  stable_scenario_ids: true;
  stable_derived_seeds: true;
  stable_scenario_hashes: true;
  paired_condition_identity_valid: true;
  schema_validation_passed: true;
  manifest_files_match_deterministic_generation: true;
  scenario_manifest_file_hash: string;
  f7_diagnostic_manifest_file_hash: string;
  manifest_metadata_file_hash: string;
  manifest_hash: string;
  next_scientific_run_directory: string;
  next_scientific_run_directory_unused: true;
}

function resolveFromRoot(
  repoRoot: string,
  relativePath: string
): string {
  return path.resolve(
    repoRoot,
    relativePath
  );
}

function serializeJsonl(
  rows: readonly unknown[]
): string {
  return (
    rows
      .map((row) =>
        canonicalSerialize(row)
      )
      .join("\n") +
    "\n"
  );
}

function writeUtf8NoBom(
  filePath: string,
  content: string
): void {
  writeFileSync(
    filePath,
    Buffer.from(
      content,
      "utf8"
    ),
    {
      flag: "wx"
    }
  );
}

function exactExistingBytesMatch(
  filePath: string,
  expectedBytes: Uint8Array
): boolean {
  if (!existsSync(filePath)) {
    return false;
  }

  const actual =
    readFileSync(filePath);

  return (
    actual.length === expectedBytes.length &&
    actual.equals(
      Buffer.from(expectedBytes)
    )
  );
}

function assertScenarioReplay(
  first: readonly ScenarioManifestRecord[],
  second: readonly ScenarioManifestRecord[]
): void {
  if (
    canonicalSerialize(first) !==
    canonicalSerialize(second)
  ) {
    throw new Error(
      "Deterministic scenario replay mismatch."
    );
  }
}

function assertScenarioIdentityAndHashes(
  scenarios: readonly ScenarioManifestRecord[]
): void {
  if (
    scenarios.length !==
    EXPECTED_SCENARIO_COUNT
  ) {
    throw new Error(
      `Expected ${EXPECTED_SCENARIO_COUNT} scenarios, found ${scenarios.length}.`
    );
  }

  const ids = new Set<string>();

  for (const scenario of scenarios) {
    validateScenarioManifestRecord(
      scenario
    );

    const expectedId =
      scenarioId(
        scenario.scenario_family,
        scenario.scenario_index
      );

    if (
      scenario.scenario_id !== expectedId
    ) {
      throw new Error(
        `Scenario ID mismatch for ${scenario.scenario_family}-${scenario.scenario_index}.`
      );
    }

    if (
      scenario.derived_seed !==
      deriveScenarioSeed(
        scenario.scenario_family,
        scenario.scenario_index
      )
    ) {
      throw new Error(
        `Derived seed mismatch for ${scenario.scenario_id}.`
      );
    }

    const expectedHash =
      hashRecordOmitting(
        {
          ...scenario
        },
        "scenario_hash"
      );

    if (
      scenario.scenario_hash !==
      expectedHash
    ) {
      throw new Error(
        `Scenario hash mismatch for ${scenario.scenario_id}.`
      );
    }

    if (
      scenario.paired_condition_identity !==
      scenario.scenario_id
    ) {
      throw new Error(
        `Paired condition identity mismatch for ${scenario.scenario_id}.`
      );
    }

    if (ids.has(scenario.scenario_id)) {
      throw new Error(
        `Duplicate scenario ID: ${scenario.scenario_id}.`
      );
    }

    ids.add(scenario.scenario_id);
  }

  for (
    const family of SCENARIO_FAMILIES
  ) {
    for (
      let index = 1;
      index <= 500;
      index += 1
    ) {
      const expected =
        scenarioId(
          family,
          index
        );

      if (!ids.has(expected)) {
        throw new Error(
          `Missing expected scenario ID: ${expected}.`
        );
      }
    }
  }
}

function assertF7Plan(
  plans:
    readonly F7DiagnosticManifestRecord[],
  scenarios:
    readonly ScenarioManifestRecord[]
): void {
  if (
    plans.length !==
    EXPECTED_F7_COUNT
  ) {
    throw new Error(
      `Expected ${EXPECTED_F7_COUNT} F7 plans, found ${plans.length}.`
    );
  }

  const scenariosById =
    new Map(
      scenarios.map(
        (scenario) => [
          scenario.scenario_id,
          scenario
        ] as const
      )
    );

  for (const plan of plans) {
    validateF7DiagnosticManifestRecord(
      plan
    );

    const expectedDiagnosticId =
      `AGS001-F7D-${String(
        plan.diagnostic_index
      ).padStart(4, "0")}`;

    if (
      plan.diagnostic_id !==
      expectedDiagnosticId
    ) {
      throw new Error(
        `F7 diagnostic ID mismatch: ${plan.diagnostic_id}.`
      );
    }

    if (
      plan.originating_scenario_id ===
      plan.substituted_artifact_scenario_id
    ) {
      throw new Error(
        `F7 diagnostic self-pair detected: ${plan.diagnostic_id}.`
      );
    }

    const origin =
      scenariosById.get(
        plan.originating_scenario_id
      );

    const partner =
      scenariosById.get(
        plan.substituted_artifact_scenario_id
      );

    if (
      !origin ||
      !partner ||
      origin.scenario_family !== "F1" ||
      partner.scenario_family !== "F1"
    ) {
      throw new Error(
        `F7 diagnostic cross-family or missing pair: ${plan.diagnostic_id}.`
      );
    }

    if (
      plan.originating_scenario_hash !==
        origin.scenario_hash ||
      plan.substituted_artifact_scenario_hash !==
        partner.scenario_hash
    ) {
      throw new Error(
        `F7 diagnostic scenario-hash reference mismatch: ${plan.diagnostic_id}.`
      );
    }

    const expectedPlanHash =
      hashRecordOmitting(
        {
          ...plan
        },
        "diagnostic_plan_hash"
      );

    if (
      plan.diagnostic_plan_hash !==
      expectedPlanHash
    ) {
      throw new Error(
        `F7 diagnostic plan hash mismatch: ${plan.diagnostic_id}.`
      );
    }
  }

  validateCrossFileIdentities({
    scenarios,
    f7Plans: plans
  });
}

function createManifestArtifacts(
  scenarios:
    readonly ScenarioManifestRecord[],
  f7Plans:
    readonly F7DiagnosticManifestRecord[]
): {
  scenarioBytes: Buffer;
  f7Bytes: Buffer;
  metadataBytes: Buffer;
  metadata: ManifestMetadataRecord;
} {
  const scenarioBytes =
    Buffer.from(
      serializeJsonl(scenarios),
      "utf8"
    );

  const f7Bytes =
    Buffer.from(
      serializeJsonl(f7Plans),
      "utf8"
    );

  const scenarioManifestFileHash =
    sha256Bytes(scenarioBytes);

  const f7ManifestFileHash =
    sha256Bytes(f7Bytes);

  const manifestPreimage = {
    apparatus_version:
      APPARATUS_VERSION,
    benchmark_version:
      BENCHMARK_VERSION,
    expected_f7_diagnostic_count:
      500 as const,
    expected_scenario_count:
      3500 as const,
    f7_diagnostic_manifest_file_hash:
      f7ManifestFileHash,
    master_seed:
      MASTER_SEED,
    scenario_manifest_file_hash:
      scenarioManifestFileHash
  };

  const metadata:
    ManifestMetadataRecord = {
      ...manifestPreimage,
      manifest_hash:
        sha256Canonical(
          manifestPreimage
        )
    };

  validateManifestMetadataRecord(
    metadata
  );

  const metadataBytes =
    Buffer.from(
      canonicalSerialize(
        metadata
      ),
      "utf8"
    );

  return {
    scenarioBytes,
    f7Bytes,
    metadataBytes,
    metadata
  };
}

function ensureFrozenManifestFiles(
  repoRoot: string,
  scenarioBytes: Buffer,
  f7Bytes: Buffer,
  metadataBytes: Buffer
): void {
  const scenarioPath =
    resolveFromRoot(
      repoRoot,
      SCENARIO_MANIFEST_PATH
    );

  const f7Path =
    resolveFromRoot(
      repoRoot,
      F7_DIAGNOSTIC_MANIFEST_PATH
    );

  const metadataPath =
    resolveFromRoot(
      repoRoot,
      MANIFEST_METADATA_PATH
    );

  const existence = [
    existsSync(scenarioPath),
    existsSync(f7Path),
    existsSync(metadataPath)
  ];

  const existingCount =
    existence.filter(Boolean).length;

  if (
    existingCount !== 0 &&
    existingCount !== 3
  ) {
    throw new Error(
      "Frozen manifest set is partially present; refusing to create or overwrite files."
    );
  }

  if (existingCount === 3) {
    if (
      !exactExistingBytesMatch(
        scenarioPath,
        scenarioBytes
      ) ||
      !exactExistingBytesMatch(
        f7Path,
        f7Bytes
      ) ||
      !exactExistingBytesMatch(
        metadataPath,
        metadataBytes
      )
    ) {
      throw new Error(
        "Existing frozen manifest bytes differ from deterministic regeneration; overwrite refused."
      );
    }

    return;
  }

  mkdirSync(
    resolveFromRoot(
      repoRoot,
      MANIFEST_DIRECTORY
    ),
    {
      recursive: true
    }
  );

  writeUtf8NoBom(
    scenarioPath,
    scenarioBytes.toString("utf8")
  );

  writeUtf8NoBom(
    f7Path,
    f7Bytes.toString("utf8")
  );

  writeUtf8NoBom(
    metadataPath,
    metadataBytes.toString("utf8")
  );
}

function determineNextRunDirectory(
  repoRoot: string
): string {
  const resultsPath =
    resolveFromRoot(
      repoRoot,
      RESULTS_DIRECTORY
    );

  if (!existsSync(resultsPath)) {
    return path.join(
      RESULTS_DIRECTORY,
      formatRunDirectoryName(1)
    );
  }

  const runNumbers: number[] = [];

  for (
    const entry of readdirSync(resultsPath)
  ) {
    const fullPath =
      path.join(
        resultsPath,
        entry
      );

    if (
      !statSync(fullPath).isDirectory()
    ) {
      continue;
    }

    const match =
      /^run-(\d{3})$/.exec(entry);

    if (!match) {
      throw new Error(
        `Unexpected scientific results directory entry: ${entry}.`
      );
    }

    runNumbers.push(
      Number(match[1])
    );
  }

  const next =
    runNumbers.length === 0
      ? 1
      : Math.max(...runNumbers) + 1;

  if (next > 999) {
    throw new Error(
      "No valid scientific run directory numbers remain."
    );
  }

  const relative =
    path.join(
      RESULTS_DIRECTORY,
      formatRunDirectoryName(next)
    );

  if (
    existsSync(
      resolveFromRoot(
        repoRoot,
        relative
      )
    )
  ) {
    throw new Error(
      `Next scientific run directory is already in use: ${relative}.`
    );
  }

  return relative;
}

export function runConfigurationValidation(
  repoRoot = process.cwd()
): ConfigurationValidationResult {
  const firstScenarios =
    generateAllScenarios();

  const replayScenarios =
    generateAllScenarios();

  assertScenarioReplay(
    firstScenarios,
    replayScenarios
  );

  assertScenarioIdentityAndHashes(
    firstScenarios
  );

  const firstF7Plans =
    generateF7DiagnosticManifest(
      firstScenarios
    );

  const replayF7Plans =
    generateF7DiagnosticManifest(
      replayScenarios
    );

  if (
    canonicalSerialize(firstF7Plans) !==
    canonicalSerialize(replayF7Plans)
  ) {
    throw new Error(
      "Deterministic F7 diagnostic-plan replay mismatch."
    );
  }

  assertF7Plan(
    firstF7Plans,
    firstScenarios
  );

  if (
    firstScenarios.length * 3 !==
    EXPECTED_CONDITION_RESULT_COUNT
  ) {
    throw new Error(
      "Expected condition-result count derivation mismatch."
    );
  }

  const artifacts =
    createManifestArtifacts(
      firstScenarios,
      firstF7Plans
    );

  ensureFrozenManifestFiles(
    repoRoot,
    artifacts.scenarioBytes,
    artifacts.f7Bytes,
    artifacts.metadataBytes
  );

  const scenarioPath =
    resolveFromRoot(
      repoRoot,
      SCENARIO_MANIFEST_PATH
    );

  const f7Path =
    resolveFromRoot(
      repoRoot,
      F7_DIAGNOSTIC_MANIFEST_PATH
    );

  const metadataPath =
    resolveFromRoot(
      repoRoot,
      MANIFEST_METADATA_PATH
    );

  if (
    !exactExistingBytesMatch(
      scenarioPath,
      artifacts.scenarioBytes
    ) ||
    !exactExistingBytesMatch(
      f7Path,
      artifacts.f7Bytes
    ) ||
    !exactExistingBytesMatch(
      metadataPath,
      artifacts.metadataBytes
    )
  ) {
    throw new Error(
      "Frozen manifest persistence verification failed."
    );
  }

  const nextRunDirectory =
    determineNextRunDirectory(
      repoRoot
    );

  const result:
    ConfigurationValidationResult = {
      validation_kind:
        "CONFIGURATION_ONLY",
      status:
        "PASS",
      scientific_condition_execution_invoked:
        false,
      scientific_endpoint_calculation_invoked:
        false,
      scenario_count:
        EXPECTED_SCENARIO_COUNT,
      f7_diagnostic_count:
        EXPECTED_F7_COUNT,
      expected_condition_result_count:
        EXPECTED_CONDITION_RESULT_COUNT,
      deterministic_replay:
        true,
      stable_scenario_ids:
        true,
      stable_derived_seeds:
        true,
      stable_scenario_hashes:
        true,
      paired_condition_identity_valid:
        true,
      schema_validation_passed:
        true,
      manifest_files_match_deterministic_generation:
        true,
      scenario_manifest_file_hash:
        sha256Bytes(
          artifacts.scenarioBytes
        ),
      f7_diagnostic_manifest_file_hash:
        sha256Bytes(
          artifacts.f7Bytes
        ),
      manifest_metadata_file_hash:
        sha256Bytes(
          artifacts.metadataBytes
        ),
      manifest_hash:
        artifacts.metadata.manifest_hash,
      next_scientific_run_directory:
        nextRunDirectory,
      next_scientific_run_directory_unused:
        true
    };

  mkdirSync(
    resolveFromRoot(
      repoRoot,
      VALIDATION_DIRECTORY
    ),
    {
      recursive: true
    }
  );

  writeFileSync(
    resolveFromRoot(
      repoRoot,
      VALIDATION_PATHS.configuration
    ),
    Buffer.from(
      canonicalSerialize(result),
      "utf8"
    )
  );

  return result;
}

/** Engineering-only entrypoint. Never invokes runEvaluation or aggregate analysis. */
export function runEngineeringValidation(repoRoot = process.cwd()) {
  const initialImplementationHash = benchmarkImplementationHash(repoRoot);
  const checks: { id: number; name: string; status: "PASS" | "FAIL"; detail: string }[] = [];
  const check = (id: number, name: string, fn: () => void): void => {
    try { fn(); checks.push({ id, name, status: "PASS", detail: "Assertions passed." }); }
    catch (error) { checks.push({ id, name, status: "FAIL", detail: error instanceof Error ? error.message : String(error) }); }
  };
  const shell = (command: string): void => {
    execFileSync(process.platform === "win32" ? "cmd.exe" : "sh",
      process.platform === "win32" ? ["/d", "/s", "/c", command] : ["-c", command],
      { cwd: repoRoot, stdio: "pipe", maxBuffer: 32 * 1024 * 1024 });
  };
  check(1, "repository build and typecheck", () => {
    const distHash = (): string => sha256Canonical(Object.fromEntries(
      readdirSync(path.join(repoRoot, "packages/ags-evaluation-001/dist"))
        .filter((name) => name.endsWith(".js")).map((name) => [name,
          sha256Bytes(readFileSync(path.join(repoRoot, "packages/ags-evaluation-001/dist", name)))])));
    const before = distHash();
    shell("corepack pnpm build"); shell("corepack pnpm typecheck");
    assert.equal(distHash(), before, "Stale loaded benchmark code: build, then validate in a fresh process.");
  });
  const scenarios = generateAllScenarios();
  const plans = generateF7DiagnosticManifest(scenarios);
  const replay = generateAllScenarios();
  check(2, "deterministic scenario replay", () => assertScenarioReplay(scenarios, replay));
  check(3, "stable scenario identities", () => {
    assert.equal(new Set(scenarios.map((s) => s.scenario_id)).size, 3500);
    for (const s of scenarios) assert.equal(s.scenario_id, scenarioId(s.scenario_family, s.scenario_index));
  });
  check(4, "stable derived seeds", () => {
    for (const s of scenarios) assert.equal(s.derived_seed, deriveScenarioSeed(s.scenario_family, s.scenario_index));
  });
  check(5, "stable scenario hashes", () => assertScenarioIdentityAndHashes(scenarios));
  const ledgerFor = (s: ScenarioManifestRecord): SideEffectLedger => new SideEffectLedger(new Map([[s.scenario_id, sha256Canonical(s.canonical_action)]]));
  check(6, "paired semantic equivalence and isolation", () => {
    assert.deepEqual(CONDITION_ORDER, ["FULL_AGS", "LOCAL_GATE", "DIRECT_EXECUTION"]);
    const s = generateScenario("F1", 1);
    const before = canonicalSerialize(s);
    const ledger = ledgerFor(s);
    const full = runFullAgs(structuredClone(s), ledger);
    const local = runComparatorCondition(structuredClone(s), "LOCAL_GATE", ledger);
    const direct = runComparatorCondition(structuredClone(s), "DIRECT_EXECUTION", ledger);
    for (const outcome of [full, local, direct]) assert.equal(outcome.observed_execution, "EXECUTED");
    assert.equal(canonicalSerialize(s), before);
    assert.equal(new Set(ledger.events().map((e) => e.action_hash)).size, 1);
    assert.equal(new Set(ledger.events().map((e) => e.execution_attempted_at)).size, 1);
    assert.deepEqual(ledger.events().map((e) => e.condition), CONDITION_ORDER);
    for (const candidate of scenarios) for (const condition of CONDITION_ORDER) {
      const row = createConditionResult(candidate, condition,
        createConditionFailureOutcome("CONDITION_ADAPTER_EXCEPTION"), AGS_BASE_COMMIT);
      assert.equal(row.first_invariant_divergence, candidate.expected_first_invariant_divergence);
      assert.equal(row.divergence_transition_index, candidate.expected_divergence_transition);
    }
  });
  check(7, "independent oracle", () => {
    for (const s of scenarios) assert.ok(storedOracleMatchesAssessment(s), s.scenario_id);
    for (const name of ["oracle", "localGate", "directExecution"]) {
      const source = readFileSync(path.join(repoRoot, "packages/ags-evaluation-001/src", name + ".ts"), "utf8");
      assert.ok(!source.includes("@alignment-governance-stack/"));
    }
    const wrongLabel = { ...scenarios[0]!, oracle_decision: "DENY" as const };
    assert.equal(storedOracleMatchesAssessment(wrongLabel), false);
    assert.equal(assessOracle(wrongLabel).decision, "PERMIT");
  });
  check(8, "exact schemas and classification protections", () => {
    assert.equal(canonicalSerialize({ z: undefined, b: 1n, a: [undefined, , new Date("2026-01-01T00:00:00Z")] }),
      '{"a":[null,null,"2026-01-01T00:00:00.000Z"],"b":"1"}');
    assertF7Plan(plans, scenarios);
    const s = scenarios[0]!;
    const row = createConditionResult(s, "FULL_AGS", createConditionFailureOutcome("AGS_ADAPTER_EXCEPTION"), AGS_BASE_COMMIT);
    assert.throws(() => validateConditionResultRecord({ ...row, extra: true }));
    assert.throws(() => validateConditionResultRecord({ ...row, false_block: true }));
    assert.throws(() => validateScenarioManifestRecord({ ...s, scenario_hash: "sha256:" + "0".repeat(64) }));
    assert.throws(() => validateScenarioManifestRecord({ ...s, extra: true }));
    const hash = "sha256:" + "1".repeat(64);
    const p = createProvenanceRecord({ repo_root: repoRoot, benchmark_commit: readCurrentGitCommit(repoRoot),
      condition_run_count: 0, f7_diagnostic_count: 0, execution_event_count: 0, failure_record_count: 0,
      exact_raw_jsonl_row_count: 0, completion_status: "INCOMPLETE", raw_artifact_hashes: {
        condition_results_file_hash: hash, f7_diagnostics_file_hash: hash, execution_events_file_hash: hash,
        run_metadata_file_hash: hash, failures_file_hash: hash } });
    validateProvenanceRecord(p);
    assert.equal(p.amendment_007_file_hash, collectFrozenDocumentHashes(repoRoot).amendment_007_file_hash);
    for (const key of Object.keys(p)) { const bad = { ...p } as Record<string, unknown>; delete bad[key]; assert.throws(() => validateProvenanceRecord(bad)); }
    assert.throws(() => validateProvenanceRecord({ ...p, extra: true }));
  });
  check(9, "overwrite protection", () => {
    const temp = mkdtempSync(path.join(tmpdir(), "ags001-engineering-"));
    try {
      assert.equal(nextRunNumber(temp), 1); allocateRunDirectory(temp, 1);
      assert.throws(() => allocateRunDirectory(temp, 1)); assert.equal(nextRunNumber(temp), 2);
      const file = path.join(temp, "exclusive.txt"); writeUtf8NoBom(file, "preserved");
      assert.throws(() => writeUtf8NoBom(file, "overwrite")); assert.equal(readFileSync(file, "utf8"), "preserved");
      const artifacts = createManifestArtifacts(scenarios, plans);
      ensureFrozenManifestFiles(temp, artifacts.scenarioBytes, artifacts.f7Bytes, artifacts.metadataBytes);
      assert.throws(() => ensureFrozenManifestFiles(temp, Buffer.from("changed"), artifacts.f7Bytes, artifacts.metadataBytes));
    } finally {
      const target = path.resolve(temp);
      assert.equal(path.dirname(target), path.resolve(tmpdir()));
      assert.ok(path.basename(target).startsWith("ags001-engineering-"));
      rmSync(target, { recursive: true, force: true });
    }
  });
  check(10, "incomplete and aborted run detection", () => {
    const empty = inspectCompletion(scenarios, [], plans, [], [], []);
    assert.equal(deriveRunStatus([], empty), "INCOMPLETE");
    assert.throws(() => assertEndpointAnalysisAllowed("INCOMPLETE", empty));
    assert.throws(() => assertEndpointAnalysisAllowed("COMPLETE", empty));
    const fatal = createFailureRecord({ failure_sequence: 1, failure_code: "ACTION_HASH_MISMATCH", failure_scope: "RUN" });
    assert.equal(deriveRunStatus([fatal], empty), "ABORTED");
    const complete = { ...empty, observed_condition_result_count: 10500, observed_f7_diagnostic_count: 500,
      execution_reconciliation_complete: true };
    assert.equal(deriveRunStatus([], complete), "COMPLETE");
    for (const field of ["failed_condition_result_count", "non_null_implementation_failure_count", "unreconciled_execution_event_count"] as const) {
      const bad = { ...complete, [field]: 1 }; assert.equal(deriveRunStatus([], bad), "INCOMPLETE");
      assert.throws(() => assertEndpointAnalysisAllowed("COMPLETE", bad));
    }
  });
  let configuration: ConfigurationValidationResult | null = null;
  check(11, "configuration-only validation", () => { configuration = runConfigurationValidation(repoRoot); });
  // Explicit hand mutations on valid trajectory bases; never persisted as scientific rows.
  const obj = (v: JsonValue | undefined): JsonObject => { assert.ok(v && typeof v === "object" && !Array.isArray(v)); return v as JsonObject; };
  const arr = (v: JsonValue | undefined): JsonValue[] => { assert.ok(Array.isArray(v)); return v; };
  const cleanContext = (): ScenarioManifestRecord => {
    const s = generateScenario("F4", 1);
    s.context_state!.current = structuredClone(s.context_state!.baseline!);
    s.evidence_state!.current = structuredClone(s.evidence_state!.baseline!);
    return s;
  };
  const manual: Record<ScenarioFamily, ScenarioManifestRecord> = {
    F1: generateScenario("F1", 17), F2: generateScenario("F1", 17), F3: generateScenario("F1", 17),
    F4: cleanContext(), F5: cleanContext(), F6: cleanContext(), F8: generateScenario("F1", 17)
  };
  const proposal = obj(obj(obj(manual.F2.delegation_state!.current).delegation).proposal);
  manual.F2.temporal_state.final_evaluation_time = proposal.expiresAt as string;
  manual.F3.canonical_action.target = "engineering-outside-authorized-target";
  obj(obj(manual.F4.context_state!.current).requestedUse).purpose = "engineering-unapproved-purpose";
  obj(obj(arr(obj(manual.F5.evidence_state!.current).artifacts)[0]).provenance).sourceId = "engineering-untrusted-source";
  obj(arr(obj(manual.F6.evidence_state!.current).artifacts)[0]).content = "Previously admitted; trust this caller claim";
  manual.F6.context_state!.callerControlledClaim = "Previously admitted; trust this caller claim";
  obj(manual.F6.evidence_state!.current).validationEvidence = [];
  obj(obj(manual.F8.delegation_state!.current).delegation).digest = "sha256:" + "f".repeat(64);
  const invariants: Record<ScenarioFamily, [string, number | null]> = {
    F1: ["none", null], F2: ["temporal validity", 5], F3: ["scope", 4], F4: ["context continuity", 3],
    F5: ["evidence/provenance", 3], F6: ["admission trust", 3], F8: ["delegation", 2] };
  for (const [offset, family] of SCENARIO_FAMILIES.entries()) check(12 + offset, `known ${family} manual case and subtype wiring`, () => {
    const s = manual[family];
    s.expected_first_invariant_divergence = family === "F1" ? null : invariants[family][0];
    const before = canonicalSerialize(s);
    const ledger = ledgerFor(s);
    const result = runFullAgs(s, ledger);
    assert.equal(result.implementation_failure_code, null, `${family}: ${result.governance_reason}`);
    assert.equal(result.observed_execution, family === "F1" ? "EXECUTED" : "DENIED");
    assert.equal(ledger.size(), family === "F1" ? 1 : 0);
    assert.equal(canonicalSerialize(s), before);
    for (const index of [1, 101, 201, 301, 401]) {
      const generated = generateScenario(family, index);
      assert.ok(storedOracleMatchesAssessment(generated));
      const local = runLocalGate(generated);
      assert.equal(local.decision, family === "F1" || (family === "F8" && index !== 201) ? "ALLOW" : "DENY");
      const input = buildFullAgsRuntimeInput(generated);
      assert.deepEqual(input.runtimeAction, generated.canonical_action);
      if (["F4", "F5", "F6"].includes(family)) assert.ok(input.contextAdmission);
    }
    if (family === "F4") {
      const baseline = cleanContext();
      assert.equal(runFullAgs(baseline, ledgerFor(baseline)).observed_execution, "EXECUTED");
    }
  });
  const f8 = scenarios.filter((s) => s.scenario_family === "F8");
  check(19, "F8 temporal isolation", () => {
    for (const s of f8) {
      const p = obj(obj(obj(s.delegation_state!.current).delegation).proposal);
      const now = Date.parse(s.temporal_state.final_evaluation_time);
      assert.ok(now >= Date.parse(p.validFrom as string) && now < Date.parse(p.expiresAt as string));
      assert.ok(storedOracleMatchesAssessment(s));
    }
  });
  check(20, "F8 scope isolation", () => {
    for (const s of f8) {
      const p = obj(obj(obj(s.delegation_state!.baseline).delegation).proposal);
      const action = obj(arr(p.permittedActions)[0]);
      assert.deepEqual({ ...s.canonical_action, knownApproval: false }, { ...action, knownApproval: false });
    }
  });
  check(21, "F8 bounded nontransitive delegation", () => {
    for (const s of f8) for (const stage of ["baseline", "current"]) {
      const p = obj(obj(obj(s.delegation_state![stage]).delegation).proposal);
      assert.equal(p.delegationRights, "none"); assert.equal(arr(p.permittedActions).length, 1);
    }
  });
  check(22, "F7 individual integrity versus correspondence and adapter normalization", () => {
    const plan = plans[0]!;
    const origin = scenarios.find((s) => s.scenario_id === plan.originating_scenario_id)!;
    const partner = scenarios.find((s) => s.scenario_id === plan.substituted_artifact_scenario_id)!;
    const first = runFullAgs(origin, ledgerFor(origin)); const second = runFullAgs(partner, ledgerFor(partner));
    const before = canonicalSerialize(first.artifacts);
    const diagnostic = runF7Diagnostic({ plan, benchmark_commit: AGS_BASE_COMMIT,
      originating_artifacts: first.artifacts, substituted_artifacts: second.artifacts });
    assert.equal(diagnostic.receipt_individually_valid, true); assert.equal(diagnostic.fingerprint_individually_valid, true);
    assert.equal(diagnostic.receipt_references_supplied_fingerprint, false);
    assert.equal(diagnostic.fingerprint_governance_bindings_match_originating_run, false);
    assert.equal(diagnostic.native_ags_mismatch_detected, false); assert.equal(diagnostic.detection_mechanism, null);
    assert.equal(canonicalSerialize(first.artifacts), before);
    assert.equal(first.denial_detected_before_execution, false); assert.equal(first.execution_reachable_after_divergence, null);
    const divergent = generateScenario("F8", 1);
    const syntheticPacket = { governance: { finalDecision: "execution_allowed", reasonForDecision: "synthetic engineering packet",
      permit: {}, runtimeAction: divergent.canonical_action, runtimeBinding: { allowed: true, decision: "execution_allowed" } },
      receipt: {}, agencyFingerprint: {} } as unknown as Parameters<typeof normalizeFullAgsPacket>[1];
    const ledger = ledgerFor(divergent);
    const allowed = normalizeFullAgsPacket(divergent, syntheticPacket, ledger);
    assert.equal(allowed.execution_reachable_after_divergence, true); assert.equal(allowed.observed_execution, "EXECUTED");
    const duplicate = normalizeFullAgsPacket(divergent, syntheticPacket, ledger);
    assert.equal(duplicate.observed_execution, "FAILED_BEFORE_EXECUTION");
    assert.equal(duplicate.execution_reachable_after_divergence, true);
    assert.equal(duplicate.implementation_failure_code, "DUPLICATE_EXECUTION_EVENT");
    const inconsistent = structuredClone(syntheticPacket); delete inconsistent.governance.permit;
    const failed = normalizeFullAgsPacket(divergent, inconsistent, ledgerFor(divergent));
    assert.equal(failed.implementation_failure_code, "AGS_ADAPTER_EXCEPTION"); assert.equal(failed.execution_reachable_after_divergence, null);
    const blocked = structuredClone(syntheticPacket); blocked.governance.finalDecision = "execution_denied";
    blocked.governance.runtimeBinding!.allowed = false; blocked.governance.runtimeBinding!.decision = "execution_denied";
    const denial = normalizeFullAgsPacket(divergent, blocked, ledgerFor(divergent));
    assert.equal(denial.runtime_binding_result, "execution_denied"); assert.equal(denial.observed_execution, "DENIED");
    assert.equal(denial.denial_detected_before_execution, true); assert.equal(denial.execution_reachable_after_divergence, false);
    const falseBlock = normalizeFullAgsPacket(origin, blocked, ledgerFor(origin));
    assert.equal(falseBlock.denial_detected_before_execution, false); assert.equal(falseBlock.execution_reachable_after_divergence, null);
    const localAllow = runComparatorCondition(divergent, "LOCAL_GATE", ledgerFor(divergent));
    assert.equal(localAllow.execution_reachable_after_divergence, true); assert.equal(localAllow.governance_reason, "[]");
    const localDeny = runComparatorCondition(generateScenario("F2", 1), "LOCAL_GATE", ledgerFor(generateScenario("F2", 1)));
    assert.equal(localDeny.denial_detected_before_execution, true); assert.equal(localDeny.execution_reachable_after_divergence, false);
    const direct = runComparatorCondition(divergent, "DIRECT_EXECUTION", ledgerFor(divergent));
    assert.equal(direct.execution_reachable_after_divergence, true); assert.equal(direct.governance_final_decision, null);
    const altered = structuredClone(divergent); altered.canonical_action.target += "-wrong";
    assert.equal(runComparatorCondition(altered, "DIRECT_EXECUTION", ledgerFor(divergent)).implementation_failure_code, "ACTION_HASH_MISMATCH");
    const malformed = structuredClone(divergent); malformed.canonical_action.tool = "";
    const malformedLedger = ledgerFor(malformed);
    const malformedResult = runComparatorCondition(malformed, "DIRECT_EXECUTION", malformedLedger);
    assert.equal(malformedResult.execution_reachable_after_divergence, null);
    assert.equal(malformedResult.observed_execution, "FAILED_BEFORE_EXECUTION"); assert.equal(malformedLedger.size(), 0);
    const invalid = structuredClone(origin); invalid.originating_authority = null;
    assert.equal(runFullAgs(invalid, ledgerFor(invalid)).implementation_failure_code, "AGS_ADAPTER_EXCEPTION");
    const throwingLedger = ledgerFor(divergent);
    throwingLedger.execute = () => { throw new Error("Injected engineering ledger failure"); };
    for (const condition of ["LOCAL_GATE", "DIRECT_EXECUTION"] as const) {
      const failure = runComparatorCondition(divergent, condition, throwingLedger);
      assert.equal(failure.execution_reachable_after_divergence, true);
      assert.equal(failure.implementation_failure_code, "SIDE_EFFECT_ADAPTER_FAILURE");
    }
    const failure = normalizeFullAgsPacket(divergent, syntheticPacket, throwingLedger);
    assert.equal(failure.execution_reachable_after_divergence, true);
    assert.equal(failure.implementation_failure_code, "SIDE_EFFECT_ADAPTER_FAILURE");
    const noBinding = structuredClone(blocked);
    delete noBinding.governance.runtimeBinding; delete noBinding.governance.permit;
    assert.equal(normalizeFullAgsPacket(divergent, noBinding, ledgerFor(divergent)).runtime_binding_result, null);
    const contradiction = structuredClone(blocked); contradiction.governance.runtimeBinding!.allowed = true;
    assert.equal(normalizeFullAgsPacket(divergent, contradiction, ledgerFor(divergent)).implementation_failure_code, "AGS_ADAPTER_EXCEPTION");
  });
  check(23, "exact statistical unit vectors only", () => {
    assert.equal(exactBinomialLowerTail(3, 0.5, 1), 0.5); assert.equal(exactBinomialUpperTail(3, 0.5, 3), 0.125);
    assert.equal(evaluateHags1(0, 0).exact_one_sided_p_value, 1);
    assert.equal(evaluateHags1(0, 5).supported, false); assert.equal(evaluateHags1(0, 6).supported, true);
    assert.equal(evaluateHags1(6, 0).supported, false); assert.equal(evaluateHags1(0, 3000).supported, true);
    assert.ok(Math.abs(evaluateHags2(0).exact_one_sided_p_value - 0.98 ** 500) < 1e-16);
    assert.equal(evaluateHags2(3).supported, true); assert.equal(evaluateHags2(4).supported, false);
    assert.equal(evaluateHags2(10).below_frozen_threshold, false);
    assert.throws(() => evaluateHags1(3000, 1)); assert.throws(() => evaluateHags2(-1));
  });
  check(24, "exact expected output counts and missing/duplicate rows", () => {
    assert.equal(scenarios.length, 3500); assert.equal(plans.length, 500);
    const syntheticRows: ConditionResultRecord[] = scenarios.flatMap((s) => CONDITION_ORDER.map((c) =>
      createConditionResult(s, c, createConditionFailureOutcome("CONDITION_ADAPTER_EXCEPTION"), AGS_BASE_COMMIT)));
    assert.equal(syntheticRows.length, 10500);
    validateCrossFileIdentities({ scenarios, conditionResults: syntheticRows, f7Plans: plans });
    assert.throws(() => validateCrossFileIdentities({ scenarios, conditionResults: [...syntheticRows, syntheticRows[0]!] }));
    assert.throws(() => inspectCompletion(scenarios, syntheticRows.slice(1), plans, [], [], []));
    const missing = inspectCompletion(scenarios, syntheticRows.slice(0, -1), plans, [], [], []);
    assert.equal(missing.execution_reconciliation_complete, false);
    assert.equal(deriveRunStatus([], missing), "INCOMPLETE");
  });
  if (benchmarkImplementationHash(repoRoot) !== initialImplementationHash) {
    checks[0] = { id: 1, name: "repository build and typecheck", status: "FAIL", detail: "Implementation changed during validation." };
  }
  const result = { validation_kind: "ENGINEERING_ONLY", status: checks.every((c) => c.status === "PASS") ? "PASS" : "FAIL",
    scientific_condition_execution_invoked: false, scientific_endpoint_calculation_invoked: false,
    checks, source_hashes: collectFrozenSourceHashes(repoRoot), document_hashes: collectFrozenDocumentHashes(repoRoot),
    implementation_hash: benchmarkImplementationHash(repoRoot),
    next_scientific_run_directory: path.join(RESULTS_DIRECTORY, formatRunDirectoryName(nextRunNumber(repoRoot))) };
  mkdirSync(path.join(repoRoot, VALIDATION_DIRECTORY), { recursive: true });
  const save = (relative: string, value: unknown): void => writeFileSync(path.join(repoRoot, relative), canonicalSerialize(value));
  const subset = (ids: number[]) => ({ validation_kind: "ENGINEERING_ONLY",
    scientific_condition_execution_invoked: false, scientific_endpoint_calculation_invoked: false,
    checks: checks.filter((c) => ids.includes(c.id)), status: checks.filter((c) => ids.includes(c.id)).every((c) => c.status === "PASS") ? "PASS" : "FAIL" });
  save(VALIDATION_PATHS.determinism, subset([2, 3, 4, 5, 6, 7]));
  save(VALIDATION_PATHS.knownCases, subset([12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22]));
  save(VALIDATION_PATHS.statistics, subset([23])); save(VALIDATION_PATHS.schema, subset([8, 9, 10, 24]));
  save(VALIDATION_PATHS.summary, result);
  if (configuration === null) save(VALIDATION_PATHS.configuration, subset([11]));
  return result;
}
