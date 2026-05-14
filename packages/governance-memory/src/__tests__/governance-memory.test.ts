import { describe, expect, it } from "vitest";
import type { GovernanceReceipt } from "@alignment-governance-stack/receipts";
import {
  analyzeReceiptHistory,
  createGovernanceRecommendations,
  detectGovernancePatterns,
  summarizeGovernanceMemory
} from "../index.js";

describe("governance memory", () => {
  it("empty receipt history returns no patterns and no recommendations", () => {
    const report = analyzeReceiptHistory({ receipts: [] });

    expect(report.receiptCount).toBe(0);
    expect(report.patterns).toEqual([]);
    expect(report.recommendations).toEqual([]);
  });

  it("repeated PGDL revisions create pattern and recommendation", () => {
    const report = analyzeReceiptHistory({
      receipts: [
        receipt("pgdl-1", { pgdlDecision: "revise_before_aag" }),
        receipt("pgdl-2", { pgdlDecision: "revise_before_aag" })
      ]
    });

    expect(report.patterns.some((pattern) => pattern.type === "repeated_pgdl_revision")).toBe(true);
    expect(
      report.recommendations.some((recommendation) =>
        recommendation.type === "review_policy_profile" || recommendation.type === "add_eval_case"
      )
    ).toBe(true);
  });

  it("repeated hard boundary blocks create hard boundary pattern", () => {
    const patterns = detectGovernancePatterns([
      receipt("hb-1", { hardBoundaryTriggered: true, blockingBoundaryIds: ["never_auto_employee_records"] }),
      receipt("hb-2", { hardBoundaryTriggered: true, blockingBoundaryIds: ["never_auto_employee_records"] })
    ]);
    const recommendations = createGovernanceRecommendations(patterns);

    expect(patterns.some((pattern) => pattern.type === "repeated_hard_boundary_block")).toBe(true);
    expect(
      recommendations.some((recommendation) =>
        recommendation.type === "add_eval_case" || recommendation.type === "review_policy_profile"
      )
    ).toBe(true);
  });

  it("repeated missing authority creates authority recommendation", () => {
    const report = analyzeReceiptHistory({
      receipts: [
        receipt("auth-missing-1", { approvalDecision: "approval_missing" }),
        receipt("auth-missing-2", { approvalDecision: "approval_missing" })
      ]
    });

    expect(report.patterns.some((pattern) => pattern.type === "repeated_missing_authority")).toBe(true);
    expect(report.recommendations.some((recommendation) => recommendation.type === "review_authority_map")).toBe(true);
  });

  it("repeated out-of-scope approval creates authority recommendation", () => {
    const report = analyzeReceiptHistory({
      receipts: [
        receipt("auth-scope-1", { approvalDecision: "approval_out_of_scope" }),
        receipt("auth-scope-2", { approvalDecision: "approval_out_of_scope" })
      ]
    });

    expect(report.patterns.some((pattern) => pattern.type === "repeated_out_of_scope_approval")).toBe(true);
    expect(report.recommendations.some((recommendation) => recommendation.type === "review_authority_map")).toBe(true);
  });

  it("repeated rubber-stamp approvals create participation recommendation", () => {
    const report = analyzeReceiptHistory({
      receipts: [
        receipt("rubber-1", { participationDecision: "likely_rubber_stamp" }),
        receipt("rubber-2", { participationDecision: "likely_rubber_stamp" })
      ]
    });

    expect(report.patterns.some((pattern) => pattern.type === "repeated_rubber_stamp")).toBe(true);
    expect(
      report.recommendations.some((recommendation) => recommendation.type === "review_human_participation_policy")
    ).toBe(true);
  });

  it("repeated runtime substitutions create runtime investigation recommendation", () => {
    const report = analyzeReceiptHistory({
      receipts: [
        receipt("runtime-1", { finalDecision: "execution_denied", runtimeFailureCodes: ["tool_mismatch"] }),
        receipt("runtime-2", { finalDecision: "execution_denied", runtimeFailureCodes: ["tool_mismatch"] })
      ]
    });

    expect(report.patterns.some((pattern) => pattern.type === "repeated_runtime_substitution")).toBe(true);
    expect(
      report.recommendations.some((recommendation) => recommendation.type === "investigate_runtime_binding")
    ).toBe(true);
  });

  it("repeated safe allows create reduce friction candidate", () => {
    const report = analyzeReceiptHistory({
      receipts: [
        receipt("safe-1", { finalDecision: "execution_allowed" }),
        receipt("safe-2", { finalDecision: "execution_allowed" })
      ]
    });

    const pattern = report.patterns.find((entry) => entry.type === "repeated_safe_allow");

    expect(pattern?.severity).toBe("low");
    expect(
      report.recommendations.some((recommendation) => recommendation.type === "reduce_review_friction_candidate")
    ).toBe(true);
  });

  it("high-sensitivity external attempts create hard boundary candidate", () => {
    const report = analyzeReceiptHistory({
      receipts: [
        receipt("external-1", { externalFacing: true, dataSensitivity: "high" }),
        receipt("external-2", { externalFacing: true, dataSensitivity: "high" })
      ]
    });

    expect(report.patterns.some((pattern) => pattern.type === "repeated_sensitive_external_attempt")).toBe(true);
    expect(
      report.recommendations.some((recommendation) => recommendation.type === "add_hard_boundary_candidate")
    ).toBe(true);
  });

  it("report summary includes counts and human review note", () => {
    const report = analyzeReceiptHistory({
      receipts: [
        receipt("safe-summary-1", { finalDecision: "execution_allowed" }),
        receipt("safe-summary-2", { finalDecision: "execution_allowed" })
      ]
    });
    const summary = summarizeGovernanceMemory(report);

    expect(summary).toContain("receipt count: 2");
    expect(summary).toContain("pattern count:");
    expect(summary).toContain("recommendation count:");
    expect(summary).toContain("human review");
  });

  it("recommendations never claim automatic policy update", () => {
    const report = analyzeReceiptHistory({
      receipts: [
        receipt("invalid-1", { finalDecision: "policy_invalid" }),
        receipt("invalid-2", { finalDecision: "policy_invalid" })
      ]
    });

    expect(report.recommendations.length).toBeGreaterThan(0);
    expect(report.recommendations.every((recommendation) => recommendation.humanReviewRequired === true)).toBe(true);
    expect(report.recommendations.map((recommendation) => recommendation.rationale).join(" ")).not.toContain(
      "automatic policy update"
    );
  });
});

interface ReceiptOverrides {
  finalDecision?: string;
  pgdlDecision?: "forward_to_aag" | "revise_before_aag" | "escalate_to_human" | "reject_before_aag";
  hardBoundaryTriggered?: boolean;
  blockingBoundaryIds?: string[];
  approvalDecision?:
    | "approval_valid"
    | "approval_missing"
    | "approval_role_unknown"
    | "approval_out_of_scope"
    | "approval_expired"
    | "approval_not_required"
    | "authority_map_invalid";
  participationDecision?:
    | "meaningful_participation"
    | "insufficient_participation"
    | "likely_rubber_stamp"
    | "participation_not_required"
    | "participation_input_invalid";
  runtimeFailureCodes?: string[];
  externalFacing?: boolean;
  dataSensitivity?: "low" | "medium" | "high";
}

function receipt(id: string, overrides: ReceiptOverrides = {}): GovernanceReceipt {
  const originalProposal = {
    id: `${id}-proposal`,
    userRequest: "Generate a weekly internal usage report.",
    tool: "report.generate",
    actionType: "generate_internal_report",
    target: "weekly_usage_summary",
    environment: "staging",
    reversible: true,
    externalFacing: overrides.externalFacing ?? false,
    dataSensitivity: overrides.dataSensitivity ?? "low",
    requiresApproval: false,
    knownApproval: false,
    metadata: {}
  };

  return {
    id,
    version: "ags.receipt.v0.1",
    createdAt: "2026-05-14T10:00:00.000Z",
    originalProposal,
    proposalSentToAag: originalProposal,
    finalDecision: overrides.finalDecision ?? "allowed_by_aag",
    reasonForDecision: "Synthetic receipt for governance memory tests.",
    receiptHash: `hash-${id}`,
    ...(overrides.pgdlDecision !== undefined
      ? {
          pgdl: {
            originalProposal,
            objections: [],
            decision: overrides.pgdlDecision,
            reasonForDecision: "Synthetic PGDL decision."
          }
        }
      : {}),
    ...(overrides.hardBoundaryTriggered === true
      ? {
          finalDecision: "blocked_by_policy",
          resolvedPolicy: {
            allowed: false,
            requiresApproval: false,
            receiptRequired: true,
            reasons: ["Synthetic hard boundary block."],
            matchedRules: overrides.blockingBoundaryIds ?? ["hard_boundary"],
            suggestedDecision: "block",
            hardBoundaryTriggered: true,
            blockingBoundaryIds: overrides.blockingBoundaryIds ?? ["hard_boundary"]
          }
        }
      : {}),
    ...(overrides.approvalDecision !== undefined
      ? {
          finalDecision: "approval_required_by_authority",
          approvalValidation: {
            valid: false,
            decision: overrides.approvalDecision,
            reasons: ["Synthetic authority validation."]
          }
        }
      : {}),
    ...(overrides.participationDecision !== undefined
      ? {
          finalDecision: "insufficient_human_participation",
          participationQuality: {
            decision: overrides.participationDecision,
            risk: "high",
            meaningful: false,
            signals: [],
            reasons: ["Synthetic participation quality."],
            recommendedAction: "block_until_meaningful_review"
          }
        }
      : {}),
    ...(overrides.runtimeFailureCodes !== undefined
      ? {
          runtimeBinding: {
            decision: "execution_denied",
            allowed: false,
            failures: overrides.runtimeFailureCodes.map((code) => ({
              code,
              reason: `Synthetic ${code} failure.`
            })),
            reasonForDecision: "Synthetic runtime binding failure."
          }
        }
      : {})
  } as GovernanceReceipt;
}
