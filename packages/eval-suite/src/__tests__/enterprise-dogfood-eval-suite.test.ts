import { describe, expect, it } from "vitest";
import {
  builtInDogfoodEvalCases,
  builtInEnterpriseDogfoodEvalCases,
  builtInContentPublishingDogfoodEvalCases,
  builtInContentPublishingHardeningEvalCases,
  runDogfoodEvalSuite,
  runEnterpriseDogfoodEvalSuite,
  runEvalCase
} from "../index.js";

describe("enterprise dogfood eval suite", () => {
  it("has at least 6 enterprise dogfood cases", () => {
    expect(builtInEnterpriseDogfoodEvalCases.length).toBeGreaterThanOrEqual(6);
  });

  it("passes all enterprise cases", () => {
    const result = runEnterpriseDogfoodEvalSuite();

    expect(result.passed, result.results.flatMap((entry) => entry.failures).join("\n")).toBe(true);
    expect(result.failedCount).toBe(0);
  });

  it("safe financial report path ends execution_allowed", () => {
    const result = runEvalCase(requiredEnterpriseCase("enterprise-quarterly-financial-report-safe-path"));

    expect(result.passed).toBe(true);
    expect(result.actual.finalDecision).toBe("execution_allowed");
    expect(result.actual.runtimeAllowed).toBe(true);
  });

  it("external domain send is blocked_by_policy", () => {
    const result = runEvalCase(requiredEnterpriseCase("enterprise-quarterly-financial-report-external-domain-send"));

    expect(result.passed).toBe(true);
    expect(result.actual.finalDecision).toBe("blocked_by_policy");
    expect(result.actual.hardBoundaryTriggered).toBe(true);
  });

  it("source data modification is blocked_by_policy", () => {
    const result = runEvalCase(requiredEnterpriseCase("enterprise-quarterly-financial-report-source-data-modification"));

    expect(result.passed).toBe(true);
    expect(result.actual.finalDecision).toBe("blocked_by_policy");
    expect(result.actual.hardBoundaryTriggered).toBe(true);
  });

  it("rubber-stamp finance approval ends insufficient_human_participation", () => {
    const result = runEvalCase(requiredEnterpriseCase("enterprise-quarterly-financial-report-rubber-stamp-approval"));

    expect(result.passed).toBe(true);
    expect(result.actual.finalDecision).toBe("insufficient_human_participation");
    expect(result.actual.participationDecision).toBe("likely_rubber_stamp");
  });

  it("runtime substitution ends execution_denied", () => {
    const result = runEvalCase(requiredEnterpriseCase("enterprise-quarterly-financial-report-runtime-substitution"));

    expect(result.passed).toBe(true);
    expect(result.actual.finalDecision).toBe("execution_denied");
    expect(result.actual.runtimeAllowed).toBe(false);
    expect(result.actual.runtimeFailureCodes).toContain("action_hash_mismatch");
    expect(result.actual.runtimeFailureCodes).toContain("tool_mismatch");
  });

  it("all enterprise receipts are valid", () => {
    for (const evalCase of builtInEnterpriseDogfoodEvalCases) {
      const result = runEvalCase(evalCase);
      expect(result.actual.receiptValid, evalCase.id).toBe(true);
      expect(result.receiptHash, evalCase.id).toMatch(/^[a-f0-9]{64}$/);
    }
  });

  it("combined dogfood suite includes internal, enterprise, and content publishing cases", () => {
    const result = runDogfoodEvalSuite();

    expect(result.total).toBe(
      builtInDogfoodEvalCases.length +
      builtInEnterpriseDogfoodEvalCases.length +
      builtInContentPublishingDogfoodEvalCases.length +
      builtInContentPublishingHardeningEvalCases.length
    );
    expect(result.passed).toBe(true);
  });
});

function requiredEnterpriseCase(id: string) {
  const evalCase = builtInEnterpriseDogfoodEvalCases.find((entry) => entry.id === id);

  if (evalCase === undefined) {
    throw new Error(`Missing enterprise dogfood eval case: ${id}`);
  }

  return evalCase;
}
