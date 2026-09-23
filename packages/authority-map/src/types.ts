import type { DataSensitivity } from "@alignment-governance-stack/shared-types";

export interface AuthorityMap {
  id: string;
  name: string;
  version: string;
  description?: string;
  roles: AuthorityRole[];
  defaultApprovalTtlMinutes?: number;
  metadata?: Record<string, unknown>;
}

export interface AuthorityRole {
  id: string;
  label: string;
  description?: string;
  scopes: AuthorityScope[];
  canOverrideHardBoundaries?: false;
  metadata?: Record<string, unknown>;
}

export interface AuthorityScope {
  id: string;
  tool?: string;
  actionType?: string;
  environment?: string;
  dataSensitivity?: DataSensitivity;
  externalFacing?: boolean;
  reversible?: boolean;
  targetIncludes?: string;
  approvalKinds?: string[];
  maxDataSensitivity?: DataSensitivity;
  notes?: string;
}

export interface ApprovalEvidence {
  id: string;
  approverId: string;
  approverRoleId: string;
  approvedAt: string;
  /** Exact reviewed use. Legacy unbound evidence is not current approval. */
  binding?: { proposalId: string; userRequest: string; actionHash: string };
  expiresAt?: string;
  approvalKind?: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}

export interface RequiredAuthority {
  required: boolean;
  reasons: string[];
  suggestedRoles: string[];
  approvalKind?: string;
}

export type ApprovalValidationDecision =
  | "approval_valid"
  | "approval_missing"
  | "approval_role_unknown"
  | "approval_out_of_scope"
  | "approval_expired"
  | "approval_invalid"
  | "approval_binding_mismatch"
  | "approval_not_required"
  | "authority_map_invalid";

export interface ApprovalValidationResult {
  validUntil?: string;
  valid: boolean;
  decision: ApprovalValidationDecision;
  reasons: string[];
  matchedRoleId?: string;
  matchedScopeIds?: string[];
  requiredAuthority?: RequiredAuthority;
}

export interface AuthorityMapValidationResult {
  valid: boolean;
  errors: string[];
}
