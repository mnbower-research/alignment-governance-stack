import { describe, expect, it } from "vitest";
import {
  builtInContentPublishingDogfoodEvalCases,
  builtInDogfoodEvalCases,
  builtInEnterpriseDogfoodEvalCases,
  runContentPublishingDogfoodEvalSuite,
  runDogfoodEvalSuite,
  runEvalCase
} from "../index.js";

function getCase(id: string) {
  const evalCase = builtInContentPublishingDogfoodEvalCases.find((entry) => entry.id === id);

  if (evalCase === undefined) {
    throw new Error(`Missing content publishing eval case: ${id}`);
  }

  return evalCase;
}

describe("content publishing dogfood eval suite", () => {
  it("exports at least 13 content publishing dogfood cases", () => {
    expect(builtInContentPublishingDogfoodEvalCases.length).toBeGreaterThanOrEqual(13);
  });

  it("passes all content publishing dogfood cases", () => {
    const result = runContentPublishingDogfoodEvalSuite();

    expect(result.passed).toBe(true);
    expect(result.failedCount).toBe(0);
  });

  it("safe internal draft is execution_allowed", () => {
    expect(runEvalCase(getCase("content-safe-internal-draft")).actual.finalDecision).toBe("execution_allowed");
  });

  it("approved blog publish is execution_allowed", () => {
    expect(runEvalCase(getCase("content-publish-approved-blog-post")).actual.finalDecision).toBe("execution_allowed");
  });

  it("consciousness language violation is blocked_by_policy", () => {
    const result = runEvalCase(getCase("content-consciousness-language-violation"));

    expect(result.actual.finalDecision).toBe("blocked_by_policy");
    expect(result.actual.hardBoundaryTriggered).toBe(true);
  });

  it("compliance guarantee claim does not execute", () => {
    expect(runEvalCase(getCase("content-compliance-guarantee-claim")).actual.finalDecision).not.toBe("execution_allowed");
  });

  it("review bypass internal draft label does not execute", () => {
    expect(runEvalCase(getCase("content-review-bypass-internal-draft-label")).actual.finalDecision).not.toBe("execution_allowed");
  });

  it("external platform publish without approval does not execute", () => {
    expect(runEvalCase(getCase("content-external-platform-publish-without-approval")).actual.finalDecision).not.toBe("execution_allowed");
  });

  it("runtime substitution from blog draft to LinkedIn is execution_denied", () => {
    expect(runEvalCase(getCase("content-runtime-substitution-blog-draft-to-linkedin-post")).actual.finalDecision).toBe("execution_denied");
  });

  it("provenance and license mutation does not execute", () => {
    expect(runEvalCase(getCase("content-provenance-license-mutation")).actual.finalDecision).not.toBe("execution_allowed");
  });

  it("prior approval reuse does not execute", () => {
    expect(runEvalCase(getCase("content-prior-approval-reuse")).actual.finalDecision).not.toBe("execution_allowed");
  });

  it("all content publishing receipts are valid", () => {
    const result = runContentPublishingDogfoodEvalSuite();

    expect(result.results.every((entry) => entry.actual.receiptValid === true)).toBe(true);
  });

  it("combined dogfood suite includes content publishing count", () => {
    const result = runDogfoodEvalSuite();

    expect(result.total).toBe(
      builtInDogfoodEvalCases.length +
      builtInEnterpriseDogfoodEvalCases.length +
      builtInContentPublishingDogfoodEvalCases.length
    );
  });
});
