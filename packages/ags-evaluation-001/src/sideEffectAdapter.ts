import {
  hashRecordOmitting,
  sha256Canonical,
  validateExecutionEventRecord
} from "./schemas.js";
import {
  type CanonicalAction,
  type Condition,
  type ExecutionEventRecord
} from "./types.js";

const CONDITIONS = new Set<Condition>([
  "FULL_AGS",
  "LOCAL_GATE",
  "DIRECT_EXECUTION"
]);

export type SideEffectAdapterFailure =
  | "ACTION_HASH_MISMATCH"
  | "DUPLICATE_EXECUTION_EVENT"
  | "SIDE_EFFECT_ADAPTER_FAILURE";

export interface SideEffectExecutionInput {
  scenario_id: string;
  condition: Condition;
  canonical_final_action: CanonicalAction;
  execution_attempted_at: string;
}

export interface SideEffectExecutionSuccess {
  ok: true;
  event: ExecutionEventRecord;
}

export interface SideEffectExecutionFailure {
  ok: false;
  failure_code: SideEffectAdapterFailure;
}

export type SideEffectExecutionResult =
  | SideEffectExecutionSuccess
  | SideEffectExecutionFailure;

function nonEmptyString(
  value: unknown
): value is string {
  return (
    typeof value === "string" &&
    value.length > 0
  );
}

function isIsoUtc(
  value: unknown
): value is string {
  if (
    typeof value !== "string" ||
    !value.endsWith("Z")
  ) {
    return false;
  }

  return Number.isFinite(Date.parse(value));
}

export function structurallyExecutable(
  input: SideEffectExecutionInput
): boolean {
  const action = input.canonical_final_action;

  return (
    action !== null && typeof action === "object" &&
    nonEmptyString(input.scenario_id) &&
    CONDITIONS.has(input.condition) &&
    nonEmptyString(action.id) &&
    nonEmptyString(action.tool) &&
    nonEmptyString(action.actionType) &&
    nonEmptyString(action.target) &&
    nonEmptyString(action.environment) &&
    isIsoUtc(input.execution_attempted_at)
  );
}

export class SideEffectLedger {
  readonly #events: ExecutionEventRecord[] = [];
  readonly #eventKeys = new Set<string>();
  readonly #expectedActionHashes: ReadonlyMap<string, string>;

  constructor(expectedActionHashes: ReadonlyMap<string, string>) {
    this.#expectedActionHashes = expectedActionHashes;
  }

  execute(
    input: SideEffectExecutionInput
  ): SideEffectExecutionResult {
    if (!structurallyExecutable(input)) {
      return {
        ok: false,
        failure_code:
          "SIDE_EFFECT_ADAPTER_FAILURE"
      };
    }

    const expectedActionHash =
      this.#expectedActionHashes.get(
        input.scenario_id
      );

    if (!expectedActionHash) {
      return {
        ok: false,
        failure_code:
          "SIDE_EFFECT_ADAPTER_FAILURE"
      };
    }

    const submittedActionHash =
      sha256Canonical(
        input.canonical_final_action
      );

    if (
      submittedActionHash !==
      expectedActionHash
    ) {
      return {
        ok: false,
        failure_code:
          "ACTION_HASH_MISMATCH"
      };
    }

    const eventKey =
      `${input.scenario_id}|${input.condition}`;

    if (this.#eventKeys.has(eventKey)) {
      return {
        ok: false,
        failure_code:
          "DUPLICATE_EXECUTION_EVENT"
      };
    }

    const eventWithoutHash = {
      scenario_id: input.scenario_id,
      condition: input.condition,
      action_hash: submittedActionHash,
      execution_attempted_at:
        input.execution_attempted_at,
      event_key: eventKey
    };

    const event: ExecutionEventRecord = {
      ...eventWithoutHash,
      event_hash: hashRecordOmitting(
        {
          ...eventWithoutHash,
          event_hash: ""
        },
        "event_hash"
      )
    };

    try {
      validateExecutionEventRecord(event);
    } catch {
      return {
        ok: false,
        failure_code:
          "SIDE_EFFECT_ADAPTER_FAILURE"
      };
    }

    this.#eventKeys.add(eventKey);
    this.#events.push(
      structuredClone(event)
    );

    return {
      ok: true,
      event: structuredClone(event)
    };
  }

  events(): readonly ExecutionEventRecord[] {
    return this.#events.map(
      (event) => structuredClone(event)
    );
  }

  hasEvent(
    scenarioId: string,
    condition: Condition
  ): boolean {
    return this.#eventKeys.has(
      `${scenarioId}|${condition}`
    );
  }

  size(): number {
    return this.#events.length;
  }
}

export function createSideEffectLedger(
  expectedActionHashes:
    ReadonlyMap<string, string>
): SideEffectLedger {
  return new SideEffectLedger(
    expectedActionHashes
  );
}
