import type { AgentActionProposal } from "@alignment-governance-stack/shared-types";
import type { PgdlPolicy, PgdlProposalAnalysis } from "../types.js";

export function analyzeProposal(
  proposal: AgentActionProposal,
  policy: PgdlPolicy
): PgdlProposalAnalysis {
  const tool = proposal.tool.toLowerCase();
  const actionType = proposal.actionType.toLowerCase();
  const target = proposal.target.toLowerCase();

  return {
    proposalId: proposal.id,
    policyName: policy.name,
    destructive: isDestructiveOperation(tool, actionType),
    externalSendOrPublish: isExternalSendOrPublish(actionType),
    broadScope: isBroadScope(target, actionType),
    production: proposal.environment.toLowerCase() === "production"
  };
}

export function isDestructiveOperation(tool: string, actionType: string): boolean {
  return [tool, actionType].some((value) =>
    ["delete", "remove", "destroy", "purge", "drop", "truncate", "override"].some((term) =>
      value.includes(term)
    )
  );
}

export function isExternalSendOrPublish(actionType: string): boolean {
  return actionType.includes("send") || actionType.includes("publish");
}

export function isBroadScope(target: string, actionType: string): boolean {
  return (
    target.includes("all") ||
    target.includes("customer_records") ||
    target.includes("database") ||
    actionType.includes("bulk") ||
    actionType.includes("delete")
  );
}
