import type {
  DecisionClosureArtifact,
  DecisionClosureCompletenessProfile,
  DecisionClosureCompletenessRequirement,
  DecisionClosureFindingSeverity
} from "./types.js";

export function evaluateDecisionClosureCompleteness(
  artifact: DecisionClosureArtifact
): DecisionClosureCompletenessProfile {
  const profileId = classifyCompletenessProfile(artifact);
  return {
    profileId,
    description: profileDescription(profileId),
    requirements: requirementsForProfile(artifact, profileId)
  };
}

function classifyCompletenessProfile(
  artifact: DecisionClosureArtifact
): DecisionClosureCompletenessProfile["profileId"] {
  if (artifact.decision.outcome === "allow" && isConsequentialExternal(artifact)) {
    return "allowed_consequential_external_action";
  }

  if (artifact.decision.outcome === "allow" && isInternalLowRiskDraft(artifact)) {
    return "allowed_internal_low_risk_draft";
  }

  if (artifact.decision.outcome === "refuse") {
    return "refused_action";
  }

  if (artifact.decision.outcome === "escalate") {
    return "escalated_action";
  }

  if (artifact.decision.outcome === "block" && (artifact.decision.hardBoundaryIds?.length ?? 0) > 0) {
    return "blocked_hard_boundary_action";
  }

  if (artifact.decision.outcome === "require_approval") {
    return "require_approval_action";
  }

  if (artifact.decision.outcome === "revise_action") {
    return "revise_action";
  }

  return "general_closure";
}

function requirementsForProfile(
  artifact: DecisionClosureArtifact,
  profileId: DecisionClosureCompletenessProfile["profileId"]
): DecisionClosureCompletenessRequirement[] {
  if (profileId === "allowed_consequential_external_action") {
    return [
      requirement("authority_valid", "Authority valid", artifact.authority.authorityValid, "$.authority.authorityValid", "critical", "Provide valid authority evidence for the exact external action."),
      requirement("human_review", "Human review present when required", !artifact.decision.humanReviewRequired || artifact.decision.humanReviewPresent, "$.decision.humanReviewPresent", "high", "Attach human review evidence or do not allow execution."),
      requirement("runtime_permit", "Runtime permit present", hasText(artifact.executionBoundary.runtimePermitId), "$.executionBoundary.runtimePermitId", "high", "Issue a narrow runtime permit before execution."),
      requirement("runtime_binding_hash", "Runtime binding hash present", hasText(artifact.executionBoundary.runtimeBindingHash), "$.executionBoundary.runtimeBindingHash", "high", "Bind permit to exact tool, target, action type, content hash, and expiration window."),
      requirement("receipt_hash", "Receipt hash present", hasText(artifact.proof.receiptHash), "$.proof.receiptHash", "high", "Generate a hash-bound receipt after decision."),
      requirement("third_party_readable", "Third-party-readable summary present", artifact.auditSummary.readableWithoutSystemAccess && hasText(artifact.auditSummary.summary), "$.auditSummary", "high", "Recreate the artifact with a readable summary and unresolved questions."),
      requirement("target_scoped", "Target covered by allowed targets", targetCovered(artifact), "$.conditions.allowedTargets", "high", "Require target-bound approval for the exact channel and audience."),
      requirement("no_hard_boundary_conflict", "No active hard-boundary conflict", (artifact.decision.hardBoundaryIds?.length ?? 0) === 0, "$.decision.hardBoundaryIds", "critical", "Do not allow execution while hard boundaries are present.")
    ];
  }

  if (profileId === "allowed_internal_low_risk_draft") {
    return [
      requirement("summary", "Readable summary present", hasText(artifact.auditSummary.summary), "$.auditSummary.summary", "medium", "Add a concise third-party-readable summary."),
      requirement("no_external_target", "No external target", !isExternal(artifact), "$.action.target", "high", "Reclassify as external publish if target or audience is external."),
      requirement("signature_optional", "Signature optional", true, "$.proof.signature", "low", "Treat unsigned internal draft artifacts as hash-bound but not signature-verified.")
    ];
  }

  if (profileId === "refused_action") {
    return [
      requirement("decision_reason", "Decision reason present", hasText(artifact.decision.reason), "$.decision.reason", "medium", "Record why the action was refused."),
      requirement("readable_summary", "Readable summary present", hasText(artifact.auditSummary.summary), "$.auditSummary.summary", "medium", "Add a summary that can be reviewed without reconstructing logs.")
    ];
  }

  if (profileId === "escalated_action") {
    return [
      requirement("reason", "Escalation reason present", hasText(artifact.decision.reason), "$.decision.reason", "medium", "Record why escalation is required."),
      requirement("questions", "Unresolved questions present", artifact.auditSummary.unresolvedQuestions.length > 0, "$.auditSummary.unresolvedQuestions", "medium", "State the authority or evidence questions for human review."),
      requirement("human_review_required", "Human review requirement present", artifact.decision.humanReviewRequired, "$.decision.humanReviewRequired", "medium", "Mark escalated actions as requiring human review.")
    ];
  }

  if (profileId === "blocked_hard_boundary_action") {
    return [
      requirement("hard_boundary", "Hard boundary ID present", (artifact.decision.hardBoundaryIds?.length ?? 0) > 0, "$.decision.hardBoundaryIds", "high", "Record the hard boundary that caused the block."),
      requirement("reason", "Block reason present", hasText(artifact.decision.reason), "$.decision.reason", "medium", "Record why the hard boundary blocked execution."),
      requirement("remediation", "Remediation hint present", artifact.auditSummary.remediationHints.length > 0, "$.auditSummary.remediationHints", "medium", "Add remediation guidance for the blocked action.")
    ];
  }

  if (profileId === "require_approval_action") {
    return [
      requirement("approval_reason", "Approval reason present", hasText(artifact.decision.reason), "$.decision.reason", "medium", "Record why approval is required."),
      requirement("authority_requirement", "Authority requirement present", hasText(artifact.authority.authorityReason), "$.authority.authorityReason", "medium", "Identify the reviewer or authority requirement."),
      requirement("scope", "Approval scope present", hasText(artifact.conditions.scope), "$.conditions.scope", "medium", "State the target and scope needing approval."),
      requirement("questions", "Unresolved questions present", artifact.auditSummary.unresolvedQuestions.length > 0, "$.auditSummary.unresolvedQuestions", "medium", "List the open approval questions.")
    ];
  }

  if (profileId === "revise_action") {
    return [
      requirement("revision_reason", "Revision reason present", hasText(artifact.decision.reason), "$.decision.reason", "medium", "Record the original risk and safer revision path."),
      requirement("scope", "Safer action scope present", hasText(artifact.conditions.scope), "$.conditions.scope", "medium", "Describe the safer proposed action or revised scope.")
    ];
  }

  return [
    requirement("summary", "Readable summary present", hasText(artifact.auditSummary.summary), "$.auditSummary.summary", "medium", "Add a concise summary."),
    requirement("decision_reason", "Decision reason present", hasText(artifact.decision.reason), "$.decision.reason", "medium", "Record the decision reason.")
  ];
}

function requirement(
  id: string,
  label: string,
  satisfied: boolean,
  evidencePath: string,
  severityIfMissing: DecisionClosureFindingSeverity,
  remediation: string
): DecisionClosureCompletenessRequirement {
  return { id, label, required: true, satisfied, evidencePath, severityIfMissing, remediation };
}

function profileDescription(profileId: DecisionClosureCompletenessProfile["profileId"]): string {
  const descriptions: Record<DecisionClosureCompletenessProfile["profileId"], string> = {
    allowed_consequential_external_action: "Allowed consequential external actions require authority, review, permit, binding, receipt, target scope, readability, and no hard-boundary conflict.",
    allowed_internal_low_risk_draft: "Allowed internal low-risk drafts do not require external-publish proof; unsigned status remains a low integrity disclosure.",
    refused_action: "Refused actions require a decision reason and readable summary, but do not require runtime permit or binding proof.",
    escalated_action: "Escalated actions require a reason, unresolved questions, and a human-review requirement.",
    blocked_hard_boundary_action: "Blocked hard-boundary actions require the boundary ID, reason, and remediation guidance.",
    require_approval_action: "Approval-gated actions require an approval reason, authority requirement, target scope, and open questions.",
    revise_action: "Revision outcomes require a revision reason and safer action scope when available.",
    general_closure: "General closure artifacts require readable summary and decision reason."
  };

  return descriptions[profileId];
}

function isInternalLowRiskDraft(artifact: DecisionClosureArtifact): boolean {
  return artifact.action.sensitivity === "low" &&
    artifact.action.reversibility === "reversible" &&
    !artifact.executionBoundary.runtimePermitRequired &&
    !isExternal(artifact);
}

function isConsequentialExternal(artifact: DecisionClosureArtifact): boolean {
  return isExternal(artifact) || artifact.action.sensitivity === "high" || artifact.action.sensitivity === "critical";
}

function isExternal(artifact: DecisionClosureArtifact): boolean {
  const values = [
    artifact.action.actionType,
    artifact.action.toolName,
    artifact.action.target,
    artifact.executionBoundary.boundaryType,
    artifact.context?.actualActionType,
    artifact.context?.actualTarget,
    artifact.context?.runtimeTarget,
    artifact.context?.channel,
    artifact.context?.audience
  ].filter((value): value is string => typeof value === "string");

  return values.some((value) => /external|public|publish|linkedin|twitter|x\/|website|social|github_pages/i.test(value));
}

function targetCovered(artifact: DecisionClosureArtifact): boolean {
  return artifact.conditions.allowedTargets === undefined || artifact.conditions.allowedTargets.includes(artifact.action.target);
}

function hasText(value: string | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}
