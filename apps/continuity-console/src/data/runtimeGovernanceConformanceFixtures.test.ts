import { describe, expect, it } from "vitest";
import {
  minimalConformanceFixtures,
  type ConformanceModuleEvaluation,
  type RuntimeGovernanceConformanceFixture,
} from "./runtimeGovernanceConformanceFixtures";

const minimalFixtureIds = [
  "rgcf-001-valid-low-risk-internal-draft",
  "rgcf-003-binding-human-review-requirement",
  "rgcf-004-binding-block",
  "rgcf-006-mandatory-module-outage",
  "rgcf-008-material-revision-invalidates-evaluations",
  "rgcf-011-receipt-reservation-failure",
  "rgcf-014-runtime-mismatch",
];

function fixture(id: string): RuntimeGovernanceConformanceFixture {
  const found = minimalConformanceFixtures.find((candidate) => candidate.fixtureId === id);
  expect(found).toBeTruthy();
  return found as RuntimeGovernanceConformanceFixture;
}

function hasBindingVerdict(fixtureRecord: RuntimeGovernanceConformanceFixture, verdict: ConformanceModuleEvaluation["verdict"]): boolean {
  return fixtureRecord.moduleEvaluations.some((evaluation) => evaluation.authorityClass === "binding" && evaluation.verdict === verdict);
}

describe("runtime governance conformance fixtures", () => {
  it("defines exactly the seven minimal first fixtures with unique IDs", () => {
    const fixtureIds = minimalConformanceFixtures.map((fixtureRecord) => fixtureRecord.fixtureId);

    expect(fixtureIds).toEqual(minimalFixtureIds);
    expect(new Set(fixtureIds).size).toBe(fixtureIds.length);
  });

  it("provides deterministic outcome metadata for every fixture", () => {
    for (const fixtureRecord of minimalConformanceFixtures) {
      expect(fixtureRecord.deterministicRule.trim().length).toBeGreaterThan(20);
      expect(fixtureRecord.pgdlRecommendation.status).toBeTruthy();
      expect(fixtureRecord.aagDecision.status).toBeTruthy();
      expect(fixtureRecord.runtimePermit.expectedState).toBeTruthy();
      expect(fixtureRecord.receipt.expectedState).toBeTruthy();
    }
  });

  it("includes explicit envelope version and integrity references", () => {
    for (const fixtureRecord of minimalConformanceFixtures) {
      expect(fixtureRecord.envelopeVersion).toMatch(/^env-rgcf-/);
      expect(fixtureRecord.envelopeIntegrityReference).toMatch(/^fixture-hash-rgcf-/);
      expect(fixtureRecord.freshnessState).toBeTruthy();
    }
  });

  it("declares requirement and authority classes for every module evaluation", () => {
    for (const fixtureRecord of minimalConformanceFixtures) {
      expect(fixtureRecord.moduleEvaluations.length).toBeGreaterThan(0);

      for (const evaluation of fixtureRecord.moduleEvaluations) {
        expect(["mandatory", "optional"]).toContain(evaluation.requirementClass);
        expect(["advisory", "binding"]).toContain(evaluation.authorityClass);
        expect(evaluation.explanation.trim().length).toBeGreaterThan(10);
      }
    }
  });

  it("does not expect permit eligibility for binding blocks", () => {
    for (const fixtureRecord of minimalConformanceFixtures) {
      if (hasBindingVerdict(fixtureRecord, "block")) {
        expect(fixtureRecord.runtimePermit.eligible).toBe(false);
      }
    }
  });

  it("does not expect permit eligibility for unresolved binding human-review requirements", () => {
    const humanReviewFixture = fixture("rgcf-003-binding-human-review-requirement");

    expect(hasBindingVerdict(humanReviewFixture, "require-human-review")).toBe(true);
    expect(humanReviewFixture.humanReview.required).toBe(true);
    expect(humanReviewFixture.humanReview.satisfied).toBe(false);
    expect(humanReviewFixture.runtimePermit.eligible).toBe(false);
  });

  it("does not expect permit eligibility for mandatory module outages", () => {
    const outageFixture = fixture("rgcf-006-mandatory-module-outage");
    const unavailableMandatoryEvaluation = outageFixture.moduleEvaluations.find(
      (evaluation) => evaluation.requirementClass === "mandatory" && evaluation.verdict === "unavailable",
    );

    expect(unavailableMandatoryEvaluation).toBeTruthy();
    expect(outageFixture.runtimePermit.eligible).toBe(false);
  });

  it("does not allow stale evaluations to support permit eligibility", () => {
    const revisionFixture = fixture("rgcf-008-material-revision-invalidates-evaluations");

    expect(revisionFixture.moduleEvaluations.some((evaluation) => evaluation.freshnessState === "stale")).toBe(true);
    expect(revisionFixture.aagDecision.status).toBe("re-evaluation-required");
    expect(revisionFixture.runtimePermit.eligible).toBe(false);
    expect(revisionFixture.runtimePermit.expectedState).toBe("invalidated");
  });

  it("represents Fixture 11 without pretending a nonexistent receipt reached a failed lifecycle state", () => {
    const receiptFailureFixture = fixture("rgcf-011-receipt-reservation-failure");

    expect(receiptFailureFixture.receipt.lifecycleStarted).toBe(false);
    expect(receiptFailureFixture.receipt.expectedState).toBe("not-started");
    expect(receiptFailureFixture.receipt.expectedState).not.toBe("failed");
    expect(receiptFailureFixture.systemAudit.required).toBe(true);
    expect(receiptFailureFixture.systemAudit.eventType).toBe("receipt-reservation-failure");
    expect(receiptFailureFixture.runtimePermit.eligible).toBe(false);
  });

  it("represents Fixture 14 as a pre-side-effect runtime mismatch with aborted receipt", () => {
    const mismatchFixture = fixture("rgcf-014-runtime-mismatch");

    expect(mismatchFixture.receipt.lifecycleStarted).toBe(true);
    expect(mismatchFixture.receipt.expectedState).toBe("aborted");
    expect(mismatchFixture.moduleEvaluations.some((evaluation) => evaluation.moduleId === "runtime-binding" && evaluation.verdict === "block")).toBe(true);
    expect(mismatchFixture.expectedAuditEvidence).toContain("no-side-effect assertion");
    expect(mismatchFixture.runtimePermit.reusableForMismatchedAction).toBe(false);
  });

  it("provides readable operator explanations and non-empty audit evidence lists", () => {
    for (const fixtureRecord of minimalConformanceFixtures) {
      expect(fixtureRecord.operatorExplanation.trim().length).toBeGreaterThan(30);
      expect(fixtureRecord.expectedAuditEvidence.length).toBeGreaterThan(0);
      for (const evidence of fixtureRecord.expectedAuditEvidence) {
        expect(evidence.trim().length).toBeGreaterThan(3);
      }
    }
  });
});
