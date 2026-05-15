import { writeFileSync } from "node:fs";
import {
  createGovernanceRealityReport,
  renderGovernanceRealityReportMarkdown
} from "@alignment-governance-stack/audit-core";
import type { CliResult } from "../cli.js";
import { readJsonFile } from "../io/readJsonFile.js";

export function runAuditReportCommand(args: string[]): CliResult {
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
      stderr: "Missing input file. Usage: ags audit-report <input.json> [--out report.md] [--json]\n"
    };
  }

  if (outIndex >= 0 && outPath === undefined) {
    return {
      exitCode: 2,
      stdout: "",
      stderr: "Missing output file after --out. Usage: ags audit-report <input.json> [--out report.md] [--json]\n"
    };
  }

  const input = readJsonFile<unknown>(inputPath);
  const result = createGovernanceRealityReport(input, { includeRawInputs: false });

  if (result.report === undefined || !result.validation.valid) {
    return {
      exitCode: 2,
      stdout: "",
      stderr: `Invalid audit report input:\n${formatValidationErrors(result.validation.errors)}\n`
    };
  }

  const markdown = renderGovernanceRealityReportMarkdown(result.report);
  if (outPath !== undefined) {
    writeFileSync(outPath, markdown, "utf8");
  }

  const hasHighOrCritical = result.report.findings.some(
    (finding) => finding.severity === "high" || finding.severity === "critical"
  );

  return {
    exitCode: hasHighOrCritical ? 1 : 0,
    stdout: jsonOutput ? `${JSON.stringify(result.report, null, 2)}\n` : outPath === undefined ? `${markdown}\n` : ""
  };
}

function formatValidationErrors(errors: Array<{ path: string; message: string }>): string {
  if (errors.length === 0) {
    return "- Unknown validation failure.";
  }

  return errors.map((error) => `- ${error.path}: ${error.message}`).join("\n");
}
