import { describe, expect, it } from "vitest";
import type {
  AagPacket,
  AgentActionProposal,
  PgdlPacket
} from "@alignment-governance-stack/shared-types";
import { createRuntimePermit } from "@alignment-governance-stack/runtime-binding";
import {
  createGovernanceReceipt,
  hashGovernanceReceipt,
  verifyGovernanceReceipt
} from "../index.js";
import type { ReceiptGovernancePacket } from "../types.js";

describe("governance receipts", () => {
  it("creates a stable receipt hash for the same governance packet and options", () => {
    const packet = createGovernancePacket();

    const first = createGovernanceReceipt({
      governancePacket: packet,
      createdAt: "2026-05-12T10:00:00.000Z",
      metadata: { source: "test" }
    });
    const second = createGovernanceReceipt({
      governancePacket: packet,
      createdAt: "2026-05-12T10:00:00.000Z",
      metadata: { source: "test" }
    });

    expect(first.id).toBe(second.id);
    expect(first.receiptHash).toBe(second.receiptHash);
  });

  it("verifies an unchanged receipt", () => {
    const receipt = createGovernanceReceipt({
      governancePacket: createGovernancePacket(),
      createdAt: "2026-05-12T10:00:00.000Z"
    });

    expect(verifyGovernanceReceipt(receipt)).toMatchObject({
      valid: true,
      actualHash: receipt.receiptHash
    });
  });

  it("fails verification after tampering", () => {
    const receipt = createGovernanceReceipt({
      governancePacket: createGovernancePacket(),
      createdAt: "2026-05-12T10:00:00.000Z"
    });
    const tampered = {
      ...receipt,
      originalProposal: {
        ...receipt.originalProposal,
        tool: "database.delete"
      }
    };

    expect(verifyGovernanceReceipt(tampered)).toMatchObject({
      valid: false,
      actualHash: receipt.receiptHash
    });
  });

  it("preserves previousReceiptHash and includes it in the hash", () => {
    const packet = createGovernancePacket();
    const base = createGovernanceReceipt({
      governancePacket: packet,
      id: "receipt-fixed",
      createdAt: "2026-05-12T10:00:00.000Z"
    });
    const chained = createGovernanceReceipt({
      governancePacket: packet,
      id: "receipt-fixed",
      previousReceiptHash: "previous-hash",
      createdAt: "2026-05-12T10:00:00.000Z"
    });

    expect(chained.previousReceiptHash).toBe("previous-hash");
    expect(chained.receiptHash).not.toBe(base.receiptHash);
  });

  it("preserves runtime permits with bound execution constraint evidence", () => {
    const proposal = createConstrainedProposal();
    const receipt = createGovernanceReceipt({
      governancePacket: {
        ...createGovernancePacket(),
        originalProposal: proposal,
        proposalSentToAag: proposal,
        permit: createRuntimePermit(proposal, { issuedAt: "2026-05-12T10:00:00.000Z" }),
        runtimeAction: proposal,
        finalDecision: "execution_allowed"
      },
      createdAt: "2026-05-12T10:00:01.000Z"
    });

    expect(receipt.permit?.executionConstraintHash).toMatch(/^sha256:/);
    expect(receipt.permit?.allowedAction.executionConstraints?.constraints.budgetAmount).toMatchObject({
      type: "exact_number",
      value: 25
    });
    expect(verifyGovernanceReceipt(receipt).valid).toBe(true);
  });

  it("ignores object key order when hashing receipt-like objects", () => {
    const first = hashGovernanceReceipt({
      id: "receipt-key-order",
      version: "ags.receipt.v0.1",
      createdAt: "2026-05-12T10:00:00.000Z",
      finalDecision: "execution_allowed",
      nested: {
        b: true,
        a: "same"
      }
    });
    const second = hashGovernanceReceipt({
      nested: {
        a: "same",
        b: true
      },
      finalDecision: "execution_allowed",
      createdAt: "2026-05-12T10:00:00.000Z",
      version: "ags.receipt.v0.1",
      id: "receipt-key-order"
    });

    expect(first).toBe(second);
  });
});

function createGovernancePacket(): ReceiptGovernancePacket {
  const proposal = createSafeReportProposal();
  const pgdl: PgdlPacket = {
    originalProposal: proposal,
    objections: [],
    internalizedPrinciple: "Keep internal low-risk reporting bounded to its stated target.",
    decision: "forward_to_aag",
    reasonForDecision: "Proposal can proceed to AAG."
  };
  const aag: AagPacket = {
    proposal,
    detectorResults: [],
    decision: "allow",
    reasonForDecision: "No gate detectors triggered.",
    receiptRequired: true
  };

  return {
    originalProposal: proposal,
    pgdl,
    proposalSentToAag: proposal,
    aag,
    finalDecision: "allowed_by_aag",
    reasonForDecision: "PGDL allowed a proposal to reach AAG. No gate detectors triggered."
  };
}

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

function createConstrainedProposal(): AgentActionProposal {
  return {
    ...createSafeReportProposal(),
    id: "constrained-simulated-spend",
    tool: "ads.sandbox.create_campaign",
    actionType: "create_paid_content_test",
    target: "virtual-property-b/content-test-001/audience-segment-alpha",
    requiresApproval: true,
    knownApproval: true,
    executionConstraints: {
      version: "execution-constraints/v0.1",
      constraints: {
        budgetAmount: { type: "exact_number", value: 25 },
        budgetCurrency: { type: "exact_string", value: "USD" }
      }
    }
  };
}

