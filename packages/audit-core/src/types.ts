export type AuditSeverity = "info" | "low" | "medium" | "high" | "critical";

export type TaxonomySeverity = Exclude<AuditSeverity, "info">;

export type AuditConfidence = "low" | "medium" | "high";

export type AuditFindingStatus =
  | "potential_signal"
  | "requires_verification"
  | "not_demonstrated"
  | "confirmed_by_fixture"
  | "resolved";

export type AuditEvidenceType =
  | "document"
  | "policy"
  | "receipt"
  | "runtime_result"
  | "redteam_case"
  | "dogfood_case"
  | "manual_note"
  | "public_claim";

export interface TheaterSignalTaxonomyEntry {
  id: string;
  title: string;
  category:
    | "authority"
    | "approval_quality"
    | "runtime_binding"
    | "policy_boundary"
    | "receipt_integrity"
    | "proposal_integrity"
    | "target_scope"
    | "reversibility"
    | "governance_memory"
    | "human_participation"
    | "dashboard_enforcement";
  defaultSeverity: TaxonomySeverity;
  description: string;
  whyItMatters: string;
  defaultAuditQuestions: string[];
  recommendedRemediations: string[];
}

export interface AuditEvidenceRef {
  id: string;
  type: AuditEvidenceType;
  title: string;
  sourcePath?: string;
  excerpt?: string;
}

export interface AuditFinding {
  id: string;
  taxonomyId: string;
  title: string;
  severity: AuditSeverity;
  confidence: AuditConfidence;
  status: AuditFindingStatus;
  summary: string;
  observation: string;
  whyItMatters: string;
  auditQuestions: string[];
  recommendedRemediations: string[];
  evidenceRefs: AuditEvidenceRef[];
  relatedRuntimeRisks?: string[];
  relatedControls?: string[];
}

export interface AgencyChainMap {
  intentOwner?: string;
  agentRole?: string;
  toolAccess?: string[];
  policyConstraints?: string[];
  approvalAuthority?: string[];
  runtimePermit?: string;
  executionBoundary?: string;
  receiptProof?: string;
  missingLinks: string[];
}

export interface RemediationPlanItem {
  findingId: string;
  priority: "low" | "medium" | "high" | "urgent";
  action: string;
  mapsToControl?:
    | "PGDL"
    | "AAG"
    | "Runtime Binding"
    | "Receipts"
    | "Authority Map"
    | "Human Participation"
    | "Governance Memory"
    | "Alignment Gap Detector";
}

export interface GovernanceRealityReport {
  reportId: string;
  generatedAt: string;
  subject: {
    organizationName?: string;
    systemName?: string;
    workflowName?: string;
    auditScope: string;
  };
  disclaimer: string;
  executiveSummary: string;
  posture: {
    overallStatus:
      | "insufficient_evidence"
      | "early_review"
      | "needs_attention"
      | "partially_supported"
      | "strongly_supported";
    governanceRealityScore?: number;
    confidence: AuditConfidence;
  };
  findings: AuditFinding[];
  agencyChainMap?: AgencyChainMap;
  remediationPlan: RemediationPlanItem[];
  appendices?: {
    evidenceRefs: AuditEvidenceRef[];
    rawInputs?: unknown;
  };
}

export interface AuditValidationIssue {
  path: string;
  message: string;
}

export interface AuditValidationResult {
  valid: boolean;
  errors: AuditValidationIssue[];
  warnings: AuditValidationIssue[];
}

export interface SimplifiedAuditReportInput {
  reportId?: string;
  generatedAt?: string;
  subject: GovernanceRealityReport["subject"];
  executiveSummary?: string;
  posture?: Partial<GovernanceRealityReport["posture"]>;
  findings: AuditFinding[];
  agencyChainMap?: AgencyChainMap;
  remediationPlan?: RemediationPlanItem[];
  appendices?: GovernanceRealityReport["appendices"];
  rawInputs?: unknown;
}
