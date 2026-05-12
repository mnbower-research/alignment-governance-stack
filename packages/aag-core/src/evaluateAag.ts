import type {
  AagDetectorResult,
  AagPacket,
  AgentActionProposal
} from "@alignment-governance-stack/shared-types" with { "resolution-mode": "import" };
import { evaluateAction } from "./actionGate/evaluateAction";
import type { ActionGateInput, GateDetectorResult } from "./actionGate/types";

export function evaluateAag(proposal: AgentActionProposal): AagPacket {
  const actionGateInput = toActionGateInput(proposal);
  const result = evaluateAction(actionGateInput);

  return {
    proposal,
    detectorResults: result.detectorResults.filter((detectorResult) => detectorResult.triggered).map(toAagDetectorResult),
    decision: result.decision,
    reasonForDecision: result.recommendedAction,
    receiptRequired: true
  };
}

export function toActionGateInput(proposal: AgentActionProposal): ActionGateInput {
  return {
    userRequest: proposal.userRequest,
    proposedAction: {
      tool: proposal.tool,
      actionType: proposal.actionType,
      target: proposal.target,
      payload: getPayload(proposal.metadata),
      reversible: proposal.reversible,
      externalFacing: proposal.externalFacing
    },
    context: {
      userApproved: proposal.knownApproval,
      environment: getEnvironment(proposal.environment),
      authorizedTargets: getStringArray(proposal.metadata.authorizedTargets),
      authorizedActionTypes: getStringArray(proposal.metadata.authorizedActionTypes)
    },
    sourceProfile: getSourceProfile(proposal.metadata)
  };
}

function toAagDetectorResult(result: GateDetectorResult): AagDetectorResult {
  return {
    detector: result.type,
    triggered: result.triggered,
    severity: result.severity,
    recommendedDecision: result.recommendedDecision,
    reason: result.evidence[0] ?? `Detector ${result.type} triggered.`,
    evidence: result.evidence
  };
}

type ActionGateContext = NonNullable<ActionGateInput["context"]>;

function getEnvironment(environment: string): ActionGateContext["environment"] {
  if (environment === "dev" || environment === "staging" || environment === "production") {
    return environment;
  }

  return undefined;
}

function getPayload(metadata: Record<string, unknown>): Record<string, unknown> | undefined {
  const payload = metadata.payload;
  return isRecord(payload) ? payload : undefined;
}

function getStringArray(value: unknown): string[] | undefined {
  return Array.isArray(value) && value.every((item) => typeof item === "string") ? value : undefined;
}

function getSourceProfile(metadata: Record<string, unknown>): ActionGateInput["sourceProfile"] {
  const sourceProfile = metadata.sourceProfile;
  return isRecord(sourceProfile) ? sourceProfile as ActionGateInput["sourceProfile"] : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
