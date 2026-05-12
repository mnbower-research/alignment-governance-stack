import type { AagDetectorResult, AgentActionProposal } from "@alignment-governance-stack/shared-types";

export function detectObjectiveDrift(_proposal: AgentActionProposal): AagDetectorResult {
  // TODO: Compare the action objective with the original user goal and matured proposal.
  return { detector: "objectiveDrift", passed: true, reason: "Placeholder detector." };
}
