import { describe, expect, it } from "vitest";
import type { AgentActionProposal } from "@alignment-governance-stack/shared-types";
import { evaluateGovernedRuntimeAction } from "../evaluateGovernedRuntimeAction.js";

describe("runtime-bound governed flow", () => {
  it("issues a permit for an allowed governed action without runtime validation", () => {
    const proposal = createSafeReportProposal();

    const packet = evaluateGovernedRuntimeAction({ proposal });

    expect(packet.pgdl?.decision).toBe("forward_to_aag");
    expect(packet.aag?.decision).toBe("allow");
    expect(packet.permit).toBeDefined();
    expect(packet.runtimeBinding).toBeUndefined();
    expect(packet.finalDecision).toBe("allowed_by_aag");
    expect(packet.reasonForDecision).toContain("permit was issued");
    expect(packet.reasonForDecision).toContain("no runtime action was supplied");
  });

  it("allows an exact runtime action against the issued permit", () => {
    const proposal = createSafeReportProposal();

    const packet = evaluateGovernedRuntimeAction({
      proposal,
      runtimeAction: proposal
    });

    expect(packet.permit).toBeDefined();
    expect(packet.runtimeBinding?.allowed).toBe(true);
    expect(packet.finalDecision).toBe("execution_allowed");
  });

  it("denies runtime tool substitution", () => {
    const proposal = createSafeReportProposal();
    const runtimeAction: AgentActionProposal = {
      ...proposal,
      tool: "database.delete"
    };

    const packet = evaluateGovernedRuntimeAction({ proposal, runtimeAction });

    expect(packet.permit).toBeDefined();
    expect(packet.runtimeBinding?.allowed).toBe(false);
    expect(packet.runtimeBinding?.failures.map((failure) => failure.code)).toEqual(
      expect.arrayContaining(["tool_mismatch", "action_hash_mismatch"])
    );
    expect(packet.finalDecision).toBe("execution_denied");
  });

  it("denies bypassing a PGDL revised external send with the original action", () => {
    const proposal: AgentActionProposal = {
      id: "external-email-send",
      userRequest: "Send an update to the customer.",
      tool: "email.send",
      actionType: "send_email",
      target: "external_customer",
      environment: "staging",
      reversible: false,
      externalFacing: true,
      dataSensitivity: "medium",
      requiresApproval: true,
      knownApproval: false,
      metadata: {}
    };

    const packet = evaluateGovernedRuntimeAction({
      proposal,
      runtimeAction: proposal
    });

    expect(packet.pgdl?.decision).toBe("revise_before_aag");
    expect(packet.proposalSentToAag).toEqual(packet.pgdl?.resolvedProposal);
    expect(packet.proposalSentToAag?.tool).toBe("draft.create");
    expect(packet.proposalSentToAag?.actionType).toBe("create_draft_for_review");
    expect(packet.permit).toBeDefined();
    expect(packet.runtimeBinding?.allowed).toBe(false);
    expect(packet.runtimeBinding?.failures.map((failure) => failure.code)).toEqual(
      expect.arrayContaining([
        "action_hash_mismatch",
        "tool_mismatch",
        "action_type_mismatch",
        "reversibility_mismatch",
        "external_impact_mismatch"
      ])
    );
    expect(packet.finalDecision).toBe("execution_denied");
  });

  it("stops before permit when PGDL escalates", () => {
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

    const packet = evaluateGovernedRuntimeAction({ proposal, runtimeAction: proposal });

    expect(packet.pgdl?.decision).toBe("escalate_to_human");
    expect(packet.finalDecision).toBe("escalated_before_gate");
    expect(packet.permit).toBeUndefined();
    expect(packet.runtimeBinding).toBeUndefined();
  });

  it("does not issue a permit when AAG requires approval", () => {
    const proposal: AgentActionProposal = {
      id: "production-report",
      userRequest: "Generate a production status report.",
      tool: "report.generate",
      actionType: "generate_internal_report",
      target: "weekly_usage_summary",
      environment: "production",
      reversible: true,
      externalFacing: false,
      dataSensitivity: "medium",
      requiresApproval: false,
      knownApproval: false,
      metadata: {}
    };

    const packet = evaluateGovernedRuntimeAction({ proposal, runtimeAction: proposal });

    expect(packet.pgdl?.decision).toBe("forward_to_aag");
    expect(packet.aag).toBeDefined();
    expect(packet.finalDecision).toBe("approval_required_by_aag");
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
