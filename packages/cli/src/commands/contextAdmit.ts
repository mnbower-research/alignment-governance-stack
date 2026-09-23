import { evaluateContextAdmission, validateContextAdmissionRequest } from "@alignment-governance-stack/context-admission";
import type { ContextAdmissionRequest } from "@alignment-governance-stack/shared-types";
import type { CliResult } from "../cli.js";
import { readJsonFile } from "../io/readJsonFile.js";

export function runContextAdmitCommand(args: string[]): CliResult {
  const paths = args.filter(arg => arg !== "--json");
  if (paths.length !== 1 || paths[0]!.startsWith("--")) return {
    exitCode: 2, stdout: "", stderr: "Usage: ags context-admit <input.json> [--json]\n"
  };
  try {
    const input = readJsonFile<unknown>(paths[0]!);
    const validation = validateContextAdmissionRequest(input);
    if (!validation.valid) return { exitCode: 2, stdout: "", stderr: `${validation.errors.join("\n")}\n` };
    const result = evaluateContextAdmission(input as ContextAdmissionRequest);
    return {
      exitCode: result.decision === "admit" || result.decision === "admit_restricted" ? 0 : 1,
      stdout: args.includes("--json") ? `${JSON.stringify(result, null, 2)}\n` : [
        `Context Admission: ${result.decision}`, `Receiving agent: ${result.requestedUse.receiverAgentId}`,
        `Purpose: ${result.requestedUse.purpose} (${result.requestedUse.mode})`,
        `Lineage digest: ${result.contextLineageDigest}`, result.reasonForDecision,
        ...result.findings.map(f => `- ${f.artifactId}: ${f.code} (${f.decision})`), ""
      ].join("\n")
    };
  } catch (error) {
    return { exitCode: 2, stdout: "", stderr: `${error instanceof Error ? error.message : "Invalid context input."}\n` };
  }
}
