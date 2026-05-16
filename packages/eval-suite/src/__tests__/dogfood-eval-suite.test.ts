import { describe, expect, it } from "vitest";
import {
  builtInDogfoodEvalCases,
  builtInEnterpriseDogfoodEvalCases,
  builtInContentPublishingDogfoodEvalCases,
  builtInContentPublishingHardeningEvalCases,
  runDogfoodEvalSuite,
  runEvalCase,
  summarizeEvalResults
} from "../index.js";

describe("dogfood eval suite", () => {
  it("has at least 10 dogfood cases", () => {
    expect(builtInDogfoodEvalCases.length).toBeGreaterThanOrEqual(10);
  });

  it("passes all dogfood cases", () => {
    const result = runDogfoodEvalSuite();

    expect(result.passed, result.results.flatMap((entry) => entry.failures).join("\n")).toBe(true);
    expect(result.failedCount).toBe(0);
  });

  it("dangerous-delete-package blocks before AAG", () => {
    const result = runEvalCase(requiredCase("dogfood-dangerous-delete-package"));

    expect(result.passed).toBe(true);
    expect(result.actual.finalDecision).toBe("blocked_by_policy");
    expect(result.actual.blockedBeforeAag).toBe(true);
  });

  it("runtime-substitution-attempt ends execution_denied", () => {
    const result = runEvalCase(requiredCase("dogfood-runtime-substitution-attempt"));

    expect(result.passed).toBe(true);
    expect(result.actual.finalDecision).toBe("execution_denied");
    expect(result.actual.runtimeAllowed).toBe(false);
    expect(result.actual.runtimeFailureCodes).toContain("tool_mismatch");
    expect(result.actual.runtimeFailureCodes).toContain("action_hash_mismatch");
  });

  it("rubber-stamp-release-approval ends insufficient_human_participation", () => {
    const result = runEvalCase(requiredCase("dogfood-rubber-stamp-release-approval"));

    expect(result.passed).toBe(true);
    expect(result.actual.finalDecision).toBe("insufficient_human_participation");
    expect(result.actual.participationDecision).toBe("likely_rubber_stamp");
  });

  it("external-email-draft-first sends draft.create to AAG, not email.send", () => {
    const result = runEvalCase(requiredCase("dogfood-external-email-draft-first"));

    expect(result.passed).toBe(true);
    expect(result.actual.proposalSentTool).toBe("draft.create");
    expect(result.actual.proposalSentTool).not.toBe("email.send");
  });

  it("dogfood receipts are valid", () => {
    for (const evalCase of builtInDogfoodEvalCases) {
      const result = runEvalCase(evalCase);
      expect(result.actual.receiptValid, evalCase.id).toBe(true);
      expect(result.receiptHash, evalCase.id).toMatch(/^[a-f0-9]{64}$/);
    }
  });

  it("summarizeEvalResults includes dogfood totals", () => {
    const result = runDogfoodEvalSuite();
    const summary = summarizeEvalResults(result);
    const total =
      builtInDogfoodEvalCases.length +
      builtInEnterpriseDogfoodEvalCases.length +
      builtInContentPublishingDogfoodEvalCases.length +
      builtInContentPublishingHardeningEvalCases.length;

    expect(summary).toContain(`total: ${total}`);
    expect(summary).toContain(`passed: ${total}`);
  });
});

function requiredCase(id: string) {
  const evalCase = builtInDogfoodEvalCases.find((entry) => entry.id === id);

  if (evalCase === undefined) {
    throw new Error(`Missing dogfood eval case: ${id}`);
  }

  return evalCase;
}
