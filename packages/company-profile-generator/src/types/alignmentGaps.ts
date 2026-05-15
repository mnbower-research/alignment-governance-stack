import type { AuthorityMap } from "@alignment-governance-stack/authority-map";
import type { HumanParticipationPolicy } from "@alignment-governance-stack/human-participation";
import type { PolicyProfile } from "@alignment-governance-stack/policy-profiles";
import type { CompanyAlignmentInput, CompanyAlignmentProfile } from "../types.js";

export type AlignmentGapSeverity = "low" | "medium" | "high" | "critical";

export type AlignmentGapType =
  | "conflicting_tool_and_boundary"
  | "missing_authority_for_required_approval"
  | "hard_boundary_override_claim"
  | "external_sharing_conflict"
  | "high_sensitivity_without_authority"
  | "production_irreversible_without_authority"
  | "review_required_without_participation_policy"
  | "missing_stop_authority"
  | "ambiguous_never_automate_boundary"
  | "permissive_default_with_strict_values"
  | "data_class_tool_sensitivity_mismatch"
  | "approval_rule_without_role"
  | "role_scope_too_broad"
  | "policy_allows_what_company_boundary_forbids"
  | "unowned_high_risk_tool"
  | "unowned_high_sensitivity_data"
  | "inconsistent_environment_rules";

export interface AlignmentGap {
  id: string;
  type: AlignmentGapType;
  severity: AlignmentGapSeverity;
  title: string;
  description: string;
  affectedItems?: string[];
  recommendation: string;
  humanReviewRequired: true;
  metadata?: Record<string, unknown>;
}

export interface AlignmentGapReport {
  id: string;
  version: "ags.alignment-gap.v1.3";
  createdAt: string;
  inputId?: string;
  inputName?: string;
  gapCount: number;
  highestSeverity?: AlignmentGapSeverity;
  gaps: AlignmentGap[];
  summary: string;
  humanReviewRequired: true;
  metadata?: Record<string, unknown>;
}

export interface DetectAlignmentGapsInput {
  companyAlignmentInput?: CompanyAlignmentInput;
  companyAlignmentProfile?: CompanyAlignmentProfile;
  policyProfile?: PolicyProfile;
  authorityMap?: AuthorityMap;
  participationPolicy?: HumanParticipationPolicy;
  metadata?: Record<string, unknown>;
}

export interface DetectAlignmentGapsOptions {
  now?: string;
  includeLowSeverity?: boolean;
}
