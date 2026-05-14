import type { GovernanceFinalDecision } from "@alignment-governance-stack/governance-core";
import type {
  N8nGovernanceNextStep,
  N8nGovernanceResponse,
  N8nGovernanceResult
} from "./types.js";

const allowedDecisions = new Set<GovernanceFinalDecision>([
  "execution_allowed",
  "allowed_by_aag"
]);

export function mapGovernanceResultToN8nResponse(
  result: N8nGovernanceResult
): N8nGovernanceResponse {
  const decision = result.governance.finalDecision;
  const allowed = allowedDecisions.has(decision);

  return {
    json: {
      allowed,
      decision,
      reason: result.governance.reasonForDecision,
      receiptHash: result.receipt.receiptHash,
      governance: result.governance,
      receipt: result.receipt,
      nextStep: mapNextStep(result)
    }
  };
}

function mapNextStep(result: N8nGovernanceResult): N8nGovernanceNextStep {
  const decision = result.governance.finalDecision;

  if (decision === "execution_allowed" || decision === "allowed_by_aag") {
    return "proceed";
  }

  if (decision === "approval_required_by_aag" || decision === "approval_required_by_authority") {
    return "request_approval";
  }

  if (
    decision === "blocked_by_policy" ||
    decision === "blocked_by_aag" ||
    decision === "rejected_before_gate" ||
    decision === "execution_denied"
  ) {
    return "stop";
  }

  if (
    decision === "escalated_before_gate" ||
    decision === "insufficient_human_participation" ||
    decision === "policy_invalid"
  ) {
    return "escalate";
  }

  if (decision === "revision_required_by_aag" || result.governance.pgdl?.decision === "revise_before_aag") {
    return "request_revision";
  }

  return "stop";
}
