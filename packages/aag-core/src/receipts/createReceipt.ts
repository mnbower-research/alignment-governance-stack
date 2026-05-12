import type { AagPacket, DecisionReceipt } from "@agent-action-governance/shared-types";

export function createReceipt(packet: AagPacket): DecisionReceipt {
  // TODO: Add durable receipt fields, actor identity, approvals, and runtime binding proof.
  return {
    id: `receipt-${packet.proposal.id}`,
    createdAt: new Date(0).toISOString(),
    proposalId: packet.proposal.id,
    component: "aag",
    decision: packet.decision,
    reason: packet.reasonForDecision,
    metadata: {}
  };
}
