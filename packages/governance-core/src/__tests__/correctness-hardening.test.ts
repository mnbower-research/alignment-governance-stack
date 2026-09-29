import { describe, expect, it } from "vitest";
import { evaluateGovernedRuntimeAction } from "../index.js";
import type { AgentActionProposal } from "@alignment-governance-stack/shared-types";
import { evaluateAag } from "@alignment-governance-stack/aag-core";
import { createApprovalBinding } from "@alignment-governance-stack/authority-map";

describe("policy approval handoff", () => {
  it("does not issue a permit when only policy requires approval", () => {
    const proposal: AgentActionProposal = {
      id: "report", userRequest: "Summarize a local report", tool: "report.generate",
      actionType: "generate_report", target: "local-report", environment: "dev",
      reversible: true, externalFacing: false, dataSensitivity: "low",
      requiresApproval: false, knownApproval: false, metadata: {}
    };
    const result = evaluateGovernedRuntimeAction({ proposal, runtimeAction: proposal,
      policyProfile: { id: "review", name: "Review", version: "1", defaultMode: "balanced",
        approvalRules: [{ id: "review-report", when: { tool: proposal.tool }, requiresApproval: true, reason: "Review required" }] }
    });
    expect(result.resolvedPolicy?.requiresApproval).toBe(true);
    expect(result.aag?.decision).toBe("require_approval");
    expect(result.finalDecision).toBe("approval_required_by_aag");
    expect(result.permit).toBeUndefined();

    // Policy enforcement must not inject metadata that changes the approved action.
    const reviewed = { ...proposal, knownApproval: true };
    const approved = evaluateGovernedRuntimeAction({ proposal: reviewed, runtimeAction: reviewed,
      policyProfile: { id: "review", name: "Review", version: "1", defaultMode: "balanced",
        approvalRules: [{ id: "review-report", when: { tool: proposal.tool }, requiresApproval: true, reason: "Review required" }] },
      authorityMap: { id: "authority", name: "Authority", version: "1", roles: [
        { id: "reviewer", label: "Reviewer", scopes: [{ id: "reports", tool: proposal.tool }] }
      ] },
      approvalEvidence: { id: "approval", approverId: "human", approverRoleId: "reviewer",
        binding: createApprovalBinding(reviewed), approvedAt: "2026-09-29T00:00:00Z", expiresAt: "2026-09-30T00:00:00Z" },
      validationOptions: { now: "2026-09-29T01:00:00Z" }
    });
    expect(approved.finalDecision).toBe("execution_allowed");
    expect(approved.proposalSentToAag?.metadata).toEqual(reviewed.metadata);
    expect(evaluateAag({ ...proposal, requiresApproval: true }).decision).toBe("require_approval");
    expect(evaluateGovernedRuntimeAction({ proposal, runtimeAction: proposal }).finalDecision).toBe("execution_allowed");
  });
});
