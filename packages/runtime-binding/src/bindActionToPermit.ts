import type { ActionPermit, PermitValidationResult, RuntimeAction } from "./types.js";

export function bindActionToPermit(
  action: RuntimeAction,
  permit: ActionPermit
): PermitValidationResult {
  // TODO: Prevent approved proposal drift, tool substitution, target substitution, and scope expansion.
  const matches =
    action.proposalId === permit.proposalId &&
    action.tool === permit.tool &&
    action.actionType === permit.actionType &&
    action.target === permit.target &&
    action.environment === permit.environment;

  return {
    valid: matches,
    reason: matches ? "Runtime action matches permit." : "Runtime action does not match permit."
  };
}
