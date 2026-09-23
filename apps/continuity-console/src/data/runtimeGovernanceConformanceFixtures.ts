export type ConformanceRequirementClass = "mandatory" | "optional";
export type ConformanceAuthorityClass = "advisory" | "binding";
export type ConformanceFreshnessState = "current" | "stale";
export type ConformanceModuleVerdict = "pass" | "recommend-revision" | "require-human-review" | "block" | "unavailable" | "pending";
export type ConformancePgdlStatus = "continue" | "recommend-revision" | "escalate" | "blocked";
export type ConformanceAagStatus = "allow" | "require-human-review" | "block" | "withhold-permit" | "re-evaluation-required";
export type ConformanceRuntimePermitState = "not-issued" | "eligible-for-issuance" | "withheld" | "invalidated" | "blocked" | "revoked";
export type ConformanceReceiptState = "reserved" | "permit-issued" | "finalized" | "aborted" | "not-started";
export type ConformanceActionConsequence = "low" | "medium" | "consequential";
export type ConformanceReceiptReservationState = "reserved" | "failed";

export interface ConformanceModuleEvaluation {
  moduleId: string;
  moduleName: string;
  requirementClass: ConformanceRequirementClass;
  authorityClass: ConformanceAuthorityClass;
  verdict: ConformanceModuleVerdict;
  overrideability: boolean;
  nonOverridable: boolean;
  freshnessState: ConformanceFreshnessState;
  explanation: string;
}

export interface ConformanceStatusExplanation<TStatus extends string> {
  status: TStatus;
  explanation: string;
}

export interface ConformanceHumanReviewState {
  required: boolean;
  satisfied: boolean;
  explanation: string;
}

export interface ConformanceRuntimePermitExpectation {
  eligible: boolean;
  expectedState: ConformanceRuntimePermitState;
  explanation: string;
  reusableForMismatchedAction?: boolean;
}

export interface ConformanceReceiptExpectation {
  lifecycleStarted: boolean;
  expectedState: ConformanceReceiptState;
  explanation: string;
}

export interface ConformanceSystemAuditExpectation {
  required: boolean;
  eventType?: string;
  explanation: string;
}

export interface ConformanceReceiptPrerequisite {
  required: boolean;
  reservationState: ConformanceReceiptReservationState;
  explanation: string;
}

export interface ConformanceExecutionAttempt {
  authorizedTool: string;
  authorizedTarget: string;
  authorizedScope: string;
  attemptedTool: string;
  attemptedTarget: string;
  attemptedScope: string;
  sideEffectStarted: boolean;
  permitReusable: boolean;
}

export interface RuntimeGovernanceConformanceFixture {
  fixtureId: string;
  title: string;
  purpose: string;
  deterministicRule: string;
  objective: string;
  actionType: string;
  actor: string;
  target: string;
  requestedTool: string;
  scope: string;
  sensitivity: string;
  consequence: ConformanceActionConsequence;
  reversibility: boolean;
  envelopeVersion: string;
  envelopeIntegrityReference: string;
  freshnessState: ConformanceFreshnessState;
  receiptPrerequisite: ConformanceReceiptPrerequisite;
  moduleEvaluations: ConformanceModuleEvaluation[];
  pgdlRecommendation: ConformanceStatusExplanation<ConformancePgdlStatus>;
  aagDecision: ConformanceStatusExplanation<ConformanceAagStatus>;
  humanReview: ConformanceHumanReviewState;
  runtimePermit: ConformanceRuntimePermitExpectation;
  receipt: ConformanceReceiptExpectation;
  systemAudit: ConformanceSystemAuditExpectation;
  executionAttempt?: ConformanceExecutionAttempt;
  operatorExplanation: string;
  expectedAuditEvidence: string[];
}

// Static conformance-reference artifacts only. These records do not execute actions,
// issue permits, implement orchestration, or connect external modules.
export const minimalConformanceFixtures: RuntimeGovernanceConformanceFixture[] = [
  {
    fixtureId: "rgcf-001-valid-low-risk-internal-draft",
    title: "Valid low-risk internal draft",
    purpose: "Establish the positive control case where all required checks pass.",
    deterministicRule: "A permit may be eligible only when mandatory checks are current, no binding block remains, no review is required, and receipt continuity is available.",
    objective: "Prepare an internal documentation draft.",
    actionType: "create-internal-draft",
    actor: "internal-docs-agent",
    target: "internal-docs-workspace/release-draft.md",
    requestedTool: "internal-doc-writer",
    scope: "Approved internal workspace draft only; no external transmission.",
    sensitivity: "low",
    consequence: "low",
    reversibility: true,
    envelopeVersion: "env-rgcf-001-v1",
    envelopeIntegrityReference: "fixture-hash-rgcf-001-v1",
    freshnessState: "current",
    receiptPrerequisite: {
      required: true,
      reservationState: "reserved",
      explanation: "A unified receipt can be reserved before permit eligibility is evaluated.",
    },
    moduleEvaluations: [
      {
        moduleId: "identity-verification",
        moduleName: "Identity verification",
        requirementClass: "mandatory",
        authorityClass: "binding",
        verdict: "pass",
        overrideability: false,
        nonOverridable: false,
        freshnessState: "current",
        explanation: "The internal documentation agent identity is known for this workspace.",
      },
      {
        moduleId: "policy-boundary",
        moduleName: "Policy boundary",
        requirementClass: "mandatory",
        authorityClass: "binding",
        verdict: "pass",
        overrideability: false,
        nonOverridable: false,
        freshnessState: "current",
        explanation: "The target is an approved internal draft workspace.",
      },
    ],
    pgdlRecommendation: {
      status: "continue",
      explanation: "PGDL finds no objection because the proposal is narrow, internal, and reversible.",
    },
    aagDecision: {
      status: "allow",
      explanation: "AAG may allow because required checks pass and receipt continuity is available.",
    },
    humanReview: {
      required: false,
      satisfied: false,
      explanation: "No human review is required for this low-risk internal draft fixture.",
    },
    runtimePermit: {
      eligible: true,
      expectedState: "eligible-for-issuance",
      explanation: "A narrow permit is eligible for the exact actor, tool, target, scope, envelope version, and integrity reference.",
    },
    receipt: {
      lifecycleStarted: true,
      expectedState: "finalized",
      explanation: "The receipt can progress from reserved to permit-issued and finalized after execution evidence.",
    },
    systemAudit: {
      required: false,
      explanation: "No separate system-level audit event is required for the positive control path.",
    },
    operatorExplanation: "The internal draft action passed required checks and remains limited to the approved internal workspace.",
    expectedAuditEvidence: [
      "current action envelope",
      "identity verification pass",
      "policy boundary pass",
      "PGDL continue recommendation",
      "AAG allow decision",
      "reserved receipt",
    ],
  },
  {
    fixtureId: "rgcf-003-binding-human-review-requirement",
    title: "Binding human-review requirement",
    purpose: "Confirm that unresolved binding human review prevents automatic execution.",
    deterministicRule: "AAG cannot allow automatic execution while a binding human-review requirement remains unresolved.",
    objective: "Summarize sensitive internal financial figures.",
    actionType: "summarize-sensitive-financial-data",
    actor: "finance-summary-agent",
    target: "planning-workspace/q2-summary.md",
    requestedTool: "workspace-writer",
    scope: "Sensitive internal figures for planning workspace, destination approval unverified.",
    sensitivity: "high",
    consequence: "consequential",
    reversibility: true,
    envelopeVersion: "env-rgcf-003-v1",
    envelopeIntegrityReference: "fixture-hash-rgcf-003-v1",
    freshnessState: "current",
    receiptPrerequisite: {
      required: true,
      reservationState: "reserved",
      explanation: "A unified receipt is reserved before human-review gating is evaluated.",
    },
    moduleEvaluations: [
      {
        moduleId: "identity-verification",
        moduleName: "Identity verification",
        requirementClass: "mandatory",
        authorityClass: "binding",
        verdict: "pass",
        overrideability: false,
        nonOverridable: false,
        freshnessState: "current",
        explanation: "The finance summary agent identity is known.",
      },
      {
        moduleId: "destination-authority",
        moduleName: "Destination authority",
        requirementClass: "mandatory",
        authorityClass: "binding",
        verdict: "require-human-review",
        overrideability: false,
        nonOverridable: false,
        freshnessState: "current",
        explanation: "Destination approval for the sensitive planning workspace is not verified.",
      },
    ],
    pgdlRecommendation: {
      status: "escalate",
      explanation: "PGDL recommends narrowing audience and fields before authorization.",
    },
    aagDecision: {
      status: "require-human-review",
      explanation: "AAG cannot allow automatic execution until destination approval review is satisfied.",
    },
    humanReview: {
      required: true,
      satisfied: false,
      explanation: "Target-bound finance review is required and unresolved for this envelope version.",
    },
    runtimePermit: {
      eligible: false,
      expectedState: "not-issued",
      explanation: "No permit is available while the binding human-review requirement remains unresolved.",
    },
    receipt: {
      lifecycleStarted: true,
      expectedState: "reserved",
      explanation: "A receipt is reserved and records the unresolved review requirement.",
    },
    systemAudit: {
      required: false,
      explanation: "The unified receipt records the review boundary for this fixture.",
    },
    operatorExplanation: "Sensitive financial data cannot proceed because destination approval is missing.",
    expectedAuditEvidence: [
      "current action envelope",
      "destination authority review requirement",
      "sensitive-data scope",
      "PGDL escalation recommendation",
      "AAG require-human-review decision",
      "reserved receipt",
    ],
  },
  {
    fixtureId: "rgcf-004-binding-block",
    title: "Binding block",
    purpose: "Confirm that a binding block prevents permit issuance.",
    deterministicRule: "AAG cannot override a binding block.",
    objective: "Deploy code after tests pass.",
    actionType: "deploy-software",
    actor: "deployment-agent",
    target: "production-service",
    requestedTool: "deployment-automation",
    scope: "Deploy build artifact to production service.",
    sensitivity: "high",
    consequence: "consequential",
    reversibility: true,
    envelopeVersion: "env-rgcf-004-v1",
    envelopeIntegrityReference: "fixture-hash-rgcf-004-v1",
    freshnessState: "current",
    receiptPrerequisite: {
      required: true,
      reservationState: "reserved",
      explanation: "A unified receipt is reserved before the binding block is recorded.",
    },
    moduleEvaluations: [
      {
        moduleId: "ci-test-evidence",
        moduleName: "CI test evidence",
        requirementClass: "mandatory",
        authorityClass: "binding",
        verdict: "pass",
        overrideability: false,
        nonOverridable: false,
        freshnessState: "current",
        explanation: "Automated tests passed for the referenced build artifact.",
      },
      {
        moduleId: "secret-scanner",
        moduleName: "Secret scanner",
        requirementClass: "mandatory",
        authorityClass: "binding",
        verdict: "block",
        overrideability: false,
        nonOverridable: false,
        freshnessState: "current",
        explanation: "A credential exposure was detected in the deployment artifact.",
      },
    ],
    pgdlRecommendation: {
      status: "blocked",
      explanation: "PGDL recommends remediation of the exposed credential before authorization.",
    },
    aagDecision: {
      status: "block",
      explanation: "AAG blocks because the mandatory secret scanner returned a binding block.",
    },
    humanReview: {
      required: false,
      satisfied: false,
      explanation: "Human approval does not silently bypass the binding block in this fixture.",
    },
    runtimePermit: {
      eligible: false,
      expectedState: "blocked",
      explanation: "No permit may be issued while the binding scanner block remains.",
    },
    receipt: {
      lifecycleStarted: true,
      expectedState: "aborted",
      explanation: "The receipt records the block and aborted authorization path.",
    },
    systemAudit: {
      required: false,
      explanation: "The unified receipt records the binding block.",
    },
    operatorExplanation: "Deployment is blocked because the mandatory secret scanner found an exposed credential.",
    expectedAuditEvidence: [
      "current action envelope",
      "passing test evidence",
      "secret-scanner binding block",
      "PGDL remediation recommendation",
      "AAG block decision",
      "aborted receipt",
    ],
  },
  {
    fixtureId: "rgcf-006-mandatory-module-outage",
    title: "Mandatory module outage",
    purpose: "Verify fail-closed behavior for mandatory binding module outage.",
    deterministicRule: "A mandatory binding module outage fails closed by default and cannot support permit eligibility.",
    objective: "Perform a low-risk internal metadata update.",
    actionType: "update-internal-metadata",
    actor: "maintenance-agent",
    target: "internal-catalog/workflow-metadata",
    requestedTool: "metadata-writer",
    scope: "Narrow reversible internal metadata update.",
    sensitivity: "low",
    consequence: "low",
    reversibility: true,
    envelopeVersion: "env-rgcf-006-v1",
    envelopeIntegrityReference: "fixture-hash-rgcf-006-v1",
    freshnessState: "current",
    receiptPrerequisite: {
      required: true,
      reservationState: "reserved",
      explanation: "A unified receipt is reserved before the mandatory outage is recorded.",
    },
    moduleEvaluations: [
      {
        moduleId: "identity-verification",
        moduleName: "Identity verification",
        requirementClass: "mandatory",
        authorityClass: "binding",
        verdict: "unavailable",
        overrideability: false,
        nonOverridable: false,
        freshnessState: "current",
        explanation: "The mandatory identity module is unavailable.",
      },
      {
        moduleId: "policy-boundary",
        moduleName: "Policy boundary",
        requirementClass: "mandatory",
        authorityClass: "binding",
        verdict: "pass",
        overrideability: false,
        nonOverridable: false,
        freshnessState: "current",
        explanation: "The requested metadata target is internal and reversible.",
      },
    ],
    pgdlRecommendation: {
      status: "escalate",
      explanation: "PGDL holds pending required identity evidence.",
    },
    aagDecision: {
      status: "withhold-permit",
      explanation: "AAG withholds permit because a mandatory binding module is unavailable.",
    },
    humanReview: {
      required: false,
      satisfied: false,
      explanation: "No human fallback is modeled for the mandatory identity outage.",
    },
    runtimePermit: {
      eligible: false,
      expectedState: "withheld",
      explanation: "No permit may be issued while mandatory identity verification is unavailable.",
    },
    receipt: {
      lifecycleStarted: true,
      expectedState: "reserved",
      explanation: "The receipt records the unavailable mandatory evaluation.",
    },
    systemAudit: {
      required: false,
      explanation: "The unified receipt records the outage for this fixture.",
    },
    operatorExplanation: "The action fails closed because mandatory identity verification is unavailable.",
    expectedAuditEvidence: [
      "current action envelope",
      "mandatory identity unavailable verdict",
      "policy boundary pass",
      "PGDL hold recommendation",
      "AAG withhold-permit decision",
      "reserved receipt",
    ],
  },
  {
    fixtureId: "rgcf-008-material-revision-invalidates-evaluations",
    title: "Material envelope revision invalidates prior evaluations",
    purpose: "Verify that material changes invalidate evaluations and prior permit eligibility.",
    deterministicRule: "Material envelope changes require a new version and fresh required evaluations before permit eligibility.",
    objective: "Send an approved internal email draft.",
    actionType: "send-email-draft",
    actor: "internal-docs-agent",
    target: "external-release-list",
    requestedTool: "email-sender",
    scope: "Revised email draft now includes an external recipient.",
    sensitivity: "medium",
    consequence: "medium",
    reversibility: false,
    envelopeVersion: "env-rgcf-008-v2",
    envelopeIntegrityReference: "fixture-hash-rgcf-008-v2",
    freshnessState: "current",
    receiptPrerequisite: {
      required: true,
      reservationState: "reserved",
      explanation: "A unified receipt is reserved to record the material revision and stale evaluations.",
    },
    moduleEvaluations: [
      {
        moduleId: "identity-verification",
        moduleName: "Identity verification",
        requirementClass: "mandatory",
        authorityClass: "binding",
        verdict: "pass",
        overrideability: false,
        nonOverridable: false,
        freshnessState: "stale",
        explanation: "The prior identity evaluation was bound to env-rgcf-008-v1.",
      },
      {
        moduleId: "recipient-classification",
        moduleName: "Recipient classification",
        requirementClass: "mandatory",
        authorityClass: "binding",
        verdict: "pending",
        overrideability: false,
        nonOverridable: false,
        freshnessState: "current",
        explanation: "The external recipient introduced in env-rgcf-008-v2 requires fresh evaluation.",
      },
    ],
    pgdlRecommendation: {
      status: "recommend-revision",
      explanation: "PGDL flags the material scope change and requires re-evaluation.",
    },
    aagDecision: {
      status: "re-evaluation-required",
      explanation: "AAG cannot rely on prior evaluations after an external recipient was added.",
    },
    humanReview: {
      required: false,
      satisfied: false,
      explanation: "Human review may become required after fresh recipient evaluation, but is not yet decided.",
    },
    runtimePermit: {
      eligible: false,
      expectedState: "invalidated",
      explanation: "Prior permit eligibility is invalidated by the material envelope revision.",
    },
    receipt: {
      lifecycleStarted: true,
      expectedState: "reserved",
      explanation: "The receipt records the material revision and stale prior evaluations.",
    },
    systemAudit: {
      required: false,
      explanation: "The unified receipt records the re-evaluation requirement.",
    },
    operatorExplanation: "Adding an external recipient materially changed the scope, so prior evaluations and permit eligibility no longer apply.",
    expectedAuditEvidence: [
      "env-rgcf-008-v2 envelope",
      "external recipient change",
      "stale prior identity evaluation",
      "recipient classification pending verdict",
      "PGDL re-evaluation recommendation",
      "AAG re-evaluation-required decision",
    ],
  },
  {
    fixtureId: "rgcf-011-receipt-reservation-failure",
    title: "Receipt reservation failure",
    purpose: "Verify receipt continuity as a permit prerequisite for consequential actions.",
    deterministicRule: "Receipt reservation failure prevents permit issuance and execution for consequential actions.",
    objective: "Execute a consequential action after policy checks pass.",
    actionType: "perform-consequential-action",
    actor: "operations-agent",
    target: "consequential-system-target",
    requestedTool: "operations-writer",
    scope: "Consequential action with passing policy checks but no receipt reservation.",
    sensitivity: "high",
    consequence: "consequential",
    reversibility: false,
    envelopeVersion: "env-rgcf-011-v1",
    envelopeIntegrityReference: "fixture-hash-rgcf-011-v1",
    freshnessState: "current",
    receiptPrerequisite: {
      required: true,
      reservationState: "failed",
      explanation: "Receipt reservation failed before permit issuance.",
    },
    moduleEvaluations: [
      {
        moduleId: "identity-verification",
        moduleName: "Identity verification",
        requirementClass: "mandatory",
        authorityClass: "binding",
        verdict: "pass",
        overrideability: false,
        nonOverridable: false,
        freshnessState: "current",
        explanation: "The operations agent identity is known.",
      },
      {
        moduleId: "receipt-continuity",
        moduleName: "Receipt continuity",
        requirementClass: "mandatory",
        authorityClass: "binding",
        verdict: "block",
        overrideability: false,
        nonOverridable: false,
        freshnessState: "current",
        explanation: "Receipt reservation failed before permit issuance.",
      },
    ],
    pgdlRecommendation: {
      status: "blocked",
      explanation: "PGDL continues only if receipt continuity is available; it is not available here.",
    },
    aagDecision: {
      status: "withhold-permit",
      explanation: "AAG fails closed because receipt continuity could not be established for a consequential action.",
    },
    humanReview: {
      required: false,
      satisfied: false,
      explanation: "Human review does not bypass the receipt reservation prerequisite in this fixture.",
    },
    runtimePermit: {
      eligible: false,
      expectedState: "not-issued",
      explanation: "No permit is issued and no execution occurs because no unified receipt was reserved.",
    },
    receipt: {
      lifecycleStarted: false,
      expectedState: "not-started",
      explanation: "No unified-receipt lifecycle begins because no receipt record was successfully reserved.",
    },
    systemAudit: {
      required: true,
      eventType: "receipt-reservation-failure",
      explanation: "A separate system-level audit event or observable operational error records the receipt-reservation failure.",
    },
    operatorExplanation: "The consequential action cannot proceed because receipt continuity could not be established before permit issuance.",
    expectedAuditEvidence: [
      "current action envelope",
      "identity verification pass",
      "receipt reservation failure",
      "AAG withhold-permit decision",
      "no-permit outcome",
      "system-level audit event",
    ],
  },
  {
    fixtureId: "rgcf-014-runtime-mismatch",
    title: "Runtime mismatch before side effect",
    purpose: "Verify Runtime Binding blocks action drift before side effect.",
    deterministicRule: "Runtime Binding rejects target and scope drift and appends mismatch evidence to the reserved receipt.",
    objective: "Execute a permitted internal draft write.",
    actionType: "write-draft",
    actor: "internal-docs-agent",
    target: "external-publishing-endpoint",
    requestedTool: "publishing-endpoint",
    scope: "Attempted external publishing endpoint differs from authorized internal draft write.",
    sensitivity: "medium",
    consequence: "medium",
    reversibility: false,
    envelopeVersion: "env-rgcf-014-v1",
    envelopeIntegrityReference: "fixture-hash-rgcf-014-v1",
    freshnessState: "current",
    receiptPrerequisite: {
      required: true,
      reservationState: "reserved",
      explanation: "A unified receipt was already reserved before Runtime Binding validation.",
    },
    moduleEvaluations: [
      {
        moduleId: "runtime-binding",
        moduleName: "Runtime Binding",
        requirementClass: "mandatory",
        authorityClass: "binding",
        verdict: "block",
        overrideability: false,
        nonOverridable: false,
        freshnessState: "current",
        explanation: "Runtime Binding detects that the attempted external endpoint does not match the authorized internal draft target before side effect.",
      },
    ],
    pgdlRecommendation: {
      status: "continue",
      explanation: "PGDL is not the runtime mismatch stage; a new proposal is required for external publish.",
    },
    aagDecision: {
      status: "block",
      explanation: "The prior AAG allow applies only to the authorized internal draft write.",
    },
    humanReview: {
      required: false,
      satisfied: false,
      explanation: "Any prior review is scoped to the permitted internal draft target.",
    },
    runtimePermit: {
      eligible: false,
      expectedState: "blocked",
      explanation: "The existing permit cannot be reused for the mismatched external publishing action.",
      reusableForMismatchedAction: false,
    },
    receipt: {
      lifecycleStarted: true,
      expectedState: "aborted",
      explanation: "Mismatch evidence is appended to the already-reserved receipt, which reaches aborted.",
    },
    systemAudit: {
      required: false,
      explanation: "The unified receipt records the pre-side-effect runtime mismatch.",
    },
    executionAttempt: {
      authorizedTool: "internal-doc-writer",
      authorizedTarget: "internal-docs-workspace/release-draft.md",
      authorizedScope: "Internal draft write only.",
      attemptedTool: "publishing-endpoint",
      attemptedTarget: "external-publishing-endpoint",
      attemptedScope: "External publishing endpoint.",
      sideEffectStarted: false,
      permitReusable: false,
    },
    operatorExplanation: "Runtime Binding blocked execution because the authorized scope was internal draft storage, while the attempted scope was external publishing.",
    expectedAuditEvidence: [
      "authorized internal draft scope",
      "attempted external publishing scope",
      "runtime mismatch evidence",
      "Runtime Binding block",
      "no-side-effect assertion",
      "aborted receipt",
    ],
  },
];
