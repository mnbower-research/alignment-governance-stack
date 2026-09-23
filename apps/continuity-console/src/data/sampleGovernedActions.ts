export type SampleHumanReviewRequirement = "Required now" | "Not required yet";
export type SampleAuthorityClass = "advisory" | "binding";
export type SampleGovernanceEvaluationStatus = "passed" | "escalated" | "recommended-revision" | "pending" | "blocked";
export type SampleRuntimePermitState = "not-requested" | "pending-human-review" | "validated";
export type SampleReceiptState = "not-started" | "pending-decision" | "partial" | "recorded";

export interface SampleGovernanceEvaluation {
  evaluationId: string;
  layerName: string;
  plainLanguagePurpose: string;
  currentVerdict: string;
  authorityClass: SampleAuthorityClass;
  status: SampleGovernanceEvaluationStatus;
  technicalDetails: string;
}

export interface SampleGovernedActivityEvent {
  eventId: string;
  label: string;
  summary: string;
  timestamp: string;
  technicalDetails: string;
}

export interface SampleGovernedActionRecord {
  actionId: string;
  objectiveId: string;
  objective: string;
  assignedAgent: string;
  scope: string;
  status: string;
  nextExpectedStep: string;
  humanReview: SampleHumanReviewRequirement;
  proposedAction: string;
  reviewReason: string;
  strongestConcern: string;
  target: string;
  reversibility: boolean;
  recommendedOperatorAction: string;
  governanceEvaluations: SampleGovernanceEvaluation[];
  runtimePermitState: SampleRuntimePermitState;
  receiptState: SampleReceiptState;
  activityEvents: SampleGovernedActivityEvent[];
}

export const sampleGovernedActions: SampleGovernedActionRecord[] = [
  {
    actionId: "action-release-draft",
    objectiveId: "objective-release-note",
    objective: "Prepare release-note draft for human review",
    assignedAgent: "Internal Docs Agent Team",
    scope: "Draft-only content in the internal workspace",
    status: "In review",
    nextExpectedStep: "Inspect revised proposal evidence",
    humanReview: "Required now",
    proposedAction: "Create reviewed public changelog draft",
    reviewReason: "External-facing language requires scoped release-owner review.",
    strongestConcern: "PGDL objection: draft and publish intent were initially blurred.",
    target: "docs/release-drafts",
    reversibility: true,
    recommendedOperatorAction: "Inspect evidence, verify target-bound release authority, then continue in Approvals.",
    runtimePermitState: "pending-human-review",
    receiptState: "pending-decision",
    governanceEvaluations: [
      {
        evaluationId: "eval-release-identity",
        layerName: "Identity verification",
        plainLanguagePurpose: "Confirm the requesting agent and accountable workflow owner.",
        currentVerdict: "Identity context present",
        authorityClass: "binding",
        status: "passed",
        technicalDetails: "Sample identity evidence references internal-docs-agent and release owner scope.",
      },
      {
        evaluationId: "eval-release-policy",
        layerName: "Policy boundary",
        plainLanguagePurpose: "Check whether the proposed action crosses a public-claim boundary.",
        currentVerdict: "Public publishing remains out of scope",
        authorityClass: "binding",
        status: "passed",
        technicalDetails: "Sample policy boundary treats external publication as blocked without release-owner approval.",
      },
      {
        evaluationId: "eval-release-domain",
        layerName: "Domain-specific constraint",
        plainLanguagePurpose: "Require release-language review before any public-facing claim.",
        currentVerdict: "Human wording review required",
        authorityClass: "advisory",
        status: "escalated",
        technicalDetails: "Sample domain check recommends review because release copy can create external commitments.",
      },
      {
        evaluationId: "eval-release-pgdl",
        layerName: "PGDL proposal scrutiny",
        plainLanguagePurpose: "Object to vague external-facing scope before AAG sees the packet.",
        currentVerdict: "Draft-only revision recommended",
        authorityClass: "advisory",
        status: "recommended-revision",
        technicalDetails: "Sample PGDL objection flags ambiguity between drafting and publishing.",
      },
      {
        evaluationId: "eval-release-aag",
        layerName: "AAG authority check",
        plainLanguagePurpose: "Gate the proposed action against approval, target, and scope.",
        currentVerdict: "Human review required before allow",
        authorityClass: "binding",
        status: "escalated",
        technicalDetails: "Sample AAG concern is target-bound release authority.",
      },
      {
        evaluationId: "eval-release-runtime",
        layerName: "Runtime Binding",
        plainLanguagePurpose: "Confirm any runtime action matches a narrow permit.",
        currentVerdict: "Pending permit",
        authorityClass: "binding",
        status: "pending",
        technicalDetails: "No runtime action is represented in this preview.",
      },
      {
        evaluationId: "eval-release-receipt",
        layerName: "Receipt recording",
        plainLanguagePurpose: "Preserve proof of review outcome and later action evidence.",
        currentVerdict: "Receipt expected after decision",
        authorityClass: "binding",
        status: "pending",
        technicalDetails: "Preview data has no receipt write-back behavior.",
      },
    ],
    activityEvents: [
      {
        eventId: "activity-release-assigned",
        label: "Objective assigned",
        summary: "Release-note draft objective assigned to Internal Docs Agent Team.",
        timestamp: "09:26",
        technicalDetails: "Sample activity only. No live assignment or external orchestration occurred.",
      },
      {
        eventId: "activity-release-revised",
        label: "Proposal revised after objection",
        summary: "PGDL requested draft-only scope before AAG review.",
        timestamp: "09:28",
        technicalDetails: "Sample PGDL path references action action-release-draft.",
      },
      {
        eventId: "activity-release-permit",
        label: "Runtime permit validated",
        summary: "Sample permit validation matched draft-only target and scope.",
        timestamp: "09:36",
        technicalDetails: "Sample permit validation is illustrative; no permit was issued by this page.",
      },
      {
        eventId: "activity-release-receipt",
        label: "Receipt recorded",
        summary: "Sample receipt evidence marked partial pending final signature.",
        timestamp: "09:37",
        technicalDetails: "This page does not write receipt artifacts.",
      },
      {
        eventId: "activity-release-memory",
        label: "Governance Memory recommendation generated",
        summary: "Recommendation surfaced for target-bound approval prompts.",
        timestamp: "09:41",
        technicalDetails: "Sample Governance Memory recommendations require human review and do not mutate policy.",
      },
    ],
  },
  {
    actionId: "action-finance-summary",
    objectiveId: "objective-finance-summary",
    objective: "Summarize sensitive Q2 figures for internal planning",
    assignedAgent: "Finance Summary Agent",
    scope: "Internal finance workspace, no external transmission",
    status: "Waiting on authority check",
    nextExpectedStep: "Confirm target-bound finance approver",
    humanReview: "Required now",
    proposedAction: "Summarize sensitive Q2 figures",
    reviewReason: "Sensitive data and target-bound approval evidence are incomplete.",
    strongestConcern: "AAG concern: missing approval for the destination workspace.",
    target: "internal finance workspace",
    reversibility: true,
    recommendedOperatorAction: "Inspect authority evidence and request narrower proposal scope.",
    runtimePermitState: "pending-human-review",
    receiptState: "pending-decision",
    governanceEvaluations: [
      {
        evaluationId: "eval-finance-identity",
        layerName: "Identity verification",
        plainLanguagePurpose: "Confirm the requesting finance agent and responsible approver.",
        currentVerdict: "Requester known, approver target incomplete",
        authorityClass: "binding",
        status: "escalated",
        technicalDetails: "Sample identity data lacks target-bound finance approval.",
      },
      {
        evaluationId: "eval-finance-policy",
        layerName: "Policy boundary",
        plainLanguagePurpose: "Prevent sensitive financial data from leaving the internal workspace.",
        currentVerdict: "External send is blocked",
        authorityClass: "binding",
        status: "blocked",
        technicalDetails: "Sample policy blocks external transmission for sensitive Q2 figures.",
      },
      {
        evaluationId: "eval-finance-domain",
        layerName: "Domain-specific constraint",
        plainLanguagePurpose: "Require finance-owner review for sensitive summaries.",
        currentVerdict: "Finance review required",
        authorityClass: "advisory",
        status: "escalated",
        technicalDetails: "Sample domain constraint classifies the summary as high-sensitivity internal data.",
      },
      {
        evaluationId: "eval-finance-pgdl",
        layerName: "PGDL proposal scrutiny",
        plainLanguagePurpose: "Challenge broad data selection and unclear audience.",
        currentVerdict: "Narrow audience and fields before AAG",
        authorityClass: "advisory",
        status: "recommended-revision",
        technicalDetails: "Sample PGDL objection flags overbroad financial context.",
      },
      {
        evaluationId: "eval-finance-aag",
        layerName: "AAG authority check",
        plainLanguagePurpose: "Require scoped approval before any sensitive summary is produced.",
        currentVerdict: "Missing target-bound approval",
        authorityClass: "binding",
        status: "escalated",
        technicalDetails: "Sample AAG concern is missing approval for the destination workspace.",
      },
      {
        evaluationId: "eval-finance-runtime",
        layerName: "Runtime Binding",
        plainLanguagePurpose: "Prevent tool or target substitution after permit issuance.",
        currentVerdict: "No permit issued",
        authorityClass: "binding",
        status: "pending",
        technicalDetails: "Preview does not issue permits.",
      },
      {
        evaluationId: "eval-finance-receipt",
        layerName: "Receipt recording",
        plainLanguagePurpose: "Record the final review disposition and evidence basis.",
        currentVerdict: "Receipt pending decision",
        authorityClass: "binding",
        status: "pending",
        technicalDetails: "Preview does not write receipts.",
      },
    ],
    activityEvents: [
      {
        eventId: "activity-finance-blocked",
        label: "Action blocked by AAG",
        summary: "External send path blocked until scoped authority is demonstrated.",
        timestamp: "09:32",
        technicalDetails: "Sample AAG block has no runtime execution side effect.",
      },
      {
        eventId: "activity-finance-domain-review",
        label: "Domain constraint requested human review",
        summary: "Finance summary requires a finance-owner check before proceeding.",
        timestamp: "09:34",
        technicalDetails: "Sample domain constraint is advisory and does not mutate policy.",
      },
    ],
  },
  {
    actionId: "action-workflow-cleanup",
    objectiveId: "objective-workflow-cleanup",
    objective: "Identify stale workflow cleanup candidates",
    assignedAgent: "Workflow Maintenance Agent",
    scope: "Read-only workflow inspection",
    status: "Queued",
    nextExpectedStep: "Generate proposal packet",
    humanReview: "Not required yet",
    proposedAction: "Inspect stale workflow nodes",
    reviewReason: "No review packet has been generated yet.",
    strongestConcern: "No PGDL objection or AAG concern yet.",
    target: "development workflow catalog",
    reversibility: true,
    recommendedOperatorAction: "Wait for a proposal packet before review.",
    runtimePermitState: "not-requested",
    receiptState: "not-started",
    governanceEvaluations: [],
    activityEvents: [],
  },
];
