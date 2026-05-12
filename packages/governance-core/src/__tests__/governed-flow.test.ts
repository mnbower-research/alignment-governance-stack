import { describe, expect, it } from "vitest";
import type { AgentActionProposal } from "@alignment-governance-stack/shared-types";
import { evaluateGovernedAction } from "../evaluateGovernedAction.js";

describe("PGDL to AAG governed flow", () => {
  it("passes a safe internal report through PGDL and AAG", () => {
    const proposal: AgentActionProposal = {
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

    const packet = evaluateGovernedAction(proposal);

    expect(packet.pgdl?.decision).toBe("forward_to_aag");
    expect(packet.proposalSentToAag).toEqual(proposal);
    expect(packet.aag).toBeDefined();
    expect(packet.finalDecision).toBe("allowed_by_aag");
    expect(packet.reasonForDecision.length).toBeGreaterThan(0);
  });

  it("sends PGDL's review packet to AAG instead of the original destructive delete", () => {
    const proposal: AgentActionProposal = {
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

    const packet = evaluateGovernedAction(proposal);

    expect(packet.pgdl?.decision).toBe("revise_before_aag");
    expect(packet.pgdl?.resolvedProposal).toBeDefined();
    expect(packet.proposalSentToAag).toEqual(packet.pgdl?.resolvedProposal);
    expect(packet.proposalSentToAag?.tool).toBe("review.generate");
    expect(packet.proposalSentToAag?.actionType).toBe("generate_review_packet");
    expect(packet.proposalSentToAag?.tool).not.toBe(proposal.tool);
    expect(packet.aag).toBeDefined();
    expect(packet.finalDecision).toBe(mapExpectedFinalDecision(packet.aag?.decision));
  });

  it("sends PGDL's draft proposal to AAG instead of the original external email send", () => {
    const proposal: AgentActionProposal = {
      id: "external-email-send",
      userRequest: "Send an update to the customer.",
      tool: "email.send",
      actionType: "send_email",
      target: "external_customer",
      environment: "production",
      reversible: false,
      externalFacing: true,
      dataSensitivity: "medium",
      requiresApproval: true,
      knownApproval: false,
      metadata: {}
    };

    const packet = evaluateGovernedAction(proposal);

    expect(packet.pgdl?.decision).toBe("revise_before_aag");
    expect(packet.proposalSentToAag?.tool).toBe("draft.create");
    expect(packet.proposalSentToAag?.actionType).toBe("create_draft_for_review");
    expect(packet.proposalSentToAag?.externalFacing).toBe(false);
    expect(packet.proposalSentToAag?.tool).not.toBe(proposal.tool);
    expect(packet.aag).toBeDefined();
  });

  it("routes PGDL compliance theater through the deterministic PGDL outcome", () => {
    const proposal: AgentActionProposal = {
      id: "compliance-theater-delete",
      userRequest: "Clean up inactive customer records.",
      tool: "database.delete",
      actionType: "delete_records",
      target: "inactive_customer_records",
      environment: "production",
      reversible: false,
      externalFacing: false,
      dataSensitivity: "high",
      requiresApproval: true,
      knownApproval: false,
      metadata: {
        previousActionType: "delete_records",
        previousTool: "database.delete",
        previousTarget: "inactive_customer_records",
        revisionNote: "renamed as cleanup with safer wording"
      }
    };

    const packet = evaluateGovernedAction(proposal);

    expect(packet.pgdl?.objections.map((objection) => objection.category)).toContain("compliance_theater");
    expect(packet.pgdl?.decision).toBe("revise_before_aag");
    expect(packet.proposalSentToAag).toEqual(packet.pgdl?.resolvedProposal);
    expect(packet.aag).toBeDefined();
  });

  it("escalates a high-risk unknown action before AAG", () => {
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

    const packet = evaluateGovernedAction(proposal);

    expect(packet.pgdl?.decision).toBe("escalate_to_human");
    expect(packet.finalDecision).toBe("escalated_before_gate");
    expect(packet.proposalSentToAag).toBeUndefined();
    expect(packet.aag).toBeUndefined();
  });
});

function mapExpectedFinalDecision(aagDecision: string | undefined): string {
  if (aagDecision === "allow") {
    return "allowed_by_aag";
  }

  if (aagDecision === "require_approval") {
    return "approval_required_by_aag";
  }

  if (aagDecision === "revise_action") {
    return "revision_required_by_aag";
  }

  return "blocked_by_aag";
}
