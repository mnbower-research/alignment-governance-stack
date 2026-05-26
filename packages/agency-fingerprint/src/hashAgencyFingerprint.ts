import { canonicalizeForHash, sha256Hex } from "@alignment-governance-stack/receipts";
import type { AgencyFingerprint } from "./types.js";

export function hashAgencyFingerprint(
  fingerprint: Omit<AgencyFingerprint, "fingerprintHash"> | AgencyFingerprint
): string {
  return sha256Hex(canonicalizeForHash(withoutDerivedFields(fingerprint)));
}

function withoutDerivedFields(
  fingerprint: Omit<AgencyFingerprint, "fingerprintHash"> | AgencyFingerprint
): unknown {
  const {
    fingerprintId: _fingerprintId,
    fingerprintHash: _fingerprintHash,
    ...body
  } = fingerprint as AgencyFingerprint;
  return body;
}
