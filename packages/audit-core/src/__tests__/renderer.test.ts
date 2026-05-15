import { describe, expect, it } from "vitest";
import {
  findProhibitedAccusatoryLanguage,
  renderGovernanceRealityReportMarkdown,
  type GovernanceRealityReport
} from "../index.js";

describe("Governance Reality Report Markdown renderer", () => {
  it("renders required sections and finding details", () => {
    const markdown = renderGovernanceRealityReportMarkdown(sampleReport());

    expect(markdown).toContain("# Governance Reality Report");
    expect(markdown).toContain("## Professional Disclaimer");
    expect(markdown).toContain("## Executive Summary");
    expect(markdown).toContain("## Audit Scope");
    expect(markdown).toContain("## Governance Reality Posture");
    expect(markdown).toContain("## Agency Chain Map");
    expect(markdown).toContain("## Key Findings");
    expect(markdown).toContain("## Remediation Plan");
    expect(markdown).toContain("## Evidence Appendix");
    expect(markdown).toContain("- Finding ID: F-001");
    expect(markdown).toContain("- Taxonomy ID: TG-003");
    expect(markdown).toContain("No evidence references provided.");
  });

  it("does not render prohibited accusatory wording outside the required disclaimer context", () => {
    const markdown = renderGovernanceRealityReportMarkdown(sampleReport());
    const issues = findProhibitedAccusatoryLanguage(markdown);

    expect(issues).toEqual([]);
  });

  it("handles reports with no findings and no evidence", () => {
    const report = {
      ...sampleReport(),
      findings: [],
      remediationPlan: [],
      appendices: { evidenceRefs: [] }
    };
    const markdown = renderGovernanceRealityReportMarkdown(report);

    expect(markdown).toContain("No key findings were supplied");
    expect(markdown).toContain("No evidence references were provided");
  });
});

function sampleReport(): GovernanceRealityReport {
  return {
    reportId: "grr-render-test",
    generatedAt: "2026-05-15T12:00:00.000Z",
    subject: {
      organizationName: "Example Corp",
      systemName: "Agentic Operations",
      workflowName: "External Report Drafting",
      auditScope: "Local fixture review"
    },
    disclaimer:
      "This report identifies potential governance theater signals and evidence gaps based on available inputs. It is not a legal conclusion, compliance certification, accusation of wrongdoing, or finding of unsafe operation. All findings require human review and verification before external use.",
    executiveSummary: "Available inputs identify one finding requiring verification.",
    posture: {
      overallStatus: "needs_attention",
      governanceRealityScore: 58,
      confidence: "medium"
    },
    findings: [
      {
        id: "F-001",
        taxonomyId: "TG-003",
        title: "Runtime binding not demonstrated",
        severity: "high",
        confidence: "medium",
        status: "not_demonstrated",
        summary: "Available evidence does not show runtime permit matching.",
        observation: "The reviewed artifact describes approval but does not include a runtime binding result.",
        whyItMatters: "Execution can differ from an approved proposal unless the exact action is checked at runtime.",
        auditQuestions: ["Is the runtime action bound to a permit?"],
        recommendedRemediations: ["Store runtime binding results with governance receipts."],
        evidenceRefs: []
      }
    ],
    agencyChainMap: {
      intentOwner: "Operations",
      agentRole: "Report drafting agent",
      toolAccess: ["docs.write"],
      missingLinks: ["runtime permit"]
    },
    remediationPlan: [
      {
        findingId: "F-001",
        priority: "high",
        action: "Add runtime binding evidence.",
        mapsToControl: "Runtime Binding"
      }
    ],
    appendices: {
      evidenceRefs: []
    }
  };
}
