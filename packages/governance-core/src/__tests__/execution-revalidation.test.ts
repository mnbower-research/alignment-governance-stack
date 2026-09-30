import { describe, expect, it } from "vitest";
import type { AgentActionProposal } from "@alignment-governance-stack/shared-types";
import { createApprovalBinding, delegationMaterialPaths, establishDelegation, hashDelegationProposal, revokeDelegation } from "@alignment-governance-stack/authority-map";
import type { DelegationProposal, CurrentDelegationContext, StandingEvidence } from "@alignment-governance-stack/authority-map";
import { bindActionToPermit, sha256Stable } from "@alignment-governance-stack/runtime-binding";
import { issueRevalidatedPermit } from "../issueRevalidatedPermit.js";
import { revalidateExecution, revalidateExecutionWithReceipt, verifyExecutionRevalidation } from "../revalidateExecution.js";
import type { ExecutionRevalidationRequest } from "../executionRevalidationTypes.js";

const t0 = "2026-09-30T10:00:00.000Z", t1 = "2026-09-30T10:00:06.000Z", end = "2026-09-30T11:00:00.000Z";
function lineage(p: DelegationProposal) {
  const { provenance, ...body } = p;
  p.provenance = Object.fromEntries(delegationMaterialPaths(body).map(path => [path, { kind: "explicit_expression", sourceId: "expression", pointer: "/text" }]));
}
function fixture(conditional = true, deployment = false, configure?: (p: DelegationProposal) => void) {
  const action: AgentActionProposal = { id: "action", userRequest: "Purchase flight AB123 for at most 500 USD.", tool: "airline.purchase", actionType: "purchase_flight", target: "AB123",
    environment: "production", reversible: true, externalFacing: true, dataSensitivity: "low", requiresApproval: true, knownApproval: false,
    // Synthetic host attestation required by existing PGDL for reviewed external actions.
    metadata: { subject: "AB123", maximumTotal: 500, currency: "USD", reviewedForExternalRelease: true } };
  if (deployment) Object.assign(action, { userRequest: "Deploy release v1 to staging.", tool: "ci.deploy", actionType: "deploy_release", target: "service", environment: "staging", externalFacing: false, metadata: { releaseId: "v1" } });
  const host: CurrentDelegationContext = { now: t0, humanId: "owner", delegateId: "agent", sourceIds: ["source"], minimumConsequence: "high", revocations: [], establishedDigests: {},
    authorityMap: { id: "map", name: "Map", version: "1", roles: [{ id: "owner", label: "Owner", scopes: [{ id: "scope", tool: action.tool, actionType: action.actionType }] }] } };
  const p: DelegationProposal = { version: "delegation-proposal/v1", id: "grant", expression: { id: "expression", humanId: "owner", text: action.userRequest, expressedAt: t0 },
    intent: { id: "intent", status: "provisional", expressionId: "expression", objective: action.userRequest, parameters: {}, preferences: {}, constraints: [], unresolved: [], confidence: 1 },
    delegateId: "agent", consequence: "high", permittedActions: [action], prohibitedActionTypes: [], discretion: "none", delegationRights: "none", approvalRequirement: "confirmed_exact_actions",
    standing: false, validFrom: t0, expiresAt: end, activeWindows: [], revocationCondition: "human_revocation_or_host_withdrawal", provenance: {},
    executionRevalidation: { maxEvidenceAgeMs: 1000, maxExecutionDelayMs: 100 },
    ...(conditional ? { currentStanding: { version: "standing-contract/v1" as const,
      dependencies: [{ id: "state", sourceId: "source", pointer: deployment ? "/environment" : "/price", maxAgeMs: 60_000 }],
      conditions: [{ id: "condition", actionId: action.id, dependencyId: "state", predicate: deployment ? { operator: "eq" as const, value: "staging" } : { operator: "lte" as const, value: 500 } }] } } : {}) };
  configure?.(p);
  lineage(p);
  const approval = { id: "approval", approverId: "owner", approverRoleId: "owner", approvedAt: t0, expiresAt: end, binding: createApprovalBinding(action) };
  const confirmation = { id: "confirmation", humanId: "owner", decision: "confirm" as const, confirmedAt: t0, proposalDigest: hashDelegationProposal(p), approvals: [approval] };
  const established = establishDelegation(p, confirmation, host); expect(established.state).toBe("authority_established");
  const delegation = established.delegation!; host.establishedDigests = { grant: delegation.digest };
  const evidence: StandingEvidence[] = conditional ? [{ id: "observation", dependencyId: "state", sourceId: "source", delegationDigest: delegation.digest, action: createApprovalBinding(action),
    status: "observed", observedAt: t0, reference: { kind: "local_artifact", ref: "source.json" }, document: deployment ? { environment: "staging" } : { price: 420 } }] : [];
  const issuance = issueRevalidatedPermit({ delegation, action, host, evidence });
  expect(issuance.governance.finalDecision, issuance.governance.reasonForDecision).toBe("allowed_by_aag"); expect(issuance.basis).toBeDefined();
  const permit = issuance.governance.permit!, basis = issuance.basis!;
  const request: ExecutionRevalidationRequest = { permit, basis, action: structuredClone(permit.allowedAction), delegation, host: { ...host, now: t1 },
    issuedBasisDigests: { [permit.id]: basis.digest }, authorityObservation: { id: "authority-read", observedAt: t1, reference: "authority.json", revision: "r2" },
    evidence: evidence.map(e => ({ ...e, id: "fresh-observation", observedAt: t1 })) };
  return { request, issuance };
}

describe("execution boundary", () => {
  it("revalidates a positive flight case with a capped horizon and reconstructable receipt", () => {
    const { request, issuance } = fixture(), { result, receipt } = revalidateExecutionWithReceipt(request);
    expect(result.state).toBe("execution_revalidated"); expect(result.executionValidUntil).toBe("2026-09-30T10:00:06.100Z");
    expect(result.consequence).toBe("not_observed"); expect(receipt.previousReceiptHash).toBe(issuance.receipt.receiptHash);
    expect(receipt.metadata?.executionRevalidation).toEqual(result);
    expect(receipt.metadata?.executionEvidence).toMatchObject({ standingEvidence: request.evidence, authority: request.host });
    expect(revalidateExecution(structuredClone(request))).toEqual(result);
  });
  it.each(["revoked", "expired", "defeated", "missing", "stale", "future", "receiver", "origin", "history", "old-history"])("blocks existing permit after %s", kind => {
    const { request: r } = fixture(kind === "expired" ? false : true);
    if (kind === "revoked") r.host.revocations = [revokeDelegation(r.delegation, { id: "stop", humanId: "owner", text: "Stop", expressedAt: t1 }, r.host)];
    if (kind === "expired") r.host.now = end;
    if (kind === "defeated") r.evidence[0]!.document = { price: 780 };
    if (kind === "missing") r.evidence = [];
    if (kind === "stale") r.evidence[0]!.observedAt = t0;
    if (kind === "future") r.evidence[0]!.observedAt = "2026-09-30T10:00:07.000Z";
    if (kind === "receiver") r.host.delegateId = "other";
    if (kind === "origin") r.host.authorityMap.roles = [];
    if (kind === "history") Reflect.deleteProperty(r.host, "revocations");
    if (kind === "old-history") r.authorityObservation.observedAt = t0;
    const result = revalidateExecution(r);
    expect(result.state).toBe(["missing", "stale", "future", "history", "old-history"].includes(kind) ? "execution_unresolved" : "execution_defeated");
    expect(result.executionValidUntil).toBeUndefined();
    if (kind === "revoked" || kind === "defeated") expect(bindActionToPermit(r.action, r.permit, { now: t1 }).allowed).toBe(true);
  });
  it("defeats deployment when the current environment becomes production", () => {
    const { request } = fixture(true, true); request.evidence[0]!.document = { environment: "production" };
    expect(revalidateExecution(request).state).toBe("execution_defeated");
  });
  it("revalidates unconditional authority without inventing standing evidence", () => {
    const { request } = fixture(false); expect(request.basis.standing).toBeUndefined();
    const result = revalidateExecution(request); expect(result.state).toBe("execution_revalidated"); expect(result.standing).toBeUndefined();
  });
  it.each(["actionType", "tool", "target", "metadata", "userRequest", "id"])("rejects exact action mutation: %s", field => {
    const { request } = fixture();
    if (field === "metadata") request.action.metadata = { amount: 1000 }; else Object.assign(request.action, { [field]: "changed" });
    const result = revalidateExecution(request); expect(result.state).toBe("execution_defeated");
    expect(result.findings.some(f => f.code === "action_hash_mismatch" || f.code === "execution_action_binding_mismatch")).toBe(true);
  });
  it("rejects another permit and an altered permit expiry", () => {
    for (const field of ["id", "expiresAt"]) {
      const { request } = fixture(); Object.assign(request.permit, { [field]: field === "id" ? "other" : end });
      expect(revalidateExecution(request).findings[0]!.code).toBe("issuance_basis_mismatch");
    }
  });
  it("does not let a renewed delegation repair an old permit", () => {
    const { request: r } = fixture();
    const renewed = establishDelegation(r.delegation.proposal, { ...r.delegation.confirmation, id: "fresh-confirmation", confirmedAt: t1 }, r.host).delegation!;
    r.delegation = renewed; r.host.establishedDigests = { grant: renewed.digest }; r.evidence[0]!.delegationDigest = renewed.digest;
    expect(revalidateExecution(r).state).toBe("execution_defeated");
  });
  it.each(["revocation", "expiry", "standing", "evidence", "horizon", "action", "permit", "forged"])("rejects successful result replay after %s", attack => {
    const { request: r } = fixture(), previous = revalidateExecution(r); expect(previous.state).toBe("execution_revalidated");
    if (attack === "revocation") r.host.revocations = [revokeDelegation(r.delegation, { id: "stop", humanId: "owner", text: "Stop", expressedAt: t1 }, r.host)];
    if (attack === "expiry") r.host.now = end;
    if (attack === "standing") r.evidence[0]!.document = { price: 780 };
    if (attack === "evidence") r.evidence = [];
    if (attack === "horizon") r.host.now = previous.executionValidUntil!;
    if (attack === "action") r.action.target = "other";
    if (attack === "permit") r.permit.id = "other";
    if (attack === "forged") { previous.executionValidUntil = end; const { digest, ...body } = previous; previous.digest = sha256Stable(body); }
    expect(verifyExecutionRevalidation(previous, r)).toBe(false);
  });
  it.each([undefined, NaN, Infinity, -0, Object.assign([], { value: 420 }), new Date()])("rejects noncanonical evidence %#", value => {
    const { request } = fixture(); request.evidence[0]!.document = { price: value } as never;
    expect(() => revalidateExecution(request)).toThrow();
  });
  it("will not accept a successful object instead of a fresh request", () => {
    const { request } = fixture(); const prior = revalidateExecution(request);
    expect(() => revalidateExecution(prior as never)).toThrow();
    request.evidence = [];
    expect(revalidateExecution(Object.assign(request, { state: "execution_revalidated" })).state).toBe("execution_unresolved");
  });
  it("requires a registered issuance basis and cannot remove required standing", () => {
    const { request: r } = fixture(); r.issuedBasisDigests = {};
    expect(revalidateExecution(r).state).toBe("execution_defeated");
    delete r.basis.standing; const { digest, ...body } = r.basis; r.basis.digest = sha256Stable(body);
    r.issuedBasisDigests = { [r.permit.id]: r.basis.digest };
    expect(revalidateExecution(r).findings[0]!.code).toBe("issuance_standing_missing");
  });
  it("still checks expired authority if a malformed longer permit was registered", () => {
    const { request: r } = fixture(false); r.permit.expiresAt = "2026-09-30T12:00:00.000Z";
    r.basis.validUntil = r.permit.expiresAt; r.basis.permitDigest = sha256Stable(r.permit);
    const { digest, ...body } = r.basis; r.basis.digest = sha256Stable(body); r.issuedBasisDigests = { [r.permit.id]: r.basis.digest };
    r.host.now = end; r.authorityObservation.observedAt = end;
    expect(bindActionToPermit(r.action, r.permit, { now: end }).allowed).toBe(true);
    expect(revalidateExecution(r).findings[0]!.code).toBe("execution_authority_invalid");
  });
  it("documents the trusted-host completeness boundary without claiming to detect omissions", () => {
    const { request } = fixture();
    const revocation = revokeDelegation(request.delegation, { id: "stop", humanId: "owner", text: "Stop", expressedAt: t1 }, request.host);
    request.host.revocations = [revocation]; expect(revalidateExecution(request).state).toBe("execution_defeated");
    request.host.revocations = []; expect(revalidateExecution(request).state).toBe("execution_revalidated");
  });
});


describe("execution horizon and issuance integrity", () => {
  it.each(["delegation", "window", "condition", "evidence", "authority", "delay"])("takes the earliest %s horizon", kind => {
    const short = "2026-09-30T10:00:06.020Z";
    const { request: r } = fixture(true, false, p => {
      if (kind === "delegation") p.expiresAt = short;
      if (kind === "window") p.activeWindows = [{ startsAt: t0, endsAt: short }];
      if (kind === "condition") p.currentStanding!.conditions[0]!.validUntil = short;
      if (kind === "delay") p.executionRevalidation!.maxExecutionDelayMs = 20;
    });
    if (kind === "evidence") r.evidence[0]!.validUntil = short;
    if (kind === "authority") r.authorityObservation.observedAt = "2026-09-30T10:00:05.020Z";
    expect(revalidateExecution(r).executionValidUntil).toBe(short);
  });
  it("cannot extend the old permit horizon using newer favorable evidence", () => {
    const { request: r } = fixture(); r.host.now = "2026-09-30T10:00:59.950Z";
    r.authorityObservation.observedAt = r.host.now; r.evidence[0]!.observedAt = r.host.now;
    expect(revalidateExecution(r).executionValidUntil).toBe("2026-09-30T10:01:00.000Z");
    r.host.now = "2026-09-30T10:01:00.000Z";
    expect(revalidateExecution(r).state).toBe("execution_defeated");
  });
  it("rejects future authority observations and the exact freshness boundary", () => {
    const { request: r } = fixture(); r.authorityObservation.observedAt = "2026-09-30T10:00:07.000Z";
    expect(revalidateExecution(r).state).toBe("execution_unresolved");
    r.authorityObservation.observedAt = "2026-09-30T10:00:05.000Z";
    expect(revalidateExecution(r).state).toBe("execution_unresolved");
  });
  it("rejects mutation of confirmed execution tolerances", () => {
    const { request: r } = fixture(); r.delegation.proposal.executionRevalidation!.maxEvidenceAgeMs = 1_000_000;
    expect(revalidateExecution(r).state).toBe("execution_defeated");
    lineage(r.delegation.proposal);
    expect(establishDelegation(r.delegation.proposal, r.delegation.confirmation, r.host).state).toBe("authority_rejected");
  });
  it("keeps fresh permit issuance behind current authority and standing", () => {
    const { request: r } = fixture(); r.evidence[0]!.document = { price: 780 };
    expect(issueRevalidatedPermit({ delegation: r.delegation, action: r.action, host: r.host, evidence: r.evidence }).basis).toBeUndefined();
    r.host.revocations = [revokeDelegation(r.delegation, { id: "stop", humanId: "owner", text: "Stop", expressedAt: t1 }, r.host)];
    const denied = issueRevalidatedPermit({ delegation: r.delegation, action: r.action, host: r.host, evidence: [] });
    expect(denied.basis).toBeUndefined(); expect(denied.governance.permit).toBeUndefined();
  });
  it("cannot forge a favorable revalidation from a defeated result", () => {
    const { request: r } = fixture(); r.evidence[0]!.document = { price: 780 };
    const result = revalidateExecution(r); result.state = "execution_revalidated"; result.executionValidUntil = end;
    const { digest, ...body } = result; result.digest = sha256Stable(body);
    expect(verifyExecutionRevalidation(result, r)).toBe(false);
  });
});
