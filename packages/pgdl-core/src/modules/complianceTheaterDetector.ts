import type { AgentActionProposal } from "@alignment-governance-stack/shared-types";

export function detectComplianceTheater(_proposal: AgentActionProposal): boolean {
  // TODO: Detect wording changes that appear safer without changing the underlying risk.
  return false;
}
