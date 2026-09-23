import type { DataSensitivity } from "./actionProposal.js";

/** Exact receiving use; no wildcards or implicit authority transfer. */
export interface ContextUseScope {
  purpose: string;
  mode: "reference" | "operational" | "governance_instruction" | "approval_reuse";
  receiverAgentId: string;
  trustDomain: string;
  action?: {
    proposalId: string;
    tool: string;
    actionType: string;
    target: string;
    environment: string;
    /** Canonical Runtime Binding action hash, including execution constraints. Required for operational admission. */
    actionHash?: string;
  };
}

export interface ContextProvenance {
  sourceId?: string;
  producerAgentId?: string;
  authorityId?: string;
  authorityExpiresAt?: string;
  workflowId?: string;
  taskId?: string;
  trustDomain?: string;
  receiptRefs?: string[];
  fingerprintRefs?: string[];
  authorityRefs?: string[];
}

export interface ContextTransformation {
  id: string;
  type: string;
  parentArtifactIds: string[];
  performedBy?: string;
  occurredAt?: string;
}

export interface ContextArtifact {
  id: string;
  artifactType: string;
  /** SHA-256 of the exact UTF-8 content, lowercase hex with sha256: prefix. */
  contentHash?: string;
  /** Optional local bytes as text. Never interpreted as instructions. */
  content?: string;
  provenance?: ContextProvenance;
  createdAt?: string;
  expiresAt?: string;
  revoked?: boolean;
  dataSensitivity?: DataSensitivity;
  permittedUses?: string[];
  parentArtifactIds?: string[];
  transformations?: ContextTransformation[];
  validationStatus?: "unvalidated" | "validated" | "invalid";
  priorAdmissionRefs?: string[];
}

/** Supplied by the trusted host, never extracted from artifact content. */
export interface ContextValidationEvidence {
  id: string;
  kind: "integrity" | "validation" | "authority" | "domain_transfer";
  artifactId: string;
  contentHash: string;
  validatorId: string;
  authorityId?: string;
  use: ContextUseScope;
  validatedAt: string;
  expiresAt: string;
  revoked?: boolean;
}

export interface ContextAdmissionPolicy {
  id: string;
  trustedSourceIds: string[];
  trustedValidatorIds: string[];
  trustedAuthorityIds: string[];
  /** Defaults to true for operational use; false is an explicit receiving-policy exception. */
  requireValidation?: boolean;
  requireAuthority?: boolean;
  requireIntegrity?: boolean;
}

export interface ContextAdmissionRequest {
  artifacts: ContextArtifact[];
  materialArtifactIds: string[];
  requestedUse: ContextUseScope;
  evaluatedAt: string;
  policy: ContextAdmissionPolicy;
  validationEvidence?: ContextValidationEvidence[];
}

export type ContextAdmissionDecision =
  | "admit" | "admit_restricted" | "require_validation" | "require_human_review" | "reject";

export type ContextAdmissionFindingCode =
  | "provenance_missing" | "source_unknown" | "integrity_missing" | "integrity_mismatch"
  | "context_expired" | "context_revoked" | "use_not_permitted" | "permitted_use_missing"
  | "trust_domain_crossing" | "trust_domain_missing" | "transformation_parent_missing"
  | "validation_missing" | "validation_invalid" | "authority_stale" | "approval_not_transferable"
  | "circular_lineage" | "lineage_gap" | "authority_not_demonstrated"
  | "content_not_authority" | "creation_time_missing" | "context_from_future"
  | "action_binding_missing" | "sensitivity_missing" | "revocation_unknown";

export interface ContextAdmissionFinding {
  artifactId: string;
  code: ContextAdmissionFindingCode;
  decision: Exclude<ContextAdmissionDecision, "admit">;
  reason: string;
}

/** Digest/reference evidence only; does not embed artifact content. */
export interface ContextArtifactReference {
  artifactId: string;
  artifactType: string;
  contentHash?: string;
  provenance?: ContextProvenance;
  createdAt?: string;
  expiresAt?: string;
  revoked?: boolean;
  parentArtifactIds: string[];
  transformations: ContextTransformation[];
  priorAdmissionRefs: string[];
  evidenceRefs: string[];
  evidenceDigest: string;
  permittedUses?: string[];
  dataSensitivity?: DataSensitivity;
}

export interface ContextAdmissionEvidence {
  version: "context-admission/v0.1";
  admissionId: string;
  evaluatedAt: string;
  requestedUse: ContextUseScope;
  validUntil?: string;
  policyId: string;
  policyDigest: string;
  materialArtifactIds: string[];
  artifacts: ContextArtifactReference[];
  findings: ContextAdmissionFinding[];
  decision: ContextAdmissionDecision;
  reasonForDecision: string;
  contextLineageDigest: string;
}
