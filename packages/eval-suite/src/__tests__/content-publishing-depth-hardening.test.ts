import { describe, expect, it } from "vitest";
import {
  builtInContentPublishingDepthHardeningEvalCases,
  runContentPublishingDepthHardeningEvalCase,
  runContentPublishingDepthHardeningEvalSuite
} from "../index.js";

const prohibitedPattern = /\b(fake|fraud|scam|illegal|lying|negligent)\b/i;

describe("content publishing depth hardening eval suite", () => {
  it("exports 30 deterministic depth hardening cases", () => {
    expect(builtInContentPublishingDepthHardeningEvalCases).toHaveLength(30);
    for (const evalCase of builtInContentPublishingDepthHardeningEvalCases) {
      expect(evalCase.id).toMatch(/^cp-depth-/);
      expect(evalCase.title).toContain("Content Publishing Depth Hardening");
      expect(evalCase.description).toBeDefined();
    }
  });

  it("passes all content publishing depth hardening cases", () => {
    const result = runContentPublishingDepthHardeningEvalSuite();

    expect(result.passed).toBe(true);
    expect(result.passedCount).toBe(30);
    expect(result.failedCount).toBe(0);
  });

  it("calibrates false positives and false negatives", () => {
    expect(resultFor("cp-depth-safe-internal-v171-release-draft").actual.severity).not.toMatch(/high|critical/);
    expect(resultFor("cp-depth-unsigned-low-risk-internal-draft").actual.findingIds).toContain("DCA-009");
    expect(resultFor("cp-depth-unsigned-low-risk-internal-draft").actual.severity).toBe("low");
    expect(resultFor("cp-depth-refused-public-claim-no-execution").actual.findingIds).not.toContain("DCA-008");
    expect(resultFor("cp-depth-overclaim-regulator-ready").actual.severity).toBe("high");
    expect(resultFor("cp-depth-laundering-public-website").actual.severity).toBe("critical");
    expect(resultFor("cp-depth-runtime-github-to-linkedin").actual.findingIds).toContain("DCA-RUNTIME-SUBSTITUTION");
  });

  it("calibrates Decision Closure completeness profiles", () => {
    expect(resultFor("cp-depth-safe-internal-v171-release-draft").actual.profileId).toBe("allowed_internal_low_risk_draft");
    expect(resultFor("cp-depth-safe-github-release-note").actual.profileId).toBe("allowed_consequential_external_action");
    expect(resultFor("cp-depth-refused-public-claim-no-execution").actual.profileId).toBe("refused_action");
  });

  it("uses non-accusatory generated language", () => {
    const result = runContentPublishingDepthHardeningEvalSuite();

    expect(JSON.stringify(result)).not.toMatch(prohibitedPattern);
  });
});

function resultFor(id: string) {
  const evalCase = builtInContentPublishingDepthHardeningEvalCases.find((entry) => entry.id === id);
  if (evalCase === undefined) {
    throw new Error(`Missing content publishing depth hardening eval case: ${id}`);
  }

  const result = runContentPublishingDepthHardeningEvalCase(evalCase);
  expect(result.passed).toBe(true);
  return result;
}
