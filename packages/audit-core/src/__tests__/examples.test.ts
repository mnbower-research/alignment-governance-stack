import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createGovernanceRealityReport,
  findProhibitedAccusatoryLanguage,
  renderGovernanceRealityReportMarkdown,
  validateGovernanceRealityReport
} from "../index.js";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../../../..");

describe("audit report examples", () => {
  const exampleFiles = [
    "strongly-supported-governance.json",
    "potential-theater-signals.json",
    "agent-workflow-gap-review.json",
    "ags-self-audit.json",
    "ags-self-audit-with-agency-chain.json",
    "content-publishing-hardening-report.json"
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

  it("renders the content publishing hardening report deterministically", () => {
    const result = createGovernanceRealityReport(readExample("content-publishing-hardening-report.json"));
    const markdown = renderGovernanceRealityReportMarkdown(result.report!);

    expect(markdown).toBe(renderGovernanceRealityReportMarkdown(result.report!));
    expect(markdown).toContain("AGS Content Publishing Agent Public-Claim Hardening Review");
    expect(markdown).toContain("## Limitations");
    expect(markdown).toContain("## Methodology");
    expect(markdown).toContain("## Severity and Confidence Definitions");
    expect(markdown).toContain("## Remediation Summary");
    expect(markdown).toContain("## Evidence Appendix");
    expect(markdown).toContain("## Agency Chain Map");
    expect(markdown).toContain("Unsupported public claim risk");
    expect(findProhibitedAccusatoryLanguage(markdown)).toEqual([]);
  });
});

function readExample(fileName: string): unknown {
  return JSON.parse(
    readFileSync(join(repoRoot, "examples", "audit-report", fileName), "utf8")
  ) as unknown;
}
