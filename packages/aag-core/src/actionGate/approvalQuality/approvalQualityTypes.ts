import type { ActionRiskLevel, GateDecision } from "../types";

export type ApprovalQualityStatus =
  | "sufficient"
  | "weak"
  | "insufficient"
  | "unknown";

export type ApprovalQualityIssue =
  | "review_too_fast"
  | "missing_review_packet"
  | "missing_reviewer_answer"
  | "missing_approval_authority"
  | "no_rejection_path"
  | "high_risk_without_rationale"
  | "critical_risk_without_second_review"
  | "unknown_review_duration";

export type ApprovalQualityInput = {
  decision: GateDecision;
  riskLevel: ActionRiskLevel;
  reviewPacketPresent?: boolean;
  reviewerAnswer?: string;
  reviewerRationale?: string;
  timeSpentReviewingMs?: number;
  approverHadAuthority?: boolean;
  rejectionSupported?: boolean;
  secondReviewerPresent?: boolean;
};

export type ApprovalQualityReviewMetadata = Omit<
  ApprovalQualityInput,
  "decision" | "riskLevel"
>;

export type ApprovalQualityResult = {
  status: ApprovalQualityStatus;
  issues: ApprovalQualityIssue[];
  score: number;
  reason: string;
  recommendedAction: string;
  minimumReviewTimeMs: number;
  actualReviewTimeMs?: number;
};
