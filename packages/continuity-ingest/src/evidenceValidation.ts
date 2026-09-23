import { validateContextAdmissionEvidence } from "@alignment-governance-stack/context-admission";
import { verifyGovernanceReceipt, canonicalizeForHash, sha256Hex, type GovernanceReceipt } from "@alignment-governance-stack/receipts";
import { assertArtifactShape } from "./artifactShape.js";
/** Every nested envelope is validated before any containing artifact is retained. */
export function assertEmbeddedEvidence(value: unknown): void {
  if (!value || typeof value !== "object") return;
  const record = value as Record<string, unknown>;
  if (record.version === "context-admission/v0.1" && !validateContextAdmissionEvidence(value))
    throw new Error("Context Admission evidence has invalid content-free shape or digest.");
  if (record.version === "ags.receipt.v0.1" && !verifyGovernanceReceipt(value as GovernanceReceipt).valid)
    throw new Error("Receipt integrity verification failed.");
  if (record.version === "agency-fingerprint/v0.1") {
    assertArtifactShape("agency-fingerprint", value);
    const { fingerprintId, fingerprintHash, ...body } = record;
    const hash = sha256Hex(canonicalizeForHash(body));
    if (fingerprintHash !== hash || fingerprintId !== `agency-fingerprint-${hash.slice(0, 16)}`) throw new Error("Fingerprint integrity verification failed.");
  }
  for (const [key, child] of Object.entries(record)) {
    if (key === "contextAdmission" && child !== undefined && !validateContextAdmissionEvidence(child))
      throw new Error("Nested Context Admission evidence has invalid content-free shape or digest.");
    assertEmbeddedEvidence(child);
  }
}
