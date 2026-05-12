import type { AgentActionProposal } from "@alignment-governance-stack/shared-types";
import type { RequiredAuthority } from "./types.js";

export interface ResolveRequiredAuthorityOptions {
  policyRequiresApproval?: boolean;
  policyReasons?: string[];
  approvalKind?: string;
}

export function resolveRequiredAuthority(
  action: AgentActionProposal,
  options: ResolveRequiredAuthorityOptions = {}
): RequiredAuthority {
  const reasons: string[] = [];
  const suggestedRoles = new Set<string>();

  if (action.requiresApproval) {
    reasons.push("Action requires approval.");
    suggestedRoles.add("business_owner");
  }

  if (options.policyRequiresApproval === true) {
    reasons.push(...(options.policyReasons ?? ["Policy resolution requires approval."]));
    suggestedRoles.add("business_owner");
  }

  if (action.environment === "production" && !action.reversible) {
    reasons.push("Production irreversible actions require authority validation.");
    suggestedRoles.add("system_admin");
    suggestedRoles.add("security_admin");
  }

  if (action.externalFacing) {
    reasons.push("External-facing actions require authority validation.");
    suggestedRoles.add("communications_admin");
    suggestedRoles.add("business_owner");
  }

  if (action.dataSensitivity === "high") {
    reasons.push("High sensitivity actions require authority validation.");
    suggestedRoles.add("security_admin");
    suggestedRoles.add("data_owner");
  }

  if (reasons.length === 0) {
    suggestedRoles.add("business_owner");
  }

  return {
    required: reasons.length > 0,
    reasons,
    suggestedRoles: Array.from(suggestedRoles),
    ...(options.approvalKind !== undefined ? { approvalKind: options.approvalKind } : {})
  };
}

