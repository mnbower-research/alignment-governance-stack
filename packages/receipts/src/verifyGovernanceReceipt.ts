import { hasReceiptEnvelope } from "./receiptShape.js";
import { hashGovernanceReceipt } from "./hashReceipt.js";
import type {
  GovernanceReceipt,
  GovernanceReceiptVerificationResult
} from "./types.js";

export function verifyGovernanceReceipt(
  receipt: GovernanceReceipt
): GovernanceReceiptVerificationResult {
  const expectedHash = hashGovernanceReceipt(receipt);
  const actualHash = receipt.receiptHash;
  const valid = hasReceiptEnvelope(receipt) && expectedHash === actualHash;

  return {
    valid,
    expectedHash,
    actualHash,
    reason: valid
      ? "Receipt hash matches the canonical receipt body."
      : "Receipt envelope is incomplete or its hash does not match the canonical body."
  };
}
