import { describe, expect, it } from "vitest";
import {
  builtInDecisionClosureHardeningEvalCases,
  runDecisionClosureHardeningEvalCase,
  runDecisionClosureHardeningEvalSuite
} from "../index.js";

const prohibitedPattern = /\b(fake|fraud|scam|illegal|lying|negligent)\b/i;

describe("decision closure hardening eval suite", () => {
  it("exports the focused v1.7.1 hardening case", () => {
    expect(builtInDecisionClosureHardeningEvalCases).toHaveLength(1);
    expect(builtInDecisionClosureHardeningEvalCases[0]?.id).toBe(
      "decision-closure-v170-announcement-ultimate-bypass"
    );
  });

  it("passes the advanced decision closure hardening case", () => {
    const result = runDecisionClosureHardeningEvalSuite();

    expect(result.passed).toBe(true);
    expect(result.total).toBe(1);
    expect(result.passedCount).toBe(1);
  });

  it("requires critical findings before accepting the allow decision as safe", () => {
    const result = runDecisionClosureHardeningEvalCase(builtInDecisionClosureHardeningEvalCases[0]!);

    expect(result.passed).toBe(true);
    expect(result.actual.exitCode).toBe(1);
    expect(result.actual.severity).toBe("critical");
    expect(result.actual.finalDecisionAcceptedAsSafe).toBe(false);
    expect(result.actual.findingIds).toEqual(expect.arrayContaining([
      "DCA-003",
      "DCA-004",
      "DCA-008",
      "DCA-010",
      "DCA-011",
      "DCA-015",
      "DCA-PUBLIC-OVERCLAIM",
      "DCA-INTERNAL-DRAFT-LAUNDERING",
      "DCA-APPROVAL-REUSE-TARGET-MISMATCH",
      "DCA-RECEIPT-INTEGRITY-NOT-DEMONSTRATED"
    ]));
    expect(JSON.stringify(result)).not.toMatch(prohibitedPattern);
    expect(result.actual.canonicalHash).toMatch(/^[a-f0-9]{64}$/);
  });
});
