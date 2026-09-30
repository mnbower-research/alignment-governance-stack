import { describe, expect, it } from "vitest";
import { sha256Stable } from "@alignment-governance-stack/runtime-binding";
import type { AgentActionProposal } from "@alignment-governance-stack/shared-types";
import { createApprovalBinding, delegationMaterialPaths, establishDelegation, hashDelegationProposal, revokeDelegation,
  evaluateCurrentStanding, verifyCurrentStanding } from "../index.js";
import type { DelegationProposal, DelegationHostContext, EvaluateCurrentStandingInput, StandingPredicate } from "../index.js";

const now = "2026-09-30T09:00:00.000Z", end = "2026-09-30T10:00:00.000Z";
function lineage(p: DelegationProposal): void {
  const { provenance, ...body } = p;
  p.provenance = Object.fromEntries(delegationMaterialPaths(body).map(path => [path,
    { kind: "explicit_expression", sourceId: "request", pointer: "/text" }]));
}
function fixture(predicate: StandingPredicate = { operator: "lte", value: 500 }, document: unknown = { price: 420 }, deployment = false): EvaluateCurrentStandingInput {
  const action: AgentActionProposal = { id: "flight", userRequest: "Buy flight AB123 only if its total is at most 500 USD.",
    tool: "airline.purchase", actionType: "purchase_flight", target: "AB123", environment: "production", reversible: false,
    externalFacing: true, dataSensitivity: "low", requiresApproval: true, knownApproval: false,
    metadata: { flight: "AB123", currency: "USD", maximumTotal: 500, account: "approved-account" } };
  if (deployment) Object.assign(action, { id: "deployment", userRequest: "Deploy service to staging only.", tool: "ci.deploy", actionType: "deploy_release", target: "service",
    environment: "staging", metadata: { service: "service", release: "v1" } });
  const host: DelegationHostContext = { now, humanId: "owner", sourceIds: ["airline"], minimumConsequence: "high", revocations: [],
    authorityMap: { id: "origin", name: "Owner", version: "1", roles: [{ id: "owner", label: "Owner",
      scopes: [{ id: "flight", tool: action.tool, actionType: action.actionType, targetIncludes: action.target }] }] } };
  const proposal: DelegationProposal = { version: "delegation-proposal/v1", id: "grant", expression: { id: "request", humanId: "owner", text: action.userRequest, expressedAt: now },
    intent: { id: "intent", status: "provisional", expressionId: "request", objective: "Buy AB123 within budget", parameters: {}, preferences: {}, constraints: [], unresolved: [], confidence: 1 },
    delegateId: "buyer", consequence: "high", permittedActions: [action], prohibitedActionTypes: [], discretion: "none", delegationRights: "none",
    approvalRequirement: "confirmed_exact_actions", standing: false, validFrom: now, expiresAt: end, activeWindows: [], revocationCondition: "human_revocation_or_host_withdrawal", provenance: {},
    currentStanding: { version: "standing-contract/v1", dependencies: [{ id: "price", sourceId: "airline", pointer: deployment ? "/environment" : "/price", maxAgeMs: 60_000 }],
      conditions: [{ id: "budget", actionId: action.id, dependencyId: "price", predicate }] } };
  lineage(proposal);
  const approval = { id: "approval", approverId: "owner", approverRoleId: "owner", approvedAt: now, expiresAt: end, binding: createApprovalBinding(action) };
  const confirmation = { id: "event", humanId: "owner", proposalDigest: hashDelegationProposal(proposal), decision: "confirm" as const, confirmedAt: now, approvals: [approval] };
  const established = establishDelegation(proposal, confirmation, host);
  expect(established.state, established.reasons.join(" ")).toBe("authority_established");
  const delegation = established.delegation!;
  return { delegation, action: structuredClone(action), host: { ...host, delegateId: "buyer", establishedDigests: { grant: delegation.digest } },
    evidence: [{ id: "quote", sourceId: "airline", dependencyId: "price", delegationDigest: delegation.digest, action: createApprovalBinding(action),
      status: "observed", observedAt: now, reference: { kind: "local_artifact", ref: "quote.json" }, document: document as never }] };
}

describe("Current Standing", () => {
  it.each([[420, "standing_valid"], [500, "standing_valid"], [780, "standing_defeated"]])("flight total %s yields %s", (price, expected) => {
    const input = fixture(undefined, { price }); const result = evaluateCurrentStanding(input);
    expect(result.state).toBe(expected);
    if (expected === "standing_valid") expect(result.standingValidUntil).toBe("2026-09-30T09:01:00.000Z");
    else expect(result.standingValidUntil).toBeUndefined();
  });
  it.each(["staging", "production"])("deployment environment %s", environment => {
    const result = evaluateCurrentStanding(fixture({ operator: "eq", value: "staging" }, { environment }, true));
    expect(result.state).toBe(environment === "staging" ? "standing_valid" : "standing_defeated");
  });
  it.each(["missing", "stale", "future", "unresolved", "wrong-source", "wrong-delegation", "wrong-action", "conflicting", "wrong-type", "absent-value"])("fails closed on %s evidence", attack => {
    const input = fixture(), e = input.evidence[0]!;
    if (attack === "missing") input.evidence = [];
    if (attack === "stale") input.host.now = "2026-09-30T09:01:00.000Z";
    if (attack === "future") e.observedAt = "2026-09-30T09:00:01.000Z";
    if (attack === "unresolved") e.status = "unresolved";
    if (attack === "wrong-source") e.sourceId = "attacker";
    if (attack === "wrong-delegation") e.delegationDigest = "another";
    if (attack === "wrong-action") e.action.actionHash = "another";
    if (attack === "conflicting") input.evidence.push({ ...e, id: "other", document: { price: 780 } });
    if (attack === "wrong-type") e.document = { price: "420" };
    if (attack === "absent-value") e.document = {};
    expect(evaluateCurrentStanding(input).state).toBe("standing_unresolved");
  });
  it.each(["revoked", "expired", "receiver", "action", "origin"])("favorable evidence cannot repair %s authority", attack => {
    const input = fixture();
    if (attack === "revoked") input.host.revocations = [revokeDelegation(input.delegation, { id: "stop", humanId: "owner", text: "Stop", expressedAt: now }, input.host)];
    if (attack === "expired") input.host.now = end;
    if (attack === "receiver") input.host.delegateId = "other";
    if (attack === "action") input.action.target = "different flight";
    if (attack === "origin") input.host.authorityMap.roles = [];
    expect(evaluateCurrentStanding(input).state).toBe("standing_defeated");
  });
  it.each(["mutate", "remove", "add"])("rejects post-confirmation condition %s", attack => {
    const input = fixture(), p = input.delegation.proposal;
    if (attack === "mutate") p.currentStanding!.conditions[0]!.predicate = { operator: "lte", value: 1000 };
    if (attack === "remove") delete p.currentStanding;
    if (attack === "add") p.currentStanding!.conditions.push({ ...p.currentStanding!.conditions[0]!, id: "extra" });
    lineage(p);
    expect(establishDelegation(p, input.delegation.confirmation, input.host).state).toBe("authority_rejected");
    expect(evaluateCurrentStanding(input).state).toBe("standing_defeated");
  });
  it("rejects unsupported operators even with a fresh matching digest", () => {
    const input = fixture(), p = input.delegation.proposal;
    Object.assign(p.currentStanding!.conditions[0]!.predicate, { operator: "eval" }); lineage(p);
    expect(establishDelegation(p, { ...input.delegation.confirmation, proposalDigest: hashDelegationProposal(p) }, input.host).state).toBe("authority_rejected");
  });
  it.each([NaN, Infinity, undefined, () => 420, Object.assign([], { price: 420 }), new Date(), new Array(1)])("rejects noncanonical evidence %#", bad => {
    const input = fixture(); input.evidence[0]!.document = bad as never;
    expect(() => evaluateCurrentStanding(input)).toThrow();
  });
  it("distinguishes externally supplied evidence from local structural resolution", () => {
    const input = fixture();
    expect(evaluateCurrentStanding(input).conditions[0]!.resolution).toBe("local_resolved");
    input.evidence[0]!.reference.kind = "external_source";
    expect(evaluateCurrentStanding(input).conditions[0]!.resolution).toBe("external_supplied");
    input.evidence[0]!.reference.kind = "unresolved";
    expect(evaluateCurrentStanding(input).state).toBe("standing_unresolved");
  });
  it("reproduces exact results and rejects replay or self-rehashed horizon extension", () => {
    const input = fixture(), result = evaluateCurrentStanding(input);
    expect(evaluateCurrentStanding(structuredClone(input))).toEqual(result);
    expect(verifyCurrentStanding(result, input)).toBe(true);
    for (const attack of ["action", "delegation", "evidence", "time", "horizon"]) {
      const next = structuredClone(input), changed = structuredClone(result);
      if (attack === "action") next.action.tool = "different";
      if (attack === "delegation") next.delegation.digest = "other";
      if (attack === "evidence") next.evidence[0]!.document = { price: 780 };
      if (attack === "time") next.host.now = "2026-09-30T09:01:00.000Z";
      if (attack === "horizon") { changed.standingValidUntil = end; const { digest, ...body } = changed; changed.digest = sha256Stable(body); }
      expect(verifyCurrentStanding(changed, next), attack).toBe(false);
    }
  });
  it("caps horizon at an earlier evidence expiry", () => {
    const input = fixture(); input.evidence[0]!.validUntil = "2026-09-30T09:00:20.000Z";
    expect(evaluateCurrentStanding(input).standingValidUntil).toBe(input.evidence[0]!.validUntil);
  });
  it.each([
    [{ operator: "gte", value: 400 }, { price: 420 }, "standing_valid"],
    [{ operator: "neq", value: "production" }, { price: "staging" }, "standing_valid"],
    [{ operator: "in", values: ["approved-account"] }, { price: "approved-account" }, "standing_valid"],
    [{ operator: "exists" }, { price: null }, "standing_valid"],
    [{ operator: "absent" }, {}, "standing_valid"],
    [{ operator: "exists" }, {}, "standing_defeated"],
  ] as const)("evaluates bounded operator %#", (predicate, document, expected) => {
    expect(evaluateCurrentStanding(fixture(predicate as StandingPredicate, document)).state).toBe(expected);
  });
});


describe("standing horizon and contract boundaries", () => {
  it.each(["condition", "delegation", "active-window"])("caps the horizon at %s", kind => {
    const input = fixture(), p = input.delegation.proposal;
    const short = "2026-09-30T09:00:15.000Z";
    if (kind === "condition") p.currentStanding!.conditions[0]!.validUntil = short;
    if (kind === "delegation") p.expiresAt = short;
    if (kind === "active-window") p.activeWindows = [{ startsAt: now, endsAt: short }];
    lineage(p);
    const confirmed = { ...input.delegation.confirmation, proposalDigest: hashDelegationProposal(p) };
    const d = establishDelegation(p, confirmed, input.host).delegation!;
    input.delegation = d; input.host.establishedDigests = { grant: d.digest }; input.evidence[0]!.delegationDigest = d.digest;
    expect(evaluateCurrentStanding(input).standingValidUntil).toBe(short);
  });
  it("does not claim standing for a legacy delegation without conditions", () => {
    const input = fixture(), p = input.delegation.proposal; delete p.currentStanding; lineage(p);
    const d = establishDelegation(p, { ...input.delegation.confirmation, proposalDigest: hashDelegationProposal(p) }, input.host).delegation!;
    input.delegation = d; input.host.establishedDigests = { grant: d.digest }; input.evidence = [];
    expect(evaluateCurrentStanding(input).state).toBe("standing_unresolved");
  });
  it("cannot infer nonexistence from missing evidence", () => {
    const input = fixture({ operator: "absent" }, {}); input.evidence = [];
    expect(evaluateCurrentStanding(input).state).toBe("standing_unresolved");
  });
  it("rejects unknown sources even when their supplied identity matches the dependency", () => {
    const input = fixture(); input.host.sourceIds = [];
    expect(evaluateCurrentStanding(input).state).toBe("standing_unresolved");
  });
  it("retains evidence substitution in the digest even when both observations satisfy conditions", () => {
    const input = fixture(), before = evaluateCurrentStanding(input);
    input.evidence[0]!.document = { price: 421 };
    const after = evaluateCurrentStanding(input);
    expect(after.state).toBe("standing_valid"); expect(after.digest).not.toBe(before.digest);
    expect(verifyCurrentStanding(before, input)).toBe(false);
  });
});
