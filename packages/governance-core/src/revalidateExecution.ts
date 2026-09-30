import { assertCanonicalDelegationJson, createApprovalBinding, evaluateCurrentStanding, validateDelegatedAction } from "@alignment-governance-stack/authority-map";
import { bindActionToPermit, sha256Stable } from "@alignment-governance-stack/runtime-binding";
import { createGovernanceReceipt } from "@alignment-governance-stack/receipts";
import type { ExecutionRevalidationRequest, ExecutionRevalidationResult } from "./executionRevalidationTypes.js";

/** Pure execution-boundary evaluation. Malformed/noncanonical inputs throw; they never authorize. */
export function revalidateExecution(request: ExecutionRevalidationRequest): ExecutionRevalidationResult {
  assertCanonicalDelegationJson(request);
  const { permit, basis, action, delegation, host, authorityObservation, evidence } = request;
  const binding = createApprovalBinding(action), now = Date.parse(host.now);
  const body: Omit<ExecutionRevalidationResult, "digest"> = {
    version: "execution-revalidation/v1", state: "execution_unresolved",
    permit: { id: permit.id, digest: sha256Stable(permit), actionHash: permit.actionHash }, issuanceBasisDigest: basis.digest,
    delegation: { id: delegation.proposal.id, digest: delegation.digest }, action: binding, receiverId: host.delegateId,
    evaluatedAt: host.now, authorityInputDigest: sha256Stable(host), evidenceDigest: sha256Stable(evidence),
    authorityObservation: structuredClone(authorityObservation), findings: [], consequence: "not_observed"
  };
  const finish = (): ExecutionRevalidationResult => ({ ...body, digest: sha256Stable(body) });
  const fail = (state: "execution_defeated" | "execution_unresolved", code: string, reason: string): ExecutionRevalidationResult => {
    body.state = state; body.findings.push({ code, reason }); return finish();
  };
  if (!Number.isFinite(now)) return fail("execution_unresolved", "invalid_execution_clock", "A valid current host clock is required.");
  const { digest, ...basisBody } = basis;
  if (basis.version !== "execution-issuance-basis/v1" || sha256Stable(basisBody) !== digest
    || request.issuedBasisDigests[permit.id] !== digest || basis.permitId !== permit.id || basis.permitDigest !== body.permit.digest
    || basis.delegation.id !== delegation.proposal.id || basis.delegation.digest !== delegation.digest || basis.receiverId !== host.delegateId
    || sha256Stable(basis.action) !== sha256Stable(createApprovalBinding(permit.allowedAction))
    || basis.issuedAt !== permit.issuedAt || basis.validUntil !== permit.expiresAt)
    return fail("execution_defeated", "issuance_basis_mismatch", "Exact registered permit/delegation issuance linkage is required.");
  const runtime = bindActionToPermit(action, permit, { now: host.now, ...(request.assurance ? { assurance: request.assurance } : {}) });
  if (!runtime.allowed) {
    body.state = "execution_defeated";
    body.findings.push(...runtime.failures.map(f => ({ code: f.code, reason: f.reason })));
    return finish();
  }
  if (sha256Stable(binding) !== sha256Stable(basis.action))
    return fail("execution_defeated", "execution_action_binding_mismatch", "Exact approved action identity and purpose must still match.");
  if (!Array.isArray(host.revocations)) return fail("execution_unresolved", "authority_history_missing", "Current complete revocation history is required.");
  const authority = validateDelegatedAction(delegation, action, host);
  if (!authority.valid) return fail("execution_defeated", "execution_authority_invalid", authority.reasons.join(" "));
  const policy = delegation.proposal.executionRevalidation;
  if (!policy) return fail("execution_defeated", "execution_policy_missing", "Execution revalidation must be explicitly established.");
  const horizons = [Date.parse(permit.expiresAt!), Date.parse(basis.validUntil), Date.parse(authority.validUntil!), now + policy.maxExecutionDelayMs];
  if (runtime.assurance?.validUntil) horizons.push(Date.parse(runtime.assurance.validUntil));
  const freshness = (observedAt: string): number | undefined => {
    const observed = Date.parse(observedAt), until = observed + policy.maxEvidenceAgeMs;
    return Number.isFinite(observed) && observed >= Date.parse(permit.issuedAt) && observed <= now && until > now ? until : undefined;
  };
  const authorityUntil = freshness(authorityObservation.observedAt);
  if (!authorityObservation.id || !authorityObservation.reference || !authorityObservation.revision || authorityUntil === undefined)
    return fail("execution_unresolved", "authority_observation_not_current", "A fresh host authority/history observation with a retained version and reference is required.");
  horizons.push(authorityUntil);
  if (delegation.proposal.currentStanding !== undefined) {
    const prior = basis.standing;
    if (!prior || prior.state !== "standing_valid" || prior.delegation.digest !== delegation.digest
      || sha256Stable(prior.action) !== sha256Stable(binding) || !prior.standingValidUntil)
      return fail("execution_defeated", "issuance_standing_missing", "The registered permit must retain its original valid standing basis.");
    const { digest: priorDigest, ...priorBody } = prior;
    if (sha256Stable(priorBody) !== priorDigest) return fail("execution_defeated", "issuance_standing_invalid", "Original standing digest is invalid.");
    body.standing = evaluateCurrentStanding({ delegation, action, evidence, host });
    if (body.standing.state !== "standing_valid") return fail(body.standing.state === "standing_defeated" ? "execution_defeated" : "execution_unresolved",
      "execution_standing_invalid", "Fresh standing does not support this execution attempt.");
    for (const e of evidence) {
      const until = freshness(e.observedAt);
      if (until === undefined) return fail("execution_unresolved", "execution_observation_not_current", "Standing observation exceeds the confirmed execution-time freshness tolerance or predates permit issuance.");
      horizons.push(until);
    }
    horizons.push(Date.parse(prior.standingValidUntil), Date.parse(body.standing.standingValidUntil!));
  }
  if (!horizons.every(Number.isFinite) || Math.min(...horizons) <= now)
    return fail("execution_defeated", "execution_horizon_elapsed", "No remaining execution validity interval.");
  body.state = "execution_revalidated";
  body.executionValidUntil = new Date(Math.min(...horizons)).toISOString();
  return finish();
}

/** Verification recomputes using current inputs; neither a hash nor an old successful result authorizes execution. */
export function verifyExecutionRevalidation(result: ExecutionRevalidationResult, request: ExecutionRevalidationRequest): boolean {
  try { assertCanonicalDelegationJson(result); return sha256Stable(result) === sha256Stable(revalidateExecution(request)); }
  catch { return false; }
}

/** Audit wrapper only. No side effect is performed or claimed. */
export function revalidateExecutionWithReceipt(request: ExecutionRevalidationRequest) {
  const result = revalidateExecution(request);
  const receipt = createGovernanceReceipt({ createdAt: request.host.now, previousReceiptHash: request.basis.issuanceReceiptHash,
    governancePacket: { originalProposal: request.permit.allowedAction, permit: request.permit, runtimeAction: request.action,
      finalDecision: result.state, reasonForDecision: result.state === "execution_revalidated"
        ? "Permission revalidated at the checked boundary; external execution and consequence were not observed."
        : "Execution is not authorized at this boundary; external execution and consequence were not observed." },
    metadata: { executionRevalidation: result, issuanceBasis: request.basis, executionEvidence: {
      delegation: request.delegation, authority: request.host, authorityObservation: request.authorityObservation,
      standingEvidence: request.evidence, issuedBasisDigests: request.issuedBasisDigests,
      ...(request.assurance ? { assurance: request.assurance } : {}) }, consequence: "not_observed" } });
  return { result, receipt };
}
