import { canonicalizeForHash } from "./canonicalize.js";
import { hashGovernanceReceipt, sha256Hex } from "./hashReceipt.js";
import type { GovernanceReceipt, GovernanceReceiptInput } from "./types.js";

export function createGovernanceReceipt(input: GovernanceReceiptInput): GovernanceReceipt {
  const createdAt = input.createdAt ?? new Date().toISOString();
  const bodyWithoutId = buildReceiptBody(input, createdAt);
  const id = input.id ?? `receipt-${sha256Hex(canonicalizeForHash(bodyWithoutId)).slice(0, 16)}`;
  const receiptWithoutHash = {
    id,
    ...bodyWithoutId
  };
  const receiptHash = hashGovernanceReceipt(receiptWithoutHash);

  return {
    ...receiptWithoutHash,
    receiptHash
  };
}

function buildReceiptBody(
  input: GovernanceReceiptInput,
  createdAt: string
): Omit<GovernanceReceipt, "id" | "receiptHash"> {
  const packet = input.governancePacket;
  for (const stage of [packet.pgdl, packet.aag]) {
    if (stage?.contextAdmission !== undefined &&
        (packet.contextAdmission === undefined || canonicalizeForHash(stage.contextAdmission) !== canonicalizeForHash(packet.contextAdmission))) {
      throw new Error("Stage context admission must match the canonical run admission.");
    }
  }

  return {
    version: "ags.receipt.v0.1",
    ...(packet.contextAdmission !== undefined ? { contextAdmission: packet.contextAdmission } : {}),
    createdAt,
    ...(input.previousReceiptHash !== undefined ? { previousReceiptHash: input.previousReceiptHash } : {}),
    originalProposal: packet.originalProposal,
    ...(packet.pgdl !== undefined ? { pgdl: packet.pgdl } : {}),
    ...(packet.proposalSentToAag !== undefined ? { proposalSentToAag: packet.proposalSentToAag } : {}),
    ...(packet.resolvedPolicy !== undefined ? { resolvedPolicy: packet.resolvedPolicy } : {}),
    ...(packet.policyProfileValidation !== undefined
      ? { policyProfileValidation: packet.policyProfileValidation }
      : {}),
    ...(packet.approvalValidation !== undefined
      ? { approvalValidation: packet.approvalValidation }
      : {}),
    ...(packet.participationQuality !== undefined
      ? { participationQuality: packet.participationQuality }
      : {}),
    ...(packet.aag !== undefined ? { aag: packet.aag } : {}),
    ...(packet.permit !== undefined ? { permit: packet.permit } : {}),
    ...(packet.runtimeAction !== undefined ? { runtimeAction: packet.runtimeAction } : {}),
    ...(packet.runtimeBinding !== undefined ? { runtimeBinding: packet.runtimeBinding } : {}),
    finalDecision: packet.finalDecision,
    reasonForDecision: packet.reasonForDecision,
    ...(input.metadata !== undefined ? { metadata: input.metadata } : {})
  };
}
