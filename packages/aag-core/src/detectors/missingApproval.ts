import type { AagDetectorResult, AgentActionProposal } from "@agent-action-governance/shared-types";

export function detectMissingApproval(proposal: AgentActionProposal): AagDetectorResult {
  // TODO: Replace placeholder approval check with policy-aware approval validation.
  const passed = !proposal.requiresApproval || proposal.knownApproval !== null;

  return {
    detector: "missingApproval",
    passed,
    reason: passed ? "Approval placeholder passed." : "Approval is required but not known."
  };
}
