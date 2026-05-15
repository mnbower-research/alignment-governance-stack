export type AgencyChainAuditMode =
  | "public_source_review"
  | "client_provided_evidence_review"
  | "internal_self_audit"
  | "workflow_review";

export type AgencyChainLinkType =
  | "human_authority"
  | "organizational_policy"
  | "hard_boundary"
  | "agent_role"
  | "tool_access"
  | "proposed_action"
  | "approval_authority"
  | "human_participation"
  | "runtime_permit"
  | "execution_boundary"
  | "receipt"
  | "governance_memory";

export type AgencyChainLinkStatus =
  | "present"
  | "weak"
  | "missing"
  | "not_applicable"
  | "requires_verification";

export type AgencyChainOverallStatus =
  | "preserved"
  | "partially_preserved"
  | "weak"
  | "broken"
  | "insufficient_evidence";

export type AgencyChainSeverity = "low" | "medium" | "high" | "critical";

export type AgencyChainConfidence = "low" | "medium" | "high";

export interface AgencyChainEvidenceRef {
  id: string;
  type:
    | "document"
    | "policy"
    | "receipt"
    | "runtime_result"
    | "redteam_case"
    | "dogfood_case"
    | "manual_note"
    | "public_claim";
  title: string;
  sourcePath?: string;
  excerpt?: string;
}

export interface AgencyChainSubject {
  organizationName?: string;
  systemName?: string;
  workflowName?: string;
  auditScope: string;
}

export interface AgencyChainLink {
  id: string;
  type: AgencyChainLinkType;
  label: string;
  status: AgencyChainLinkStatus;
  description?: string;
  evidenceRefs?: AgencyChainEvidenceRef[];
  dependsOn?: string[];
  notes?: string[];
  metadata?: Record<string, unknown>;
}

export interface AgencyChainIssue {
  id: string;
  title: string;
  severity: AgencyChainSeverity;
  confidence: AgencyChainConfidence;
  linkType: AgencyChainLinkType;
  linkId?: string;
  observation: string;
  whyItMatters: string;
  auditQuestion: string;
  recommendedRemediation: string;
  taxonomyId?: string;
  evidenceRefs?: AgencyChainEvidenceRef[];
}

export interface AgencyChainMap {
  subject: AgencyChainSubject;
  auditMode: AgencyChainAuditMode;
  chainId: string;
  description: string;
  links: AgencyChainLink[];
  issues: AgencyChainIssue[];
  overallStatus: AgencyChainOverallStatus;
  createdAt?: string;
  metadata?: Record<string, unknown>;
}

export interface AgencyChainInput {
  subject: AgencyChainSubject;
  auditMode?: AgencyChainAuditMode;
  chainId?: string;
  description?: string;
  links: AgencyChainLink[];
  createdAt?: string;
  metadata?: Record<string, unknown>;
}

export interface AgencyChainValidationResult {
  valid: boolean;
  errors: Array<{ path: string; message: string }>;
}
