import { createGovernanceReceipt } from "@alignment-governance-stack/receipts";
import { evaluateGovernedRuntimeAction } from "./evaluateGovernedRuntimeAction.js";
import type {
  EvaluateGovernedRuntimeActionWithReceiptInput,
  GovernanceRuntimePacketWithReceipt
} from "./types.js";

export function evaluateGovernedRuntimeActionWithReceipt(
  input: EvaluateGovernedRuntimeActionWithReceiptInput
): GovernanceRuntimePacketWithReceipt {
  const governance = evaluateGovernedRuntimeAction(input);
  const receipt = createGovernanceReceipt({
    governancePacket: governance,
    ...(input.receiptOptions?.id !== undefined ? { id: input.receiptOptions.id } : {}),
    ...(input.receiptOptions?.createdAt !== undefined ? { createdAt: input.receiptOptions.createdAt } : {}),
    ...(input.receiptOptions?.previousReceiptHash !== undefined
      ? { previousReceiptHash: input.receiptOptions.previousReceiptHash }
      : {}),
    ...(input.receiptOptions?.metadata !== undefined ? { metadata: input.receiptOptions.metadata } : {})
  });

  return {
    governance,
    receipt
  };
}
