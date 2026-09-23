/** Minimum complete receipt envelope, independent of issuer trust or execution claims. */
export function hasReceiptEnvelope(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const r = value as Record<string, unknown>;
  const text = (v: unknown): boolean => typeof v === "string" && v.trim().length > 0;
  if (r.version !== "ags.receipt.v0.1" || ![r.id, r.createdAt, r.finalDecision, r.reasonForDecision, r.receiptHash].every(text) ||
      !Number.isFinite(Date.parse(String(r.createdAt)))) return false;
  const p = r.originalProposal as Record<string, unknown> | undefined;
  return !!p && [p.id, p.userRequest, p.tool, p.actionType, p.target, p.environment].every(text) &&
    [p.reversible, p.externalFacing, p.requiresApproval, p.knownApproval].every(v => typeof v === "boolean") &&
    ["low", "medium", "high"].includes(String(p.dataSensitivity));
}
