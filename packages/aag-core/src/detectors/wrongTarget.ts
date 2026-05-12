import type { AagDetectorResult, AgentActionProposal } from "@agent-action-governance/shared-types";

export function detectWrongTarget(_proposal: AgentActionProposal): AagDetectorResult {
  // TODO: Verify the requested target matches the intended target.
  return { detector: "wrongTarget", passed: true, reason: "Placeholder detector." };
}
