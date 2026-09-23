import { canonicalizeForHash, sha256Hex } from "@alignment-governance-stack/receipts";
import type {
  ContextAdmissionDecision, ContextAdmissionEvidence, ContextAdmissionFinding,
  ContextAdmissionFindingCode, ContextAdmissionRequest, ContextArtifact, ContextArtifactReference
} from "@alignment-governance-stack/shared-types";
import { assertContextAdmissionRequest } from "./validateContextAdmissionRequest.js";

const rank: Record<ContextAdmissionDecision, number> = {
  admit: 0, admit_restricted: 1, require_validation: 2, require_human_review: 3, reject: 4
};

export function hashContextContent(content: string): string {
  return `sha256:${sha256Hex(content)}`;
}

const digest = (value: unknown): string => `sha256:${sha256Hex(canonicalizeForHash(value))}`;

export function evaluateContextAdmission(request: ContextAdmissionRequest): ContextAdmissionEvidence {
  assertContextAdmissionRequest(request);
  const input = structuredClone(request);
  const { policy, requestedUse: use } = input;
  const now = Date.parse(input.evaluatedAt);
  const findings: ContextAdmissionFinding[] = [];
  const references: ContextArtifactReference[] = [];
  const expiryTimes: number[] = [];
  const artifacts = new Map(input.artifacts.map(artifact => [artifact.id, artifact]));
  const visited = new Set<string>();
  const active = new Set<string>();
  const add = (artifactId: string, code: ContextAdmissionFindingCode, decision: ContextAdmissionFinding["decision"], reason: string): void => {
    if (!findings.some(f => f.artifactId === artifactId && f.code === code)) findings.push({ artifactId, code, decision, reason });
  };

  const inspect = (artifact: ContextArtifact): void => {
    const id = artifact.id;
    const provenance = artifact.provenance;
    const referenceOnly = use.mode === "reference" && artifact.dataSensitivity === "low";
    const requiresValidation = policy.requireValidation ?? !referenceOnly;
    const requiresAuthority = policy.requireAuthority === true || !referenceOnly;
    const evidence = (input.validationEvidence ?? []).filter(e =>
      e.artifactId === id && e.contentHash === artifact.contentHash && !e.revoked &&
      policy.trustedValidatorIds.includes(e.validatorId) &&
      canonicalizeForHash(e.use) === canonicalizeForHash(use) &&
      Date.parse(e.validatedAt) <= now && Date.parse(e.expiresAt) > now &&
      (artifact.createdAt === undefined || Date.parse(e.validatedAt) >= Date.parse(artifact.createdAt))
    );
    const authorityEvidence = evidence.filter(e => e.kind === "authority" &&
      e.authorityId !== undefined && policy.trustedAuthorityIds.includes(e.authorityId) &&
      e.authorityId === provenance?.authorityId);
    const transferEvidence = evidence.filter(e => e.kind === "domain_transfer" &&
      e.authorityId === provenance?.authorityId && e.authorityId !== undefined && policy.trustedAuthorityIds.includes(e.authorityId));
    // Each required kind needs one valid attestation, not every optional/duplicate one.
    const requiredGroups = [
      ...(requiresAuthority ? [authorityEvidence] : []),
      ...(requiresValidation ? [evidence.filter(e => e.kind === "validation")] : []),
      ...(artifact.content === undefined ? [evidence.filter(e => e.kind === "integrity")] : []),
      ...(provenance?.trustDomain !== use.trustDomain ? [transferEvidence] : [])
    ];
    for (const group of requiredGroups) {
      if (group.length > 0) expiryTimes.push(Math.max(...group.map(e => Date.parse(e.expiresAt))));
    }
    for (const value of [artifact.expiresAt, provenance?.authorityExpiresAt]) {
      if (value !== undefined) expiryTimes.push(Date.parse(value));
    }
    const parents = [...new Set([...(artifact.parentArtifactIds ?? []), ...(artifact.transformations ?? []).flatMap(t => t.parentArtifactIds)])].sort();

    if (provenance === undefined) add(id, "provenance_missing", "require_validation", "No provenance envelope was supplied; source lineage is not demonstrated.");
    if (!provenance?.sourceId || !policy.trustedSourceIds.includes(provenance.sourceId)) add(id, "source_unknown", "require_validation", "The source is absent or not recognized by the receiving policy; this does not establish maliciousness.");
    if (artifact.content !== undefined && artifact.contentHash !== undefined && hashContextContent(artifact.content) !== artifact.contentHash) add(id, "integrity_mismatch", "reject", "The supplied content does not match its declared SHA-256 digest.");
    if (!artifact.contentHash || (artifact.content === undefined && !evidence.some(e => e.kind === "integrity"))) {
      add(id, "integrity_missing", policy.requireIntegrity === false && referenceOnly ? "admit_restricted" : "require_validation", "Content integrity has not been demonstrated by local bytes or current, exact-use integrity evidence.");
    }
    if (artifact.createdAt === undefined) add(id, "creation_time_missing", referenceOnly ? "admit_restricted" : "require_validation", "Creation time is unavailable; temporal validity cannot be fully established.");
    else if (Date.parse(artifact.createdAt) > now) add(id, "context_from_future", "require_validation", "Creation time is later than the receiving evaluation time.");
    if (artifact.expiresAt !== undefined && Date.parse(artifact.expiresAt) <= now) add(id, "context_expired", "reject", "The artifact expired before or at the receiving evaluation time.");
    if (use.mode === "operational") {
      if (!use.action?.actionHash) add(id, "action_binding_missing", "require_validation", "Operational context requires the canonical hash of the exact receiving action, including execution constraints.");
      if (artifact.dataSensitivity === undefined) add(id, "sensitivity_missing", "require_validation", "Operational context requires an explicit data sensitivity classification.");
      if (artifact.revoked === undefined) add(id, "revocation_unknown", "require_validation", "The host must supply revocation state before operational reuse; unknown is not unrevoked.");
    }
    if (artifact.revoked) add(id, "context_revoked", "reject", "The supplied state explicitly revokes this artifact even though it remains available.");
    if (artifact.permittedUses === undefined) add(id, "permitted_use_missing", referenceOnly ? "admit_restricted" : "require_validation", "No permitted purpose was supplied; operational reuse is not demonstrated.");
    else if (!artifact.permittedUses.includes(use.purpose)) add(id, "use_not_permitted", "reject", "The requested purpose is outside the artifact's permitted uses.");
    if (provenance?.trustDomain === undefined) add(id, "trust_domain_missing", referenceOnly ? "admit_restricted" : "require_validation", "The originating trust domain is not demonstrated.");
    else if (provenance.trustDomain !== use.trustDomain && !evidence.some(e =>
      e.kind === "domain_transfer" && e.authorityId === provenance.authorityId &&
      e.authorityId !== undefined && policy.trustedAuthorityIds.includes(e.authorityId)
    )) add(id, "trust_domain_crossing", "require_human_review", "No current, exact-use authority evidence supports transfer into the receiving trust domain.");
    if (provenance?.authorityExpiresAt !== undefined && Date.parse(provenance.authorityExpiresAt) <= now) add(id, "authority_stale", "require_human_review", "The artifact's authority source is stale; persistence did not renew it.");
    if (authorityEvidence.length === 0) add(id, "authority_not_demonstrated", requiresAuthority ? "require_human_review" : "admit_restricted", "Source availability does not demonstrate authority for this receiver and use. Reference-only use does not grant operational authority.");
    if (artifact.validationStatus === "invalid") add(id, "validation_invalid", "reject", "The supplied artifact is explicitly marked invalid.");
    if (requiresValidation && !evidence.some(e => e.kind === "validation")) add(id, "validation_missing", "require_validation", "Policy requires current validation bound to the content hash, receiver and exact use; stored status and prior admissions do not satisfy it.");
    if ((artifact.transformations ?? []).some(t => t.parentArtifactIds.length === 0) ||
        (["summary", "translation", "derived"].includes(artifact.artifactType) && parents.length === 0)) add(id, "transformation_parent_missing", "require_validation", "A transformation or derived artifact does not identify parent lineage.");
    if (use.mode === "approval_reuse") add(id, "approval_not_transferable", "reject", "An inherited approval is historical context, not current action approval. Submit current approval to Authority Map and AAG.");
    if (use.mode === "governance_instruction") add(id, "content_not_authority", "reject", "Artifact content cannot redefine the receiving system's authority, policy, or task. It is data, not self-authorizing governance.");

    references.push({
      artifactId: id, artifactType: artifact.artifactType,
      ...(artifact.contentHash !== undefined ? { contentHash: artifact.contentHash } : {}),
      ...(provenance !== undefined ? { provenance } : {}),
      ...(artifact.createdAt !== undefined ? { createdAt: artifact.createdAt } : {}),
      ...(artifact.expiresAt !== undefined ? { expiresAt: artifact.expiresAt } : {}),
      ...(artifact.revoked !== undefined ? { revoked: artifact.revoked } : {}), parentArtifactIds: parents,
      transformations: artifact.transformations ?? [], priorAdmissionRefs: artifact.priorAdmissionRefs ?? [],
      evidenceRefs: evidence.map(e => e.id).sort(), evidenceDigest: digest(evidence),
      ...(artifact.permittedUses !== undefined ? { permittedUses: artifact.permittedUses } : {}),
      ...(artifact.dataSensitivity !== undefined ? { dataSensitivity: artifact.dataSensitivity } : {})
    });
  };

  // Iterative DFS avoids overflowing the call stack on long temporal histories.
  for (const root of [...input.materialArtifactIds].sort()) {
    const stack: Array<{ id: string; exit: boolean }> = [{ id: root, exit: false }];
    while (stack.length > 0) {
      const node = stack.pop()!;
      if (node.exit) { active.delete(node.id); visited.add(node.id); continue; }
      if (active.has(node.id)) { add(node.id, "circular_lineage", "reject", "The supplied ancestry contains a cycle."); continue; }
      if (visited.has(node.id)) continue;
      const artifact = artifacts.get(node.id);
      if (!artifact) { add(node.id, "lineage_gap", "require_validation", "A material artifact or referenced ancestor was not supplied."); visited.add(node.id); continue; }
      active.add(node.id);
      inspect(artifact);
      stack.push({ id: node.id, exit: true });
      const parents = [...new Set([...(artifact.parentArtifactIds ?? []), ...(artifact.transformations ?? []).flatMap(t => t.parentArtifactIds)])].sort().reverse();
      for (const id of parents) stack.push({ id, exit: false });
    }
  }
  findings.sort((a, b) => `${a.artifactId}:${a.code}`.localeCompare(`${b.artifactId}:${b.code}`, "en"));
  references.sort((a, b) => a.artifactId.localeCompare(b.artifactId, "en"));
  const decision = findings.reduce<ContextAdmissionDecision>((current, f) => rank[f.decision] > rank[current] ? f.decision : current, "admit");
  const body = {
    version: "context-admission/v0.1" as const, evaluatedAt: input.evaluatedAt,
    ...(expiryTimes.length > 0 ? { validUntil: new Date(expiryTimes.reduce((a, b) => Math.min(a, b))).toISOString() } : {}),
    requestedUse: use, policyId: policy.id, policyDigest: digest(policy),
    materialArtifactIds: [...input.materialArtifactIds].sort(), artifacts: references, findings, decision,
    reasonForDecision: findings.length === 0
      ? "Supplied evidence supports this receiving use at the evaluation time. This is not execution approval."
      : findings.map(f => `${f.artifactId}: ${f.reason}`).join(" ")
  };
  const contextLineageDigest = digest(body);
  return { ...body, contextLineageDigest, admissionId: `context-${contextLineageDigest.slice(7, 23)}` };
}

/** Integrity only: a hash is neither issuer authentication nor current admission. */
export function verifyContextAdmissionEvidence(evidence: ContextAdmissionEvidence): boolean {
  const { admissionId, contextLineageDigest, ...body } = evidence;
  return contextLineageDigest === digest(body) && admissionId === `context-${contextLineageDigest.slice(7, 23)}`;
}
