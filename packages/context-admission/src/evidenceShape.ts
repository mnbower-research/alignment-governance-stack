import type { ContextAdmissionEvidence } from "@alignment-governance-stack/shared-types";
import { validateContextAdmissionRequest } from "./validateContextAdmissionRequest.js";

/** Validates imported evidence shape (digest verification is separate), never its issuer or live validity. */
export function validateContextAdmissionEvidenceShape(input: unknown): input is ContextAdmissionEvidence {
  if (!record(input) || input.version !== "context-admission/v0.1" || !text(input.admissionId) ||
      !hash(input.contextLineageDigest) || !hash(input.policyDigest) || !text(input.policyId) ||
      !text(input.reasonForDecision) || !decisions.includes(String(input.decision)) ||
      !Array.isArray(input.artifacts) || !Array.isArray(input.findings)) return false;
  if (!onlyKeys(input, ["version", "admissionId", "evaluatedAt", "requestedUse", "validUntil", "policyId", "policyDigest", "materialArtifactIds", "artifacts", "findings", "decision", "reasonForDecision", "contextLineageDigest"])) return false;
  if (input.validUntil !== undefined && (typeof input.validUntil !== "string" || !Number.isFinite(Date.parse(input.validUntil)))) return false;
  if (!input.artifacts.every(a => record(a) && onlyKeys(a, ["artifactId", "artifactType", "contentHash", "provenance", "createdAt", "expiresAt", "revoked", "parentArtifactIds", "transformations", "priorAdmissionRefs", "evidenceRefs", "evidenceDigest", "permittedUses", "dataSensitivity"]) && text(a.artifactId) && (a.revoked === undefined || typeof a.revoked === "boolean") &&
      Array.isArray(a.parentArtifactIds) && Array.isArray(a.transformations) && Array.isArray(a.priorAdmissionRefs) &&
      Array.isArray(a.evidenceRefs) && a.evidenceRefs.every(text) && hash(a.evidenceDigest))) return false;
  if (!input.findings.every(f => record(f) && onlyKeys(f, ["artifactId", "code", "decision", "reason"]) && text(f.artifactId) && findingCodes.includes(String(f.code)) && text(f.reason) &&
      decisions.slice(1).includes(String(f.decision)))) return false;
  const requestValidation = validateContextAdmissionRequest({
    evaluatedAt: input.evaluatedAt, requestedUse: input.requestedUse, materialArtifactIds: input.materialArtifactIds,
    // A missing material root can legitimately result in a report with no supplied references.
    artifacts: input.artifacts.length > 0 ? input.artifacts.map(a => {
      const { artifactId, evidenceRefs: _refs, evidenceDigest: _digest, ...artifact } = a;
      return { ...artifact, id: artifactId };
    }) : [{ id: "missing-reference", artifactType: "unavailable" }],
    policy: { id: input.policyId, trustedSourceIds: [], trustedValidatorIds: [], trustedAuthorityIds: [] }
  });
  if (!requestValidation.valid) return false;
  const expectedDecision = input.findings.reduce<string>((decision, finding) =>
    decisions.indexOf(String(finding.decision)) > decisions.indexOf(decision) ? String(finding.decision) : decision, "admit");
  if (input.decision !== expectedDecision) return false;
  const artifactIds = new Set(input.artifacts.map(a => a.artifactId));
  if (input.decision === "admit" && !(input.materialArtifactIds as string[]).every(id => artifactIds.has(id))) return false;
  return true;
}

const decisions = ["admit", "admit_restricted", "require_validation", "require_human_review", "reject"];
const text = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;
const hash = (v: unknown): boolean => typeof v === "string" && /^sha256:[a-f0-9]{64}$/.test(v);
const record = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === "object" && !Array.isArray(v);

const onlyKeys = (value: Record<string, unknown>, allowed: string[]): boolean => Object.keys(value).every(key => allowed.includes(key));
const findingCodes = [
  "provenance_missing", "source_unknown", "integrity_missing", "integrity_mismatch", "context_expired", "context_revoked",
  "use_not_permitted", "permitted_use_missing", "trust_domain_crossing", "trust_domain_missing", "transformation_parent_missing",
  "validation_missing", "validation_invalid", "authority_stale", "approval_not_transferable", "circular_lineage", "lineage_gap",
  "authority_not_demonstrated", "content_not_authority", "creation_time_missing", "context_from_future",
  "action_binding_missing", "sensitivity_missing", "revocation_unknown"
];
