export type DecisionClosureOutcome =
  | "allow"
  | "escalate"
  | "refuse"
  | "revise_action"
  | "require_approval"
  | "block";

export type DecisionClosureSensitivity = "low" | "medium" | "high" | "critical" | "unknown";
export type DecisionClosureReversibility = "reversible" | "partially_reversible" | "irreversible" | "unknown";
export type DecisionClosureParticipationQuality = "not_required" | "strong" | "weak" | "unknown";
export type DecisionClosureIntegrityStatus = "unsigned" | "signed" | "verified" | "invalid" | "unknown";
export type DecisionClosureFindingSeverity = "info" | "low" | "medium" | "high" | "critical";

export interface DecisionClosureArtifact {
  artifactType: "decision_closure";
  artifactVersion: "1.0";
  artifactId: string;
  createdAt: string;
  context?: DecisionClosureContext;
  action: DecisionClosureAction;
  executionBoundary: DecisionClosureExecutionBoundary;
  authority: DecisionClosureAuthority;
  decision: DecisionClosureDecision;
  conditions: DecisionClosureConditions;
  proof: DecisionClosureProof;
  auditSummary: DecisionClosureAuditSummary;
}

export interface DecisionClosureAction {
  actionId: string;
  actionType: string;
  summary: string;
  toolName: string;
  target: string;
  proposedByAgentId?: string;
  sensitivity: DecisionClosureSensitivity;
  reversibility: DecisionClosureReversibility;
}

export interface DecisionClosureContext {
  declaredActionType?: string;
  actualActionType?: string;
  declaredTarget?: string;
  actualTarget?: string;
  approvedTool?: string;
  approvedTarget?: string;
  runtimeTool?: string;
  runtimeTarget?: string;
  secondaryRuntimeTarget?: string;
  channel?: string;
  audience?: "internal" | "external" | "mixed" | "unknown";
  unsupportedPublicClaims?: string[];
  receiptChainStatus?: "complete" | "incomplete" | "unknown";
  receiptReference?: string;
  approvalMetadata?: {
    reviewDurationSeconds?: number;
    reviewerComments?: string;
    reviewerRole?: string;
    reviewerContextProvided?: boolean;
    approvedTarget?: string;
    actualTarget?: string;
  };
  metadata?: Record<string, unknown>;
}

export interface DecisionClosureExecutionBoundary {
  boundaryId: string;
  boundaryType: string;
  reachedAt: string;
  runtimePermitRequired: boolean;
  runtimePermitId?: string;
  runtimeBindingHash?: string;
}

export interface DecisionClosureAuthority {
  authoritySource: string;
  authorityId?: string;
  authorityName?: string;
  reviewerId?: string;
  reviewerRole?: string;
  authorityValid: boolean;
  authorityReason: string;
}

export interface DecisionClosureDecision {
  outcome: DecisionClosureOutcome;
  reason: string;
  ruleIds: string[];
  policyProfileId?: string;
  hardBoundaryIds?: string[];
  humanReviewRequired: boolean;
  humanReviewPresent: boolean;
  humanParticipationQuality?: DecisionClosureParticipationQuality;
}

export interface DecisionClosureConditions {
  scope: string;
  expiresAt?: string;
  allowedTools?: string[];
  allowedTargets?: string[];
  prohibitedTargets?: string[];
  notes?: string[];
}

export interface DecisionClosureProof {
  receiptHash?: string;
  previousReceiptHash?: string;
  signature?: string;
  signatureAlgorithm?: string;
  canonicalHash: string;
  integrityStatus: DecisionClosureIntegrityStatus;
}

export interface DecisionClosureAuditSummary {
  readableWithoutSystemAccess: boolean;
  summary: string;
  unresolvedQuestions: string[];
  theaterSignals: string[];
  remediationHints: string[];
}

export type DecisionClosureArtifactInput = Omit<DecisionClosureArtifact, "artifactType" | "artifactVersion" | "proof"> & {
  artifactType?: "decision_closure";
  artifactVersion?: "1.0";
  proof?: Partial<DecisionClosureProof>;
};

export interface DecisionClosureValidationFinding {
  id: string;
  title: string;
  severity: DecisionClosureFindingSeverity;
  evidencePath: string;
  explanation: string;
  auditQuestion: string;
  remediation: string;
}

export interface DecisionClosureValidationResult {
  valid: boolean;
  severity: DecisionClosureFindingSeverity;
  findings: DecisionClosureValidationFinding[];
}
