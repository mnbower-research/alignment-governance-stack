import type { AagDetectorResult, AgentActionProposal } from "@agent-action-governance/shared-types";

export function detectToolMismatch(_proposal: AgentActionProposal): AagDetectorResult {
  // TODO: Verify the selected tool is appropriate for the approved action.
  return { detector: "toolMismatch", passed: true, reason: "Placeholder detector." };
}
