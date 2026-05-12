import { createHash } from "node:crypto";
import { canonicalizeForHash } from "./canonicalize.js";

export function hashGovernanceReceipt(receipt: unknown): string {
  return sha256Hex(canonicalizeForHash(withoutReceiptHash(receipt)));
}

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function withoutReceiptHash(receipt: unknown): unknown {
  if (receipt === null || typeof receipt !== "object" || Array.isArray(receipt)) {
    return receipt;
  }

  const { receiptHash: _receiptHash, ...rest } = receipt as Record<string, unknown>;
  return rest;
}
