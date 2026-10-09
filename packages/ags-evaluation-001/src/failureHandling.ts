import {
  hashRecordOmitting,
  validateFailureRecord
} from "./schemas.js";
import {
  APPARATUS_VERSION,
  BENCHMARK_VERSION,
  type Condition,
  type ConditionAdapterOutcome,
  type FailureCode,
  type FailureRecord,
  type FailureScope,
  type RunStatus
} from "./types.js";

const FATAL_FAILURE_CODES = new Set<FailureCode>([
  "SCHEMA_VALIDATION_FAILURE",
  "SCENARIO_HASH_MISMATCH",
  "PAIRING_MISMATCH",
  "ACTION_HASH_MISMATCH",
  "DUPLICATE_SCENARIO_ID",
  "DUPLICATE_CONDITION_RESULT",
  "DUPLICATE_EXECUTION_EVENT",
  "SERIALIZATION_FAILURE",
  "OUTPUT_WRITE_FAILURE",
  "OUTPUT_OVERWRITE_DETECTED",
  "PROVENANCE_MISMATCH",
  "SOURCE_HASH_MISMATCH",
  "MANIFEST_MISMATCH",
  "NONDETERMINISTIC_REPLAY"
]);

export interface CreateFailureRecordInput {
  failure_sequence: number;
  failure_code: FailureCode;
  failure_scope: FailureScope;
  scenario_id?: string | null;
  condition?: Condition | null;
  diagnostic_id?: string | null;
  fatal?: boolean;
}

export interface CompletionState {
  observed_scenario_count: number;
  observed_condition_result_count: number;
  observed_f7_diagnostic_count: number;
  failed_condition_result_count: number;
  non_null_implementation_failure_count: number;
  execution_reconciliation_complete: boolean;
  unreconciled_execution_event_count: number;
}

export function isFatalFailureCode(
  failureCode: FailureCode
): boolean {
  return FATAL_FAILURE_CODES.has(failureCode);
}

export function createFailureRecord(
  input: CreateFailureRecordInput
): FailureRecord {
  if (
    !Number.isInteger(input.failure_sequence) ||
    input.failure_sequence < 1
  ) {
    throw new Error(
      "failure_sequence must be an integer beginning at 1."
    );
  }

  const fatal =
    input.fatal ??
    isFatalFailureCode(input.failure_code);

  const recordWithoutHash = {
    benchmark_version: BENCHMARK_VERSION,
    apparatus_version: APPARATUS_VERSION,
    failure_sequence: input.failure_sequence,
    failure_code: input.failure_code,
    failure_scope: input.failure_scope,
    scenario_id: input.scenario_id ?? null,
    condition: input.condition ?? null,
    diagnostic_id: input.diagnostic_id ?? null,
    fatal
  };

  const record: FailureRecord = {
    ...recordWithoutHash,
    failure_record_hash:
      hashRecordOmitting(
        {
          ...recordWithoutHash,
          failure_record_hash: ""
        },
        "failure_record_hash"
      )
  };

  validateFailureRecord(record);

  return record;
}

export function createConditionFailureOutcome(
  failureCode: FailureCode
): ConditionAdapterOutcome {
  return {
    governance_final_decision: null,
    governance_reason: null,
    observed_execution: "FAILED_BEFORE_EXECUTION",
    denial_detected_before_execution: false,
    execution_reachable_after_divergence: null,
    runtime_permit_created: null,
    runtime_binding_result: null,
    implementation_failure_code: failureCode
  };
}

export function deriveRunStatus(
  failures: readonly FailureRecord[],
  completion: CompletionState
): RunStatus {
  if (failures.some((failure) => failure.fatal)) {
    return "ABORTED";
  }

  if (
    failures.length > 0 ||
    completion.observed_scenario_count !== 3500 ||
    completion.observed_condition_result_count !== 10500 ||
    completion.observed_f7_diagnostic_count !== 500 ||
    completion.failed_condition_result_count !== 0 ||
    completion.non_null_implementation_failure_count !== 0 ||
    !completion.execution_reconciliation_complete ||
    completion.unreconciled_execution_event_count !== 0
  ) {
    return "INCOMPLETE";
  }

  return "COMPLETE";
}

export function selectRunFailureCode(
  status: RunStatus,
  failures: readonly FailureRecord[]
): FailureCode | null {
  if (status === "COMPLETE") {
    return null;
  }

  const ordered =
    [...failures].sort(
      (a, b) =>
        a.failure_sequence - b.failure_sequence
    );

  const firstFatal =
    ordered.find((failure) => failure.fatal);

  return (
    firstFatal?.failure_code ??
    ordered[0]?.failure_code ??
    null
  );
}

export function assertEndpointAnalysisAllowed(
  status: RunStatus,
  completion: CompletionState
): void {
  if (status !== "COMPLETE") {
    throw new Error(
      "Scientific endpoint analysis prohibited: run status is not COMPLETE."
    );
  }

  if (
    completion.observed_scenario_count !== 3500 ||
    completion.observed_condition_result_count !== 10500 ||
    completion.observed_f7_diagnostic_count !== 500 ||
    completion.failed_condition_result_count !== 0 ||
    completion.non_null_implementation_failure_count !== 0 ||
    !completion.execution_reconciliation_complete ||
    completion.unreconciled_execution_event_count !== 0
  ) {
    throw new Error(
      "Scientific endpoint analysis prohibited: complete-run requirements are not satisfied."
    );
  }
}
