import {
  evaluateGovernedRuntimeActionWithReceipt,
  type EvaluateGovernedRuntimeActionWithReceiptInput
} from "@alignment-governance-stack/governance-core";
import { buildContextAdmissionRequest } from "./scenarioGenerator.js";
import { createConditionFailureOutcome } from "./failureHandling.js";
import { canonicalSerialize } from "./schemas.js";
import type { SideEffectLedger } from "./sideEffectAdapter.js";
import type { FullAgsAdapterOutcome } from "./types.js";
import {
  type JsonObject,
  type JsonValue,
  type ScenarioManifestRecord
} from "./types.js";

type RuntimeInput =
  EvaluateGovernedRuntimeActionWithReceiptInput;

type RuntimeProposal =
  RuntimeInput["proposal"];

function objectValue(
  value: JsonValue | undefined,
  label: string
): JsonObject {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new Error(
      `Full AGS adapter expected object: ${label}`
    );
  }

  return value as JsonObject;
}

function arrayValue(
  value: JsonValue | undefined,
  label: string
): JsonValue[] {
  if (!Array.isArray(value)) {
    throw new Error(
      `Full AGS adapter expected array: ${label}`
    );
  }

  return value;
}

function stringValue(
  value: JsonValue | undefined,
  label: string
): string {
  if (typeof value !== "string") {
    throw new Error(
      `Full AGS adapter expected string: ${label}`
    );
  }

  return value;
}

function cloneForRuntime<T>(
  value: T
): T {
  return structuredClone(value);
}

function originatingAuthorityParts(
  scenario: ScenarioManifestRecord
): {
  humanId: string;
  authorityMap:
    NonNullable<RuntimeInput["authorityMap"]>;
  approvalEvidence:
    NonNullable<RuntimeInput["approvalEvidence"]>;
} {
  if (!scenario.originating_authority) {
    throw new Error(
      `${scenario.scenario_id}: missing originating_authority`
    );
  }

  const authority =
    scenario.originating_authority;

  const humanId =
    stringValue(
      authority.humanId,
      "originating_authority.humanId"
    );

  const authorityMap =
    objectValue(
      authority.authorityMap,
      "originating_authority.authorityMap"
    );

  const approvalEvidence =
    objectValue(
      authority.approvalEvidence,
      "originating_authority.approvalEvidence"
    );

  return {
    humanId,
    authorityMap:
      cloneForRuntime(
        authorityMap
      ) as unknown as NonNullable<
        RuntimeInput["authorityMap"]
      >,
    approvalEvidence:
      cloneForRuntime(
        approvalEvidence
      ) as unknown as NonNullable<
        RuntimeInput["approvalEvidence"]
      >
  };
}

function delegationCurrentParts(
  scenario: ScenarioManifestRecord
): {
  proposal: RuntimeProposal;
  currentStanding:
    NonNullable<RuntimeInput["currentStanding"]>;
  receivingDelegateId: string;
} {
  if (!scenario.delegation_state) {
    throw new Error(
      `${scenario.scenario_id}: missing delegation_state`
    );
  }

  const current =
    objectValue(
      scenario.delegation_state.current,
      "delegation_state.current"
    );

  const delegation =
    objectValue(
      current.delegation,
      "delegation_state.current.delegation"
    );

  const host =
    objectValue(
      current.host,
      "delegation_state.current.host"
    );

  const evidence =
    arrayValue(
      current.standingEvidence,
      "delegation_state.current.standingEvidence"
    );

  const delegationProposal =
    objectValue(
      delegation.proposal,
      "delegation_state.current.delegation.proposal"
    );

  const permittedActions =
    arrayValue(
      delegationProposal.permittedActions,
      "delegation_state.current.delegation.proposal.permittedActions"
    );

  if (permittedActions.length !== 1) {
    throw new Error(
      `${scenario.scenario_id}: expected exactly one delegated permitted action`
    );
  }

  const authorizedAction =
    objectValue(
      permittedActions[0],
      "delegation permitted action"
    );

  const proposal =
    cloneForRuntime(
      authorizedAction
    ) as unknown as RuntimeProposal;

  proposal.knownApproval = true;

  const receivingDelegateId =
    stringValue(
      scenario.delegation_state.receivingDelegateId,
      "delegation_state.receivingDelegateId"
    );

  return {
    proposal,
    currentStanding: {
      delegation:
        cloneForRuntime(
          delegation
        ) as unknown as NonNullable<
          RuntimeInput["currentStanding"]
        >["delegation"],
      evidence:
        cloneForRuntime(
          evidence
        ) as unknown as NonNullable<
          RuntimeInput["currentStanding"]
        >["evidence"],
      host:
        cloneForRuntime(
          host
        ) as unknown as NonNullable<
          RuntimeInput["currentStanding"]
        >["host"]
    },
    receivingDelegateId
  };
}

function contextAdmissionForScenario(
  scenario: ScenarioManifestRecord
): NonNullable<RuntimeInput["contextAdmission"]> {
  if (
    !scenario.context_state ||
    !scenario.evidence_state
  ) {
    throw new Error(
      `${scenario.scenario_id}: incomplete context-admission state`
    );
  }

  return cloneForRuntime(
    buildContextAdmissionRequest(
      scenario.context_state,
      scenario.evidence_state
    )
  ) as unknown as NonNullable<
    RuntimeInput["contextAdmission"]
  >;
}

export function buildFullAgsRuntimeInput(
  scenario: ScenarioManifestRecord
): RuntimeInput {
  const finalEvaluationTime =
    scenario.temporal_state.final_evaluation_time;

  const {
    humanId,
    authorityMap,
    approvalEvidence
  } =
    originatingAuthorityParts(scenario);

  const hasContextState =
    scenario.context_state !== null ||
    scenario.evidence_state !== null;

  if (
    (scenario.context_state === null) !==
    (scenario.evidence_state === null)
  ) {
    throw new Error(
      `${scenario.scenario_id}: context_state and evidence_state must be present together`
    );
  }

  const runtimeAction =
    cloneForRuntime(
      scenario.canonical_action
    ) as unknown as RuntimeProposal;

  let proposal: RuntimeProposal;
  let currentStanding:
    RuntimeInput["currentStanding"];
  let contextAdmission:
    RuntimeInput["contextAdmission"];
  let fingerprintAgentId: string;

  if (hasContextState) {
    proposal =
      cloneForRuntime(runtimeAction);

    contextAdmission =
      contextAdmissionForScenario(scenario);

    fingerprintAgentId =
      contextAdmission.requestedUse.receiverAgentId;
  } else {
    const delegation =
      delegationCurrentParts(scenario);

    proposal =
      delegation.proposal;

    currentStanding =
      delegation.currentStanding;

    fingerprintAgentId =
      delegation.receivingDelegateId;
  }

  return {
    proposal,
    runtimeAction,
    authorityMap,
    approvalEvidence,
    ...(currentStanding !== undefined
      ? { currentStanding }
      : {}),
    ...(contextAdmission !== undefined
      ? { contextAdmission }
      : {}),
    validationOptions: {
      now: finalEvaluationTime
    },
    receiptOptions: {
      createdAt: finalEvaluationTime
    },
    agencyFingerprintOptions: {
      input: {
        subjectHumanId: humanId,
        delegatedBy: humanId,
        agentId: fingerprintAgentId,
        timestamp: finalEvaluationTime
      }
    }
  };
}

type ProductionPacket = ReturnType<typeof evaluateGovernedRuntimeActionWithReceipt>;

// Exposed for synthetic engineering checks; scientific execution always calls
// the real production entrypoint through runFullAgs below.
export function normalizeFullAgsPacket(
  scenario: ScenarioManifestRecord,
  packet: ProductionPacket,
  ledger: SideEffectLedger
): FullAgsAdapterOutcome {
  const g = packet.governance;
  const binding = g.runtimeBinding;
  const outcome: FullAgsAdapterOutcome = {
    ...createConditionFailureOutcome("AGS_ADAPTER_EXCEPTION"),
    governance_final_decision: g.finalDecision,
    governance_reason: g.reasonForDecision,
    runtime_permit_created: g.permit !== undefined,
    runtime_binding_result: binding?.decision ?? null,
    artifacts: {
      receipt: JSON.parse(canonicalSerialize(packet.receipt)) as JsonObject,
      agency_fingerprint: packet.agencyFingerprint === undefined ? null
        : JSON.parse(canonicalSerialize(packet.agencyFingerprint)) as JsonObject
    }
  };
  const reachable = g.finalDecision === "execution_allowed" &&
    g.permit !== undefined && g.runtimeAction !== undefined &&
    binding?.allowed === true && binding.decision === "execution_allowed";
  const blockingDecisions = new Set([
    "policy_invalid", "blocked_by_policy", "approval_required_by_authority",
    "insufficient_human_participation", "rejected_before_gate", "escalated_before_gate",
    "blocked_by_aag", "approval_required_by_aag", "revision_required_by_aag", "execution_denied"
  ]);
  const blocked = blockingDecisions.has(g.finalDecision) &&
    (binding === undefined ? g.permit === undefined :
      binding.allowed === false && binding.decision === "execution_denied" &&
      g.finalDecision === "execution_denied" && g.permit !== undefined && g.runtimeAction !== undefined);
  const divergent = scenario.expected_first_invariant_divergence !== null;
  if (blocked) return {
    ...outcome, observed_execution: "DENIED", implementation_failure_code: null,
    denial_detected_before_execution: divergent,
    execution_reachable_after_divergence: divergent ? false : null
  };
  if (!reachable) return outcome;
  outcome.execution_reachable_after_divergence = divergent ? true : null;
  try {
    const execution = ledger.execute({
      scenario_id: scenario.scenario_id, condition: "FULL_AGS",
      canonical_final_action: structuredClone(scenario.canonical_action),
      execution_attempted_at: scenario.temporal_state.final_evaluation_time
    });
    return { ...outcome,
      observed_execution: execution.ok ? "EXECUTED" : "FAILED_BEFORE_EXECUTION",
      implementation_failure_code: execution.ok ? null : execution.failure_code };
  } catch {
    return { ...outcome, implementation_failure_code: "SIDE_EFFECT_ADAPTER_FAILURE" };
  }
}

export function runFullAgs(
  scenario: ScenarioManifestRecord,
  ledger: SideEffectLedger
): FullAgsAdapterOutcome {
  try {
    const packet = evaluateGovernedRuntimeActionWithReceipt(buildFullAgsRuntimeInput(scenario));
    return normalizeFullAgsPacket(scenario, packet, ledger);
  } catch {
    return { ...createConditionFailureOutcome("AGS_ADAPTER_EXCEPTION"),
      artifacts: { receipt: null, agency_fingerprint: null } };
  }
}
