import type { GovernanceReceiptVerificationResult } from "@alignment-governance-stack/receipts";

export function formatReceiptVerification(result: GovernanceReceiptVerificationResult): string {
  return [
    "AGS Receipt Verification",
    `valid: ${result.valid}`,
    `expectedHash: ${result.expectedHash}`,
    `actualHash: ${result.actualHash}`,
    `reason: ${result.reason}`
  ].join("\n");
}
