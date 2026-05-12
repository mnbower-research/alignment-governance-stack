import type { ActionPermit, PermitSourceProposal } from "./types.js";

export function createPermit(proposal: PermitSourceProposal): ActionPermit {
  // TODO: Bind permit creation to an allowed AAG packet and approval metadata.
  return {
    id: `permit-${proposal.id}`,
    proposalId: proposal.id,
    tool: proposal.tool,
    actionType: proposal.actionType,
    target: proposal.target,
    environment: proposal.environment,
    expiresAt: new Date(0).toISOString()
  };
}
