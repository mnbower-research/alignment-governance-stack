import { canonicalizeForHash, sha256HexAsync } from "@alignment-governance-stack/receipts/browser";
import { validateContextAdmissionEvidenceShape } from "./evidenceShape.js";
export async function validateContextAdmissionEvidenceAsync(input: unknown): Promise<boolean> {
  if (!validateContextAdmissionEvidenceShape(input)) return false;
  const { admissionId, contextLineageDigest, ...body } = input;
  return contextLineageDigest === `sha256:${await sha256HexAsync(canonicalizeForHash(body))}` &&
    admissionId === `context-${contextLineageDigest.slice(7, 23)}`;
}
