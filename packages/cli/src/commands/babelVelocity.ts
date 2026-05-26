import { writeFileSync } from "node:fs";
import {
  analyzeBabelVelocity,
  renderBabelVelocityReportMarkdown,
  validateBabelVelocityInput,
  type BabelVelocityInput
} from "@alignment-governance-stack/babel-risk";
import type { CliResult } from "../cli.js";
import { readJsonFile } from "../io/readJsonFile.js";

export function runBabelVelocityCommand(args: string[]): CliResult {
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
      stderr: "Missing input file. Usage: ags babel-velocity <input.json> [--out report.md] [--json]\n"
    };
  }

  if (outIndex >= 0 && outPath === undefined) {
    return {
      exitCode: 2,
      stdout: "",
      stderr: "Missing output file after --out. Usage: ags babel-velocity <input.json> [--out report.md] [--json]\n"
    };
  }

  const input = readJsonFile<unknown>(inputPath);
  const validation = validateBabelVelocityInput(input as BabelVelocityInput);

  if (!validation.valid) {
    return {
      exitCode: 2,
      stdout: "",
      stderr: `Invalid Babel Velocity input:\n${validation.errors.map((error) => `- ${error}`).join("\n")}\n`
    };
  }

  const report = analyzeBabelVelocity(input as BabelVelocityInput);
  const markdown = renderBabelVelocityReportMarkdown(report);

  if (outPath !== undefined) {
    writeFileSync(outPath, markdown, "utf8");
  }

  const exitCode = report.overallVelocityRisk === "high" || report.overallVelocityRisk === "critical" ? 1 : 0;

  return {
    exitCode,
    stdout: jsonOutput ? `${JSON.stringify(report, null, 2)}\n` : outPath === undefined ? `${markdown}\n` : ""
  };
}
