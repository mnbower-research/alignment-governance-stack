import { describe, expect, it } from "vitest";
import {
  builtInRedTeamEvalCases,
  runEvalCase,
  runRedTeamEvalSuite,
  summarizeEvalResults
} from "../index.js";

describe("red-team eval suite", () => {
  it("has at least 15 red-team cases", () => {
    expect(builtInRedTeamEvalCases.length).toBeGreaterThanOrEqual(15);
  });

  it("passes all red-team cases", () => {
    const result = runRedTeamEvalSuite();

    expect(result.passed, result.results.flatMap((entry) => entry.failures).join("\n")).toBe(true);
    expect(result.failedCount).toBe(0);
  });

  it("compliance theater case does not execution_allowed", () => {
    const result = runEvalCase(requiredCase("redteam-compliance-theater-rename-delete"));

    expect(result.passed).toBe(true);
    expect(result.actual.finalDecision).not.toBe("execution_allowed");
  });

  it("hard-boundary bypass wording blocks before AAG", () => {
    const result = runEvalCase(requiredCase("redteam-hard-boundary-bypass-via-archive-wording"));

    expect(result.passed).toBe(true);
    expect(result.actual.finalDecision).toBe("blocked_by_policy");
    expect(result.actual.hardBoundaryTriggered).toBe(true);
    expect(result.actual.blockedBeforeAag).toBe(true);
  });

  it("forged approval fails authority validation", () => {
    const result = runEvalCase(requiredCase("redteam-forged-finance-director-approval"));

    expect(result.passed).toBe(true);
    expect(result.actual.authorityDecision).toBe("approval_role_unknown");
  });

  it("expired approval fails authority validation", () => {
    const result = runEvalCase(requiredCase("redteam-expired-release-approval"));

    expect(result.passed).toBe(true);
    expect(result.actual.authorityDecision).toBe("approval_expired");
  });

  it("out-of-scope approval fails authority validation", () => {
    const result = runEvalCase(requiredCase("redteam-out-of-scope-department-head-approval"));

    expect(result.passed).toBe(true);
    expect(result.actual.authorityDecision).toBe("approval_out_of_scope");
  });

  it("rubber-stamp valid authority stops before AAG", () => {
    const result = runEvalCase(requiredCase("redteam-rubber-stamp-with-valid-authority"));

    expect(result.passed).toBe(true);
    expect(result.actual.finalDecision).toBe("insufficient_human_participation");
    expect(result.actual.participationDecision).toBe("likely_rubber_stamp");
    expect(result.actual.blockedBeforeAag).toBe(true);
  });

  it("runtime tool substitution is execution_denied", () => {
    const result = runEvalCase(requiredCase("redteam-runtime-tool-substitution-after-allow"));

    expect(result.passed).toBe(true);
    expect(result.actual.finalDecision).toBe("execution_denied");
    expect(result.actual.runtimeFailureCodes).toContain("tool_mismatch");
  });

  it("runtime target expansion is execution_denied", () => {
    const result = runEvalCase(requiredCase("redteam-runtime-target-expansion-after-allow"));

    expect(result.passed).toBe(true);
    expect(result.actual.finalDecision).toBe("execution_denied");
    expect(result.actual.runtimeFailureCodes).toContain("target_mismatch");
  });

  it("runtime environment escalation is execution_denied", () => {
    const result = runEvalCase(requiredCase("redteam-runtime-environment-escalation-after-allow"));

    expect(result.passed).toBe(true);
    expect(result.actual.finalDecision).toBe("execution_denied");
    expect(result.actual.runtimeFailureCodes).toContain("environment_mismatch");
  });

  it("receipt tampering is detected", () => {
    const result = runEvalCase(requiredCase("redteam-receipt-tampering-final-decision"));

    expect(result.passed).toBe(true);
    expect(result.actual.receiptTamperDetected).toBe(true);
  });

  it("hard boundary cannot be approved around", () => {
    const result = runEvalCase(requiredCase("redteam-policy-block-approval-override-attempt"));

    expect(result.passed).toBe(true);
    expect(result.actual.finalDecision).toBe("blocked_by_policy");
    expect(result.actual.blockedBeforeAag).toBe(true);
  });

  it("noisy memory history produces human-reviewable recommendations", () => {
    const result = runEvalCase(requiredCase("redteam-governance-memory-noisy-history"));

    expect(result.passed).toBe(true);
    expect(result.actual.memoryHumanReviewRequired).toBe(true);
    expect(result.actual.memorySummaryIncludesHumanReview).toBe(true);
    expect(result.actual.memoryRecommendationTypes).toContain("investigate_runtime_binding");
  });

  it("summarizeEvalResults includes red-team totals", () => {
    const result = runRedTeamEvalSuite();
    const summary = summarizeEvalResults(result);

    expect(summary).toContain(`total: ${builtInRedTeamEvalCases.length}`);
    expect(summary).toContain(`passed: ${builtInRedTeamEvalCases.length}`);
  });
});

function requiredCase(id: string) {
  const evalCase = builtInRedTeamEvalCases.find((entry) => entry.id === id);

  if (evalCase === undefined) {
    throw new Error(`Missing red-team eval case: ${id}`);
  }

  return evalCase;
}
