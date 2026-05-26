import type { BabelRiskConfidence, BabelRiskSeverity, DemonstrationStatus } from "./types.js";

export interface TemporalBabelRiskWindow {
  id: string;
  label?: string;
  from: string;
  to: string;
  decisionEvents: DecisionThroughputEvent[];
  closureEvents: GovernanceClosureEvent[];
  capacitySignals?: GovernanceCapacitySignal[];
  remediationEvents?: RemediationEvent[];
  proofEvents?: ProofCompletenessEvent[];
  authorityCoverageEvents?: AuthorityCoverageEvent[];
  metadata?: Record<string, unknown>;
}

export interface DecisionThroughputEvent {
  id: string;
  timestamp: string;
  kind:
    | "draft"
    | "internal_update"
    | "external_publish"
    | "external_message"
    | "customer_impacting"
    | "financial"
    | "legal"
    | "medical"
    | "security"
    | "permission_change"
    | "data_export"
    | "deletion"
    | "policy_change"
    | "runtime_execution"
    | "other";
  consequenceLevel: BabelRiskSeverity;
  agentId?: string;
  workflowId?: string;
  actionHash?: string;
  receiptHash?: string;
  fingerprintHash?: string;
  description?: string;
  evidenceRefs?: string[];
  metadata?: Record<string, unknown>;
}

export interface GovernanceClosureEvent {
  id: string;
  timestamp: string;
  kind:
    | "human_review"
    | "approval"
    | "rejection"
    | "revision_required"
    | "escalation_closed"
    | "remediation_completed"
    | "audit_finding_closed"
    | "authority_map_updated"
    | "policy_profile_updated"
    | "receipt_verified"
    | "fingerprint_verified"
    | "decision_closure_verified"
    | "other";
  participationQuality: "meaningful" | "partial" | "weak" | "rubber_stamp" | "not_demonstrated";
  closureStatus: "closed" | "partially_closed" | "not_closed" | "invalid";
  relatedDecisionIds?: string[];
  relatedFindingIds?: string[];
  humanReviewerRole?: string;
  authorityValid?: boolean;
  beforeCommitment?: boolean;
  refusalPowerDemonstrated?: boolean;
  contextSufficient?: boolean;
  scopeMatched?: boolean;
  evidenceRefs?: string[];
  metadata?: Record<string, unknown>;
}

export interface GovernanceCapacitySignal {
  id: string;
  timestamp?: string;
  kind:
    | "reviewer_bandwidth"
    | "authority_map_coverage"
    | "policy_coverage"
    | "remediation_capacity"
    | "audit_response_capacity"
    | "participation_quality_capacity"
    | "proof_verification_capacity"
    | "other";
  capacityLevel: DemonstrationStatus;
  value?: number;
  description?: string;
  evidenceRefs?: string[];
}

export interface RemediationEvent {
  id: string;
  openedAt: string;
  closedAt?: string;
  severity: BabelRiskSeverity;
  status: "open" | "closed" | "stale" | "not_demonstrated";
  description?: string;
  evidenceRefs?: string[];
}

export interface ProofCompletenessEvent {
  id: string;
  timestamp: string;
  hasReceipt?: boolean;
  hasRuntimeBinding?: boolean;
  hasDecisionClosure?: boolean;
  hasAgencyFingerprint?: boolean;
  hasAuthorityEvidence?: boolean;
  completeness: "complete" | "partial" | "weak" | "not_demonstrated";
  evidenceRefs?: string[];
}

export interface AuthorityCoverageEvent {
  id: string;
  timestamp: string;
  workflowId?: string;
  scopeId?: string;
  coverage: "covered" | "partial" | "weak" | "not_demonstrated";
  missingAuthority?: boolean;
  ambiguousAuthority?: boolean;
  staleAuthority?: boolean;
  evidenceRefs?: string[];
}

export interface GovernanceAbsorptionMetrics {
  windowId: string;
  from: string;
  to: string;
  durationHours: number;
  rawDecisionCount: number;
  riskWeightedDecisionLoad: number;
  riskWeightedDecisionRatePerHour: number;
  rawClosureCount: number;
  qualityWeightedClosureLoad: number;
  qualityWeightedClosureRatePerHour: number;
  governanceClosureRatio: number;
  estimatedAbsorptionCapacityPerHour: number;
  capacityUtilization: number;
  averageClosureLagHours?: number;
  openRemediationLoad: number;
  staleRemediationLoad: number;
  proofCompletenessScore: number;
  authorityCoverageScore: number;
  participationQualityScore: number;
}

export type BabelVelocityFindingCategory =
  | "decision_rate_exceeds_closure_rate"
  | "closure_ratio_declining"
  | "raw_approvals_mask_meaningful_closure_decline"
  | "risk_weighted_load_accelerating"
  | "review_lag_increasing"
  | "remediation_backlog_growing"
  | "authority_coverage_lagging_scope"
  | "proof_completeness_declining"
  | "capacity_ceiling_not_expanding"
  | "locally_valid_globally_drowning";

export interface BabelVelocityFinding {
  id: string;
  category: BabelVelocityFindingCategory;
  severity: BabelRiskSeverity;
  confidence: BabelRiskConfidence;
  title: string;
  summary: string;
  evidenceRefs: string[];
  recommendedRemediation: string[];
  limitations?: string[];
}

export interface BabelVelocityReport {
  version: "babel-velocity/v0.1";
  reportId: string;
  systemId?: string;
  organizationId?: string;
  workflowId?: string;
  generatedAt: string;
  windows: GovernanceAbsorptionMetrics[];
  overallVelocityRisk: BabelRiskSeverity;
  currentClosureRatio: number;
  previousClosureRatio?: number;
  closureRatioDelta?: number;
  decisionLoadDelta?: number;
  closureRateDelta?: number;
  capacityDelta?: number;
  absorptionStatus:
    | "keeping_pace"
    | "strained"
    | "falling_behind"
    | "structurally_drowning"
    | "not_enough_data";
  findings: BabelVelocityFinding[];
  summary: {
    decisionTempo: BabelRiskSeverity;
    closureCapacity: DemonstrationStatus;
    closureTrend: "improving" | "stable" | "declining" | "not_enough_data";
    proofTrend: "improving" | "stable" | "declining" | "not_enough_data";
    authorityCoverageTrend: "improving" | "stable" | "declining" | "not_enough_data";
  };
  metadata?: Record<string, unknown>;
}

export interface BabelVelocityInput {
  systemId?: string;
  organizationId?: string;
  workflowId?: string;
  windows: TemporalBabelRiskWindow[];
  metadata?: Record<string, unknown>;
}

export interface BabelVelocityValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
