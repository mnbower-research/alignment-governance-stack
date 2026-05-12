import { evaluateApprovalQuality } from "./evaluateApprovalQuality";
import type {
  ApprovalQualityInput,
  ApprovalQualityIssue,
  ApprovalQualityStatus,
} from "./approvalQualityTypes";

type ApprovalQualityEvalCase = {
  id: string;
  name: string;
  input: ApprovalQualityInput;
  expectedStatus?: ApprovalQualityStatus;
  acceptedStatuses?: ApprovalQualityStatus[];
  expectedIssue?: ApprovalQualityIssue;
};

const baseHighRisk: ApprovalQualityInput = {
  decision: "require_approval",
  riskLevel: "high",
  reviewPacketPresent: true,
  reviewerAnswer: "I approve this exact action with this scope.",
  reviewerRationale: "The Review Packet shows the target, scope, and consequence.",
  timeSpentReviewingMs: 45000,
  approverHadAuthority: true,
  rejectionSupported: true,
  secondReviewerPresent: false,
};

const cases: ApprovalQualityEvalCase[] = [
  {
    id: "case-01",
    name: "high-risk approval in 2 seconds flags fast review",
    input: {
      ...baseHighRisk,
      timeSpentReviewingMs: 2000,
    },
    acceptedStatuses: ["weak", "insufficient"],
    expectedIssue: "review_too_fast",
  },
  {
    id: "case-02",
    name: "high-risk approval with no Review Packet is insufficient",
    input: {
      ...baseHighRisk,
      reviewPacketPresent: false,
    },
    expectedStatus: "insufficient",
    expectedIssue: "missing_review_packet",
  },
  {
    id: "case-03",
    name: "high-risk approval with no reviewer answer is weak",
    input: {
      ...baseHighRisk,
      reviewerAnswer: "",
    },
    acceptedStatuses: ["weak", "insufficient"],
    expectedIssue: "missing_reviewer_answer",
  },
  {
    id: "case-04",
    name: "approval by unauthorized reviewer is insufficient",
    input: {
      ...baseHighRisk,
      approverHadAuthority: false,
    },
    expectedStatus: "insufficient",
    expectedIssue: "missing_approval_authority",
  },
  {
    id: "case-05",
    name: "approval process with no rejection path is insufficient",
    input: {
      ...baseHighRisk,
      rejectionSupported: false,
    },
    expectedStatus: "insufficient",
    expectedIssue: "no_rejection_path",
  },
  {
    id: "case-06",
    name: "critical risk with no second reviewer is insufficient",
    input: {
      ...baseHighRisk,
      riskLevel: "critical",
      timeSpentReviewingMs: 90000,
      secondReviewerPresent: false,
    },
    expectedStatus: "insufficient",
    expectedIssue: "critical_risk_without_second_review",
  },
  {
    id: "case-07",
    name: "high-risk review with enough time and process context is sufficient",
    input: baseHighRisk,
    expectedStatus: "sufficient",
  },
  {
    id: "case-08",
    name: "medium-risk review with adequate time and context is sufficient",
    input: {
      decision: "require_approval",
      riskLevel: "medium",
      reviewPacketPresent: true,
      reviewerAnswer: "I approve this scoped action.",
      reviewerRationale: "The context is clear for the medium-risk change.",
      timeSpentReviewingMs: 15000,
      approverHadAuthority: true,
      rejectionSupported: true,
      secondReviewerPresent: false,
    },
    expectedStatus: "sufficient",
  },
];

let passed = 0;

for (const testCase of cases) {
  const result = evaluateApprovalQuality(testCase.input);
  const statusOk = testCase.expectedStatus
    ? result.status === testCase.expectedStatus
    : testCase.acceptedStatuses?.includes(result.status) ?? true;
  const issueOk = testCase.expectedIssue
    ? result.issues.includes(testCase.expectedIssue)
    : result.issues.length === 0;
  const ok = statusOk && issueOk;

  if (ok) {
    passed += 1;
  }

  console.log(
    `${ok ? "PASS" : "FAIL"} | ${testCase.id} | ${testCase.name} | status=${result.status} | score=${result.score} | issues=${result.issues.join(",") || "none"}`,
  );
}

const failed = cases.length - passed;
console.log(`Totals: passed=${passed} failed=${failed} total=${cases.length}`);

if (failed > 0) {
  process.exitCode = 1;
}
