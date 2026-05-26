export type BabelRiskVersion = "babel-risk/v0.1";

export type BabelRiskSeverity = "low" | "medium" | "high" | "critical";
export type BabelRiskConfidence = "low" | "medium" | "high";
export type DemonstrationStatus = "strong" | "partial" | "weak" | "not_demonstrated";

export interface BabelRiskInput {
  systemId?: string;
  organizationId?: string;
  workflowId?: string;
  assessmentWindow?: {
    from?: string;
    to?: string;
  };
  capabilitySignals?: CapabilitySignal[];
  coordinationSignals?: CoordinationSignal[];
  authoritySignals?: AuthoritySignal[];
  participationSignals?: ParticipationSignal[];
  proofSignals?: ProofSignal[];
  memorySignals?: MemorySignal[];
  agencyChainSignals?: AgencyChainSignal[];
  fingerprintSignals?: FingerprintSignal[];
  governanceReportSignals?: GovernanceReportSignal[];
  metadata?: Record<string, unknown>;
}

export interface BaseSignal {
  id: string;
  severity?: BabelRiskSeverity;
  description?: string;
  evidenceRefs?: string[];
}

export interface CapabilitySignal extends BaseSignal {
  kind:
    | "agent_count"
    | "tool_access"
    | "autonomy_level"
    | "execution_speed"
    | "scope_expansion"
    | "model_capability"
    | "workflow_complexity"
    | "other";
  value?: number;
}

export interface CoordinationSignal extends BaseSignal {
  kind:
    | "multi_agent_coordination"
    | "cross_department_workflow"
    | "shared_language_without_shared_meaning"
    | "centralized_control_plane"
    | "dependency_on_single_platform"
    | "handoff_complexity"
    | "other";
}

export interface AuthoritySignal extends BaseSignal {
  kind:
    | "unclear_owner"
    | "missing_stop_authority"
    | "approval_scope_ambiguous"
    | "authority_centralization"
    | "delegation_without_map"
    | "policy_authority_mismatch"
    | "other";
}

export interface ParticipationSignal extends BaseSignal {
  kind:
    | "rubber_stamp_pattern"
    | "low_context_approval"
    | "approval_after_momentum"
    | "human_near_loop"
    | "review_without_refusal_power"
    | "overload_pressure"
    | "other";
}

export interface ProofSignal extends BaseSignal {
  kind:
    | "missing_receipt"
    | "weak_decision_closure"
    | "unverified_runtime_binding"
    | "incomplete_fingerprint"
    | "unlinked_action_chain"
    | "tamper_gap"
    | "other";
}

export interface MemorySignal extends BaseSignal {
  kind:
    | "memory_without_review"
    | "self_modifying_governance"
    | "recommendation_without_human_approval"
    | "repeated_unreviewed_pattern"
    | "governance_memory_ignored"
    | "other";
}

export interface AgencyChainSignal extends BaseSignal {
  kind:
    | "broken_authority_chain"
    | "weak_human_authority"
    | "bypassed_participation"
    | "missing_delegation_link"
    | "unclear_accountability"
    | "other";
}

export interface FingerprintSignal extends BaseSignal {
  kind:
    | "missing_fingerprint"
    | "fingerprint_chain_gap"
    | "delegated_by_ambiguous"
    | "subject_missing"
    | "permit_unlinked"
    | "receipt_unlinked"
    | "other";
}

export interface GovernanceReportSignal extends BaseSignal {
  kind:
    | "repeated_governance_theater_finding"
    | "unresolved_high_severity_finding"
    | "self_audit_circularity"
    | "third_party_review_missing"
    | "remediation_not_demonstrated"
    | "other";
}

export type BabelRiskFindingCategory =
  | "capability_outruns_discernment"
  | "coordination_outruns_authority"
  | "language_outruns_meaning"
  | "automation_outruns_participation"
  | "memory_outruns_review"
  | "proof_outruns_reality"
  | "governance_theater"
  | "dependency_capture"
  | "self_audit_circularity"
  | "centralized_control_without_accountability";

export interface BabelRiskFinding {
  id: string;
  category: BabelRiskFindingCategory;
  severity: BabelRiskSeverity;
  confidence: BabelRiskConfidence;
  title: string;
  summary: string;
  evidenceRefs: string[];
  recommendedRemediation: string[];
  limitations?: string[];
}

export interface BabelRiskReport {
  version: BabelRiskVersion;
  reportId: string;
  systemId?: string;
  organizationId?: string;
  workflowId?: string;
  assessmentWindow?: {
    from?: string;
    to?: string;
  };
  overallRisk: BabelRiskSeverity;
  structuralAscentScore: number;
  findings: BabelRiskFinding[];
  summary: {
    capabilityPressure: BabelRiskSeverity;
    coordinationPressure: BabelRiskSeverity;
    authorityClarity: DemonstrationStatus;
    participationQuality: DemonstrationStatus;
    proofContinuity: DemonstrationStatus;
    memoryGovernance: DemonstrationStatus;
  };
  generatedAt: string;
  metadata?: Record<string, unknown>;
}

export interface BabelRiskValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
