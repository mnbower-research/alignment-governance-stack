import { describe, expect, it } from "vitest";
import {
  createGovernanceContinuityFindings,
  createGovernanceRealityReport,
  renderGovernanceRealityReportMarkdown
} from "../index.js";
import type { AgentActionProposal } from "@alignment-governance-stack/shared-types";

describe("governance continuity findings", () => {
  it("converts temporal governance drift into Governance Reality Report findings", () => {
    const result = createGovernanceContinuityFindings(
      {
        receipts: [
          {
            id: "receipt-draft-1",
            createdAt: "2026-05-01T10:00:00.000Z",
            proposal: proposal({
              id: "proposal-draft-1",
              actionType: "draft_internal_report",
              externalFacing: false,
              reversible: true
            }),
            finalDecision: "allowed",
            receiptHash: "hash-1",
            knownApproval: false
          },
          {
            id: "receipt-send-1",
            createdAt: "2026-05-02T10:00:00.000Z",
            proposal: proposal({
              id: "proposal-send-1",
              actionType: "send_external_report",
              externalFacing: true,
              reversible: false,
              requiresApproval: true,
              dataSensitivity: "high"
            }),
            finalDecision: "executed",
            executedAt: "2026-05-02T10:00:10.000Z",
            approvedAt: "2026-05-02T10:00:20.000Z",
            receiptHash: "hash-2",
            knownApproval: false
          }
        ],
        permits: [],
        options: { requireReceiptHashChain: true }
      },
      "2026-05-03T00:00:00.000Z"
    );

    expect(result.findings.some((finding) => finding.id === "continuity-scope-002")).toBe(true);
    expect(result.findings.some((finding) => finding.id === "continuity-review-001")).toBe(true);
    expect(result.findings.some((finding) => finding.id === "continuity-receipt-002")).toBe(true);
    expect(result.summary.findingsAdded).toBe(result.findings.length);
  });

  it("adds continuity checks through the existing Governance Reality Report flow", () => {
    const result = createGovernanceRealityReport(
      {
        subject: {
          organizationName: "Example Corp",
          systemName: "Agent Workflow",
          auditScope: "Continuity-enabled governance reality review"
        },
        findings: [],
        continuity: {
          receipts: [
            {
              id: "receipt-review-1",
              createdAt: "2026-05-01T10:00:00.000Z",
              proposal: proposal({ id: "proposal-review-1", actionType: "review_internal_report" }),
              finalDecision: "allowed",
              receiptHash: "hash-1"
            },
            {
              id: "receipt-publish-1",
              createdAt: "2026-05-02T10:00:00.000Z",
              proposal: proposal({
                id: "proposal-publish-1",
                actionType: "publish_report",
                externalFacing: true,
                reversible: false,
                requiresApproval: true
              }),
              finalDecision: "executed",
              executedAt: "2026-05-02T10:00:00.000Z",
              receiptHash: "hash-2"
            }
          ]
        }
      },
      { generatedAt: "2026-05-03T00:00:00.000Z" }
    );

    expect(result.validation.valid).toBe(true);
    expect(result.report?.continuityReview?.findingsAdded).toBeGreaterThan(0);
    expect(result.report?.findings.some((finding) => finding.id.startsWith("continuity-"))).toBe(true);

    const markdown = renderGovernanceRealityReportMarkdown(result.report!);
    expect(markdown).toContain("## Continuity Checks");
    expect(markdown).toContain("Continuity checks ask whether governance remained coherent over time");
  });
});

function proposal(overrides: Partial<AgentActionProposal>): AgentActionProposal {
  return {
    id: "proposal",
    userRequest: "Prepare a report.",
    tool: "report.tool",
    actionType: "review_internal_report",
    target: "weekly_report",
    environment: "production",
    reversible: true,
    externalFacing: false,
    dataSensitivity: "low",
    requiresApproval: false,
    knownApproval: false,
    metadata: {},
    ...overrides
  };
}
