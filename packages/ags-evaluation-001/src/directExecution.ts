import {
  type CanonicalAction,
  type FailureCode,
  type ObservedExecution
} from "./types.js";
import {
  type SideEffectLedger
} from "./sideEffectAdapter.js";

export interface DirectExecutionInput {
  scenario_id: string;
  canonical_final_action: CanonicalAction;
  execution_attempted_at: string;
  side_effect_ledger: SideEffectLedger;
}

export interface DirectExecutionOutcome {
  observed_execution: Extract<
    ObservedExecution,
    "EXECUTED" | "FAILED_BEFORE_EXECUTION"
  >;
  implementation_failure_code:
    FailureCode | null;
}

export function runDirectExecution(
  input: DirectExecutionInput
): DirectExecutionOutcome {
  const result =
    input.side_effect_ledger.execute({
      scenario_id: input.scenario_id,
      condition: "DIRECT_EXECUTION",
      canonical_final_action:
        input.canonical_final_action,
      execution_attempted_at:
        input.execution_attempted_at
    });

  if (!result.ok) {
    return {
      observed_execution:
        "FAILED_BEFORE_EXECUTION",
      implementation_failure_code:
        result.failure_code
    };
  }

  return {
    observed_execution: "EXECUTED",
    implementation_failure_code: null
  };
}
