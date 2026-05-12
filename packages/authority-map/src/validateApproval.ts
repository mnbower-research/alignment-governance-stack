import type { AgentActionProposal, DataSensitivity } from "@alignment-governance-stack/shared-types";
import type {
  ApprovalEvidence,
  ApprovalValidationResult,
  AuthorityMap,
  AuthorityScope
} from "./types.js";
import {
  resolveRequiredAuthority,
  type ResolveRequiredAuthorityOptions
} from "./resolveRequiredAuthority.js";
import { validateAuthorityMap } from "./validateAuthorityMap.js";

const sensitivityRank: Record<DataSensitivity, number> = {
  low: 1,
  medium: 2,
  high: 3
};

export interface ValidateApprovalOptions extends ResolveRequiredAuthorityOptions {
  now?: string;
}

export function validateApproval(
  authorityMap: AuthorityMap,
  action: AgentActionProposal,
  approvalEvidence?: ApprovalEvidence,
  options: ValidateApprovalOptions = {}
): ApprovalValidationResult {
  const authorityMapValidation = validateAuthorityMap(authorityMap);
  const requiredAuthority = resolveRequiredAuthority(action, options);

  if (!authorityMapValidation.valid) {
    return {
      valid: false,
      decision: "authority_map_invalid",
      reasons: [`Authority map is invalid: ${authorityMapValidation.errors.join(" ")}`],
      requiredAuthority
    };
  }

  if (!requiredAuthority.required && approvalEvidence === undefined) {
    return {
      valid: true,
      decision: "approval_not_required",
      reasons: ["Approval is not required for this action."],
      requiredAuthority
    };
  }

  if (requiredAuthority.required && approvalEvidence === undefined) {
    return {
      valid: false,
      decision: "approval_missing",
      reasons: ["Approval is required, but no approval evidence was supplied."],
      requiredAuthority
    };
  }

  if (approvalEvidence === undefined) {
    return {
      valid: true,
      decision: "approval_not_required",
      reasons: ["Approval is not required for this action."],
      requiredAuthority
    };
  }

  const role = authorityMap.roles.find((entry) => entry.id === approvalEvidence.approverRoleId);

  if (role === undefined) {
    return {
      valid: false,
      decision: "approval_role_unknown",
      reasons: [`Approval role is not defined in the authority map: ${approvalEvidence.approverRoleId}.`],
      requiredAuthority
    };
  }

  const now = new Date(options.now ?? new Date().toISOString());

  if (approvalEvidence.expiresAt !== undefined && now > new Date(approvalEvidence.expiresAt)) {
    return {
      valid: false,
      decision: "approval_expired",
      reasons: [`Approval expired at ${approvalEvidence.expiresAt}.`],
      matchedRoleId: role.id,
      requiredAuthority
    };
  }

  const approvalKind = options.approvalKind ?? approvalEvidence.approvalKind;
  const matchedScopes = role.scopes.filter((scope) => matchesScope(scope, action, approvalKind));

  if (matchedScopes.length === 0) {
    return {
      valid: false,
      decision: "approval_out_of_scope",
      reasons: [`Approval role ${role.id} does not have scope for this action.`],
      matchedRoleId: role.id,
      requiredAuthority
    };
  }

  return {
    valid: true,
    decision: "approval_valid",
    reasons: [`Approval was supplied by authorized role ${role.id}.`],
    matchedRoleId: role.id,
    matchedScopeIds: matchedScopes.map((scope) => scope.id),
    requiredAuthority
  };
}

function matchesScope(
  scope: AuthorityScope,
  action: AgentActionProposal,
  approvalKind: string | undefined
): boolean {
  return (
    matchesString(scope.tool, action.tool) &&
    matchesString(scope.actionType, action.actionType) &&
    matchesString(scope.environment, action.environment) &&
    matchesString(scope.dataSensitivity, action.dataSensitivity) &&
    matchesBoolean(scope.externalFacing, action.externalFacing) &&
    matchesBoolean(scope.reversible, action.reversible) &&
    matchesTargetIncludes(scope.targetIncludes, action.target) &&
    matchesMaxDataSensitivity(scope.maxDataSensitivity, action.dataSensitivity) &&
    matchesApprovalKind(scope.approvalKinds, approvalKind)
  );
}

function matchesString(expected: string | undefined, actual: string): boolean {
  return expected === undefined || expected === actual;
}

function matchesBoolean(expected: boolean | undefined, actual: boolean): boolean {
  return expected === undefined || expected === actual;
}

function matchesTargetIncludes(expected: string | undefined, actual: string): boolean {
  return expected === undefined || actual.toLowerCase().includes(expected.toLowerCase());
}

function matchesMaxDataSensitivity(
  expected: DataSensitivity | undefined,
  actual: DataSensitivity
): boolean {
  return expected === undefined || getSensitivityRank(actual) <= getSensitivityRank(expected);
}

function matchesApprovalKind(
  approvalKinds: string[] | undefined,
  approvalKind: string | undefined
): boolean {
  return approvalKind === undefined || approvalKinds === undefined || approvalKinds.includes(approvalKind);
}

function getSensitivityRank(sensitivity: DataSensitivity): number {
  return sensitivityRank[sensitivity];
}
