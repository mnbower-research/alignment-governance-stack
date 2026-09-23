import { createGovernanceReceipt } from "@alignment-governance-stack/receipts";
import { createAgencyFingerprintForGovernedRuntimeAction } from "./createAgencyFingerprintForGovernedRuntimeAction.js";
import { evaluateGovernedRuntimeAction } from "./evaluateGovernedRuntimeAction.js";
import type {
  EvaluateGovernedRuntimeActionWithReceiptInput,
  GovernanceRuntimePacketWithReceipt
} from "./types.js";

export function evaluateGovernedRuntimeActionWithReceipt(
  input: EvaluateGovernedRuntimeActionWithReceiptInput
): GovernanceRuntimePacketWithReceipt {
  if (input.contextAdmission !== undefined && input.agencyFingerprintOptions !== undefined &&
      input.contextAdmission.requestedUse.receiverAgentId !== input.agencyFingerprintOptions.input.agentId) {
    throw new Error("Agency fingerprint agent must match the admitted context receiver.");
  }
  const governance = evaluateGovernedRuntimeAction(input);
  const agencyFingerprint =
    input.agencyFingerprintOptions !== undefined
      ? createAgencyFingerprintForGovernedRuntimeAction({
          governance,
          fingerprintInput: input.agencyFingerprintOptions.input
        })
      : undefined;
  const receiptMetadata =
    agencyFingerprint !== undefined
      ? {
          ...input.receiptOptions?.metadata,
          agencyFingerprintId: agencyFingerprint.fingerprintId,
          agencyFingerprintHash: agencyFingerprint.fingerprintHash
        }
      : input.receiptOptions?.metadata;
  const receipt = createGovernanceReceipt({
    governancePacket: governance,
    ...(input.receiptOptions?.id !== undefined ? { id: input.receiptOptions.id } : {}),
    ...(input.receiptOptions?.createdAt !== undefined ? { createdAt: input.receiptOptions.createdAt } : {}),
    ...(input.receiptOptions?.previousReceiptHash !== undefined
      ? { previousReceiptHash: input.receiptOptions.previousReceiptHash }
      : {}),
    ...(receiptMetadata !== undefined ? { metadata: receiptMetadata } : {})
  });

  return {
    governance,
    receipt,
    ...(agencyFingerprint !== undefined ? { agencyFingerprint } : {})
  };
}
