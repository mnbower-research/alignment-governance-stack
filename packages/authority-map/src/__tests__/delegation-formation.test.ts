import { describe, expect, it } from "vitest";
import type { AgentActionProposal } from "@alignment-governance-stack/shared-types";
import { createApprovalBinding, validateApproval, delegationFormationState, delegationMaterialPaths, establishDelegation,
  hashDelegationProposal, currentDelegationState, revokeDelegation, validateDelegatedAction } from "../index.js";
import type { DelegationProposal, DelegationHostContext, DelegationConfirmation, CurrentDelegationContext, EstablishedDelegation } from "../index.js";

const now = "2026-09-30T09:00:00.000Z", end = "2026-10-02T12:00:00.000Z";
function action(type = "purchase_coffee"): AgentActionProposal {
  return { id: "coffee", userRequest: "Buy one normal coffee for at most five dollars.", tool: "cafe.purchase", actionType: type,
    target: "cafe/order", environment: "production", reversible: false, externalFacing: true, dataSensitivity: "low",
    requiresApproval: true, knownApproval: false, metadata: { quantity: 1, maxPrice: 5, preference: "black coffee" } };
}
function host(): DelegationHostContext {
  return { now, revocations: [], humanId: "owner", minimumConsequence: "low", sourceIds: ["coffee-preference", "interpretation"], authorityMap: {
    id: "origin", name: "Originating human authority", version: "1", roles: [{ id: "owner-role", label: "Owner",
      scopes: [{ id: "coffee", tool: "cafe.purchase", actionType: "purchase_coffee", targetIncludes: "cafe/order" }] }] } };
}
function lineage(p: DelegationProposal): DelegationProposal {
  const { provenance: _, ...material } = p;
  p.provenance = Object.fromEntries(delegationMaterialPaths(material).map(path => [path,
    { kind: "explicit_expression" as const, sourceId: p.expression.id, pointer: "/text" }]));
  return p;
}
function proposal(): DelegationProposal {
  return lineage({ version: "delegation-proposal/v1", id: "coffee-grant", expression: { id: "request", humanId: "owner", text: "Buy one coffee.", expressedAt: now },
    intent: { id: "interpretation", status: "provisional", expressionId: "request", objective: "Obtain coffee", parameters: { quantity: 1 },
      preferences: { coffee: "black" }, constraints: ["budget five dollars"], unresolved: [], confidence: 1 }, delegateId: "agent",
    consequence: "low", permittedActions: [action()], prohibitedActionTypes: ["delete_data"], discretion: "none", delegationRights: "none",
    approvalRequirement: "confirmed_exact_actions", standing: false, validFrom: now, expiresAt: end, activeWindows: [],
    revocationCondition: "human_revocation_or_host_withdrawal", provenance: {} });
}
function confirm(p: DelegationProposal): DelegationConfirmation {
  return { id: "human-confirmation", humanId: "owner", proposalDigest: hashDelegationProposal(p), confirmedAt: now, decision: "confirm",
    approvals: p.permittedActions.map((a,i) => ({ id: `approval-${i}`, approverId: "owner", approverRoleId: "owner-role", approvedAt: now,
      expiresAt: end, binding: createApprovalBinding(a) })) };
}
function current(d: EstablishedDelegation): CurrentDelegationContext {
  return { ...host(), delegateId: "agent", establishedDigests: { [d.proposal.id]: d.digest }, revocations: [] };
}
function establish(p = proposal()): EstablishedDelegation {
  const result = establishDelegation(p, confirm(p), host());
  expect(result.state, result.reasons.join(" ")).toBe("authority_established");
  return result.delegation!;
}

describe("deterministic delegation formation", () => {
  it("records vague task initiation and explicit missing-information clarification without purchase authority", () => {
    const p = proposal(); p.expression.text = "Run to the store.";
    p.permittedActions = [];
    expect(delegationFormationState(p.expression)).toBe("task_initiated");
    p.intent.unresolved = ["items", "quantity", "budget", "substitutions", "preferences"].map(id => ({ id, kind: "missing_information", question: `Specify ${id}` }));
    lineage(p);
    expect(delegationFormationState(p.expression,p.intent)).toBe("clarification_required");
    expect(establishDelegation(p,confirm(p),host()).state).toBe("clarification_required");
  });
  it("requires confirmation even with confidence one and seemingly explicit expression", () => {
    const p=proposal();
    expect(delegationFormationState(p.expression,p.intent)).toBe("interpretation_proposed");
    expect(establishDelegation(p,undefined,host()).state).toBe("confirmation_required");
  });
  it("establishes a bounded instruction and reuses existing downstream approval validation", () => {
    const d=establish();
    expect(validateDelegatedAction(d,action(),current(d))).toMatchObject({ valid:true, decision:"approval_valid", delegationRef:{id:d.proposal.id,digest:d.digest} });
    expect(validateApproval(host().authorityMap,action(),d.confirmation.approvals[0],{now}).valid).toBe(true);
  });
  it("does not allow an inferred additional action under an old confirmation", () => {
    const p=proposal(), c=confirm(p);
    p.permittedActions.push(action("delete_data")); p.discretion="choose_listed_action"; lineage(p);
    expect(establishDelegation(p,c,host()).state).toBe("authority_rejected");
  });
  it("does not authorize arbitrary means from a website objective", () => {
    const p=proposal();p.expression.text="Fix the website.";p.intent.objective="Fix website";lineage(p);
    const d=establish(p);
    for (const type of ["deploy_release","purchase_service","delete_data"]) expect(validateDelegatedAction(d,action(type),current(d)).valid).toBe(false);
  });
  it("review authority never becomes deployment authority", () => {
    const p=proposal();p.permittedActions[0]!.actionType="review_deployment";
    p.permittedActions[0]!.userRequest="Review this production deployment.";lineage(p);
    const h=host();h.authorityMap.roles[0]!.scopes[0]!.actionType="review_deployment";
    const d=establishDelegation(p,confirm(p),h).delegation!;
    expect(validateDelegatedAction(d,{...p.permittedActions[0]!,actionType:"deploy_release"},{...current(d),authorityMap:h.authorityMap}).valid).toBe(false);
  });
  it("retains preference provenance without creating authority", () => {
    const p=proposal();p.intent.preferences={bananas:"slightly green"};lineage(p);
    p.provenance["/intent/preferences/bananas"]={kind:"permitted_preference",sourceId:"coffee-preference",pointer:"/bananas"};
    expect(establishDelegation(p,undefined,host()).state).toBe("confirmation_required");
  });
  it("preserves inferred provenance after explicit confirmation, never relabels it as expression", () => {
    const p=proposal();p.provenance["/intent/objective"]={kind:"inference_awaiting_confirmation",sourceId:"interpretation",pointer:"/objective"};
    expect(establishDelegation(p,undefined,host()).state).toBe("confirmation_required");
    expect(establish(p).proposal.provenance["/intent/objective"]!.kind).toBe("inference_awaiting_confirmation");
  });
  it("represents a weekday standing routine and rejects use outside the listed windows", () => {
    const p=proposal();p.standing=true;p.expression.text="Buy my normal coffee every weekday morning until revoked.";
    p.activeWindows=[{startsAt:now,endsAt:"2026-09-30T10:00:00.000Z"},{startsAt:"2026-10-01T09:00:00.000Z",endsAt:"2026-10-01T10:00:00.000Z"}];lineage(p);
    const d=establish(p);
    expect(currentDelegationState(d,current(d))).toBe("authority_established");
    expect(currentDelegationState(d,{...current(d),now:"2026-09-30T11:00:00.000Z"})).toBe("authority_rejected");
  });
  it("revokes outside a standing window without erasing coffee preferences", () => {
    const p=proposal();p.standing=true;p.activeWindows=[{startsAt:now,endsAt:"2026-09-30T10:00:00.000Z"}];lineage(p);
    const d=establish(p), h={...current(d),now:"2026-09-30T11:00:00.000Z"};
    const before=structuredClone(d.proposal.intent.preferences);
    const revocation=revokeDelegation(d,{id:"stop",humanId:"owner",text:"Stop buying coffee.",expressedAt:h.now},h);
    expect(currentDelegationState(d,{...h,revocations:[revocation]})).toBe("authority_revoked");
    expect(d.proposal.intent.preferences).toEqual(before);
    expect(validateDelegatedAction(d,action(),{...h,revocations:[revocation]}).valid).toBe(false);
  });
  it("expires at the exact boundary and respects future validity", () => {
    const d=establish();expect(currentDelegationState(d,{...current(d),now:end})).toBe("authority_expired");
    const p=proposal();p.validFrom="2026-10-01T09:00:00.000Z";lineage(p);const future=establish(p);
    expect(currentDelegationState(future,current(future))).toBe("authority_rejected");
  });
  it.each(["low","high"] as const)("unresolved authority blocks %s consequence even when explicitly confirmed", consequence => {
    const p=proposal();p.consequence=consequence;p.intent.unresolved=[{id:"who",kind:"authority_uncertainty",question:"Who has authority?"}];lineage(p);
    expect(establishDelegation(p,confirm(p),host()).state).toBe("clarification_required");
  });
  it("allows only explicitly confirmed low-risk discretion over listed alternatives; respects host consequence floor", () => {
    const p=proposal();p.discretion="choose_listed_action";p.intent.unresolved=[{id:"taste",kind:"preference_uncertainty",question:"Which listed coffee?"}];lineage(p);
    expect(establishDelegation(p,confirm(p),host()).state).toBe("authority_established");
    expect(establishDelegation(p,confirm(p),{...host(),minimumConsequence:"high"}).state).toBe("clarification_required");
  });
  it.each(["inference","provenance","receiver","registry","tamper","origin"])("rejects authority laundering: %s", attack => {
    const p=proposal();
    if(attack==="provenance") {delete p.provenance["/delegateId"];expect(establishDelegation(p,confirm(p),host()).state).toBe("authority_rejected");return;}
    if(attack==="inference") {p.permittedActions[0]!.tool="cloud.deploy";lineage(p);expect(establishDelegation(p,confirm(p),host()).state).toBe("authority_rejected");return;}
    const d=establish(p), h=current(d);
    if(attack==="receiver") h.delegateId="other";
    if(attack==="registry") h.establishedDigests={};
    if(attack==="tamper") d.proposal.permittedActions[0]!.metadata={quantity:100};
    if(attack==="origin") h.authorityMap.roles=[];
    expect(validateDelegatedAction(d,action(),h).valid).toBe(false);
  });
  it("rejects altered metadata, target, request and budget without broadening substring authority", () => {
    const d=establish();for(const delta of [{target:"cafe/order/other"},{userRequest:"Buy arbitrary goods"},{metadata:{maxPrice:500}}]) {
      expect(validateDelegatedAction(d,{...action(),...delta},current(d)).valid).toBe(false);
    }
  });
  it("honors human rejection, invalid clocks and approval lifetime", () => {
    const p=proposal(), c=confirm(p);expect(establishDelegation(p,{...c,decision:"reject"},host()).state).toBe("authority_rejected");
    expect(establishDelegation(p,c,{...host(),now:"invalid"}).state).toBe("authority_rejected");
    c.approvals[0]!.expiresAt="2026-09-30T10:00:00.000Z";
    expect(establishDelegation(p,c,host()).state).toBe("authority_rejected");
  });
  it("rejects use before establishment and approval records created after confirmation", () => {
    const p=proposal(), c=confirm(p), later={...host(),now:"2026-09-30T09:05:00.000Z"};
    const d=establishDelegation(p,c,later).delegation!;
    expect(currentDelegationState(d,current(d))).toBe("authority_rejected");
    c.approvals[0]!.approvedAt="2026-09-30T09:01:00.000Z";
    expect(establishDelegation(p,c,later).state).toBe("authority_rejected");
  });
  it("uses stable whole-artifact hashes, rejects non-JSON values", () => {
    const p=proposal();expect(hashDelegationProposal({...p})).toBe(hashDelegationProposal(p));
    p.intent.confidence=Infinity;expect(()=>hashDelegationProposal(p)).toThrow();
  });
});


describe("adversarial establishment integrity", () => {
  it("cannot replay revoked confirmation, but permits a fresh later authority event", () => {
    const p = proposal(), c = confirm(p), d = establish(p);
    const h = { ...current(d), now: "2026-09-30T10:00:00.000Z" };
    const revocation = revokeDelegation(d, { id: "stop", humanId: "owner", text: "Stop", expressedAt: h.now }, h);
    const history = structuredClone([revocation]);
    const later = { ...h, now: "2026-09-30T11:00:00.000Z", revocations: history };
    expect(currentDelegationState(d, later)).toBe("authority_revoked");
    expect(establishDelegation(p, c, later).state).toBe("authority_revoked");
    // Even an artifact recreated by a stale host cannot escape retained revocation.
    const replay = establishDelegation(p, c, { ...later, revocations: [] }).delegation!;
    expect(currentDelegationState(replay, { ...later, establishedDigests: { [p.id]: replay.digest } })).toBe("authority_revoked");
    expect(establishDelegation(p, { ...c, confirmedAt: later.now }, later).state).toBe("authority_revoked");
    expect(establishDelegation(p, { ...c, id: "new-id-only" }, later).state).toBe("authority_revoked");
    const fresh = { ...c, id: "fresh-human-confirmation", confirmedAt: later.now };
    const renewed = establishDelegation(p, fresh, later);
    expect(renewed.state).toBe("authority_established");
    expect(currentDelegationState(renewed.delegation!, { ...later, establishedDigests: { [p.id]: renewed.delegation!.digest } })).toBe("authority_established");
    p.intent.objective = "Different objective";
    expect(establishDelegation(p, fresh, later).state).toBe("authority_rejected");
    expect(history).toEqual([revocation]);
  });

  const malformed: [string, () => unknown][] = [
    ["named array property", () => Object.assign(["budget"], { budget: 5 })],
    ["sparse array", () => new Array(2)],
    ["undefined", () => undefined], ["symbol", () => Symbol("x")], ["function", () => () => 1],
    ["nonfinite", () => Infinity], ["NaN", () => NaN], ["negative zero", () => -0],
    ["custom prototype", () => Object.create({ inherited: true })],
    ["array subclass", () => new (class extends Array {})()],
    ["symbol key", () => ({ [Symbol("hidden")]: true })],
    ["nonenumerable property", () => Object.defineProperty({}, "hidden", { value: 1 })],
    ["accessor", () => Object.defineProperty({}, "value", { enumerable: true, get: () => 1 })],
  ];
  it.each(malformed)("rejects lossy representation: %s", (_, make) => {
    const p = proposal(), c = confirm(p);
    (p.intent.parameters as Record<string, unknown>).attack = make();
    expect(() => hashDelegationProposal(p)).toThrow();
    expect(establishDelegation(p, c, host()).state).toBe("authority_rejected");
  });
  it("rejects malformed array mutation after confirmation and establishment", () => {
    const d = establish();
    Object.assign(d.proposal.intent.constraints, { budget: 500 });
    expect(currentDelegationState(d, current(d))).toBe("authority_rejected");
  });
  it.each(["/does/not/exist", "/toString", "/text/~2", "/text/length"])("rejects unresolved embedded pointer %s", pointer => {
    const p = proposal(); p.provenance["/intent/objective"]!.pointer = pointer;
    expect(establishDelegation(p, confirm(p), host()).state).toBe("authority_rejected");
  });
  it("resolves embedded pointers structurally without claiming semantic entailment", () => {
    for (const pointer of ["", "/text", "/humanId"]) {
      const p = proposal(); p.provenance["/intent/objective"]!.pointer = pointer;
      expect(establishDelegation(p, confirm(p), host()).state).toBe("authority_established");
    }
    const p = proposal(); p.provenance["/intent/objective"]!.sourceId = "wrong";
    expect(establishDelegation(p, confirm(p), host()).state).toBe("authority_rejected");
  });
  it("keeps external pointer resolution host-owned and requires recognized sources", () => {
    const p = proposal();
    p.provenance["/intent/objective"] = { kind: "inference_awaiting_confirmation", sourceId: "interpretation", pointer: "/unresolved/external" };
    const d = establish(p);
    expect(d.proposal.provenance["/intent/objective"]).toEqual(p.provenance["/intent/objective"]);
    expect(establishDelegation(p, confirm(p), { ...host(), sourceIds: [] }).state).toBe("authority_rejected");
    p.provenance["/intent/objective"] = { kind: "inference_awaiting_confirmation", sourceId: p.expression.id, pointer: "/missing" };
    expect(establishDelegation(p, confirm(p), { ...host(), sourceIds: [p.expression.id] }).state).toBe("authority_rejected");
  });
});


describe("post-hardening lifecycle probes", () => {
  const mutations: [string, (p: DelegationProposal) => void][] = [
    ["objective", p => { p.intent.objective = "Anything"; }],
    ["actions", p => { p.permittedActions.push(action()); }],
    ["parameters", p => { p.intent.parameters.quantity = 100; }],
    ["scope", p => { p.permittedActions[0]!.target = "other"; }],
    ["tool", p => { p.permittedActions[0]!.tool = "cloud.deploy"; }],
    ["receiver", p => { p.delegateId = "other"; }],
    ["temporal bounds", p => { p.expiresAt = "2026-10-03T12:00:00.000Z"; }],
    ["delegation rights", p => { Object.assign(p, { delegationRights: "unlimited" }); }],
    ["preferences", p => { p.intent.preferences.coffee = "all goods"; }],
    ["provenance", p => { p.provenance["/intent/objective"]!.pointer = "/humanId"; }],
  ];
  it.each(mutations)("invalidates confirmed envelope mutation: %s", (_, mutate) => {
    const p = proposal(), c = confirm(p); mutate(p);
    expect(establishDelegation(p, c, host()).state).toBe("authority_rejected");
    const d = establish(); mutate(d.proposal);
    expect(currentDelegationState(d, current(d))).toBe("authority_rejected");
  });
  it("rejects confirmation identity and approval-reference mutation", () => {
    for (const field of ["id", "humanId", "approval"] as const) {
      const d = establish();
      if (field === "approval") d.confirmation.approvals[0]!.id = "different";
      else d.confirmation[field] = "different";
      expect(currentDelegationState(d, current(d))).toBe("authority_rejected");
    }
  });
  it("does not renew expiry or reverse rejection by replaying a human decision", () => {
    const p = proposal(), c = confirm(p);
    expect(establishDelegation(p, c, { ...host(), now: end }).state).toBe("authority_rejected");
    expect(establishDelegation(p, { ...c, decision: "reject" }, { ...host(), now: "2026-09-30T10:00:00Z" }).state).toBe("authority_rejected");
  });
  it("fails closed when host omits revocation history", () => {
    const h = host(); Reflect.deleteProperty(h, "revocations");
    const p = proposal(); expect(establishDelegation(p, confirm(p), h).state).toBe("authority_rejected");
  });
  it("rejects malformed actual action parameters before exact-action comparison", () => {
    const d = establish(), a = action();
    Object.defineProperty(a.metadata, "hidden", { value: 500 });
    expect(validateDelegatedAction(d, a, current(d)).valid).toBe(false);
  });
});
