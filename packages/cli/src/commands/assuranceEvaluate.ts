import { readFileSync } from "node:fs";
import { evaluateAssurance } from "@alignment-governance-stack/assurance";
import type { AssuranceEvaluationRequest } from "@alignment-governance-stack/shared-types";
import type { CliResult } from "../cli.js";
export function runAssuranceEvaluateCommand(args: string[]): CliResult {
  try {
    if (!args[0] || args[0].startsWith("--")) throw new Error("Usage: ags assurance-evaluate <input.json> [--json]");
    const request = JSON.parse(readFileSync(args[0], "utf8")) as AssuranceEvaluationRequest;
    const result = evaluateAssurance(request.action, request.assurance);
    return { exitCode: result.decision === "satisfied" ? 0 : 1,
      stdout: args.includes("--json") ? `${JSON.stringify(result, null, 2)}\n` : `Assurance: ${result.decision}\nRisk: ${result.binding.riskLevel}\nThis is validation evidence, not execution authority.\n${result.findings.map(f => `${f.code}: ${f.reason}`).join("\n")}\n` };
  } catch (error) { return { exitCode: 2, stdout: "", stderr: `${error instanceof Error ? error.message : "Invalid assurance input."}\n` }; }
}
