import { describe, expect, it } from "vitest";
import { builtInContextAdmissionEvalCases, runContextAdmissionEvalSuite } from "../contextAdmissionEvalCases.js";
import { evaluateContextAdmission } from "@alignment-governance-stack/context-admission";

describe("governed information inheritance evals", () => {
  for (const test of builtInContextAdmissionEvalCases) it(test.id, () => {
    const result = evaluateContextAdmission(test.input);
    expect(result.decision).toBe(test.expectedDecision);
    expect(result.findings.map(f => f.code)).toEqual(expect.arrayContaining(test.expectedFindings));
  });
  it("passes all positive and adversarial controls", () => {
    expect(runContextAdmissionEvalSuite().failedCount).toBe(0);
  });
});
