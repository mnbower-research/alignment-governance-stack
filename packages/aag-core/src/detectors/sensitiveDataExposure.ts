import type { AagDetectorResult, AgentActionProposal } from "@alignment-governance-stack/shared-types";

export function detectSensitiveDataExposure(_proposal: AgentActionProposal): AagDetectorResult {
  // TODO: Evaluate sensitive data exposure against policy and destination.
  return { detector: "sensitiveDataExposure", passed: true, reason: "Placeholder detector." };
}
