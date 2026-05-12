import type { AgentActionProposal } from "@agent-action-governance/shared-types";
import type { PgdlPolicy } from "../types.js";

export function analyzeProposal(
  proposal: AgentActionProposal,
  policy: PgdlPolicy
): { proposalId: string; policyName: string } {
  // TODO: Analyze proposal intent, requested action shape, and missing context.
  return {
    proposalId: proposal.id,
    policyName: policy.name
  };
}
