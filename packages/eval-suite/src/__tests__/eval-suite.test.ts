import { describe, expect, it } from "vitest";
import {
  evaluateGovernedRuntimeActionWithReceipt
} from "@alignment-governance-stack/governance-core";
import { verifyGovernanceReceipt } from "@alignment-governance-stack/receipts";
import {
  builtInEvalCases,
  runEvalCase,
  runEvalSuite,
  summarizeEvalResults
} from "../index.js";
import type { AgsEvalCase } from "../types.js";

describe("eval suite", () => {
  it("passes all built-in eval cases", () => {
    const results = builtInEvalCases.map(runEvalCase);

    expect(results, results.flatMap((result) => result.failures).join("\n")).toSatisfy(
      (entries: ReturnType<typeof runEvalCase>[]) => entries.every((entry) => entry.passed)
    );
  });

  it("runEvalSuite returns a passing aggregate result", () => {
    const result = runEvalSuite();

    expect(result.passed).toBe(true);
    expect(result.total).toBe(builtInEvalCases.length);
    expect(result.failedCount).toBe(0);
  });

  it("summarizes total, passed, and failed counts", () => {
    const summary = summarizeEvalResults(runEvalSuite());

    expect(summary).toContain(`total: ${builtInEvalCases.length}`);
    expect(summary).toContain(`passed: ${builtInEvalCases.length}`);
    expect(summary).toContain("failed: 0");
  });

  it("returns a failed result for deliberately wrong expectations", () => {
    const result = runEvalCase({
      ...firstEvalCase(),
      expected: {
        finalDecision: "blocked_by_policy"
      }
    });

    expect(result.passed).toBe(false);
    expect(result.failures.join(" ")).toContain("finalDecision");
  });

  it("checks receipt verification for eval cases", () => {
    const result = runEvalCase(firstEvalCase());

    expect(result.actual.receiptValid).toBe(true);
    expect(result.receiptHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("detects receipt tampering through receipts API", () => {
    const input = firstEvalCase().input;
    const { receipt } = evaluateGovernedRuntimeActionWithReceipt({
      proposal: input.proposal,
      ...(input.runtimeAction !== undefined ? { runtimeAction: input.runtimeAction } : {}),
      ...(input.permitOptions !== undefined ? { permitOptions: input.permitOptions } : {}),
      ...(input.receiptOptions !== undefined ? { receiptOptions: input.receiptOptions } : {})
    });
    const tampered = {
      ...receipt,
      finalDecision: "tampered"
    };

    expect(verifyGovernanceReceipt(receipt).valid).toBe(true);
    expect(verifyGovernanceReceipt(tampered).valid).toBe(false);
  });
});

function firstEvalCase(): AgsEvalCase {
  const evalCase = builtInEvalCases[0];

  if (evalCase === undefined) {
    throw new Error("Expected at least one built-in eval case.");
  }

  return evalCase;
}
