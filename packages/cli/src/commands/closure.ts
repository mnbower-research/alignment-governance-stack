import { writeFileSync } from "node:fs";
import {
  createDecisionClosureArtifact,
  renderDecisionClosureArtifactMarkdown,
  summarizeDecisionClosureArtifact,
  validateDecisionClosureArtifact,
  type DecisionClosureArtifactInput
} from "@alignment-governance-stack/decision-closure";
import type { CliResult } from "../cli.js";
import { readJsonFile } from "../io/readJsonFile.js";

export function runClosureCommand(args: string[]): CliResult {
  const jsonOutput = args.includes("--json");
  const outIndex = args.indexOf("--out");
  const outPath = outIndex >= 0 ? args[outIndex + 1] : undefined;
  const inputPath = args.find((arg, index) => {
    if (arg === "--json" || arg === "--out") {
      return false;
    }

    if (outIndex >= 0 && index === outIndex + 1) {
      return false;
    }

    return true;
  });

  if (inputPath === undefined) {
    return {
      exitCode: 2,
      stdout: "",
      stderr: "Missing input file. Usage: ags closure <input.json> [--out closure.md] [--json]\n"
    };
  }

  if (outIndex >= 0 && outPath === undefined) {
    return {
      exitCode: 2,
      stdout: "",
      stderr: "Missing output file after --out. Usage: ags closure <input.json> [--out closure.md] [--json]\n"
    };
  }

  const input = readJsonFile<unknown>(inputPath);
  if (!isClosureInput(input)) {
    return {
      exitCode: 2,
      stdout: "",
      stderr: "Invalid decision closure input: expected artifactId, createdAt, action, executionBoundary, authority, decision, conditions, and auditSummary.\n"
    };
  }

  const artifact = createDecisionClosureArtifact(input);
  const validation = validateDecisionClosureArtifact(artifact);
  const markdown = renderDecisionClosureArtifactMarkdown(artifact, validation);

  if (outPath !== undefined) {
    writeFileSync(outPath, markdown, "utf8");
  }

  const exitCode = validation.severity === "high" || validation.severity === "critical" ? 1 : 0;

  return {
    exitCode,
    stdout: jsonOutput
      ? `${JSON.stringify({ artifact, validation }, null, 2)}\n`
      : outPath === undefined
        ? summarizeDecisionClosureArtifact(artifact, validation)
        : ""
  };
}

function isClosureInput(input: unknown): input is DecisionClosureArtifactInput {
  if (!isRecord(input)) {
    return false;
  }

  return (
    typeof input.artifactId === "string" &&
    typeof input.createdAt === "string" &&
    isRecord(input.action) &&
    isRecord(input.executionBoundary) &&
    isRecord(input.authority) &&
    isRecord(input.decision) &&
    isRecord(input.conditions) &&
    isRecord(input.auditSummary)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

