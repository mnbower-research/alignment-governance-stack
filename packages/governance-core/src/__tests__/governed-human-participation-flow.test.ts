import { createApprovalBinding } from "@alignment-governance-stack/authority-map";
import { describe, expect, it } from "vitest";
import type { ApprovalEvidence } from "@alignment-governance-stack/authority-map";
import { defaultAuthorityMap } from "@alignment-governance-stack/authority-map";
import type { AgentActionProposal } from "@alignment-governance-stack/shared-types";
import type { HumanParticipationInput } from "@alignment-governance-stack/human-participation";
import { verifyGovernanceReceipt } from "@alignment-governance-stack/receipts";
import { defaultPolicyProfile } from "@alignment-governance-stack/policy-profiles";
import { evaluateGovernedAction } from "../evaluateGovernedAction.js";
import { evaluateGovernedRuntimeAction } from "../evaluateGovernedRuntimeAction.js";
import { evaluateGovernedRuntimeActionWithReceipt } from "../evaluateGovernedRuntimeActionWithReceipt.js";

describe("governed flow with human participation quality", () => {
  it("preserves existing behavior when no human participation input is supplied", () => {
    const packet = evaluateGovernedRuntimeAction({
      proposal: createSafeReportProposal(),
      runtimeAction: createSafeReportProposal()
    });

    expect(packet.participationQuality).toBeUndefined();
    expect(packet.finalDecision).toBe("execution_allowed");
  });

  it("allows flow to AAG when participation is meaningful", () => {
    const packet = evaluateGovernedAction({
      proposal: createApprovalRequiredReportProposal(),
      authorityMap: defaultAuthorityMap,
      approvalEvidence: createApprovalEvidence(),
      humanParticipation: {
        input: createMeaningfulParticipationInput()
      }
    });

    expect(packet.approvalValidation?.valid).toBe(true);
    expect(packet.participationQuality?.meaningful).toBe(true);
    expect(packet.participationQuality?.decision).toBe("meaningful_participation");
    expect(packet.aag).toBeDefined();
  });

  it("stops before AAG when approval looks like rubber-stamping", () => {
    const packet = evaluateGovernedAction({
      proposal: createApprovalRequiredReportProposal(),
      authorityMap: defaultAuthorityMap,
      approvalEvidence: createApprovalEvidence(),
      humanParticipation: {
        input: {
          context: {
            highRisk: true
          },
          humanResponse: {
            decision: "approve",
            responseTimeSeconds: 1
          }
        }
      }
    });

    expect(packet.finalDecision).toBe("insufficient_human_participation");
    expect(packet.participationQuality?.decision).toBe("likely_rubber_stamp");
    expect(packet.aag).toBeUndefined();
  });

  it("lets hard boundaries block before participation quality runs", () => {
    const packet = evaluateGovernedAction({
      proposal: createSafeReportProposal(),
      policyProfile: {
        ...defaultPolicyProfile,
        hardBoundaries: [
          {
            id: "never_auto_usage_report",
            label: "Never auto usage report",
            when: {
              actionType: "generate_internal_report",
              targetIncludes: "usage"
            },
            effect: "block",
            reason: "Usage reports require human-owned preparation."
          }
        ]
      },
      authorityMap: defaultAuthorityMap,
      approvalEvidence: createApprovalEvidence(),
      humanParticipation: {
        input: createMeaningfulParticipationInput()
      }
    });

    expect(packet.finalDecision).toBe("blocked_by_policy");
    expect(packet.participationQuality).toBeUndefined();
    expect(packet.aag).toBeUndefined();
  });

  it("preserves participation quality in receipts", () => {
    const proposal = createApprovalRequiredReportProposal();
    const result = evaluateGovernedRuntimeActionWithReceipt({
      proposal,
      authorityMap: defaultAuthorityMap,
      approvalEvidence: createApprovalEvidence(),
      humanParticipation: {
        input: createMeaningfulParticipationInput()
      },
      runtimeAction: proposal,
      permitOptions: {
        issuedAt: "2026-05-12T10:00:00.000Z"
      },
      receiptOptions: {
        createdAt: "2026-05-12T10:00:01.000Z"
      }
    });

    expect(result.governance.participationQuality?.meaningful).toBe(true);
    expect(result.receipt.participationQuality).toEqual(result.governance.participationQuality);
    expect(verifyGovernanceReceipt(result.receipt).valid).toBe(true);
  });
});

function createSafeReportProposal(): AgentActionProposal {
  return {
    id: "safe-internal-report",
    userRequest: "Generate a weekly usage summary.",
    tool: "report.generate",
    actionType: "generate_internal_report",
    target: "weekly_usage_summary",
    environment: "staging",
    reversible: true,
    externalFacing: false,
    dataSensitivity: "low",
    requiresApproval: false,
    knownApproval: false,
    metadata: {}
  };
}

function createApprovalRequiredReportProposal(): AgentActionProposal {
  return {
    ...createSafeReportProposal(),
    id: "approval-required-report",
    requiresApproval: true,
    knownApproval: true
  };
}

function createApprovalEvidence(): ApprovalEvidence {
  return {
    id: "approval-1",
    approverId: "user-1",
    approverRoleId: "business_owner",
    binding: createApprovalBinding(createApprovalRequiredReportProposal()),
    expiresAt: "2030-01-01T00:00:00.000Z",
    approvedAt: "2026-05-14T09:00:00.000Z"
  };
}

function createMeaningfulParticipationInput(): Omit<HumanParticipationInput, "action"> {
  return {
    context: {
      requiredApproval: true,
      authorityValid: true,
      highRisk: true
    },
    presentedContext: {
      riskSummary: "Approval required for an internal report with policy context.",
      objectionsPresented: true
    },
    humanResponse: {
      decision: "approve",
      reason: "Reviewed the report scope and confirmed this approval is limited to the internal weekly summary.",
      responseTimeSeconds: 45
    }
  };
}
