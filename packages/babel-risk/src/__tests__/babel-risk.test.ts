import { describe, expect, it } from "vitest";
import {
  analyzeBabelRisk,
  renderBabelRiskReportMarkdown,
  summarizeBabelRisk,
  validateBabelRiskInput
} from "../index.js";
import type { BabelRiskInput, BabelRiskReport } from "../types.js";

describe("structural babel risk", () => {
  it("returns a low report with warnings for empty input without crashing", () => {
    const validation = validateBabelRiskInput({});
    const report = analyzeBabelRisk(withGeneratedAt({}));

    expect(validation.valid).toBe(true);
    expect(validation.warnings.length).toBeGreaterThan(0);
    expect(report.overallRisk).toBe("low");
    expect(report.findings).toHaveLength(0);
  });

  it("flags capability outrunning discernment", () => {
    const report = analyzeBabelRisk(
      withGeneratedAt({
        capabilitySignals: [
          { id: "cap-autonomy", kind: "autonomy_level", severity: "high" }
        ],
        participationSignals: [
          { id: "part-low-context", kind: "low_context_approval", severity: "medium" }
        ]
      })
    );

    expect(categories(report)).toContain("capability_outruns_discernment");
  });

  it("flags coordination outrunning authority", () => {
    const report = analyzeBabelRisk(
      withGeneratedAt({
        coordinationSignals: [
          { id: "coord-cross-team", kind: "cross_department_workflow", severity: "high" }
        ],
        authoritySignals: [
          { id: "auth-owner", kind: "unclear_owner", severity: "medium" }
        ]
      })
    );

    expect(categories(report)).toContain("coordination_outruns_authority");
  });

  it("flags language outrunning meaning", () => {
    const report = analyzeBabelRisk(
      withGeneratedAt({
        coordinationSignals: [
          {
            id: "coord-language",
            kind: "shared_language_without_shared_meaning",
            severity: "medium"
          }
        ]
      })
    );

    expect(categories(report)).toContain("language_outruns_meaning");
  });

  it("flags automation outrunning participation", () => {
    const report = analyzeBabelRisk(
      withGeneratedAt({
        capabilitySignals: [
          { id: "cap-speed", kind: "execution_speed", severity: "medium" }
        ],
        participationSignals: [
          { id: "part-near-loop", kind: "human_near_loop", severity: "high" }
        ]
      })
    );

    expect(categories(report)).toContain("automation_outruns_participation");
  });

  it("flags memory outrunning review", () => {
    const report = analyzeBabelRisk(
      withGeneratedAt({
        memorySignals: [
          { id: "mem-review", kind: "memory_without_review", severity: "high" }
        ]
      })
    );

    expect(categories(report)).toContain("memory_outruns_review");
  });

  it("flags proof outrunning reality for missing receipt/runtime/fingerprint gaps", () => {
    const report = analyzeBabelRisk(
      withGeneratedAt({
        proofSignals: [
          { id: "proof-runtime", kind: "unverified_runtime_binding", severity: "high" }
        ],
        fingerprintSignals: [
          { id: "fp-missing", kind: "missing_fingerprint", severity: "medium" }
        ]
      })
    );

    expect(categories(report)).toContain("proof_outruns_reality");
  });

  it("flags repeated governance theater findings", () => {
    const report = analyzeBabelRisk(
      withGeneratedAt({
        governanceReportSignals: [
          {
            id: "report-theater",
            kind: "repeated_governance_theater_finding",
            severity: "high"
          }
        ]
      })
    );

    expect(categories(report)).toContain("governance_theater");
  });

  it("flags dependency capture", () => {
    const report = analyzeBabelRisk(
      withGeneratedAt({
        coordinationSignals: [
          { id: "coord-platform", kind: "dependency_on_single_platform", severity: "high" }
        ]
      })
    );

    expect(categories(report)).toContain("dependency_capture");
  });

  it("flags self-audit circularity", () => {
    const report = analyzeBabelRisk(
      withGeneratedAt({
        governanceReportSignals: [
          { id: "report-circular", kind: "self_audit_circularity", severity: "high" }
        ]
      })
    );

    expect(categories(report)).toContain("self_audit_circularity");
  });

  it("flags centralized control without accountability", () => {
    const report = analyzeBabelRisk(
      withGeneratedAt({
        coordinationSignals: [
          { id: "coord-control", kind: "centralized_control_plane", severity: "high" }
        ],
        authoritySignals: [
          { id: "auth-stop", kind: "missing_stop_authority", severity: "medium" }
        ]
      })
    );

    expect(categories(report)).toContain("centralized_control_without_accountability");
  });

  it("keeps healthy anti-Babel structure low risk with few findings", () => {
    const report = analyzeBabelRisk(
      withGeneratedAt({
        systemId: "healthy-system",
        organizationId: "org-example",
        workflowId: "reviewed-release",
        metadata: {
          evidence: [
            "authority map present",
            "meaningful participation present",
            "runtime binding present",
            "receipts linked",
            "agency fingerprints linked",
            "governance memory reviewed by humans"
          ]
        }
      })
    );

    expect(report.overallRisk).toBe("low");
    expect(report.findings.length).toBeLessThanOrEqual(1);
  });

  it("renders markdown with risk, score, findings, remediation, and limitations", () => {
    const report = analyzeBabelRisk(
      withGeneratedAt({
        proofSignals: [
          { id: "proof-gap", kind: "missing_receipt", severity: "high" }
        ]
      })
    );
    const markdown = renderBabelRiskReportMarkdown(report);

    expect(markdown).toContain("# Structural Babel Risk Report");
    expect(markdown).toContain("Overall risk:");
    expect(markdown).toContain("Structural ascent score:");
    expect(markdown).toContain("## Findings");
    expect(markdown).toContain("## Recommended Remediation");
    expect(markdown).toContain("## Limitations");
  });

  it("produces stable report identity for fixed input when generatedAt is controlled", () => {
    const input = withGeneratedAt({
      capabilitySignals: [
        { id: "cap-scope", kind: "scope_expansion", severity: "high" }
      ],
      proofSignals: [
        { id: "proof-fp", kind: "incomplete_fingerprint", severity: "medium" }
      ]
    });

    const first = analyzeBabelRisk(input);
    const second = analyzeBabelRisk(input);

    expect(stripGeneratedAt(first)).toEqual(stripGeneratedAt(second));
    expect(first.generatedAt).toBe("2026-05-26T12:00:00.000Z");
    expect(summarizeBabelRisk(first)).toContain("AGS Structural Babel Risk Report");
  });
});

function categories(report: BabelRiskReport): string[] {
  return report.findings.map((finding) => finding.category);
}

function withGeneratedAt(input: BabelRiskInput): BabelRiskInput {
  return {
    ...input,
    metadata: {
      ...input.metadata,
      generatedAt: "2026-05-26T12:00:00.000Z"
    }
  };
}

function stripGeneratedAt(report: BabelRiskReport): Omit<BabelRiskReport, "generatedAt"> {
  const { generatedAt: _generatedAt, ...rest } = report;
  return rest;
}
