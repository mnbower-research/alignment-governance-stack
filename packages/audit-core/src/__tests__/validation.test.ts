import { describe, expect, it } from "vitest";
import {
  createGovernanceRealityReport,
  validateAuditFinding,
  validateGovernanceRealityReport,
  type AuditFinding,
  type GovernanceRealityReport
} from "../index.js";

describe("audit validation", () => {
  it("validates a complete audit finding", () => {
    const result = validateAuditFinding(sampleFinding());

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("requires a valid taxonomy ID, questions, remediations, and evidence array", () => {
    const result = validateAuditFinding({
      ...sampleFinding(),
      taxonomyId: "BAD-001",
      auditQuestions: [],
      recommendedRemediations: [],
      evidenceRefs: undefined
    });

    expect(result.valid).toBe(false);
    expect(result.errors.map((error) => error.path)).toContain("$.taxonomyId");
    expect(result.errors.map((error) => error.path)).toContain("$.auditQuestions");
    expect(result.errors.map((error) => error.path)).toContain("$.recommendedRemediations");
    expect(result.errors.map((error) => error.path)).toContain("$.evidenceRefs");
  });

  it("flags prohibited accusatory language in findings", () => {
    const result = validateAuditFinding({
      ...sampleFinding(),
      observation: "The company is lying about governance."
    });

    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.message.includes("lying"))).toBe(true);
  });

  it("validates a Governance Reality Report", () => {
    const report = sampleReport();
    const result = validateGovernanceRealityReport(report);

    expect(result.valid).toBe(true);
  });

  it("creates a report from simplified input", () => {
    const result = createGovernanceRealityReport(
      {
        subject: {
          organizationName: "Example Corp",
          auditScope: "Agent workflow governance review"
        },
        findings: [sampleFinding()]
      },
      { generatedAt: "2026-05-15T12:00:00.000Z" }
    );

    expect(result.validation.valid).toBe(true);
    expect(result.report?.reportId).toBe("grr-2026-05-15-agent-workflow-governance-review");
    expect(result.report?.remediationPlan).toHaveLength(1);
  });
});

function sampleFinding(): AuditFinding {
  return {
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
  };
}

function sampleReport(): GovernanceRealityReport {
  return {
    reportId: "grr-test",
    generatedAt: "2026-05-15T12:00:00.000Z",
    subject: {
      organizationName: "Example Corp",
      auditScope: "Agent workflow governance review"
    },
    disclaimer:
      "This report identifies potential governance theater signals and evidence gaps based on available inputs. It is not a legal conclusion, compliance certification, accusation of wrongdoing, or finding of unsafe operation. All findings require human review and verification before external use.",
    executiveSummary: "Available inputs identify one finding requiring verification.",
    posture: {
      overallStatus: "needs_attention",
      confidence: "medium"
    },
    findings: [sampleFinding()],
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
