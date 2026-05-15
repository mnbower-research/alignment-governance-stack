import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createGovernanceRealityReport,
  renderGovernanceRealityReportMarkdown,
  validateGovernanceRealityReport
} from "../index.js";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../../../..");

describe("audit report examples", () => {
  const exampleFiles = [
    "strongly-supported-governance.json",
    "potential-theater-signals.json",
    "agent-workflow-gap-review.json",
    "ags-self-audit.json"
  ];

  it.each(exampleFiles)("validates %s", (fileName) => {
    const input = readExample(fileName);
    const result = createGovernanceRealityReport(input, { generatedAt: "2026-05-15T12:00:00.000Z" });

    expect(result.validation.valid).toBe(true);
    expect(result.report).toBeDefined();
    expect(validateGovernanceRealityReport(result.report).valid).toBe(true);
  });

  it("renders the AGS self-audit with professional report sections", () => {
    const result = createGovernanceRealityReport(readExample("ags-self-audit.json"));
    const markdown = renderGovernanceRealityReportMarkdown(result.report!);

    expect(markdown).toContain("## Self-Audit Disclosure");
    expect(markdown).toContain("PGDL exists for proposal scrutiny.");
    expect(markdown).toContain("## Limitations");
    expect(markdown).toContain("## Severity and Confidence Definitions");
    expect(markdown).toContain("## Non-Accusatory Closing Note");
  });
});

function readExample(fileName: string): unknown {
  return JSON.parse(
    readFileSync(join(repoRoot, "examples", "audit-report", fileName), "utf8")
  ) as unknown;
}
