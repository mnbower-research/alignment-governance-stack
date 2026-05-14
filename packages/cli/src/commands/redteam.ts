import { runRedTeamEvalSuite } from "@alignment-governance-stack/eval-suite";
import type { CliResult } from "../cli.js";

export function runRedTeamCommand(_args: string[] = []): CliResult {
  const result = runRedTeamEvalSuite();
  const lines = [
    "AGS Red-Team Eval Suite",
    `total: ${result.total}`,
    `passed: ${result.passedCount}`,
    `failed: ${result.failedCount}`
  ];

  for (const failed of result.results.filter((entry) => !entry.passed)) {
    lines.push(`- ${failed.id}: ${failed.failures.join(" ")}`);
  }

  return {
    exitCode: result.passed ? 0 : 1,
    stdout: `${lines.join("\n")}\n`
  };
}
