import { describe, expect, it } from "vitest";
import type { AgentActionProposal } from "@alignment-governance-stack/shared-types";
import {
  defaultPolicyProfile,
  type PolicyProfile
} from "@alignment-governance-stack/policy-profiles";
import { verifyGovernanceReceipt } from "@alignment-governance-stack/receipts";
import { evaluateGovernedAction } from "../evaluateGovernedAction.js";
import { evaluateGovernedRuntimeAction } from "../evaluateGovernedRuntimeAction.js";
import { evaluateGovernedRuntimeActionWithReceipt } from "../evaluateGovernedRuntimeActionWithReceipt.js";

describe("governed flow with policy profiles", () => {
  it("preserves existing behavior when no policy profile is supplied", () => {
    const proposal = createSafeReportProposal();

    const packet = evaluateGovernedRuntimeAction({
      proposal,
      runtimeAction: proposal
    });

    expect(packet.finalDecision).toBe("execution_allowed");
    expect(packet.resolvedPolicy).toBeUndefined();
    expect(packet.policyProfileValidation).toBeUndefined();
  });

  it("stops before PGDL and AAG when policy profile validation fails", () => {
    const packet = evaluateGovernedRuntimeAction({
      proposal: createSafeReportProposal(),
      policyProfile: {} as PolicyProfile
    });

    expect(packet.finalDecision).toBe("policy_invalid");
    expect(packet.reasonForDecision).toMatch(/invalid policy profile|policy profile is invalid/i);
    expect(packet.reasonForDecision).toMatch(/id|name|version|defaultMode/);
    expect(packet.pgdl).toBeUndefined();
    expect(packet.aag).toBeUndefined();
    expect(packet.permit).toBeUndefined();
    expect(packet.runtimeBinding).toBeUndefined();
  });

  it("includes resolvedPolicy and proceeds for a safe internal report under default policy", () => {
    const packet = evaluateGovernedAction({
      proposal: createSafeReportProposal(),
      policyProfile: defaultPolicyProfile
    });

    expect(packet.resolvedPolicy).toBeDefined();
    expect(packet.resolvedPolicy?.allowed).toBe(true);
    expect(packet.resolvedPolicy?.requiresApproval).toBe(false);
    expect(packet.aag).toBeDefined();
    expect(packet.finalDecision).toBe("allowed_by_aag");
  });

  it("stops before AAG when policy blocks the proposed tool", () => {
    const packet = evaluateGovernedRuntimeAction({
      proposal: createSafeReportProposal(),
      policyProfile: {
        ...defaultPolicyProfile,
        tools: [
          {
            tool: "report.generate",
            allowed: false
          }
        ]
      }
    });

    expect(packet.resolvedPolicy?.allowed).toBe(false);
    expect(packet.finalDecision).toBe("blocked_by_policy");
    expect(packet.aag).toBeUndefined();
    expect(packet.permit).toBeUndefined();
    expect(packet.runtimeBinding).toBeUndefined();
  });

  it("resolves policy after PGDL revision rather than against the original action", () => {
    const proposal = createDestructiveCustomerDeleteProposal();
    const packet = evaluateGovernedAction({
      proposal,
      policyProfile: {
        ...defaultPolicyProfile,
        tools: [
          {
            tool: "database.delete",
            allowed: false
          },
          {
            tool: "review.generate",
            allowed: true
          }
        ]
      }
    });

    expect(packet.pgdl?.decision).toBe("revise_before_aag");
    expect(packet.proposalSentToAag?.tool).toBe("review.generate");
    expect(packet.resolvedPolicy?.matchedRules).toContain("tool:review.generate");
    expect(packet.resolvedPolicy?.matchedRules).not.toContain("tool:database.delete");
    expect(packet.finalDecision).not.toBe("blocked_by_policy");
    expect(packet.aag).toBeDefined();
  });

  it("blocks when policy blocks the PGDL-resolved proposal", () => {
    const packet = evaluateGovernedAction({
      proposal: createDestructiveCustomerDeleteProposal(),
      policyProfile: {
        ...defaultPolicyProfile,
        tools: [
          {
            tool: "review.generate",
            allowed: false
          }
        ]
      }
    });

    expect(packet.pgdl?.decision).toBe("revise_before_aag");
    expect(packet.proposalSentToAag?.tool).toBe("review.generate");
    expect(packet.resolvedPolicy?.allowed).toBe(false);
    expect(packet.finalDecision).toBe("blocked_by_policy");
    expect(packet.aag).toBeUndefined();
  });

  it("includes resolvedPolicy in runtime governance receipts", () => {
    const proposal = createSafeReportProposal();
    const result = evaluateGovernedRuntimeActionWithReceipt({
      proposal,
      policyProfile: defaultPolicyProfile,
      runtimeAction: proposal,
      permitOptions: {
        issuedAt: "2026-05-12T10:00:00.000Z"
      },
      receiptOptions: {
        createdAt: "2026-05-12T10:00:01.000Z"
      }
    });

    expect(result.governance.resolvedPolicy).toBeDefined();
    expect(result.receipt.resolvedPolicy).toEqual(result.governance.resolvedPolicy);
    expect(verifyGovernanceReceipt(result.receipt).valid).toBe(true);
  });

  it("stops before AAG when a hard boundary matches", () => {
    const packet = evaluateGovernedRuntimeAction({
      proposal: createSafeReportProposal(),
      policyProfile: {
        ...defaultPolicyProfile,
        hardBoundaries: [
          {
            id: "never_auto_weekly_usage_report",
            label: "Never auto-generate weekly usage report",
            when: {
              actionType: "generate_internal_report",
              targetIncludes: "weekly_usage"
            },
            effect: "block",
            reason: "Weekly usage reports require explicit human-owned preparation."
          }
        ]
      },
      runtimeAction: createSafeReportProposal()
    });

    expect(packet.finalDecision).toBe("blocked_by_policy");
    expect(packet.resolvedPolicy?.hardBoundaryTriggered).toBe(true);
    expect(packet.resolvedPolicy?.blockingBoundaryIds).toContain("never_auto_weekly_usage_report");
    expect(packet.aag).toBeUndefined();
    expect(packet.permit).toBeUndefined();
    expect(packet.runtimeBinding).toBeUndefined();
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

function createDestructiveCustomerDeleteProposal(): AgentActionProposal {
  return {
    id: "delete-production-customer-records",
    userRequest: "Delete inactive customer records.",
    tool: "database.delete",
    actionType: "delete_records",
    target: "inactive_customer_records",
    environment: "production",
    reversible: false,
    externalFacing: false,
    dataSensitivity: "high",
    requiresApproval: true,
    knownApproval: false,
    metadata: {}
  };
}
