export const BENCHMARK_VERSION = "AGS-EVALUATION-001" as const;
export const APPARATUS_VERSION = "AGS-EVALUATION-001-APPARATUS-001" as const;
export const AGS_BASE_COMMIT = "7d7c3ba95a58a83c6c29d922d92dd97ac5b1c595" as const;
export const MASTER_SEED = 1299507477 as const;

export type BenchmarkVersion = typeof BENCHMARK_VERSION;
export type ApparatusVersion = typeof APPARATUS_VERSION;

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };

export type ScenarioFamily = "F1" | "F2" | "F3" | "F4" | "F5" | "F6" | "F8";
export type ScenarioSubtype = "A" | "B" | "C" | "D" | "E";
export type OracleDecision = "PERMIT" | "DENY";

export interface OracleAssessment {
  decision: OracleDecision;
  primary_invariant_family: string;
  first_invariant_divergence: string | null;
  divergence_transition_index: number | null;
}
export type Condition = "FULL_AGS" | "LOCAL_GATE" | "DIRECT_EXECUTION";
export type ObservedExecution = "EXECUTED" | "DENIED" | "FAILED_BEFORE_EXECUTION";
export type RunStatus = "COMPLETE" | "ABORTED" | "INCOMPLETE";

export type FailureCode =
  | "SCHEMA_VALIDATION_FAILURE"
  | "SCENARIO_HASH_MISMATCH"
  | "PAIRING_MISMATCH"
  | "ACTION_HASH_MISMATCH"
  | "DUPLICATE_SCENARIO_ID"
  | "DUPLICATE_CONDITION_RESULT"
  | "DUPLICATE_EXECUTION_EVENT"
  | "MISSING_REQUIRED_RESULT"
  | "UNEXPECTED_RESULT"
  | "SIDE_EFFECT_ADAPTER_FAILURE"
  | "CONDITION_ADAPTER_EXCEPTION"
  | "AGS_ADAPTER_EXCEPTION"
  | "LOCAL_GATE_ADAPTER_EXCEPTION"
  | "DIRECT_EXECUTION_ADAPTER_EXCEPTION"
  | "F7_DIAGNOSTIC_EXCEPTION"
  | "SERIALIZATION_FAILURE"
  | "OUTPUT_WRITE_FAILURE"
  | "OUTPUT_OVERWRITE_DETECTED"
  | "PROVENANCE_MISMATCH"
  | "SOURCE_HASH_MISMATCH"
  | "MANIFEST_MISMATCH"
  | "COUNT_MISMATCH"
  | "NONDETERMINISTIC_REPLAY"
  | "UNKNOWN_IMPLEMENTATION_FAILURE";

export type FailureScope =
  | "RUN"
  | "CONDITION"
  | "F7_DIAGNOSTIC"
  | "EXECUTION_EVENT"
  | "MANIFEST"
  | "PROVENANCE"
  | "OUTPUT";

export interface CanonicalAction extends JsonObject {
  id: string;
  userRequest: string;
  tool: string;
  actionType: string;
  target: string;
  environment: string;
  reversible: boolean;
  externalFacing: boolean;
  dataSensitivity: string;
  requiresApproval: boolean;
  knownApproval: boolean;
  metadata: JsonObject;
}

export interface TemporalState extends JsonObject {
  final_evaluation_time: string;
}

export interface ScenarioManifestRecord {
  benchmark_version: BenchmarkVersion;
  apparatus_version: ApparatusVersion;
  scenario_id: string;
  scenario_family: ScenarioFamily;
  scenario_index: number;
  scenario_subtype: ScenarioSubtype;
  derived_seed: number;
  oracle_decision: OracleDecision;
  primary_invariant_family: string;
  canonical_action: CanonicalAction;
  originating_authority: JsonObject | null;
  delegation_state: JsonObject | null;
  context_state: JsonObject | null;
  evidence_state: JsonObject | null;
  temporal_state: TemporalState;
  perturbation_type: string;
  perturbation_target: string | null;
  perturbation_before: JsonValue | null;
  perturbation_after: JsonValue | null;
  expected_first_invariant_divergence: string | null;
  expected_divergence_transition: number | null;
  paired_condition_identity: string;
  scenario_hash: string;
}

export interface ConditionResultRecord {
  benchmark_version: BenchmarkVersion;
  apparatus_version: ApparatusVersion;
  ags_base_commit: string;
  benchmark_commit: string;
  master_seed: number;
  scenario_id: string;
  scenario_family: ScenarioFamily;
  scenario_index: number;
  derived_seed: number;
  condition: Condition;
  oracle_decision: OracleDecision;
  primary_invariant_family: string;
  perturbation_type: string;
  first_invariant_divergence: string | null;
  divergence_transition_index: number | null;
  governance_final_decision: string | null;
  governance_reason: string | null;
  observed_execution: ObservedExecution;
  unauthorized_execution: boolean;
  false_block: boolean;
  silent_violation: boolean;
  denial_detected_before_execution: boolean;
  execution_reachable_after_divergence: boolean | null;
  runtime_permit_created: boolean | null;
  runtime_binding_result: string | null;
  implementation_failure_code: FailureCode | null;
  scenario_hash: string;
  result_row_hash: string;
}

export interface F7DiagnosticManifestRecord {
  benchmark_version: BenchmarkVersion;
  apparatus_version: ApparatusVersion;
  diagnostic_id: string;
  diagnostic_index: number;
  originating_scenario_id: string;
  originating_scenario_hash: string;
  substituted_artifact_scenario_id: string;
  substituted_artifact_scenario_hash: string;
  substitution_kind: "PARTNER_AGENCY_FINGERPRINT";
  diagnostic_plan_hash: string;
}

export interface F7DiagnosticRecord {
  benchmark_version: BenchmarkVersion;
  apparatus_version: ApparatusVersion;
  ags_base_commit: string;
  benchmark_commit: string;
  master_seed: number;
  diagnostic_id: string;
  diagnostic_plan_hash: string;
  originating_scenario_id: string;
  substituted_artifact_scenario_id: string;
  receipt_individually_valid: boolean;
  fingerprint_individually_valid: boolean;
  receipt_references_supplied_fingerprint: boolean;
  fingerprint_governance_bindings_match_originating_run: boolean;
  native_ags_mismatch_detected: boolean;
  detection_mechanism: string | null;
  diagnostic_record_hash: string;
}

export interface ExecutionEventRecord {
  scenario_id: string;
  condition: Condition;
  action_hash: string;
  execution_attempted_at: string;
  event_key: string;
  event_hash: string;
}

export interface FailureRecord {
  benchmark_version: BenchmarkVersion;
  apparatus_version: ApparatusVersion;
  failure_sequence: number;
  failure_code: FailureCode;
  failure_scope: FailureScope;
  scenario_id: string | null;
  condition: Condition | null;
  diagnostic_id: string | null;
  fatal: boolean;
  failure_record_hash: string;
}

export interface RunMetadataRecord {
  benchmark_version: BenchmarkVersion;
  apparatus_version: ApparatusVersion;
  ags_base_commit: string;
  benchmark_commit: string;
  master_seed: number;
  manifest_hash: string;
  generator_source_hash: string;
  oracle_source_hash: string;
  full_ags_adapter_source_hash: string;
  local_gate_source_hash: string;
  direct_execution_source_hash: string;
  side_effect_adapter_source_hash: string;
  statistics_source_hash: string;
  schema_source_hash: string;
  expected_scenario_count: 3500;
  expected_condition_result_count: 10500;
  expected_f7_diagnostic_count: 500;
  observed_scenario_count: number;
  observed_condition_result_count: number;
  observed_f7_diagnostic_count: number;
  execution_event_count: number;
  status: RunStatus;
  failure_code: FailureCode | null;
  started_at: string;
  completed_at: string;
  metadata_hash: string;
}

export interface ManifestMetadataRecord {
  apparatus_version: ApparatusVersion;
  benchmark_version: BenchmarkVersion;
  expected_f7_diagnostic_count: 500;
  expected_scenario_count: 3500;
  f7_diagnostic_manifest_file_hash: string;
  master_seed: typeof MASTER_SEED;
  scenario_manifest_file_hash: string;
  manifest_hash: string;
}

export interface AgsConfiguration {
  condition: "FULL_AGS";
  workspace_package: "@alignment-governance-stack/governance-core";
  runtime_entrypoint: "evaluateGovernedRuntimeActionWithReceipt";
  ags_base_commit: typeof AGS_BASE_COMMIT;
  production_runtime_required: true;
  benchmark_reimplementation_allowed: false;
  shared_side_effect_adapter: "SECTION_27_1";
}

export interface ComparatorConfiguration {
  local_gate_condition: "LOCAL_GATE";
  local_gate_specification: "SECTION_20_1";
  local_gate_uses_ags_decision_logic: false;
  direct_execution_condition: "DIRECT_EXECUTION";
  direct_execution_specification: "SECTION_21_1";
  direct_execution_governance_logic: false;
  shared_side_effect_adapter: "SECTION_27_1";
  condition_order: ["FULL_AGS", "LOCAL_GATE", "DIRECT_EXECUTION"];
}

export interface RawArtifactHashes {
  condition_results_file_hash: string;
  f7_diagnostics_file_hash: string;
  execution_events_file_hash: string;
  run_metadata_file_hash: string;
  failures_file_hash: string;
}

export interface ProvenanceRecord {
  benchmark_version: BenchmarkVersion;
  apparatus_version: ApparatusVersion;
  ags_base_commit: typeof AGS_BASE_COMMIT;
  benchmark_commit: string;
  preregistration_file_hash: string;
  amendment_001_file_hash: string;
  amendment_002_file_hash: string;
  amendment_003_file_hash: string;
  amendment_004_file_hash: string;
  amendment_005_file_hash: string;
  amendment_006_file_hash: string;
  amendment_007_file_hash: string;
  apparatus_file_hash: string;
  master_seed: typeof MASTER_SEED;
  scenario_manifest_file_hash: string;
  f7_diagnostic_manifest_file_hash: string;
  manifest_metadata_file_hash: string;
  manifest_hash: string;
  generator_source_hash: string;
  oracle_source_hash: string;
  full_ags_adapter_source_hash: string;
  local_gate_source_hash: string;
  direct_execution_source_hash: string;
  side_effect_adapter_source_hash: string;
  statistics_source_hash: string;
  schema_source_hash: string;
  ags_configuration: AgsConfiguration;
  comparator_configuration: ComparatorConfiguration;
  episode_count: 3500;
  condition_run_count: number;
  f7_diagnostic_count: number;
  execution_event_count: number;
  failure_record_count: number;
  exact_raw_jsonl_row_count: number;
  completion_status: RunStatus;
  raw_artifact_hashes: RawArtifactHashes;
  provenance_hash: string;
}

export interface ScenarioDraws {
  d0: number;
  d1: number;
  d2: number;
  d3: number;
  d4: number;
  d5: number;
  d6: number;
  d7: number;
}

export interface ConditionAdapterOutcome {
  governance_final_decision: string | null;
  governance_reason: string | null;
  observed_execution: ObservedExecution;
  denial_detected_before_execution: boolean;
  execution_reachable_after_divergence: boolean | null;
  runtime_permit_created: boolean | null;
  runtime_binding_result: string | null;
  implementation_failure_code: FailureCode | null;
}

export interface FullAgsArtifacts {
  receipt: JsonObject | null;
  agency_fingerprint: JsonObject | null;
}

export interface FullAgsAdapterOutcome extends ConditionAdapterOutcome {
  artifacts: FullAgsArtifacts;
}
