import { describe, expect, it } from "vitest";
import {
  createGovernanceRealityReport,
  findProhibitedAccusatoryLanguage,
  renderGovernanceRealityReportMarkdown,
  STANDARD_AUDIT_LIMITATIONS,
  STANDARD_CONFIDENCE_DEFINITIONS,
  STANDARD_SEVERITY_DEFINITIONS,
  type GovernanceRealityReport
} from "../index.js";

describe("Governance Reality Report Markdown renderer", () => {
  it("renders required sections and finding details", () => {
    const markdown = renderGovernanceRealityReportMarkdown(sampleReport());

    expect(markdown).toContain("# Governance Reality Report");
    expect(markdown).toContain("## Executive Summary");
    expect(markdown).toContain("## Audit Scope");
    expect(markdown).toContain("## Audit Mode");
    expect(markdown).toContain("## Methodology");
    expect(markdown).toContain("## Limitations");
    expect(markdown).toContain("## Overall Assessment");
    expect(markdown).toContain("## Agency Chain Map");
    expect(markdown).toContain("## Finding Summary");
    expect(markdown).toContain("## Severity and Confidence Definitions");
    expect(markdown).toContain("## Findings");
    expect(markdown).toContain("## Remediation Summary");
    expect(markdown).toContain("## Evidence Appendix");
    expect(markdown).toContain("- Finding ID: F-001");
    expect(markdown).toContain("- Taxonomy ID: TG-003");
    expect(markdown).toContain("- Category / risk surface: runtime binding");
    expect(markdown).toContain("No evidence references provided.");
  });

  it("renders limitations and severity/confidence definitions", () => {
    const markdown = renderGovernanceRealityReportMarkdown(sampleReport());

    expect(markdown).toContain(STANDARD_AUDIT_LIMITATIONS[0]);
    expect(markdown).toContain(`- Critical: ${STANDARD_SEVERITY_DEFINITIONS.critical}`);
    expect(markdown).toContain(`- Medium: ${STANDARD_CONFIDENCE_DEFINITIONS.medium}`);
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

    expect(markdown).toContain("No findings were supplied");
    expect(markdown).toContain("No evidence references were provided");
  });

  it("renders deterministically", () => {
    const report = sampleReport();

    expect(renderGovernanceRealityReportMarkdown(report)).toBe(renderGovernanceRealityReportMarkdown(report));
  });

  it("renders a self-audit disclosure", () => {
    const report = {
      ...sampleReport(),
      auditMode: "internal_self_audit" as const,
      selfAuditDisclosure: {
        scopeDisclosure: "This is an internal AGS self-audit fixture.",
        strengths: ["PGDL exists for proposal scrutiny."],
        watchItems: ["No third-party external audit is included in this fixture."],
        nonCertificationStatement: "This self-audit is not a certification."
      }
    };
    const markdown = renderGovernanceRealityReportMarkdown(report);

    expect(markdown).toContain("## Self-Audit Disclosure");
    expect(markdown).toContain("PGDL exists for proposal scrutiny.");
  });

  it("normalizes sparse findings into a client-ready rendered report", () => {
    const result = createGovernanceRealityReport(
      {
        generatedAt: "2026-05-15T12:00:00.000Z",
        subject: { auditScope: "Sparse report review" },
        findings: [
          {
            id: "F-SPARSE",
            taxonomyId: "TG-001",
            title: "Stop authority not demonstrated",
            severity: "high",
            confidence: "medium",
            status: "not_demonstrated",
            summary: "Stop authority was not supplied.",
            observation: "The reviewed input does not identify stop authority.",
            whyItMatters: "Stop authority is needed at the action boundary.",
            evidenceRefs: []
          }
        ]
      },
      { generatedAt: "2026-05-15T12:00:00.000Z" }
    );

    expect(result.validation.valid).toBe(true);
    expect(renderGovernanceRealityReportMarkdown(result.report as GovernanceRealityReport)).toContain(
      "Define named human stop authority"
    );
  });
});

function sampleReport(): GovernanceRealityReport {
  return {
    reportId: "grr-render-test",
    generatedAt: "2026-05-15T12:00:00.000Z",
    auditMode: "workflow_review",
    subject: {
      organizationName: "Example Corp",
      systemName: "Agentic Operations",
      workflowName: "External Report Drafting",
      auditScope: "Local fixture review"
    },
    disclaimer:
      "This report identifies potential governance theater signals and evidence gaps based on available inputs. It is not a legal conclusion, compliance certification, accusation of wrongdoing, or finding of unsafe operation. All findings require human review and verification before external use.",
    executiveSummary: "Available inputs identify one finding requiring verification.",
    limitations: [...STANDARD_AUDIT_LIMITATIONS],
    methodology: ["Review available governance evidence."],
    severityDefinitions: STANDARD_SEVERITY_DEFINITIONS,
    confidenceDefinitions: STANDARD_CONFIDENCE_DEFINITIONS,
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
    remediationSummary: {
      overview: "One remediation item maps to runtime binding.",
      items: [
        {
          findingId: "F-001",
          priority: "high",
          action: "Add runtime binding evidence.",
          mapsToControl: "Runtime Binding"
        }
      ]
    },
    evidenceAppendix: [],
    appendices: {
      evidenceRefs: []
    }
  };
}
