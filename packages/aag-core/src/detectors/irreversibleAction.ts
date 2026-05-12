import type { AagDetectorResult, AgentActionProposal } from "@alignment-governance-stack/shared-types";

export function detectIrreversibleAction(proposal: AgentActionProposal): AagDetectorResult {
  // TODO: Evaluate irreversible action policy by environment, scope, and approval.
  return {
    detector: "irreversibleAction",
    passed: proposal.reversible,
    reason: proposal.reversible ? "Action is marked reversible." : "Action is marked irreversible."
  };
}
