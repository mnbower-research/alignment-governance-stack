import { describe, expect, it } from "vitest";
import type { AgentActionProposal } from "@alignment-governance-stack/shared-types";
import { verifyGovernanceReceipt } from "@alignment-governance-stack/receipts";
import { evaluateGovernedRuntimeActionWithReceipt } from "../evaluateGovernedRuntimeActionWithReceipt.js";

describe("runtime-bound governed flow with receipts", () => {
  it("produces a governance result and receipt for a safe runtime action", () => {
    const proposal = createSafeReportProposal();

    const result = evaluateGovernedRuntimeActionWithReceipt({
      proposal,
      runtimeAction: proposal,
      permitOptions: {
        issuedAt: "2026-05-12T10:00:00.000Z"
      },
      receiptOptions: {
        createdAt: "2026-05-12T10:00:01.000Z"
      }
    });

    expect(result.governance.finalDecision).toBe("execution_allowed");
    expect(result.receipt.finalDecision).toBe("execution_allowed");
    expect(verifyGovernanceReceipt(result.receipt).valid).toBe(true);
  });

  it("produces a receipt when Runtime Binding denies a mismatched runtime action", () => {
    const proposal = createSafeReportProposal();
    const runtimeAction: AgentActionProposal = {
      ...proposal,
      tool: "database.delete"
    };

    const result = evaluateGovernedRuntimeActionWithReceipt({
      proposal,
      runtimeAction,
      permitOptions: {
        issuedAt: "2026-05-12T10:00:00.000Z"
      },
      receiptOptions: {
        createdAt: "2026-05-12T10:00:01.000Z"
      }
    });

    expect(result.governance.finalDecision).toBe("execution_denied");
    expect(result.governance.runtimeBinding?.failures.length).toBeGreaterThan(0);
    expect(result.receipt.finalDecision).toBe("execution_denied");
    expect(verifyGovernanceReceipt(result.receipt).valid).toBe(true);
  });

  it("produces a receipt when PGDL escalates before AAG", () => {
    const proposal: AgentActionProposal = {
      id: "unknown-production-override",
      userRequest: "Override production admin permissions.",
      tool: "custom.admin",
      actionType: "override_permissions",
      target: "production_admin_roles",
      environment: "production",
      reversible: false,
      externalFacing: false,
      dataSensitivity: "high",
      requiresApproval: true,
      knownApproval: false,
      metadata: {}
    };

    const result = evaluateGovernedRuntimeActionWithReceipt({
      proposal,
      runtimeAction: proposal,
      receiptOptions: {
        createdAt: "2026-05-12T10:00:01.000Z"
      }
    });

    expect(result.governance.finalDecision).toBe("escalated_before_gate");
    expect(result.governance.permit).toBeUndefined();
    expect(result.governance.runtimeBinding).toBeUndefined();
    expect(result.receipt.finalDecision).toBe("escalated_before_gate");
    expect(result.receipt.permit).toBeUndefined();
    expect(result.receipt.runtimeBinding).toBeUndefined();
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
