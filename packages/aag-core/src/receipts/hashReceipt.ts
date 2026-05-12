import type { DecisionReceipt } from "@agent-action-governance/shared-types";

export function hashReceipt(receipt: DecisionReceipt): string {
  // TODO: Replace stable placeholder with canonical receipt hashing.
  return `hash-placeholder:${receipt.id}`;
}
