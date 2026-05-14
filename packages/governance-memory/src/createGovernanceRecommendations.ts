import type {
  GovernancePattern,
  GovernanceRecommendation,
  GovernanceRecommendationType
} from "./types.js";

export function createGovernanceRecommendations(
  patterns: GovernancePattern[]
): GovernanceRecommendation[] {
  return patterns.map(createRecommendation).sort((left, right) => left.id.localeCompare(right.id));
}

function createRecommendation(pattern: GovernancePattern): GovernanceRecommendation {
  const type = recommendationTypeForPattern(pattern);

  return {
    id: `${type}:${pattern.id}`,
    type,
    severity: pattern.severity,
    title: titleForRecommendation(type, pattern),
    rationale: `${pattern.summary} This recommendation is review-only and must be approved by a human before any governance change.`,
    relatedPatternIds: [pattern.id],
    humanReviewRequired: true,
    suggestedChange: suggestedChangeForPattern(type, pattern)
  };
}

function recommendationTypeForPattern(pattern: GovernancePattern): GovernanceRecommendationType {
  switch (pattern.type) {
    case "repeated_pgdl_revision":
      return "review_policy_profile";
    case "repeated_policy_block":
      return "clarify_company_decision_boundary";
    case "repeated_hard_boundary_block":
      return "add_eval_case";
    case "repeated_missing_authority":
    case "repeated_out_of_scope_approval":
      return "review_authority_map";
    case "repeated_rubber_stamp":
      return "review_human_participation_policy";
    case "repeated_runtime_substitution":
    case "repeated_execution_denial":
      return "investigate_runtime_binding";
    case "repeated_policy_invalid":
      return "fix_invalid_policy_profile";
    case "repeated_safe_allow":
      return "reduce_review_friction_candidate";
    case "repeated_sensitive_external_attempt":
      return "add_hard_boundary_candidate";
    case "repeated_unknown_or_ambiguous_action":
      return "review_policy_profile";
  }
}

function titleForRecommendation(
  type: GovernanceRecommendationType,
  pattern: GovernancePattern
): string {
  switch (type) {
    case "review_policy_profile":
      return `Review policy profile for ${pattern.type}`;
    case "add_hard_boundary_candidate":
      return "Review candidate hard boundary for repeated sensitive external attempts";
    case "review_authority_map":
      return "Review authority map coverage and approval scopes";
    case "review_human_participation_policy":
      return "Review human participation policy for rubber-stamp signals";
    case "add_eval_case":
      return "Add eval coverage for repeated governance pattern";
    case "reduce_review_friction_candidate":
      return "Review candidate for lighter repeated safe-action handling";
    case "investigate_runtime_binding":
      return "Investigate repeated runtime binding failures";
    case "fix_invalid_policy_profile":
      return "Fix invalid policy profile inputs";
    case "clarify_company_decision_boundary":
      return "Clarify company decision boundary for repeated blocks";
  }
}

function suggestedChangeForPattern(
  type: GovernanceRecommendationType,
  pattern: GovernancePattern
): Record<string, unknown> {
  return {
    reviewOnly: true,
    recommendationType: type,
    relatedTools: pattern.relatedTools ?? [],
    relatedActionTypes: pattern.relatedActionTypes ?? [],
    relatedTargets: pattern.relatedTargets ?? [],
    patternCount: pattern.count
  };
}
