import { createApprovalBinding } from "@alignment-governance-stack/authority-map";
import { describe, expect, it } from "vitest";
import type { ApprovalEvidence } from "@alignment-governance-stack/authority-map";
import {
  defaultAuthorityMap,
  validateApproval
} from "@alignment-governance-stack/authority-map";
import type { AgentActionProposal } from "@alignment-governance-stack/shared-types";
import { verifyGovernanceReceipt } from "@alignment-governance-stack/receipts";
import { defaultPolicyProfile } from "@alignment-governance-stack/policy-profiles";
import { evaluateGovernedAction } from "../evaluateGovernedAction.js";
import { evaluateGovernedRuntimeAction } from "../evaluateGovernedRuntimeAction.js";
import { evaluateGovernedRuntimeActionWithReceipt } from "../evaluateGovernedRuntimeActionWithReceipt.js";

describe("governed flow with authority validation", () => {
  it("preserves existing behavior when no authority map is supplied", () => {
    const packet = evaluateGovernedRuntimeAction({
      proposal: createSafeReportProposal(),
      runtimeAction: createSafeReportProposal()
    });

    expect(packet.approvalValidation).toBeUndefined();
    expect(packet.finalDecision).toBe("execution_allowed");
  });

  it("stops before AAG when required authority approval is missing", () => {
    const packet = evaluateGovernedAction({
      proposal: createApprovalRequiredReportProposal(),
      authorityMap: defaultAuthorityMap
    });

    expect(packet.finalDecision).toBe("approval_required_by_authority");
    expect(packet.approvalValidation?.decision).toBe("approval_missing");
    expect(packet.aag).toBeUndefined();
  });

  it("continues to AAG when valid authority approval is supplied", () => {
    const packet = evaluateGovernedAction({
      proposal: createApprovalRequiredReportProposal(),
      authorityMap: defaultAuthorityMap,
      approvalEvidence: createApprovalEvidence({ approverRoleId: "security_admin" })
    });

    expect(packet.approvalValidation?.valid).toBe(true);
    expect(packet.approvalValidation?.decision).toBe("approval_valid");
    expect(packet.aag).toBeDefined();
  });

  it("stops before AAG when approval is out of scope", () => {
    const packet = evaluateGovernedAction({
      proposal: createApprovalRequiredReportProposal(),
      authorityMap: defaultAuthorityMap,
      approvalEvidence: createApprovalEvidence({ approverRoleId: "communications_admin" })
    });

    expect(packet.finalDecision).toBe("approval_required_by_authority");
    expect(packet.approvalValidation?.decision).toBe("approval_out_of_scope");
    expect(packet.aag).toBeUndefined();
  });

  it("lets hard boundaries block before authority approval matters", () => {
    const packet = evaluateGovernedRuntimeAction({
      proposal: createSafeReportProposal(),
      policyProfile: {
        ...defaultPolicyProfile,
        hardBoundaries: [
          {
            id: "never_auto_usage_summary",
            label: "Never auto usage summary",
            when: {
              actionType: "generate_internal_report",
              targetIncludes: "usage"
            },
            effect: "block",
            reason: "Usage summaries require human-owned preparation."
          }
        ]
      },
      authorityMap: defaultAuthorityMap,
      approvalEvidence: createApprovalEvidence({ approverRoleId: "security_admin" }),
      runtimeAction: createSafeReportProposal()
    });

    expect(packet.finalDecision).toBe("blocked_by_policy");
    expect(packet.approvalValidation).toBeUndefined();
    expect(packet.aag).toBeUndefined();
  });

  it("preserves approval validation in receipts", () => {
    const proposal = createApprovalRequiredReportProposal();
    const result = evaluateGovernedRuntimeActionWithReceipt({
      proposal,
      authorityMap: defaultAuthorityMap,
      approvalEvidence: createApprovalEvidence({ approverRoleId: "security_admin" }),
      runtimeAction: proposal,
      permitOptions: {
        issuedAt: "2026-05-12T10:00:00.000Z"
      },
      receiptOptions: {
        createdAt: "2026-05-12T10:00:01.000Z"
      }
    });

    expect(result.governance.approvalValidation?.valid).toBe(true);
    expect(result.receipt.approvalValidation).toEqual(result.governance.approvalValidation);
    expect(verifyGovernanceReceipt(result.receipt).valid).toBe(true);
  });

  it("uses the same authority validation result shape as authority-map", () => {
    const proposal = createApprovalRequiredReportProposal();
    const approvalEvidence = createApprovalEvidence({ approverRoleId: "security_admin" });
    const expected = validateApproval(defaultAuthorityMap, proposal, approvalEvidence);
    const packet = evaluateGovernedAction({
      proposal,
      authorityMap: defaultAuthorityMap,
      approvalEvidence
    });

    expect(packet.approvalValidation).toEqual(expected);
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

function createApprovalEvidence(
  overrides: Partial<ApprovalEvidence> = {}
): ApprovalEvidence {
  return {
    id: "approval-1",
    approverId: "user-1",
    approverRoleId: "security_admin",
    binding: createApprovalBinding(createApprovalRequiredReportProposal()),
    expiresAt: "2030-01-01T00:00:00.000Z",
    approvedAt: "2026-05-14T09:00:00.000Z",
    ...overrides
  };
}
