import { describe, expect, it } from "vitest";
import type { AgentActionProposal, PgdlObjectionCategory } from "@alignment-governance-stack/shared-types";
import { evaluatePgdl } from "../evaluatePgdl.js";

function objectionCategories(proposal: AgentActionProposal): PgdlObjectionCategory[] {
  return evaluatePgdl(proposal).objections.map((objection) => objection.category);
}

describe("PGDL v0.1 deterministic packet generation", () => {
  it("revises a destructive production customer record delete into a review packet", () => {
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

    const packet = evaluatePgdl(proposal);
    const categories = packet.objections.map((objection) => objection.category);

    expect(packet.decision).toBe("revise_before_aag");
    expect(categories).toEqual(
      expect.arrayContaining(["reversibility", "human_judgment", "data_sensitivity", "authority", "scope"])
    );
    expect(packet.internalizedPrinciple).toBeDefined();
    expect(packet.resolvedProposal).toBeDefined();
    expect(packet.resolvedProposal?.tool).toBe("review.generate");
    expect(packet.resolvedProposal?.actionType).toBe("generate_review_packet");
    expect(packet.resolvedProposal?.reversible).toBe(true);
    expect(packet.resolvedProposal?.externalFacing).toBe(false);
  });

  it("revises an external email send without approval into a draft for review", () => {
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

    const packet = evaluatePgdl(proposal);
    const categories = packet.objections.map((objection) => objection.category);

    expect(packet.decision).toBe("revise_before_aag");
    expect(categories).toEqual(
      expect.arrayContaining(["reversibility", "human_judgment", "external_impact", "authority"])
    );
    expect(packet.resolvedProposal?.tool).toBe("draft.create");
    expect(packet.resolvedProposal?.actionType).toBe("create_draft_for_review");
    expect(packet.resolvedProposal?.externalFacing).toBe(false);
  });

  it("forwards a safe internal reversible proposal to AAG", () => {
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

    const packet = evaluatePgdl(proposal);

    expect(packet.decision).toBe("forward_to_aag");
    expect(packet.objections).toHaveLength(0);
    expect(packet.resolvedProposal).toBeUndefined();
    expect(packet.reasonForDecision).toContain("no PGDL objections");
  });

  it("detects compliance theater when wording changes without risk reduction", () => {
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

    const packet = evaluatePgdl(proposal);

    expect(objectionCategories(proposal)).toContain("compliance_theater");
    expect(["reject_before_aag", "revise_before_aag"]).toContain(packet.decision);
    expect(packet.reasonForDecision).toMatch(/wording|risk did not meaningfully change/i);
  });

  it("escalates a high-severity unknown action when no safe rewrite is known", () => {
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

    const packet = evaluatePgdl(proposal);

    expect(packet.objections.some((objection) => objection.severity === "high")).toBe(true);
    expect(packet.resolvedProposal).toBeUndefined();
    expect(packet.decision).toBe("escalate_to_human");
  });
});
