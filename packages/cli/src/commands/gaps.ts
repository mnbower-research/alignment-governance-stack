import {
  detectAlignmentGaps,
  summarizeAlignmentGapReport,
  type DetectAlignmentGapsInput
} from "@alignment-governance-stack/company-profile-generator";
import type { CliResult } from "../cli.js";
import { readJsonFile } from "../io/readJsonFile.js";

export function runGapsCommand(args: string[]): CliResult {
  const jsonOutput = args.includes("--json");
  const inputPath = args.find((arg) => arg !== "--json");

  if (inputPath === undefined) {
    return {
      exitCode: 1,
      stdout: "",
      stderr: "Missing input file. Usage: ags gaps <input.json> [--json]\n"
    };
  }

  const input = readJsonFile<DetectAlignmentGapsInput>(inputPath);
  const report = detectAlignmentGaps(input);
  const hasHighOrCritical = report.gaps.some(
    (gap) => gap.severity === "high" || gap.severity === "critical"
  );

  return {
    exitCode: hasHighOrCritical ? 2 : 0,
    stdout: jsonOutput
      ? `${JSON.stringify(report, null, 2)}\n`
      : `${summarizeAlignmentGapReport(report)}\n`
  };
}
