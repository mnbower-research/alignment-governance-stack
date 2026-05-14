import type { AgsEvalSuiteResult } from "./types.js";

export function summarizeEvalResults(result: AgsEvalSuiteResult): string {
  const lines = [
    `AGS Eval Suite`,
    `total: ${result.total}`,
    `passed: ${result.passedCount}`,
    `failed: ${result.failedCount}`
  ];

  for (const failed of result.results.filter((entry) => !entry.passed)) {
    lines.push(`- ${failed.id}: ${failed.failures.join(" ")}`);
  }

  return lines.join("\n");
}

