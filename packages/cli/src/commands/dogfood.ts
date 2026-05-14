import { runDogfoodEvalSuite } from "@alignment-governance-stack/eval-suite";
import type { CliResult } from "../cli.js";
import { formatEvalSummary } from "../format/formatEvalSummary.js";

export function runDogfoodCommand(_args: string[] = []): CliResult {
  const result = runDogfoodEvalSuite();

  return {
    exitCode: result.passed ? 0 : 1,
    stdout: `${formatEvalSummary(result)}\n`
  };
}
