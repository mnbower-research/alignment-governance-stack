import type { AgentActionProposal, DataSensitivity } from "@alignment-governance-stack/shared-types";
import { createActionHash } from "@alignment-governance-stack/runtime-binding";
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

/** Bind the reviewed use using the canonical execution contract; approval status is a result, not reviewed scope. */
export function createApprovalBinding(action: AgentActionProposal): NonNullable<ApprovalEvidence["binding"]> {
  return { proposalId: action.id, userRequest: action.userRequest, actionHash: createActionHash({ ...action, knownApproval: false }) };
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

  if (options.now !== undefined && !Number.isFinite(Date.parse(options.now))) {
    return { valid: false, decision: "approval_invalid", reasons: ["Invalid host approval evaluation clock."], requiredAuthority };
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
  const approvedAt = Date.parse(approvalEvidence.approvedAt);
  const expiry = approvalEvidence.expiresAt !== undefined ? Date.parse(approvalEvidence.expiresAt)
    : authorityMap.defaultApprovalTtlMinutes !== undefined ? approvedAt + authorityMap.defaultApprovalTtlMinutes * 60_000 : NaN;
  if (![now.getTime(), approvedAt, expiry].every(Number.isFinite)) {
    return { valid: false, decision: "approval_invalid", reasons: ["Approval requires valid timestamps and an explicit expiry or policy default TTL."], requiredAuthority };
  }
  if (now.getTime() >= expiry) {
    return {
      valid: false,
      decision: "approval_expired",
      reasons: [`Approval expired at ${new Date(expiry).toISOString()}.`],
      matchedRoleId: role.id,
      requiredAuthority
    };
  }
  if (approvedAt > now.getTime() || expiry <= approvedAt) {
    return { valid: false, decision: "approval_invalid", reasons: ["Approval is future-dated or has an invalid validity window."], requiredAuthority };
  }

  if (options.approvalKind !== undefined && options.approvalKind !== approvalEvidence.approvalKind) {
    return { valid: false, decision: "approval_out_of_scope", reasons: ["The supplied approval kind does not match the required review."], requiredAuthority };
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

  const expectedBinding = createApprovalBinding(action);
  if (!approvalEvidence.binding || Object.entries(expectedBinding).some(([key, value]) => approvalEvidence.binding?.[key as keyof typeof expectedBinding] !== value)) {
    return { valid: false, decision: "approval_binding_mismatch", reasons: ["Approval does not bind this exact proposal, purpose, target and execution constraints."], requiredAuthority };
  }

  return {
    valid: true,
    decision: "approval_valid",
    validUntil: new Date(expiry).toISOString(),
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
  return approvalKinds === undefined || (approvalKind !== undefined && approvalKinds.includes(approvalKind));
}

function getSensitivityRank(sensitivity: DataSensitivity): number {
  return sensitivityRank[sensitivity];
}
