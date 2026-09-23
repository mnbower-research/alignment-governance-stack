import type {
  ConformanceAagStatus,
  ConformanceFreshnessState,
  ConformanceHumanReviewState,
  ConformanceModuleEvaluation,
  ConformanceReceiptPrerequisite,
  ConformanceReceiptState,
  ConformanceRuntimePermitState,
} from "./runtimeGovernanceConformanceFixtures";

export type PermitEligibilityReasonCode =
  | "eligible"
  | "required-evaluation-unresolved"
  | "receipt-reservation-failed"
  | "stale-evaluation"
  | "mandatory-module-unavailable"
  | "binding-block"
  | "human-review-required";

export interface PermitEligibilityInput {
  consequence: "low" | "medium" | "consequential";
  envelopeFreshnessState: ConformanceFreshnessState;
  receiptPrerequisite: ConformanceReceiptPrerequisite;
  moduleEvaluations: ConformanceModuleEvaluation[];
  humanReview: ConformanceHumanReviewState;
}

export interface PermitReceiptResolution {
  lifecycleStarted: boolean;
  expectedState: ConformanceReceiptState;
  explanation: string;
}

export interface PermitEligibilityResolution {
  decision: ConformanceAagStatus;
  permitEligible: boolean;
  expectedPermitState: ConformanceRuntimePermitState;
  reasonCodes: PermitEligibilityReasonCode[];
  operatorExplanation: string;
  receiptExpectation: PermitReceiptResolution;
  systemAuditRequired: boolean;
}

export type ExecutionAttemptReasonCode = "execution-matches-permit" | "runtime-mismatch";

export interface ExecutionAttemptValidationInput {
  authorizedTool: string;
  authorizedTarget: string;
  authorizedScope: string;
  attemptedTool: string;
  attemptedTarget: string;
  attemptedScope: string;
  sideEffectStarted: boolean;
  permitReusable: boolean;
}

export interface ExecutionAttemptValidationResult {
  executionAllowed: boolean;
  mismatchDetected: boolean;
  receiptState: ConformanceReceiptState;
  permitReusable: boolean;
  reasonCodes: ExecutionAttemptReasonCode[];
  operatorExplanation: string;
  expectedAuditEvidence: string[];
}

// Pure reference-resolution prototypes only. These functions do not issue permits,
// execute actions, call adapters, or implement external orchestration.
export function resolvePermitEligibility(input: PermitEligibilityInput): PermitEligibilityResolution {
  const staleRequiredEvaluation = input.moduleEvaluations.find(
    (evaluation) => evaluation.requirementClass === "mandatory" && evaluation.freshnessState === "stale",
  );
  const unavailableMandatoryBinding = input.moduleEvaluations.find(
    (evaluation) =>
      evaluation.requirementClass === "mandatory" &&
      evaluation.authorityClass === "binding" &&
      evaluation.verdict === "unavailable",
  );
  const bindingBlock = input.moduleEvaluations.find(
    (evaluation) => evaluation.authorityClass === "binding" && evaluation.freshnessState === "current" && evaluation.verdict === "block",
  );
  const unresolvedBindingHumanReview = input.moduleEvaluations.find(
    (evaluation) =>
      evaluation.authorityClass === "binding" &&
      evaluation.freshnessState === "current" &&
      evaluation.verdict === "require-human-review" &&
      !input.humanReview.satisfied,
  );

  // Deterministic precedence: receipt reservation failure, stale required
  // evaluations, mandatory binding outage, binding block, unresolved human
  // review, then successful eligibility.
  if (input.consequence === "consequential" && input.receiptPrerequisite.required && input.receiptPrerequisite.reservationState === "failed") {
    return {
      decision: "withhold-permit",
      permitEligible: false,
      expectedPermitState: "not-issued",
      reasonCodes: ["receipt-reservation-failed"],
      operatorExplanation: "Receipt continuity could not be established before permit issuance, so the consequential action fails closed.",
      receiptExpectation: {
        lifecycleStarted: false,
        expectedState: "not-started",
        explanation: "No unified-receipt lifecycle begins because no receipt record was successfully reserved.",
      },
      systemAuditRequired: true,
    };
  }

  if (input.envelopeFreshnessState === "stale" || staleRequiredEvaluation) {
    return {
      decision: "re-evaluation-required",
      permitEligible: false,
      expectedPermitState: "invalidated",
      reasonCodes: ["stale-evaluation"],
      operatorExplanation: "A required evaluation is stale after a material envelope change, so re-evaluation is required before permit eligibility.",
      receiptExpectation: {
        lifecycleStarted: input.receiptPrerequisite.reservationState === "reserved",
        expectedState: "reserved",
        explanation: "The receipt records stale evaluations and the required re-evaluation path.",
      },
      systemAuditRequired: false,
    };
  }

  if (unavailableMandatoryBinding) {
    return {
      decision: "withhold-permit",
      permitEligible: false,
      expectedPermitState: "withheld",
      reasonCodes: ["mandatory-module-unavailable"],
      operatorExplanation: `${unavailableMandatoryBinding.moduleName} is mandatory and unavailable, so the action fails closed.`,
      receiptExpectation: {
        lifecycleStarted: input.receiptPrerequisite.reservationState === "reserved",
        expectedState: "reserved",
        explanation: "The receipt records the unavailable mandatory evaluation.",
      },
      systemAuditRequired: false,
    };
  }

  if (bindingBlock) {
    return {
      decision: "block",
      permitEligible: false,
      expectedPermitState: "blocked",
      reasonCodes: ["binding-block"],
      operatorExplanation: `${bindingBlock.moduleName} returned a binding block, so AAG cannot allow permit eligibility.`,
      receiptExpectation: {
        lifecycleStarted: input.receiptPrerequisite.reservationState === "reserved",
        expectedState: "aborted",
        explanation: "The receipt records the binding block and aborted authorization path.",
      },
      systemAuditRequired: false,
    };
  }

  const unresolved = input.moduleEvaluations.length === 0 || input.moduleEvaluations.some(evaluation =>
    (evaluation.requirementClass === "mandatory" && ["pending", "unavailable"].includes(evaluation.verdict)) ||
    (evaluation.authorityClass === "binding" && ["pending", "unavailable", "recommend-revision"].includes(evaluation.verdict)));
  if (unresolved) return {
    decision: "withhold-permit", permitEligible: false, expectedPermitState: "withheld",
    reasonCodes: ["required-evaluation-unresolved"],
    operatorExplanation: "Required evaluations are missing, pending, unavailable, or require revision; permit eligibility is not established.",
    receiptExpectation: { lifecycleStarted: input.receiptPrerequisite.reservationState === "reserved", expectedState: input.receiptPrerequisite.reservationState === "reserved" ? "reserved" : "not-started", explanation: "Preserve unresolved evaluation evidence without claiming authorization." },
    systemAuditRequired: false
  };

  if (unresolvedBindingHumanReview || (input.humanReview.required && !input.humanReview.satisfied)) {
    return {
      decision: "require-human-review",
      permitEligible: false,
      expectedPermitState: "not-issued",
      reasonCodes: ["human-review-required"],
      operatorExplanation: `${unresolvedBindingHumanReview?.moduleName ?? "The receiving policy"} requires unresolved human review before automatic execution.`,
      receiptExpectation: {
        lifecycleStarted: input.receiptPrerequisite.reservationState === "reserved",
        expectedState: "reserved",
        explanation: "The receipt records the unresolved binding human-review requirement.",
      },
      systemAuditRequired: false,
    };
  }

  return {
    decision: "allow",
    permitEligible: true,
    expectedPermitState: "eligible-for-issuance",
    reasonCodes: ["eligible"],
    operatorExplanation: "All mandatory checks are current, receipt continuity is available, and no blocking condition remains.",
    receiptExpectation: {
      lifecycleStarted: input.receiptPrerequisite.reservationState === "reserved",
      expectedState: "finalized",
      explanation: "The receipt may progress through permit-issued and finalized after execution evidence.",
    },
    systemAuditRequired: false,
  };
}

export function validateExecutionAttempt(input: ExecutionAttemptValidationInput): ExecutionAttemptValidationResult {
  const toolMatches = input.authorizedTool === input.attemptedTool;
  const targetMatches = input.authorizedTarget === input.attemptedTarget;
  const scopeMatches = input.authorizedScope === input.attemptedScope;
  const mismatchDetected = !(toolMatches && targetMatches && scopeMatches);

  if (mismatchDetected) {
    return {
      executionAllowed: false,
      mismatchDetected: true,
      receiptState: "aborted",
      permitReusable: false,
      reasonCodes: ["runtime-mismatch"],
      operatorExplanation: input.sideEffectStarted ? "A runtime mismatch was detected after a side effect started. Authorization failed; this record does not claim prevention or rollback." : "Runtime Binding blocked execution because the attempted tool, target, or scope did not match the authorized permit before side effect.",
      expectedAuditEvidence: [
        `authorized tool: ${input.authorizedTool}`,
        `attempted tool: ${input.attemptedTool}`,
        `authorized target: ${input.authorizedTarget}`,
        `attempted target: ${input.attemptedTarget}`,
        `authorized scope: ${input.authorizedScope}`,
        `attempted scope: ${input.attemptedScope}`,
        input.sideEffectStarted ? "post-side-effect runtime mismatch; incident review required" : "pre-side-effect runtime mismatch",
      ],
    };
  }

  return {
    executionAllowed: true,
    mismatchDetected: false,
    receiptState: "reserved",
    permitReusable: input.permitReusable,
    reasonCodes: ["execution-matches-permit"],
    operatorExplanation: "The attempted execution matches the authorized permit fields.",
    expectedAuditEvidence: ["authorized execution attempt matched permit fields"],
  };
}
