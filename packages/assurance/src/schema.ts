import type { AssuranceInput, AssuranceEvidence, AssurancePolicy, ValidatorAttestation } from "@alignment-governance-stack/shared-types" with { "resolution-mode": "import" };
import { riskDimensions, riskLevels, canonicalAssurance } from "./model.js";
export const record = (v: unknown): v is Record<string, any> => !!v && typeof v === "object" && !Array.isArray(v);
const text = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;
const strings = (v: unknown): v is string[] => Array.isArray(v) && v.every(text) && new Set(v).size === v.length;
const bool = (v: unknown): boolean => typeof v === "boolean";
const hash = (v: unknown): boolean => typeof v === "string" && /^sha256:[a-f0-9]{64}$/.test(v);
export const timestamp = (v: unknown): boolean => typeof v === "string" && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(v) && Number.isFinite(Date.parse(v)) && new Date(v).toISOString() === v;
const keys = (v: Record<string, unknown>, allowed: string[]): boolean => Object.keys(v).every(k => allowed.includes(k));
const types = ["human", "agent", "system", "organization"];
export function bindingShape(v: unknown): boolean {
  return record(v) && keys(v, ["caseId", "proposalId", "target", "actionDigest", "riskDigest", "policyDigest", "requirementDigest", "riskLevel", "authorityDomain"]) &&
    [v.caseId, v.proposalId, v.target, v.authorityDomain].every(text) && [v.actionDigest, v.riskDigest, v.policyDigest, v.requirementDigest].every(hash) && [...riskLevels, "unknown"].includes(v.riskLevel);
}
export function attestationShape(v: unknown): v is ValidatorAttestation {
  return record(v) && keys(v, ["version", "id", "validatorId", "validatorType", "role", "authorityDomain", "independenceGroup", "verdict", "binding", "policyVersion", "evidenceRefs", "createdAt", "expiresAt", "revoked", "revokedAt", "rationale", "lineage", "digest"]) &&
    v.version === "assurance-attestation/v0.1" && [v.id, v.validatorId, v.role, v.authorityDomain, v.independenceGroup, v.policyVersion, v.rationale].every(text) && types.includes(v.validatorType) &&
    ["approve", "deny", "abstain", "request_revision"].includes(v.verdict) && bindingShape(v.binding) && strings(v.evidenceRefs) && strings(v.lineage) &&
    timestamp(v.createdAt) && timestamp(v.expiresAt) && Date.parse(v.expiresAt) > Date.parse(v.createdAt) && bool(v.revoked) &&
    (v.revokedAt === undefined || timestamp(v.revokedAt)) && hash(v.digest);
}
function validatorShape(v: unknown): boolean {
  return record(v) && keys(v, ["id", "subjectId", "type", "roles", "authorityDomains", "independenceGroup", "revoked"]) &&
    [v.id, v.subjectId, v.independenceGroup].every(text) && types.includes(v.type) && strings(v.roles) && v.roles.length > 0 && strings(v.authorityDomains) && v.authorityDomains.length > 0 && bool(v.revoked);
}
function requirementShape(v: unknown): boolean {
  return record(v) && keys(v, ["minimumAttestations", "slots", "distinctGroups", "mandatoryHuman", "unanimity", "denialBlocks", "requiredEvidence", "maxAgeMs", "ttlMs", "sequence", "onInsufficient"]) &&
    Number.isInteger(v.minimumAttestations) && v.minimumAttestations >= 1 && v.minimumAttestations <= 16 &&
    Array.isArray(v.slots) && v.slots.length <= 16 && v.slots.every((s: unknown) => record(s) && keys(s, ["id", "role", "authorityDomain", "independenceGroup", "validatorType"]) && text(s.id) && ["role", "authorityDomain", "independenceGroup"].every(k => s[k] === undefined || text(s[k])) && (s.validatorType === undefined || types.includes(s.validatorType))) &&
    new Set(v.slots.map((s: any) => s.id)).size === v.slots.length && [v.distinctGroups, v.mandatoryHuman, v.unanimity, v.denialBlocks].every(bool) && strings(v.requiredEvidence) &&
    Number.isSafeInteger(v.maxAgeMs) && v.maxAgeMs > 0 && Number.isSafeInteger(v.ttlMs) && v.ttlMs > 0 && strings(v.sequence) && v.sequence.every((id: string) => v.slots.some((s: any) => s.id === id)) &&
    ["insufficient", "request_validation", "escalate"].includes(v.onInsufficient);
}
export function policyShape(v: unknown): v is AssurancePolicy {
  if (!record(v) || !keys(v, ["id", "version", "materialDimensions", "requirements", "denialExpiry", "resolutionRoles"]) || !text(v.id) || !text(v.version) ||
      !strings(v.materialDimensions) || !v.materialDimensions.every(d => riskDimensions.includes(d as never)) || !record(v.requirements) || !keys(v.requirements, riskLevels) ||
      !riskLevels.every(level => requirementShape(v.requirements[level])) || !["persist", "attestation_expiry"].includes(v.denialExpiry) ||
      !record(v.resolutionRoles) || !keys(v.resolutionRoles, ["material_revision", "escalation", "override"]) || !Object.values(v.resolutionRoles).every(strings)) return false;
  // Higher consequence must not reduce the requirement or remove mandatory protections.
  for (let i = 1; i < riskLevels.length; i++) {
    const a = v.requirements[riskLevels[i - 1]!]; const b = v.requirements[riskLevels[i]!];
    if (b.minimumAttestations < a.minimumAttestations || b.maxAgeMs > a.maxAgeMs || b.ttlMs > a.ttlMs ||
        ["mandatoryHuman", "distinctGroups", "unanimity", "denialBlocks"].some(k => a[k] && !b[k]) ||
        a.requiredEvidence.some((e: string) => !b.requiredEvidence.includes(e)) ||
        a.slots.some((s: unknown) => !b.slots.some((other: unknown) => canonicalAssurance(s) === canonicalAssurance(other))) ||
        a.sequence.some((id: string, n: number) => b.sequence.indexOf(id) < 0 || (n > 0 && b.sequence.indexOf(id) <= b.sequence.indexOf(a.sequence[n - 1])))) return false;
  }
  return v.requirements.high.minimumAttestations >= 2 && v.requirements.high.distinctGroups && v.requirements.high.mandatoryHuman && v.requirements.critical.mandatoryHuman;
}
export function riskShape(v: unknown): boolean {
  return record(v) && keys(v, riskDimensions) && Object.values(v).every(f => record(f) && keys(f, ["value", "source", "evidenceRefs"]) &&
    [...riskLevels, "unknown"].includes(f.value) && ["host_supplied", "derived", "unknown"].includes(f.source) && strings(f.evidenceRefs) &&
    (f.value === "unknown" ? f.source === "unknown" : f.source !== "unknown" && f.evidenceRefs.length > 0));
}
export function resolutionShape(v: unknown): boolean {
  return record(v) && keys(v, ["id", "kind", "attestationIds", "binding", "resolverId", "createdAt", "expiresAt", "rationale", "evidenceRefs"]) &&
    [v.id, v.resolverId, v.rationale].every(text) && ["material_revision", "escalation", "override"].includes(v.kind) && strings(v.attestationIds) && v.attestationIds.length > 0 && bindingShape(v.binding) &&
    timestamp(v.createdAt) && timestamp(v.expiresAt) && Date.parse(v.createdAt) < Date.parse(v.expiresAt) && strings(v.evidenceRefs) && v.evidenceRefs.length > 0;
}
export function inputShape(v: unknown): v is AssuranceInput {
  return record(v) && keys(v, ["caseId", "authorityDomain", "risk", "policy", "validators", "attestations", "resolutions", "historyComplete", "evaluatedAt"]) &&
    text(v.caseId) && text(v.authorityDomain) && riskShape(v.risk) && policyShape(v.policy) && timestamp(v.evaluatedAt) && bool(v.historyComplete) &&
    Array.isArray(v.validators) && v.validators.length <= 64 && v.validators.every(validatorShape) && new Set(v.validators.map((r: any) => r.id)).size === v.validators.length &&
    Array.isArray(v.attestations) && v.attestations.length <= 128 && v.attestations.every(attestationShape) &&
    Array.isArray(v.resolutions) && v.resolutions.length <= 128 && v.resolutions.every(resolutionShape) && new Set(v.resolutions.map((r: any) => r.id)).size === v.resolutions.length;
}
export function evidenceShape(v: unknown): v is AssuranceEvidence {
  return record(v) && bool(v.historyComplete) && keys(v, ["version", "historyComplete", "binding", "evaluatedAt", "validUntil", "risk", "policy", "requirement", "validators", "attestations", "resolutions", "acceptedAttestationIds", "rejectedAttestations", "unresolvedDenialIds", "resolvedDenials", "slotAssignments", "independenceGroups", "decision", "findings", "digest"]) &&
    v.version === "assurance-evidence/v0.1" && bindingShape(v.binding) && timestamp(v.evaluatedAt) && (v.validUntil === undefined || timestamp(v.validUntil)) &&
    riskShape(v.risk) && policyShape(v.policy) && requirementShape(v.requirement) && Array.isArray(v.validators) && v.validators.every(validatorShape) &&
    Array.isArray(v.attestations) && v.attestations.every(attestationShape) && Array.isArray(v.resolutions) && v.resolutions.every(resolutionShape) &&
    strings(v.acceptedAttestationIds) && strings(v.unresolvedDenialIds) && strings(v.independenceGroups) && record(v.slotAssignments) && Object.values(v.slotAssignments).every(text) &&
    Array.isArray(v.rejectedAttestations) && v.rejectedAttestations.every((a: any) => record(a) && keys(a, ["id", "reasons"]) && text(a.id) && strings(a.reasons)) &&
    Array.isArray(v.resolvedDenials) && v.resolvedDenials.every((r: any) => record(r) && keys(r, ["attestationId", "resolutionId"]) && text(r.attestationId) && text(r.resolutionId)) &&
    ["satisfied", "insufficient", "request_validation", "request_revision", "escalate", "blocked"].includes(v.decision) &&
    Array.isArray(v.findings) && v.findings.every((f: any) => record(f) && keys(f, ["code", "reason", "attestationId"]) && text(f.code) && text(f.reason) && (f.attestationId === undefined || text(f.attestationId))) && hash(v.digest);
}
