import { hasReceiptEnvelope } from "./receiptShape.js";
// Browser verification uses the same canonical body as the synchronous Node API.
import { canonicalizeForHash } from "./canonicalize.js";
export { canonicalizeForHash } from "./canonicalize.js";
export async function sha256HexAsync(value: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}
export async function verifyGovernanceReceiptAsync(value: unknown): Promise<boolean> {
  if (!hasReceiptEnvelope(value)) return false;
  const { receiptHash, ...body } = value as Record<string, unknown>;
  return typeof receiptHash === "string" && receiptHash === await sha256HexAsync(canonicalizeForHash(body));
}
