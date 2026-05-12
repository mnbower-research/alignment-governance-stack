import type { AagDetectorResult, AgentActionProposal } from "@agent-action-governance/shared-types";

export function detectUnauthorizedScope(_proposal: AgentActionProposal): AagDetectorResult {
  // TODO: Verify the action scope is authorized.
  return { detector: "unauthorizedScope", passed: true, reason: "Placeholder detector." };
}
