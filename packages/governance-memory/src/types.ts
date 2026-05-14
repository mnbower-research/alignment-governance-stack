import type { GovernanceReceipt } from "@alignment-governance-stack/receipts";

export type GovernanceMemorySeverity = "low" | "medium" | "high";

export interface GovernanceMemoryInput {
  receipts: GovernanceReceipt[];
  minOccurrences?: number;
  metadata?: Record<string, unknown>;
}

export type GovernancePatternType =
  | "repeated_pgdl_revision"
  | "repeated_policy_block"
  | "repeated_hard_boundary_block"
  | "repeated_missing_authority"
  | "repeated_out_of_scope_approval"
  | "repeated_rubber_stamp"
  | "repeated_runtime_substitution"
  | "repeated_execution_denial"
  | "repeated_policy_invalid"
  | "repeated_safe_allow"
  | "repeated_sensitive_external_attempt"
  | "repeated_unknown_or_ambiguous_action";

export interface GovernancePattern {
  id: string;
  type: GovernancePatternType;
  count: number;
  severity: GovernanceMemorySeverity;
  summary: string;
  evidenceReceiptHashes: string[];
  relatedTools?: string[];
  relatedActionTypes?: string[];
  relatedTargets?: string[];
  relatedFinalDecisions?: string[];
  metadata?: Record<string, unknown>;
}

export type GovernanceRecommendationType =
  | "review_policy_profile"
  | "add_hard_boundary_candidate"
  | "review_authority_map"
  | "review_human_participation_policy"
  | "add_eval_case"
  | "reduce_review_friction_candidate"
  | "investigate_runtime_binding"
  | "fix_invalid_policy_profile"
  | "clarify_company_decision_boundary";

export interface GovernanceRecommendation {
  id: string;
  type: GovernanceRecommendationType;
  severity: GovernanceMemorySeverity;
  title: string;
  rationale: string;
  relatedPatternIds: string[];
  humanReviewRequired: true;
  suggestedChange?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface GovernanceMemoryReport {
  id: string;
  version: "ags.governance-memory.v1.0";
  createdAt: string;
  receiptCount: number;
  patterns: GovernancePattern[];
  recommendations: GovernanceRecommendation[];
  summary: string;
  metadata?: Record<string, unknown>;
}

export interface DetectGovernancePatternsOptions {
  minOccurrences?: number;
}
