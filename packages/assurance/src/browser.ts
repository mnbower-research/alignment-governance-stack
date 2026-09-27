import type { AssuranceEvidence } from "@alignment-governance-stack/shared-types" with { "resolution-mode": "import" };
import { canonicalAssurance } from "./model.js";
import { attestationShape, evidenceShape } from "./schema.js";
import { consistentEvidence } from "./evidenceConsistency.js";
async function validDigest(value: Record<string, unknown>): Promise<boolean> {
  const { digest, ...body } = value;
  const bytes = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonicalAssurance(body)));
  return digest === `sha256:${Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, "0")).join("")}`;
}
export async function verifyValidatorAttestationAsync(value: unknown): Promise<boolean> {
  return attestationShape(value) && validDigest(value as unknown as Record<string, unknown>);
}
/** Imported history only: digest verification is not identity authentication or current assurance. */
export async function verifyAssuranceEvidenceAsync(value: unknown): Promise<boolean> {
  if (!evidenceShape(value) || !consistentEvidence(value)) return false;
  for (const [digest, body] of [[value.binding.policyDigest, value.policy], [value.binding.riskDigest, value.risk], [value.binding.requirementDigest, value.requirement]] as const) {
    if (!await validDigest({ ...body, digest })) return false;
  }
  for (const a of (value as AssuranceEvidence).attestations) if (!attestationShape(a) || !await validDigest(a as unknown as Record<string, unknown>)) return false;
  return validDigest(value as unknown as Record<string, unknown>);
}
