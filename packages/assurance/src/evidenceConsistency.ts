import type { AssuranceEvidence } from "@alignment-governance-stack/shared-types" with { "resolution-mode": "import" };
import { canonicalAssurance, riskLevels } from "./model.js";

/** Checks internal claims only. Current authority always requires fresh host evaluation. */
export function consistentEvidence(e: AssuranceEvidence): boolean {
  const requirement = e.policy.requirements[e.binding.riskLevel === "unknown" ? "critical" : e.binding.riskLevel];
  if (canonicalAssurance(e.requirement) !== canonicalAssurance(requirement)) return false;
  const selected = e.acceptedAttestationIds.map(id => e.attestations.filter(a => a.id === id));
  if (selected.some(records => records.length !== 1)) return false;
  const accepted = selected.map(records => records[0]!);
  const assigned = Object.values(e.slotAssignments);
  if (new Set(assigned).size !== assigned.length || canonicalAssurance([...assigned].sort()) !== canonicalAssurance([...e.acceptedAttestationIds].sort())) return false;
  if (canonicalAssurance([...new Set(accepted.map(a => a.independenceGroup))].sort()) !== canonicalAssurance([...e.independenceGroups].sort())) return false;
  if (e.decision !== "satisfied") return e.validUntil === undefined;
  const now = Date.parse(e.evaluatedAt);
  const fatal = new Set(["history_incomplete", "policy_mismatch", "identity_conflict", "integrity_invalid", "duplicate_attestation_id", "unresolved_denial", "risk_unknown", "mandatory_human_missing", "independent_slots_missing", "evaluation_limit"]);
  if (e.findings.some(f => fatal.has(f.code) || (requirement.unanimity && f.code === "validator_abstained"))) return false;
  const material = new Set([...e.policy.materialDimensions, "consequenceSeverity", "irreversibility", "sensitivity", "externalConsequence"] as const);
  if ([...material].some(d => !e.risk[d] || e.risk[d]!.value === "unknown") ||
      riskLevels[Math.max(0, ...[...material].map(d => riskLevels.indexOf(e.risk[d]!.value as typeof riskLevels[number])))] !== e.binding.riskLevel) return false;
  if (!e.historyComplete || e.unresolvedDenialIds.length || !e.validUntil ||
      Date.parse(e.validUntil) <= now || Date.parse(e.validUntil) > now + requirement.ttlMs || accepted.length < requirement.minimumAttestations ||
      (requirement.mandatoryHuman && !accepted.some(a => a.validatorType === "human")) ||
      (requirement.distinctGroups && new Set(accepted.map(a => a.independenceGroup)).size !== accepted.length)) return false;
  const subjects = new Set<string>();
  for (const a of accepted) {
    const identities = e.validators.filter(v => v.id === a.validatorId);
    const v = identities[0];
    if (identities.length !== 1 || !v || subjects.has(v.subjectId) || v.revoked || a.revoked ||
        v.type !== a.validatorType || !v.roles.includes(a.role) || !v.authorityDomains.includes(a.authorityDomain) || v.independenceGroup !== a.independenceGroup ||
        a.verdict !== "approve" || a.policyVersion !== e.policy.version || canonicalAssurance(a.binding) !== canonicalAssurance(e.binding) ||
        (a.authorityDomain !== e.binding.authorityDomain && !requirement.slots.some(s => s.authorityDomain === a.authorityDomain)) ||
        Date.parse(a.createdAt) > now || (a.revokedAt !== undefined && Date.parse(a.revokedAt) <= now) ||
        Date.parse(e.validUntil) > Math.min(Date.parse(a.expiresAt), Date.parse(a.createdAt) + requirement.maxAgeMs) ||
        requirement.requiredEvidence.some(ref => !a.evidenceRefs.includes(ref)) || e.rejectedAttestations.some(r => r.id === a.id)) return false;
    subjects.add(v.subjectId);
  }
  for (const s of requirement.slots) {
    const a = accepted.find(a => a.id === e.slotAssignments[s.id]);
    if (!a || (s.role && a.role !== s.role) || (s.validatorType && a.validatorType !== s.validatorType) ||
        (s.authorityDomain && a.authorityDomain !== s.authorityDomain) || (s.independenceGroup && a.independenceGroup !== s.independenceGroup)) return false;
  }
  if (requirement.sequence.some((id, n) => n > 0 && Date.parse(accepted.find(a => a.id === e.slotAssignments[id])!.createdAt) <=
      Date.parse(accepted.find(a => a.id === e.slotAssignments[requirement.sequence[n - 1]!])!.createdAt))) return false;
  if (new Set(e.attestations.map(a => a.id)).size !== e.attestations.length || new Set(e.validators.map(v => v.id)).size !== e.validators.length ||
      e.validators.some(v => e.validators.some(other => other.subjectId === v.subjectId && (other.type !== v.type || other.independenceGroup !== v.independenceGroup)))) return false;
  for (const a of e.attestations) {
    const v = e.validators.find(v => v.id === a.validatorId);
    if (requirement.unanimity && a.verdict === "abstain" && v && !v.revoked && !a.revoked &&
        v.type === a.validatorType && v.roles.includes(a.role) && v.authorityDomains.includes(a.authorityDomain) && v.independenceGroup === a.independenceGroup &&
        (a.authorityDomain === e.binding.authorityDomain || requirement.slots.some(s => s.authorityDomain === a.authorityDomain)) &&
        canonicalAssurance(a.binding) === canonicalAssurance(e.binding) && a.policyVersion === e.policy.version &&
        Date.parse(a.createdAt) <= now && now < Math.min(Date.parse(a.expiresAt), Date.parse(a.createdAt) + requirement.maxAgeMs) &&
        (a.revokedAt === undefined || now < Date.parse(a.revokedAt)) && requirement.requiredEvidence.every(ref => a.evidenceRefs.includes(ref))) return false;
    if (a.binding.caseId !== e.binding.caseId || !["deny", "request_revision"].includes(a.verdict)) continue;
    const recorded = e.resolvedDenials.filter(r => r.attestationId === a.id);
    if (recorded.length !== 1) return false;
    if (recorded[0]!.resolutionId === "policy:attestation_expiry" && e.policy.denialExpiry === "attestation_expiry" && Date.parse(a.expiresAt) <= now) continue;
    const r = e.resolutions.find(r => r.id === recorded[0]!.resolutionId);
    const resolver = r && e.validators.find(v => v.id === r.resolverId);
    if (!r || !resolver || resolver.type !== "human" || resolver.revoked || !resolver.authorityDomains.includes(e.binding.authorityDomain) ||
        !(e.policy.resolutionRoles[r.kind] ?? []).some(role => resolver.roles.includes(role)) || !r.attestationIds.includes(a.id) ||
        canonicalAssurance(r.binding) !== canonicalAssurance(e.binding) || Date.parse(r.createdAt) < Date.parse(a.createdAt) || Date.parse(r.createdAt) > now ||
        Date.parse(r.expiresAt) < Date.parse(e.validUntil!) ||
        (r.kind === "material_revision" && r.binding.actionDigest === a.binding.actionDigest && r.binding.riskDigest === a.binding.riskDigest)) return false;
  }
  return true;
}
