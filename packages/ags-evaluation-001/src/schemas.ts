import { createHash } from "node:crypto";
import {
  AGS_BASE_COMMIT,
  APPARATUS_VERSION,
  BENCHMARK_VERSION,
  MASTER_SEED,
  type Condition,
  type ConditionResultRecord,
  type ExecutionEventRecord,
  type F7DiagnosticManifestRecord,
  type F7DiagnosticRecord,
  type FailureCode,
  type FailureRecord,
  type ManifestMetadataRecord,
  type ProvenanceRecord,
  type RunMetadataRecord,
  type ScenarioFamily,
  type ScenarioManifestRecord,
  type ScenarioSubtype
} from "./types.js";

const HASH_RE = /^sha256:[0-9a-f]{64}$/;
const COMMIT_RE = /^[0-9a-f]{40}$/;
const SCENARIO_ID_RE = /^AGS001-(F1|F2|F3|F4|F5|F6|F8)-[0-9]{4}$/;
const F1_SCENARIO_ID_RE = /^AGS001-F1-[0-9]{4}$/;
const DIAGNOSTIC_ID_RE = /^AGS001-F7D-[0-9]{4}$/;

const SCENARIO_FAMILIES = new Set<ScenarioFamily>(["F1", "F2", "F3", "F4", "F5", "F6", "F8"]);
const SCENARIO_SUBTYPES = new Set<ScenarioSubtype>(["A", "B", "C", "D", "E"]);
const CONDITIONS = new Set<Condition>(["FULL_AGS", "LOCAL_GATE", "DIRECT_EXECUTION"]);
const ORACLE_DECISIONS = new Set(["PERMIT", "DENY"]);
const OBSERVED_EXECUTIONS = new Set(["EXECUTED", "DENIED", "FAILED_BEFORE_EXECUTION"]);
const RUN_STATUSES = new Set(["COMPLETE", "ABORTED", "INCOMPLETE"]);
const FAILURE_SCOPES = new Set(["RUN", "CONDITION", "F7_DIAGNOSTIC", "EXECUTION_EVENT", "MANIFEST", "PROVENANCE", "OUTPUT"]);
const FAILURE_CODES = new Set<FailureCode>([
  "SCHEMA_VALIDATION_FAILURE",
  "SCENARIO_HASH_MISMATCH",
  "PAIRING_MISMATCH",
  "ACTION_HASH_MISMATCH",
  "DUPLICATE_SCENARIO_ID",
  "DUPLICATE_CONDITION_RESULT",
  "DUPLICATE_EXECUTION_EVENT",
  "MISSING_REQUIRED_RESULT",
  "UNEXPECTED_RESULT",
  "SIDE_EFFECT_ADAPTER_FAILURE",
  "CONDITION_ADAPTER_EXCEPTION",
  "AGS_ADAPTER_EXCEPTION",
  "LOCAL_GATE_ADAPTER_EXCEPTION",
  "DIRECT_EXECUTION_ADAPTER_EXCEPTION",
  "F7_DIAGNOSTIC_EXCEPTION",
  "SERIALIZATION_FAILURE",
  "OUTPUT_WRITE_FAILURE",
  "OUTPUT_OVERWRITE_DETECTED",
  "PROVENANCE_MISMATCH",
  "SOURCE_HASH_MISMATCH",
  "MANIFEST_MISMATCH",
  "COUNT_MISMATCH",
  "NONDETERMINISTIC_REPLAY",
  "UNKNOWN_IMPLEMENTATION_FAILURE"
]);

export function canonicalSerialize(value: unknown): string {
  if (value instanceof Date) return JSON.stringify(value.toISOString());

  if (typeof value === "bigint") return JSON.stringify(value.toString());

  if (value === null) return "null";

  if (typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("Canonical serialization does not permit non-finite numbers.");
    }
    return JSON.stringify(value);
  }

  if (typeof value === "undefined") {
    return "null";
  }

  if (Array.isArray(value)) {
    return `[${Array.from(value, (item) => canonicalSerialize(item === undefined ? null : item)).join(",")}]`;
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const entries = Object.keys(record)
      .sort()
      .filter((key) => record[key] !== undefined)
      .map((key) => `${JSON.stringify(key)}:${canonicalSerialize(record[key])}`);
    return `{${entries.join(",")}}`;
  }

  throw new Error(`Unsupported canonical serialization type: ${typeof value}`);
}

export function sha256Bytes(value: string | Uint8Array): string {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

export function sha256Canonical(value: unknown): string {
  return sha256Bytes(canonicalSerialize(value));
}

export function hashRecordOmitting(record: Record<string, unknown>, omittedKey: string): string {
  const copy: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    if (key !== omittedKey) copy[key] = value;
  }
  return sha256Canonical(copy);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertRecord(value: unknown, label: string): asserts value is Record<string, unknown> {
  if (!isRecord(value)) throw new Error(`${label} must be an object.`);
}

function assertExactKeys(record: Record<string, unknown>, expected: readonly string[], label: string): void {
  const actual = Object.keys(record).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    throw new Error(`${label} has unexpected or missing fields. Expected [${wanted.join(", ")}], received [${actual.join(", ")}].`);
  }
}

function assertString(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string") throw new Error(`${label} must be a string.`);
}

function assertNonEmptyString(value: unknown, label: string): asserts value is string {
  assertString(value, label);
  if (value.length === 0) throw new Error(`${label} must be non-empty.`);
}

function assertBoolean(value: unknown, label: string): asserts value is boolean {
  if (typeof value !== "boolean") throw new Error(`${label} must be a boolean.`);
}

function assertInteger(value: unknown, label: string, min?: number, max?: number): asserts value is number {
  if (!Number.isInteger(value)) throw new Error(`${label} must be an integer.`);
  const n = value as number;
  if (min !== undefined && n < min) throw new Error(`${label} must be >= ${min}.`);
  if (max !== undefined && n > max) throw new Error(`${label} must be <= ${max}.`);
}

function assertUnsigned32(value: unknown, label: string): asserts value is number {
  assertInteger(value, label, 0, 0xffffffff);
}

function assertNullableString(value: unknown, label: string): void {
  if (value !== null) assertString(value, label);
}

function assertNullableInteger(value: unknown, label: string): void {
  if (value !== null) assertInteger(value, label);
}

function assertHash(value: unknown, label: string): asserts value is string {
  assertString(value, label);
  if (!HASH_RE.test(value)) throw new Error(`${label} must match ${HASH_RE}.`);
}

function assertCommit(value: unknown, label: string): asserts value is string {
  assertString(value, label);
  if (!COMMIT_RE.test(value)) throw new Error(`${label} must be a 40-character lowercase hexadecimal Git commit.`);
}

function assertIsoUtc(value: unknown, label: string): asserts value is string {
  assertString(value, label);
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed) || !value.endsWith("Z")) throw new Error(`${label} must be an ISO-8601 UTC timestamp.`);
}

function assertVersionFields(record: Record<string, unknown>, label: string): void {
  if (record.benchmark_version !== BENCHMARK_VERSION) throw new Error(`${label}.benchmark_version is invalid.`);
  if (record.apparatus_version !== APPARATUS_VERSION) throw new Error(`${label}.apparatus_version is invalid.`);
}

function assertScenarioFamily(value: unknown, label: string): asserts value is ScenarioFamily {
  if (typeof value !== "string" || !SCENARIO_FAMILIES.has(value as ScenarioFamily)) {
    throw new Error(`${label} is not a frozen scenario family.`);
  }
}

function assertScenarioSubtype(value: unknown, label: string): asserts value is ScenarioSubtype {
  if (typeof value !== "string" || !SCENARIO_SUBTYPES.has(value as ScenarioSubtype)) {
    throw new Error(`${label} is not a frozen scenario subtype.`);
  }
}

function assertCondition(value: unknown, label: string): asserts value is Condition {
  if (typeof value !== "string" || !CONDITIONS.has(value as Condition)) throw new Error(`${label} is not a frozen condition.`);
}

function assertFailureCode(value: unknown, label: string): asserts value is FailureCode {
  if (typeof value !== "string" || !FAILURE_CODES.has(value as FailureCode)) throw new Error(`${label} is not a frozen failure code.`);
}

function assertScenarioIdentity(record: Record<string, unknown>, label: string): void {
  assertString(record.scenario_id, `${label}.scenario_id`);
  if (!SCENARIO_ID_RE.test(record.scenario_id)) throw new Error(`${label}.scenario_id has invalid format.`);
  assertScenarioFamily(record.scenario_family, `${label}.scenario_family`);
  assertInteger(record.scenario_index, `${label}.scenario_index`, 1, 500);
  const expected = `AGS001-${record.scenario_family}-${String(record.scenario_index).padStart(4, "0")}`;
  if (record.scenario_id !== expected) throw new Error(`${label}.scenario_id does not match family/index.`);
}

export function validateScenarioManifestRecord(value: unknown): asserts value is ScenarioManifestRecord {
  assertRecord(value, "scenario manifest record");
  assertExactKeys(value, [
    "benchmark_version","apparatus_version","scenario_id","scenario_family","scenario_index","scenario_subtype",
    "derived_seed","oracle_decision","primary_invariant_family","canonical_action","originating_authority",
    "delegation_state","context_state","evidence_state","temporal_state","perturbation_type","perturbation_target",
    "perturbation_before","perturbation_after","expected_first_invariant_divergence","expected_divergence_transition",
    "paired_condition_identity","scenario_hash"
  ], "scenario manifest record");
  assertVersionFields(value, "scenario manifest record");
  assertScenarioIdentity(value, "scenario manifest record");
  assertScenarioSubtype(value.scenario_subtype, "scenario manifest record.scenario_subtype");
  assertUnsigned32(value.derived_seed, "scenario manifest record.derived_seed");
  if (!ORACLE_DECISIONS.has(value.oracle_decision as string)) throw new Error("scenario manifest record.oracle_decision is invalid.");
  assertNonEmptyString(value.primary_invariant_family, "scenario manifest record.primary_invariant_family");
  assertRecord(value.canonical_action, "scenario manifest record.canonical_action");
  if (value.originating_authority !== null) assertRecord(value.originating_authority, "scenario manifest record.originating_authority");
  if (value.delegation_state !== null) assertRecord(value.delegation_state, "scenario manifest record.delegation_state");
  if (value.context_state !== null) assertRecord(value.context_state, "scenario manifest record.context_state");
  if (value.evidence_state !== null) assertRecord(value.evidence_state, "scenario manifest record.evidence_state");
  assertRecord(value.temporal_state, "scenario manifest record.temporal_state");
  assertNonEmptyString(value.perturbation_type, "scenario manifest record.perturbation_type");
  assertNullableString(value.perturbation_target, "scenario manifest record.perturbation_target");
  assertNullableString(value.expected_first_invariant_divergence, "scenario manifest record.expected_first_invariant_divergence");
  assertNullableInteger(value.expected_divergence_transition, "scenario manifest record.expected_divergence_transition");
  assertNonEmptyString(value.paired_condition_identity, "scenario manifest record.paired_condition_identity");
  assertHash(value.scenario_hash, "scenario manifest record.scenario_hash");
  const expectedHash = hashRecordOmitting(value, "scenario_hash");
  if (value.scenario_hash !== expectedHash) throw new Error("scenario manifest record.scenario_hash mismatch.");
}

export function validateConditionResultRecord(value: unknown): asserts value is ConditionResultRecord {
  assertRecord(value, "condition result record");
  assertExactKeys(value, [
    "benchmark_version","apparatus_version","ags_base_commit","benchmark_commit","master_seed","scenario_id",
    "scenario_family","scenario_index","derived_seed","condition","oracle_decision","primary_invariant_family",
    "perturbation_type","first_invariant_divergence","divergence_transition_index","governance_final_decision",
    "governance_reason","observed_execution","unauthorized_execution","false_block","silent_violation",
    "denial_detected_before_execution","execution_reachable_after_divergence","runtime_permit_created",
    "runtime_binding_result","implementation_failure_code","scenario_hash","result_row_hash"
  ], "condition result record");
  assertVersionFields(value, "condition result record");
  if (value.ags_base_commit !== AGS_BASE_COMMIT) throw new Error("condition result record.ags_base_commit is invalid.");
  assertCommit(value.benchmark_commit, "condition result record.benchmark_commit");
  if (value.master_seed !== MASTER_SEED) throw new Error("condition result record.master_seed is invalid.");
  assertScenarioIdentity(value, "condition result record");
  assertUnsigned32(value.derived_seed, "condition result record.derived_seed");
  assertCondition(value.condition, "condition result record.condition");
  if (!ORACLE_DECISIONS.has(value.oracle_decision as string)) throw new Error("condition result record.oracle_decision is invalid.");
  assertNonEmptyString(value.primary_invariant_family, "condition result record.primary_invariant_family");
  assertNonEmptyString(value.perturbation_type, "condition result record.perturbation_type");
  assertNullableString(value.first_invariant_divergence, "condition result record.first_invariant_divergence");
  assertNullableInteger(value.divergence_transition_index, "condition result record.divergence_transition_index");
  assertNullableString(value.governance_final_decision, "condition result record.governance_final_decision");
  assertNullableString(value.governance_reason, "condition result record.governance_reason");
  if (!OBSERVED_EXECUTIONS.has(value.observed_execution as string)) throw new Error("condition result record.observed_execution is invalid.");
  assertBoolean(value.unauthorized_execution, "condition result record.unauthorized_execution");
  assertBoolean(value.false_block, "condition result record.false_block");
  assertBoolean(value.silent_violation, "condition result record.silent_violation");
  assertBoolean(value.denial_detected_before_execution, "condition result record.denial_detected_before_execution");
  if (value.execution_reachable_after_divergence !== null) assertBoolean(value.execution_reachable_after_divergence, "condition result record.execution_reachable_after_divergence");
  if (value.runtime_permit_created !== null) assertBoolean(value.runtime_permit_created, "condition result record.runtime_permit_created");
  assertNullableString(value.runtime_binding_result, "condition result record.runtime_binding_result");
  if (value.implementation_failure_code !== null) assertFailureCode(value.implementation_failure_code, "condition result record.implementation_failure_code");
  assertHash(value.scenario_hash, "condition result record.scenario_hash");
  assertHash(value.result_row_hash, "condition result record.result_row_hash");
  if (value.condition === "DIRECT_EXECUTION") {
    for (const key of ["governance_final_decision","governance_reason","runtime_permit_created","runtime_binding_result"] as const) {
      if (value[key] !== null) throw new Error(`DIRECT_EXECUTION requires ${key}=null.`);
    }
    if (value.observed_execution === "DENIED") throw new Error("DIRECT_EXECUTION may not produce DENIED.");
  }
  if (value.condition === "LOCAL_GATE" && (value.runtime_permit_created !== null || value.runtime_binding_result !== null)) {
    throw new Error("Local Gate has no permit or runtime binding.");
  }
  if (value.runtime_binding_result !== null && !["execution_allowed", "execution_denied"].includes(value.runtime_binding_result as string)) {
    throw new Error("Invalid production runtime-binding decision.");
  }
  const failed = value.implementation_failure_code !== null;
  if (failed !== (value.observed_execution === "FAILED_BEFORE_EXECUTION")) throw new Error("Failure code/outcome mismatch.");
  const unauthorized = !failed && value.oracle_decision === "DENY" && value.observed_execution === "EXECUTED";
  const falseBlock = !failed && value.oracle_decision === "PERMIT" && value.observed_execution === "DENIED";
  const silent = unauthorized && value.condition === "FULL_AGS" && value.first_invariant_divergence !== null && !value.denial_detected_before_execution;
  if (value.unauthorized_execution !== unauthorized || value.false_block !== falseBlock || value.silent_violation !== silent) {
    throw new Error("Endpoint classification inconsistent with valid outcome.");
  }
  if (value.first_invariant_divergence === null) {
    if (value.denial_detected_before_execution !== false || value.execution_reachable_after_divergence !== null) throw new Error("No-divergence behavior mismatch.");
  } else if (!failed) {
    const blocked = value.observed_execution === "DENIED";
    if (value.denial_detected_before_execution !== blocked || value.execution_reachable_after_divergence !== !blocked) throw new Error("Divergence behavior mismatch.");
  } else if (value.denial_detected_before_execution || value.execution_reachable_after_divergence === false) {
    throw new Error("Implementation failure is not a valid blocking outcome.");
  }
  const expectedHash = hashRecordOmitting(value, "result_row_hash");
  if (value.result_row_hash !== expectedHash) throw new Error("condition result record.result_row_hash mismatch.");
}

export function validateF7DiagnosticManifestRecord(value: unknown): asserts value is F7DiagnosticManifestRecord {
  assertRecord(value, "F7 diagnostic manifest record");
  assertExactKeys(value, [
    "benchmark_version","apparatus_version","diagnostic_id","diagnostic_index","originating_scenario_id",
    "originating_scenario_hash","substituted_artifact_scenario_id","substituted_artifact_scenario_hash",
    "substitution_kind","diagnostic_plan_hash"
  ], "F7 diagnostic manifest record");
  assertVersionFields(value, "F7 diagnostic manifest record");
  assertString(value.diagnostic_id, "F7 diagnostic manifest record.diagnostic_id");
  if (!DIAGNOSTIC_ID_RE.test(value.diagnostic_id)) throw new Error("F7 diagnostic manifest record.diagnostic_id is invalid.");
  assertInteger(value.diagnostic_index, "F7 diagnostic manifest record.diagnostic_index", 1, 500);
  assertString(value.originating_scenario_id, "F7 diagnostic manifest record.originating_scenario_id");
  assertString(value.substituted_artifact_scenario_id, "F7 diagnostic manifest record.substituted_artifact_scenario_id");
  if (!F1_SCENARIO_ID_RE.test(value.originating_scenario_id) || !F1_SCENARIO_ID_RE.test(value.substituted_artifact_scenario_id)) {
    throw new Error("F7 diagnostic manifest scenario IDs must identify F1 scenarios.");
  }
  if (value.originating_scenario_id === value.substituted_artifact_scenario_id) {
    throw new Error("F7 diagnostic manifest origin and substitution scenarios must differ.");
  }
  assertHash(value.originating_scenario_hash, "F7 diagnostic manifest record.originating_scenario_hash");
  assertHash(value.substituted_artifact_scenario_hash, "F7 diagnostic manifest record.substituted_artifact_scenario_hash");
  if (value.substitution_kind !== "PARTNER_AGENCY_FINGERPRINT") throw new Error("F7 diagnostic manifest substitution_kind is invalid.");
  assertHash(value.diagnostic_plan_hash, "F7 diagnostic manifest record.diagnostic_plan_hash");
  const expectedHash = hashRecordOmitting(value, "diagnostic_plan_hash");
  if (value.diagnostic_plan_hash !== expectedHash) throw new Error("F7 diagnostic manifest diagnostic_plan_hash mismatch.");
}

export function validateF7DiagnosticRecord(value: unknown): asserts value is F7DiagnosticRecord {
  assertRecord(value, "F7 diagnostic record");
  assertExactKeys(value, [
    "benchmark_version","apparatus_version","ags_base_commit","benchmark_commit","master_seed","diagnostic_id",
    "diagnostic_plan_hash","originating_scenario_id","substituted_artifact_scenario_id","receipt_individually_valid",
    "fingerprint_individually_valid","receipt_references_supplied_fingerprint",
    "fingerprint_governance_bindings_match_originating_run","native_ags_mismatch_detected","detection_mechanism",
    "diagnostic_record_hash"
  ], "F7 diagnostic record");
  assertVersionFields(value, "F7 diagnostic record");
  if (value.ags_base_commit !== AGS_BASE_COMMIT) throw new Error("F7 diagnostic record.ags_base_commit is invalid.");
  assertCommit(value.benchmark_commit, "F7 diagnostic record.benchmark_commit");
  if (value.master_seed !== MASTER_SEED) throw new Error("F7 diagnostic record.master_seed is invalid.");
  assertString(value.diagnostic_id, "F7 diagnostic record.diagnostic_id");
  if (!DIAGNOSTIC_ID_RE.test(value.diagnostic_id)) throw new Error("F7 diagnostic record.diagnostic_id is invalid.");
  assertHash(value.diagnostic_plan_hash, "F7 diagnostic record.diagnostic_plan_hash");
  assertNonEmptyString(value.originating_scenario_id, "F7 diagnostic record.originating_scenario_id");
  assertNonEmptyString(value.substituted_artifact_scenario_id, "F7 diagnostic record.substituted_artifact_scenario_id");
  assertBoolean(value.receipt_individually_valid, "F7 diagnostic record.receipt_individually_valid");
  assertBoolean(value.fingerprint_individually_valid, "F7 diagnostic record.fingerprint_individually_valid");
  assertBoolean(value.receipt_references_supplied_fingerprint, "F7 diagnostic record.receipt_references_supplied_fingerprint");
  assertBoolean(value.fingerprint_governance_bindings_match_originating_run, "F7 diagnostic record.fingerprint_governance_bindings_match_originating_run");
  assertBoolean(value.native_ags_mismatch_detected, "F7 diagnostic record.native_ags_mismatch_detected");
  assertNullableString(value.detection_mechanism, "F7 diagnostic record.detection_mechanism");
  assertHash(value.diagnostic_record_hash, "F7 diagnostic record.diagnostic_record_hash");
  const expectedHash = hashRecordOmitting(value, "diagnostic_record_hash");
  if (value.diagnostic_record_hash !== expectedHash) throw new Error("F7 diagnostic record.diagnostic_record_hash mismatch.");
}

export function validateExecutionEventRecord(value: unknown): asserts value is ExecutionEventRecord {
  assertRecord(value, "execution event record");
  assertExactKeys(value, ["scenario_id","condition","action_hash","execution_attempted_at","event_key","event_hash"], "execution event record");
  assertNonEmptyString(value.scenario_id, "execution event record.scenario_id");
  assertCondition(value.condition, "execution event record.condition");
  assertHash(value.action_hash, "execution event record.action_hash");
  assertIsoUtc(value.execution_attempted_at, "execution event record.execution_attempted_at");
  assertString(value.event_key, "execution event record.event_key");
  if (value.event_key !== `${value.scenario_id}|${value.condition}`) throw new Error("execution event record.event_key mismatch.");
  assertHash(value.event_hash, "execution event record.event_hash");
  const expectedHash = hashRecordOmitting(value, "event_hash");
  if (value.event_hash !== expectedHash) throw new Error("execution event record.event_hash mismatch.");
}

export function validateFailureRecord(value: unknown): asserts value is FailureRecord {
  assertRecord(value, "failure record");
  assertExactKeys(value, [
    "benchmark_version","apparatus_version","failure_sequence","failure_code","failure_scope",
    "scenario_id","condition","diagnostic_id","fatal","failure_record_hash"
  ], "failure record");
  assertVersionFields(value, "failure record");
  assertInteger(value.failure_sequence, "failure record.failure_sequence", 1);
  assertFailureCode(value.failure_code, "failure record.failure_code");
  if (typeof value.failure_scope !== "string" || !FAILURE_SCOPES.has(value.failure_scope)) throw new Error("failure record.failure_scope is invalid.");
  assertNullableString(value.scenario_id, "failure record.scenario_id");
  if (value.condition !== null) assertCondition(value.condition, "failure record.condition");
  assertNullableString(value.diagnostic_id, "failure record.diagnostic_id");
  if (typeof value.diagnostic_id === "string" && !DIAGNOSTIC_ID_RE.test(value.diagnostic_id)) throw new Error("failure record.diagnostic_id is invalid.");
  assertBoolean(value.fatal, "failure record.fatal");
  assertHash(value.failure_record_hash, "failure record.failure_record_hash");
  const expectedHash = hashRecordOmitting(value, "failure_record_hash");
  if (value.failure_record_hash !== expectedHash) throw new Error("failure record.failure_record_hash mismatch.");
}

export function validateManifestMetadataRecord(value: unknown): asserts value is ManifestMetadataRecord {
  assertRecord(value, "manifest metadata record");
  assertExactKeys(value, [
    "apparatus_version","benchmark_version","expected_f7_diagnostic_count","expected_scenario_count",
    "f7_diagnostic_manifest_file_hash","master_seed","scenario_manifest_file_hash","manifest_hash"
  ], "manifest metadata record");
  assertVersionFields(value, "manifest metadata record");
  if (value.expected_f7_diagnostic_count !== 500 || value.expected_scenario_count !== 3500 || value.master_seed !== MASTER_SEED) {
    throw new Error("manifest metadata record frozen counts/seed mismatch.");
  }
  assertHash(value.f7_diagnostic_manifest_file_hash, "manifest metadata record.f7_diagnostic_manifest_file_hash");
  assertHash(value.scenario_manifest_file_hash, "manifest metadata record.scenario_manifest_file_hash");
  assertHash(value.manifest_hash, "manifest metadata record.manifest_hash");
  const expectedHash = sha256Canonical({
    apparatus_version: APPARATUS_VERSION,
    benchmark_version: BENCHMARK_VERSION,
    expected_f7_diagnostic_count: 500,
    expected_scenario_count: 3500,
    f7_diagnostic_manifest_file_hash: value.f7_diagnostic_manifest_file_hash,
    master_seed: MASTER_SEED,
    scenario_manifest_file_hash: value.scenario_manifest_file_hash
  });
  if (value.manifest_hash !== expectedHash) throw new Error("manifest metadata record.manifest_hash mismatch.");
}

export function validateRunMetadataRecord(value: unknown): asserts value is RunMetadataRecord {
  assertRecord(value, "run metadata record");
  assertExactKeys(value, [
    "benchmark_version","apparatus_version","ags_base_commit","benchmark_commit","master_seed","manifest_hash",
    "generator_source_hash","oracle_source_hash","full_ags_adapter_source_hash","local_gate_source_hash",
    "direct_execution_source_hash","side_effect_adapter_source_hash","statistics_source_hash","schema_source_hash",
    "expected_scenario_count","expected_condition_result_count","expected_f7_diagnostic_count","observed_scenario_count",
    "observed_condition_result_count","observed_f7_diagnostic_count","execution_event_count","status","failure_code",
    "started_at","completed_at","metadata_hash"
  ], "run metadata record");
  assertVersionFields(value, "run metadata record");
  if (value.ags_base_commit !== AGS_BASE_COMMIT) throw new Error("run metadata record.ags_base_commit is invalid.");
  assertCommit(value.benchmark_commit, "run metadata record.benchmark_commit");
  if (value.master_seed !== MASTER_SEED) throw new Error("run metadata record.master_seed is invalid.");
  for (const key of [
    "manifest_hash","generator_source_hash","oracle_source_hash","full_ags_adapter_source_hash","local_gate_source_hash",
    "direct_execution_source_hash","side_effect_adapter_source_hash","statistics_source_hash","schema_source_hash","metadata_hash"
  ] as const) assertHash(value[key], `run metadata record.${key}`);
  if (value.expected_scenario_count !== 3500 || value.expected_condition_result_count !== 10500 || value.expected_f7_diagnostic_count !== 500) {
    throw new Error("run metadata record frozen expected counts mismatch.");
  }
  assertInteger(value.observed_scenario_count, "run metadata record.observed_scenario_count", 0);
  assertInteger(value.observed_condition_result_count, "run metadata record.observed_condition_result_count", 0);
  assertInteger(value.observed_f7_diagnostic_count, "run metadata record.observed_f7_diagnostic_count", 0);
  assertInteger(value.execution_event_count, "run metadata record.execution_event_count", 0);
  if (typeof value.status !== "string" || !RUN_STATUSES.has(value.status)) throw new Error("run metadata record.status is invalid.");
  if (value.failure_code !== null) assertFailureCode(value.failure_code, "run metadata record.failure_code");
  if (value.status === "COMPLETE" && value.failure_code !== null) throw new Error("COMPLETE run metadata requires failure_code=null.");
  assertIsoUtc(value.started_at, "run metadata record.started_at");
  assertIsoUtc(value.completed_at, "run metadata record.completed_at");
  const expectedHash = hashRecordOmitting(value, "metadata_hash");
  if (value.metadata_hash !== expectedHash) throw new Error("run metadata record.metadata_hash mismatch.");
}

export function validateProvenanceRecord(value: unknown): asserts value is ProvenanceRecord {
  assertRecord(value, "provenance record");
  assertExactKeys(value, [
    "benchmark_version","apparatus_version","ags_base_commit","benchmark_commit","preregistration_file_hash",
    "amendment_001_file_hash","amendment_002_file_hash","amendment_003_file_hash","amendment_004_file_hash","amendment_005_file_hash","amendment_006_file_hash","amendment_007_file_hash","apparatus_file_hash","master_seed",
    "scenario_manifest_file_hash","f7_diagnostic_manifest_file_hash","manifest_metadata_file_hash","manifest_hash",
    "generator_source_hash","oracle_source_hash","full_ags_adapter_source_hash","local_gate_source_hash",
    "direct_execution_source_hash","side_effect_adapter_source_hash","statistics_source_hash","schema_source_hash",
    "ags_configuration","comparator_configuration","episode_count","condition_run_count","f7_diagnostic_count",
    "execution_event_count","failure_record_count","exact_raw_jsonl_row_count","completion_status",
    "raw_artifact_hashes","provenance_hash"
  ], "provenance record");
  assertVersionFields(value, "provenance record");
  if (value.ags_base_commit !== AGS_BASE_COMMIT) throw new Error("provenance record.ags_base_commit is invalid.");
  assertCommit(value.benchmark_commit, "provenance record.benchmark_commit");
  if (value.master_seed !== MASTER_SEED || value.episode_count !== 3500) throw new Error("provenance record frozen seed/count mismatch.");
  for (const key of [
    "preregistration_file_hash","amendment_001_file_hash","amendment_002_file_hash","amendment_003_file_hash","amendment_004_file_hash","amendment_005_file_hash","amendment_006_file_hash","amendment_007_file_hash","apparatus_file_hash",
    "scenario_manifest_file_hash","f7_diagnostic_manifest_file_hash","manifest_metadata_file_hash","manifest_hash",
    "generator_source_hash","oracle_source_hash","full_ags_adapter_source_hash","local_gate_source_hash",
    "direct_execution_source_hash","side_effect_adapter_source_hash","statistics_source_hash","schema_source_hash","provenance_hash"
  ] as const) assertHash(value[key], `provenance record.${key}`);
  assertRecord(value.ags_configuration, "provenance record.ags_configuration");
  assertExactKeys(value.ags_configuration, [
    "condition","workspace_package","runtime_entrypoint","ags_base_commit","production_runtime_required",
    "benchmark_reimplementation_allowed","shared_side_effect_adapter"
  ], "provenance record.ags_configuration");
  if (
    value.ags_configuration.condition !== "FULL_AGS" ||
    value.ags_configuration.workspace_package !== "@alignment-governance-stack/governance-core" ||
    value.ags_configuration.runtime_entrypoint !== "evaluateGovernedRuntimeActionWithReceipt" ||
    value.ags_configuration.ags_base_commit !== AGS_BASE_COMMIT ||
    value.ags_configuration.production_runtime_required !== true ||
    value.ags_configuration.benchmark_reimplementation_allowed !== false ||
    value.ags_configuration.shared_side_effect_adapter !== "SECTION_27_1"
  ) throw new Error("provenance record.ags_configuration mismatch.");

  assertRecord(value.comparator_configuration, "provenance record.comparator_configuration");
  assertExactKeys(value.comparator_configuration, [
    "local_gate_condition","local_gate_specification","local_gate_uses_ags_decision_logic",
    "direct_execution_condition","direct_execution_specification","direct_execution_governance_logic",
    "shared_side_effect_adapter","condition_order"
  ], "provenance record.comparator_configuration");
  const c = value.comparator_configuration;
  if (
    c.local_gate_condition !== "LOCAL_GATE" ||
    c.local_gate_specification !== "SECTION_20_1" ||
    c.local_gate_uses_ags_decision_logic !== false ||
    c.direct_execution_condition !== "DIRECT_EXECUTION" ||
    c.direct_execution_specification !== "SECTION_21_1" ||
    c.direct_execution_governance_logic !== false ||
    c.shared_side_effect_adapter !== "SECTION_27_1" ||
    !Array.isArray(c.condition_order) ||
    c.condition_order.length !== 3 ||
    c.condition_order[0] !== "FULL_AGS" ||
    c.condition_order[1] !== "LOCAL_GATE" ||
    c.condition_order[2] !== "DIRECT_EXECUTION"
  ) throw new Error("provenance record.comparator_configuration mismatch.");

  for (const key of ["condition_run_count","f7_diagnostic_count","execution_event_count","failure_record_count","exact_raw_jsonl_row_count"] as const) {
    assertInteger(value[key], `provenance record.${key}`, 0);
  }
  if (typeof value.completion_status !== "string" || !RUN_STATUSES.has(value.completion_status)) throw new Error("provenance record.completion_status is invalid.");
  assertRecord(value.raw_artifact_hashes, "provenance record.raw_artifact_hashes");
  assertExactKeys(value.raw_artifact_hashes, [
    "condition_results_file_hash","f7_diagnostics_file_hash","execution_events_file_hash","run_metadata_file_hash","failures_file_hash"
  ], "provenance record.raw_artifact_hashes");
  for (const [key, hash] of Object.entries(value.raw_artifact_hashes)) assertHash(hash, `provenance record.raw_artifact_hashes.${key}`);
  const expectedHash = hashRecordOmitting(value, "provenance_hash");
  if (value.provenance_hash !== expectedHash) throw new Error("provenance record.provenance_hash mismatch.");
}

export interface CrossFileIdentityInput {
  scenarios: readonly ScenarioManifestRecord[];
  conditionResults?: readonly ConditionResultRecord[];
  f7Plans?: readonly F7DiagnosticManifestRecord[];
  f7Results?: readonly F7DiagnosticRecord[];
  failures?: readonly FailureRecord[];
  executionEvents?: readonly ExecutionEventRecord[];
}

export function validateCrossFileIdentities(input: CrossFileIdentityInput): void {
  const scenarios = new Map<string, ScenarioManifestRecord>();
  for (const scenario of input.scenarios) {
    validateScenarioManifestRecord(scenario);
    if (scenarios.has(scenario.scenario_id)) throw new Error(`Duplicate scenario identity: ${scenario.scenario_id}`);
    scenarios.set(scenario.scenario_id, scenario);
  }

  const resultKeys = new Set<string>();
  for (const row of input.conditionResults ?? []) {
    validateConditionResultRecord(row);
    const scenario = scenarios.get(row.scenario_id);
    if (!scenario) throw new Error(`Condition result references unknown scenario: ${row.scenario_id}`);
    if (
      row.scenario_hash !== scenario.scenario_hash ||
      row.scenario_family !== scenario.scenario_family ||
      row.scenario_index !== scenario.scenario_index ||
      row.derived_seed !== scenario.derived_seed ||
      row.oracle_decision !== scenario.oracle_decision ||
      row.primary_invariant_family !== scenario.primary_invariant_family ||
      row.perturbation_type !== scenario.perturbation_type
      || row.first_invariant_divergence !== scenario.expected_first_invariant_divergence
      || row.divergence_transition_index !== scenario.expected_divergence_transition
    ) throw new Error(`Condition result pairing mismatch: ${row.scenario_id}|${row.condition}`);
    const key = `${row.scenario_id}|${row.condition}`;
    if (resultKeys.has(key)) throw new Error(`Duplicate condition result identity: ${key}`);
    resultKeys.add(key);
  }

  const plans = new Map<string, F7DiagnosticManifestRecord>();
  for (const plan of input.f7Plans ?? []) {
    validateF7DiagnosticManifestRecord(plan);
    if (plans.has(plan.diagnostic_id)) throw new Error(`Duplicate F7 diagnostic plan identity: ${plan.diagnostic_id}`);
    const origin = scenarios.get(plan.originating_scenario_id);
    const partner = scenarios.get(plan.substituted_artifact_scenario_id);
    if (!origin || !partner) throw new Error(`F7 diagnostic plan references unknown scenario: ${plan.diagnostic_id}`);
    if (origin.scenario_hash !== plan.originating_scenario_hash || partner.scenario_hash !== plan.substituted_artifact_scenario_hash) {
      throw new Error(`F7 diagnostic plan scenario hash mismatch: ${plan.diagnostic_id}`);
    }
    plans.set(plan.diagnostic_id, plan);
  }

  const diagnosticIds = new Set<string>();
  for (const row of input.f7Results ?? []) {
    validateF7DiagnosticRecord(row);
    if (diagnosticIds.has(row.diagnostic_id)) throw new Error(`Duplicate F7 diagnostic result identity: ${row.diagnostic_id}`);
    const plan = plans.get(row.diagnostic_id);
    if (!plan) throw new Error(`F7 diagnostic result references unknown plan: ${row.diagnostic_id}`);
    if (
      row.diagnostic_plan_hash !== plan.diagnostic_plan_hash ||
      row.originating_scenario_id !== plan.originating_scenario_id ||
      row.substituted_artifact_scenario_id !== plan.substituted_artifact_scenario_id
    ) throw new Error(`F7 diagnostic result pairing mismatch: ${row.diagnostic_id}`);
    diagnosticIds.add(row.diagnostic_id);
  }

  const eventKeys = new Set<string>();
  for (const event of input.executionEvents ?? []) {
    validateExecutionEventRecord(event);
    if (!scenarios.has(event.scenario_id)) throw new Error(`Execution event references unknown scenario: ${event.event_key}`);
    if (eventKeys.has(event.event_key)) throw new Error(`Duplicate execution event identity: ${event.event_key}`);
    eventKeys.add(event.event_key);
  }

  let expectedFailureSequence = 1;
  for (const failure of input.failures ?? []) {
    validateFailureRecord(failure);
    if (failure.failure_sequence !== expectedFailureSequence) {
      throw new Error(`Failure sequence mismatch at ${failure.failure_sequence}; expected ${expectedFailureSequence}.`);
    }
    expectedFailureSequence += 1;
  }
}
