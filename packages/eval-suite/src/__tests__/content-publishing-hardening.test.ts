import { describe, expect, it } from "vitest";
import {
  builtInContentPublishingHardeningEvalCases,
  runContentPublishingHardeningEvalSuite,
  runDogfoodEvalSuite
} from "../index.js";
import { runEvalCase } from "../runEvalCase.js";

describe("content publishing hardening eval suite", () => {
  it("exports the focused v1.6.1 hardening cases", () => {
    expect(builtInContentPublishingHardeningEvalCases).toHaveLength(8);

    for (const evalCase of builtInContentPublishingHardeningEvalCases) {
      expect(evalCase.id).toMatch(/^content-hardening-/);
      expect(evalCase.title).toContain("Content Publishing Hardening");
      expect(evalCase.description).toBeDefined();
    }
  });

  it("passes all content publishing hardening cases", () => {
    const result = runContentPublishingHardeningEvalSuite();

    expect(result.passed).toBe(true);
    expect(result.failedCount).toBe(0);
  });

  it("does not allow unsupported public overclaim to final external publish", () => {
    const result = runEvalCase(requiredCase("content-hardening-unsupported-public-overclaim"));

    expect(result.passed).toBe(true);
    expect(result.actual.finalDecision).toBe("blocked_by_policy");
    expect(result.actual.finalDecision).not.toBe("execution_allowed");
    expect(result.actual.hardBoundaryTriggered).toBe(true);
  });

  it("requires approval for direct external publish without review", () => {
    const result = runEvalCase(requiredCase("content-hardening-direct-external-publish-without-review"));

    expect(result.passed).toBe(true);
    expect(result.actual.finalDecision).toBe("approval_required_by_authority");
    expect(result.actual.authorityDecision).toBe("approval_missing");
  });

  it("rejects runtime substitution from draft to external publish", () => {
    const result = runEvalCase(requiredCase("content-hardening-runtime-substitution-draft-to-social"));

    expect(result.passed).toBe(true);
    expect(result.actual.finalDecision).toBe("execution_denied");
    expect(result.actual.runtimeAllowed).toBe(false);
    expect(result.actual.runtimeFailureCodes).toContain("tool_mismatch");
  });

  it("rejects or requires fresh governance for approval reuse across targets", () => {
    const result = runEvalCase(requiredCase("content-hardening-approval-reuse-across-targets"));

    expect(result.passed).toBe(true);
    expect(result.actual.finalDecision).toBe("approval_required_by_authority");
    expect(result.actual.authorityDecision).toBe("approval_out_of_scope");
  });

  it("flags tone and claim drift through governance memory without accusatory generated language", () => {
    const result = runEvalCase(requiredCase("content-hardening-tone-claim-drift"));

    expect(result.passed).toBe(true);
    expect(result.actual.memoryRecommendationTypes).toEqual(["add_eval_case"]);
    expect(result.actual.memoryHumanReviewRequired).toBe(true);
    expect(result.actual.memorySummaryIncludesHumanReview).toBe(true);
  });

  it("combined dogfood suite includes hardening cases", () => {
    const combined = runDogfoodEvalSuite();

    expect(combined.total).toBeGreaterThan(builtInContentPublishingHardeningEvalCases.length);
    for (const evalCase of builtInContentPublishingHardeningEvalCases) {
      expect(combined.results.some((result) => result.id === evalCase.id)).toBe(true);
    }
  });
});

function requiredCase(id: string) {
  const evalCase = builtInContentPublishingHardeningEvalCases.find((entry) => entry.id === id);
  if (evalCase === undefined) {
    throw new Error(`Missing content publishing hardening eval case: ${id}`);
  }

  return evalCase;
}

