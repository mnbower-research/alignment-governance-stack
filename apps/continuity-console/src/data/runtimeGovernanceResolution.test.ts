import { describe, expect, it } from "vitest";
import {
  minimalConformanceFixtures,
  type ConformanceExecutionAttempt,
  type RuntimeGovernanceConformanceFixture,
} from "./runtimeGovernanceConformanceFixtures";
import {
  resolvePermitEligibility,
  validateExecutionAttempt,
  type ExecutionAttemptValidationInput,
  type PermitEligibilityInput,
} from "./runtimeGovernanceResolution";

const permitFixtureIds = [
  "rgcf-001-valid-low-risk-internal-draft",
  "rgcf-003-binding-human-review-requirement",
  "rgcf-004-binding-block",
  "rgcf-006-mandatory-module-outage",
  "rgcf-008-material-revision-invalidates-evaluations",
  "rgcf-011-receipt-reservation-failure",
];

function fixture(id: string): RuntimeGovernanceConformanceFixture {
  const found = minimalConformanceFixtures.find((candidate) => candidate.fixtureId === id);
  expect(found).toBeTruthy();
  return found as RuntimeGovernanceConformanceFixture;
}

function permitInputFromFixture(fixtureRecord: RuntimeGovernanceConformanceFixture): PermitEligibilityInput {
  return {
    consequence: fixtureRecord.consequence,
    envelopeFreshnessState: fixtureRecord.freshnessState,
    receiptPrerequisite: fixtureRecord.receiptPrerequisite,
    moduleEvaluations: fixtureRecord.moduleEvaluations,
    humanReview: fixtureRecord.humanReview,
  };
}

function executionInputFromAttempt(attempt: ConformanceExecutionAttempt): ExecutionAttemptValidationInput {
  return {
    authorizedTool: attempt.authorizedTool,
    authorizedTarget: attempt.authorizedTarget,
    authorizedScope: attempt.authorizedScope,
    attemptedTool: attempt.attemptedTool,
    attemptedTarget: attempt.attemptedTarget,
    attemptedScope: attempt.attemptedScope,
    sideEffectStarted: attempt.sideEffectStarted,
    permitReusable: attempt.permitReusable,
  };
}

describe("runtime governance resolution prototypes", () => {
  it.each(["pending", "recommend-revision"] as const)("withholds a binding %s verdict", verdict => {
    const input = structuredClone(permitInputFromFixture(fixture("rgcf-001-valid-low-risk-internal-draft")));
    input.moduleEvaluations[0]!.authorityClass = "binding";
    input.moduleEvaluations[0]!.verdict = verdict;
    expect(resolvePermitEligibility(input).permitEligible).toBe(false);
  });
  it("cannot clear binding review through the global required flag", () => {
    const input = structuredClone(permitInputFromFixture(fixture("rgcf-003-binding-human-review-requirement")));
    input.humanReview.required = false;
    expect(resolvePermitEligibility(input).permitEligible).toBe(false);
  });
  it("does not infer eligibility from an empty evaluation set", () => {
    const input = permitInputFromFixture(fixture("rgcf-001-valid-low-risk-internal-draft"));
    input.moduleEvaluations = [];
    expect(resolvePermitEligibility(input).permitEligible).toBe(false);
  });
  it("preserves mismatch evidence after a side effect has started", () => {
    const result = validateExecutionAttempt({ authorizedTool: "a", attemptedTool: "b", authorizedTarget: "x", attemptedTarget: "x", authorizedScope: "s", attemptedScope: "s", sideEffectStarted: true, permitReusable: true });
    expect(result.executionAllowed).toBe(false);
    expect(result.mismatchDetected).toBe(true);
    expect(result.permitReusable).toBe(false);
    expect(result.operatorExplanation).toContain("does not claim prevention");
  });
  it("accepts resolver inputs that exclude fixture IDs, titles, and expected-output fields", () => {
    const input = permitInputFromFixture(fixture("rgcf-001-valid-low-risk-internal-draft"));
    const inputKeys = Object.keys(input);

    expect(inputKeys).not.toContain("fixtureId");
    expect(inputKeys).not.toContain("title");
    expect(inputKeys).not.toContain("runtimePermit");
    expect(inputKeys).not.toContain("receipt");
    expect(inputKeys).not.toContain("operatorExplanation");
  });

  it("computes the expected permit eligibility outcomes for the six pre-issuance fixtures", () => {
    for (const fixtureId of permitFixtureIds) {
      const fixtureRecord = fixture(fixtureId);
      const resolution = resolvePermitEligibility(permitInputFromFixture(fixtureRecord));

      expect(resolution.permitEligible).toBe(fixtureRecord.runtimePermit.eligible);
      expect(resolution.expectedPermitState).toBe(fixtureRecord.runtimePermit.expectedState);
      expect(resolution.receiptExpectation.lifecycleStarted).toBe(fixtureRecord.receipt.lifecycleStarted);
      expect(resolution.receiptExpectation.expectedState).toBe(fixtureRecord.receipt.expectedState);
      expect(resolution.systemAuditRequired).toBe(fixtureRecord.systemAudit.required);
      expect(resolution.operatorExplanation.trim().length).toBeGreaterThan(30);
      expect(resolution.reasonCodes.length).toBeGreaterThan(0);
    }
  });

  it("makes the valid low-risk internal draft permit-eligible", () => {
    const resolution = resolvePermitEligibility(permitInputFromFixture(fixture("rgcf-001-valid-low-risk-internal-draft")));

    expect(resolution.decision).toBe("allow");
    expect(resolution.permitEligible).toBe(true);
    expect(resolution.expectedPermitState).toBe("eligible-for-issuance");
    expect(resolution.reasonCodes).toEqual(["eligible"]);
  });

  it("prevents eligibility for unresolved binding human review", () => {
    const resolution = resolvePermitEligibility(permitInputFromFixture(fixture("rgcf-003-binding-human-review-requirement")));

    expect(resolution.decision).toBe("require-human-review");
    expect(resolution.permitEligible).toBe(false);
    expect(resolution.reasonCodes).toEqual(["human-review-required"]);
  });

  it("prevents eligibility for binding blocks", () => {
    const resolution = resolvePermitEligibility(permitInputFromFixture(fixture("rgcf-004-binding-block")));

    expect(resolution.decision).toBe("block");
    expect(resolution.permitEligible).toBe(false);
    expect(resolution.expectedPermitState).toBe("blocked");
    expect(resolution.reasonCodes).toEqual(["binding-block"]);
  });

  it("fails closed for mandatory module outages", () => {
    const resolution = resolvePermitEligibility(permitInputFromFixture(fixture("rgcf-006-mandatory-module-outage")));

    expect(resolution.decision).toBe("withhold-permit");
    expect(resolution.permitEligible).toBe(false);
    expect(resolution.expectedPermitState).toBe("withheld");
    expect(resolution.reasonCodes).toEqual(["mandatory-module-unavailable"]);
  });

  it("requires re-evaluation when stale evaluations are present", () => {
    const resolution = resolvePermitEligibility(permitInputFromFixture(fixture("rgcf-008-material-revision-invalidates-evaluations")));

    expect(resolution.decision).toBe("re-evaluation-required");
    expect(resolution.permitEligible).toBe(false);
    expect(resolution.expectedPermitState).toBe("invalidated");
    expect(resolution.reasonCodes).toEqual(["stale-evaluation"]);
  });

  it("fails closed for consequential receipt-reservation failure without starting a unified receipt lifecycle", () => {
    const resolution = resolvePermitEligibility(permitInputFromFixture(fixture("rgcf-011-receipt-reservation-failure")));

    expect(resolution.decision).toBe("withhold-permit");
    expect(resolution.permitEligible).toBe(false);
    expect(resolution.expectedPermitState).toBe("not-issued");
    expect(resolution.reasonCodes).toEqual(["receipt-reservation-failed"]);
    expect(resolution.receiptExpectation.lifecycleStarted).toBe(false);
    expect(resolution.receiptExpectation.expectedState).toBe("not-started");
    expect(resolution.systemAuditRequired).toBe(true);
  });

  it("blocks a pre-side-effect runtime mismatch and appends evidence to an aborted receipt expectation", () => {
    const fixtureRecord = fixture("rgcf-014-runtime-mismatch");
    expect(fixtureRecord.executionAttempt).toBeTruthy();
    const result = validateExecutionAttempt(executionInputFromAttempt(fixtureRecord.executionAttempt as ConformanceExecutionAttempt));

    expect(result.executionAllowed).toBe(false);
    expect(result.mismatchDetected).toBe(true);
    expect(result.receiptState).toBe("aborted");
    expect(result.permitReusable).toBe(false);
    expect(result.reasonCodes).toEqual(["runtime-mismatch"]);
    expect(result.operatorExplanation.trim().length).toBeGreaterThan(30);
    expect(result.expectedAuditEvidence.some((evidence) => evidence.includes("pre-side-effect runtime mismatch"))).toBe(true);
  });

  it("does not mutate permit-resolution inputs", () => {
    const input = permitInputFromFixture(fixture("rgcf-004-binding-block"));
    const before = JSON.stringify(input);

    resolvePermitEligibility(input);

    expect(JSON.stringify(input)).toBe(before);
  });

  it("does not mutate execution-validation inputs", () => {
    const fixtureRecord = fixture("rgcf-014-runtime-mismatch");
    const input = executionInputFromAttempt(fixtureRecord.executionAttempt as ConformanceExecutionAttempt);
    const before = JSON.stringify(input);

    validateExecutionAttempt(input);

    expect(JSON.stringify(input)).toBe(before);
  });
});
