import type { ActionPermit, PermitValidationResult } from "./types.js";

export function validatePermit(permit: ActionPermit, now: Date = new Date()): PermitValidationResult {
  // TODO: Validate signatures, issuance source, revocation, approval state, and policy constraints.
  const expiresAt = new Date(permit.expiresAt);

  if (Number.isNaN(expiresAt.getTime())) {
    return { valid: false, reason: "Permit expiration is invalid." };
  }

  return {
    valid: expiresAt.getTime() >= now.getTime(),
    reason: expiresAt.getTime() >= now.getTime() ? "Permit is valid." : "Permit is expired."
  };
}
