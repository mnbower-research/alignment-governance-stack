import { assertCanonicalDelegationJson } from "@alignment-governance-stack/authority-map";
import { verifyGovernanceReceipt } from "@alignment-governance-stack/receipts";
import type { GovernanceReceipt } from "@alignment-governance-stack/receipts";
import { sha256Stable } from "@alignment-governance-stack/runtime-binding";
import type { MemoryObservation, MemoryObservationContent } from "./internalizationTypes.js";

/** Retains the full normalized record at an own JSON location, not an unverified string citation. */
export function createMemoryObservation(receipt: GovernanceReceipt, pointer: string): MemoryObservation {
  assertCanonicalDelegationJson(receipt);
  if (!verifyGovernanceReceipt(receipt).valid) throw new Error("Invalid source receipt");
  if (typeof pointer !== "string" || !pointer.startsWith("/") || /~(?![01])/.test(pointer)) throw new Error("Invalid memory source pointer");
  let source: unknown = receipt;
  for (const token of pointer.slice(1).split("/")) {
    const key = token.replace(/~1/g, "/").replace(/~0/g, "~");
    if (!source || typeof source !== "object" || !Object.prototype.hasOwnProperty.call(source, key)
      || (Array.isArray(source) && !/^(0|[1-9][0-9]*)$/.test(key))) throw new Error("Unresolved memory source pointer");
    source = (source as Record<string, unknown>)[key];
  }
  const c = source as MemoryObservationContent;
  if (!c || typeof c !== "object" || Array.isArray(c)) throw new Error("Memory source must be a normalized record");
  const allowed = new Set(["id", "category", "subjectId", "contextKey", "key", "value", "classification", "observedAt", "supersedes", "predictionConfidence"]);
  if (Object.keys(c).some(k => !allowed.has(k)) || ![c.id,c.subjectId,c.contextKey,c.key].every(v => typeof v === "string" && v.length > 0)
    || !["preference","procedure","observed_routine"].includes(c.category) || !["explicit","inferred"].includes(c.classification)
    || !Object.prototype.hasOwnProperty.call(c, "value") || typeof c.observedAt !== "string" || !Number.isFinite(Date.parse(c.observedAt))
    || !Array.isArray(c.supersedes) || c.supersedes.some(id => typeof id !== "string" || !id)
    || new Set(c.supersedes).size !== c.supersedes.length || (c.supersedes.length > 0 && c.classification !== "explicit")
    || (c.predictionConfidence !== undefined && (typeof c.predictionConfidence !== "number" || c.predictionConfidence < 0 || c.predictionConfidence > 1)))
    throw new Error("Invalid normalized memory observation");
  if (typeof receipt.createdAt !== "string" || !Number.isFinite(Date.parse(receipt.createdAt)) || Date.parse(c.observedAt) > Date.parse(receipt.createdAt)) throw new Error("Invalid receipt time or observation postdates receipt");
  const body = { ...structuredClone(c), version: "memory-observation/v1" as const,
    source: { receiptId: receipt.id, receiptHash: receipt.receiptHash, pointer } };
  return { ...body, digest: sha256Stable(body) };
}
