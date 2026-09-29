import { describe, expect, it } from "vitest";
import { createGovernanceRealityReport, createGovernanceContinuityFindings } from "../index.js";

describe("evidence versus inference", () => {
  it("does not infer positive support from an empty findings list", () => {
    const result = createGovernanceRealityReport({ subject: { auditScope: "No evidence" }, findings: [] });
    expect(result.validation.valid).toBe(true);
    expect(result.report?.posture).toEqual({ overallStatus: "insufficient_evidence", confidence: "low" });
  });

  it.each(["allowed", "allowed_by_aag", "execution_allowed", "execution_denied", "not_executed"])(
    "does not infer execution from %s", finalDecision => {
      const result = createGovernanceContinuityFindings({ receipts: [{ id: "r", finalDecision,
        proposal: { id: "action", userRequest: "Publish report", tool: "report.publish",
          actionType: "publish_report", target: "public", environment: "production",
          externalFacing: true, reversible: false, dataSensitivity: "low",
          requiresApproval: true, knownApproval: false, metadata: {} } }] });
      expect(result.findings.map(f => f.id)).not.toContain("continuity-receipt-002");
    }
  );

  it.each([
    { finalDecision: "executed" },
    { finalDecision: "execution_denied", finalOutcome: "executed" },
    { finalDecision: "allowed_by_aag", executedAt: "2026-09-29T00:00:00Z" }
  ])("retains explicit supplied execution claims %#", evidence => {
    const result = createGovernanceContinuityFindings({ receipts: [{ id: "r", ...evidence,
      proposal: { id: "action", userRequest: "Publish report", tool: "report.publish",
        actionType: "publish_report", target: "public", environment: "production",
        externalFacing: true, reversible: false, dataSensitivity: "low",
        requiresApproval: true, knownApproval: false, metadata: {} } }] });
    expect(result.findings.map(f => f.id)).toContain("continuity-receipt-002");
  });

  it("preserves an explicitly supplied analyst posture instead of inventing one", () => {
    const posture = { overallStatus: "early_review", confidence: "low" };
    const result = createGovernanceRealityReport({ subject: { auditScope: "Manual review" }, findings: [], posture });
    expect(result.report?.posture).toEqual(posture);
  });
});
