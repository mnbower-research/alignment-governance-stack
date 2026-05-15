import {
  createAgencyChainMap,
  summarizeAgencyChain,
  validateAgencyChainInput,
  type AgencyChainInput
} from "@alignment-governance-stack/agency-chain";
import type { CliResult } from "../cli.js";
import { readJsonFile } from "../io/readJsonFile.js";

export function runAgencyChainCommand(args: string[]): CliResult {
  const jsonOutput = args.includes("--json");
  const inputPath = args.find((arg) => arg !== "--json");

  if (inputPath === undefined) {
    return {
      exitCode: 2,
      stdout: "",
      stderr: "Missing input file. Usage: ags agency-chain <input.json> [--json]\n"
    };
  }

  const input = readJsonFile<unknown>(inputPath);
  const validation = validateAgencyChainInput(input);

  if (!validation.valid) {
    return {
      exitCode: 2,
      stdout: "",
      stderr: `Invalid agency chain input:\n${validation.errors
        .map((error) => `- ${error.path}: ${error.message}`)
        .join("\n")}\n`
    };
  }

  const chain = createAgencyChainMap(input as AgencyChainInput);
  const hasHighOrCriticalIssue = chain.issues.some(
    (issue) => issue.severity === "high" || issue.severity === "critical"
  );
  const exitCode = chain.overallStatus === "weak" || chain.overallStatus === "broken" || hasHighOrCriticalIssue ? 1 : 0;

  return {
    exitCode,
    stdout: jsonOutput ? `${JSON.stringify(chain, null, 2)}\n` : summarizeAgencyChain(chain)
  };
}
