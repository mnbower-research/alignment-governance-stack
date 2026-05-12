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
  const valid = expectedHash === actualHash;

  return {
    valid,
    expectedHash,
    actualHash,
    reason: valid
      ? "Receipt hash matches the canonical receipt body."
      : "Receipt hash does not match the canonical receipt body."
  };
}
