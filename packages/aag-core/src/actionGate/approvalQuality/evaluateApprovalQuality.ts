import type {
  ApprovalQualityInput,
  ApprovalQualityIssue,
  ApprovalQualityResult,
  ApprovalQualityStatus,
} from "./approvalQualityTypes";

const minimumReviewTimesMs: Record<ApprovalQualityInput["riskLevel"], number> = {
  low: 0,
  medium: 10000,
  high: 30000,
  critical: 60000,
};

const insufficientIssues = new Set<ApprovalQualityIssue>([
  "missing_approval_authority",
  "missing_review_packet",
  "no_rejection_path",
  "critical_risk_without_second_review",
]);

const issueWeights: Record<ApprovalQualityIssue, number> = {
  review_too_fast: 0.25,
  missing_review_packet: 0.35,
  missing_reviewer_answer: 0.2,
  missing_approval_authority: 0.4,
  no_rejection_path: 0.4,
  high_risk_without_rationale: 0.2,
  critical_risk_without_second_review: 0.4,
  unknown_review_duration: 0.15,
};

export function evaluateApprovalQuality(
  input: ApprovalQualityInput,
): ApprovalQualityResult {
  const minimumReviewTimeMs = minimumReviewTimesMs[input.riskLevel];

  if (input.decision !== "require_approval") {
    return {
      status: "unknown",
      issues: [],
      score: 1,
      reason: "Approval quality only applies to approval-gated decisions.",
      recommendedAction:
        "No approval quality evaluation is needed for this decision.",
      minimumReviewTimeMs,
      ...(input.timeSpentReviewingMs !== undefined
        ? { actualReviewTimeMs: input.timeSpentReviewingMs }
        : {}),
    };
  }

  const issues = collectIssues(input, minimumReviewTimeMs);
  const status = getStatus(issues);

  return {
    status,
    issues,
    score: scoreReviewProcess(issues),
    reason: getReason(status, issues),
    recommendedAction: getRecommendedAction(status, issues),
    minimumReviewTimeMs,
    ...(input.timeSpentReviewingMs !== undefined
      ? { actualReviewTimeMs: input.timeSpentReviewingMs }
      : {}),
  };
}

export function getMinimumReviewTimeMs(
  riskLevel: ApprovalQualityInput["riskLevel"],
): number {
  return minimumReviewTimesMs[riskLevel];
}

function collectIssues(
  input: ApprovalQualityInput,
  minimumReviewTimeMs: number,
): ApprovalQualityIssue[] {
  const issues = new Set<ApprovalQualityIssue>();

  if (input.reviewPacketPresent !== true) {
    issues.add("missing_review_packet");
  }

  if (input.timeSpentReviewingMs === undefined) {
    issues.add("unknown_review_duration");
  } else if (
    minimumReviewTimeMs > 0 &&
    input.timeSpentReviewingMs < minimumReviewTimeMs
  ) {
    issues.add("review_too_fast");
  }

  if (isHighOrCritical(input.riskLevel) && isBlank(input.reviewerAnswer)) {
    issues.add("missing_reviewer_answer");
  }

  if (isHighOrCritical(input.riskLevel) && isBlank(input.reviewerRationale)) {
    issues.add("high_risk_without_rationale");
  }

  if (input.approverHadAuthority !== true) {
    issues.add("missing_approval_authority");
  }

  if (input.rejectionSupported !== true) {
    issues.add("no_rejection_path");
  }

  if (input.riskLevel === "critical" && input.secondReviewerPresent !== true) {
    issues.add("critical_risk_without_second_review");
  }

  return Array.from(issues);
}

function getStatus(issues: ApprovalQualityIssue[]): ApprovalQualityStatus {
  if (issues.length === 0) {
    return "sufficient";
  }

  if (issues.some((issue) => insufficientIssues.has(issue))) {
    return "insufficient";
  }

  return "weak";
}

function scoreReviewProcess(issues: ApprovalQualityIssue[]): number {
  const penalty = issues.reduce(
    (total, issue) => total + issueWeights[issue],
    0,
  );

  return Math.max(0, Math.round((1 - penalty) * 100) / 100);
}

function getReason(
  status: ApprovalQualityStatus,
  issues: ApprovalQualityIssue[],
): string {
  if (status === "sufficient") {
    return "The approval process includes the minimum review-process signals for meaningful oversight.";
  }

  if (status === "insufficient") {
    return `The approval process is missing required oversight conditions: ${issues.join(", ")}.`;
  }

  return `The approval process has weak review-process signals: ${issues.join(", ")}.`;
}

function getRecommendedAction(
  status: ApprovalQualityStatus,
  issues: ApprovalQualityIssue[],
): string {
  if (status === "sufficient") {
    return "Proceed with the approval record, while preserving the review-process metadata.";
  }

  if (issues.includes("missing_review_packet")) {
    return "Provide a Review Packet before accepting approval.";
  }

  if (issues.includes("missing_approval_authority")) {
    return "Route the action to an approver with recorded authority.";
  }

  if (issues.includes("no_rejection_path")) {
    return "Add a protected rejection path before accepting approval.";
  }

  if (issues.includes("critical_risk_without_second_review")) {
    return "Require a second reviewer before accepting approval for critical risk.";
  }

  if (issues.includes("review_too_fast")) {
    return "Slow the review path and require enough time for the reviewer to inspect context.";
  }

  return "Request stronger review evidence before treating approval as meaningful oversight.";
}

function isHighOrCritical(
  riskLevel: ApprovalQualityInput["riskLevel"],
): boolean {
  return riskLevel === "high" || riskLevel === "critical";
}

function isBlank(value: string | undefined): boolean {
  return value === undefined || value.trim().length === 0;
}
