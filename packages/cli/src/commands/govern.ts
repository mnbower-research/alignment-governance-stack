import {
  evaluateGovernedRuntimeActionWithReceipt,
  type EvaluateGovernedRuntimeActionWithReceiptInput,
  type GovernanceFinalDecision
} from "@alignment-governance-stack/governance-core";
import type { CliResult } from "../cli.js";
import { formatGovernanceResult } from "../format/formatGovernanceResult.js";
import { readJsonFile } from "../io/readJsonFile.js";

const allowedFinalDecisions = new Set<GovernanceFinalDecision>([
  "allowed_by_aag",
  "execution_allowed"
]);

export function runGovernCommand(args: string[]): CliResult {
  const jsonOutput = args.includes("--json");
  const inputPath = args.find((arg) => arg !== "--json");

  if (inputPath === undefined) {
    return {
      exitCode: 1,
      stdout: "",
      stderr: "Missing input file. Usage: ags govern <input.json> [--json]\n"
    };
  }

  const input = readJsonFile<EvaluateGovernedRuntimeActionWithReceiptInput>(inputPath);
  const result = evaluateGovernedRuntimeActionWithReceipt(input);
  const exitCode = allowedFinalDecisions.has(result.governance.finalDecision) ? 0 : 2;

  return {
    exitCode,
    stdout: jsonOutput
      ? `${JSON.stringify(result, null, 2)}\n`
      : `${formatGovernanceResult(result)}\n`
  };
}
