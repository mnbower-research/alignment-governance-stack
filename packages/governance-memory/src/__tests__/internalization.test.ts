import { describe, expect, it } from "vitest";
import { createGovernanceReceipt, hashGovernanceReceipt } from "@alignment-governance-stack/receipts";
import { assertCanonicalDelegationJson, createApprovalBinding, delegationMaterialPaths, establishDelegation, hashDelegationProposal, revokeDelegation,
  validateDelegatedAction, validateApproval, evaluateCurrentStanding } from "@alignment-governance-stack/authority-map";
import type { DelegationProposal, CurrentDelegationContext } from "@alignment-governance-stack/authority-map";
import { evaluateGovernedRuntimeActionWithReceipt, issueRevalidatedPermit, revalidateExecution } from "@alignment-governance-stack/governance-core";
import { bindActionToPermit, sha256Stable, stableStringify } from "@alignment-governance-stack/runtime-binding";
import type { AgentActionProposal } from "@alignment-governance-stack/shared-types";
import { createMemoryObservation, evaluateInternalization, verifyInternalization, proposeMemoryAssistedIntent } from "../index.js";
import type { InternalizationInput, MemoryObservationContent } from "../index.js";

const start = Date.parse("2026-09-01T07:30:00.000Z"), now = new Date(start + 301 * 60_000).toISOString(), end = "2026-09-03T00:00:00.000Z";
const time = (i: number) => new Date(start + i * 60_000).toISOString();
const recipe = { size: "large", cream: 2, sugar: 0 };
const action: AgentActionProposal = { id: "coffee", userRequest: "Buy one coffee for at most 8 dollars.", tool: "cafe.purchase", actionType: "purchase_coffee", target: "Vendor A",
  environment: "production", reversible: true, externalFacing: true, dataSensitivity: "low", requiresApproval: true, knownApproval: true,
  metadata: { quantity: 1, maxSpend: 8, recipe, reviewedForExternalRelease: true } };
const map = { id: "map", name: "Owner", version: "1", roles: [{ id: "owner", label: "Owner", scopes: [{ id: "coffee", tool: action.tool, actionType: action.actionType }] }] };
const approval = { id: "approval", approverId: "alice", approverRoleId: "owner", approvedAt: time(0), expiresAt: end, binding: createApprovalBinding(action) };
const governed = evaluateGovernedRuntimeActionWithReceipt({ proposal: action, runtimeAction: action, authorityMap: map, approvalEvidence: approval, validationOptions: { now: time(0) }, receiptOptions: { createdAt: time(0) } });
function content(id: string, changes: Partial<MemoryObservationContent> = {}): MemoryObservationContent {
  return { id, category: "preference", subjectId: "alice", contextKey: "office", key: "coffee", value: recipe, classification: "inferred", observedAt: time(0), supersedes: [], predictionConfidence: 0.999, ...changes };
}
function empty(): InternalizationInput { return { observations: [], receipts: [], host: { now, receiptHashes: {}, maxObservationAgeMs: 7 * 86400_000, minInferredSupport: 3 } }; }
function add(input: InternalizationInput, records: MemoryObservationContent[]) {
  const timestamp = records.map(r => r.observedAt).sort().at(-1)!;
  const interaction = evaluateGovernedRuntimeActionWithReceipt({ proposal: action, runtimeAction: action, authorityMap: map, approvalEvidence: approval, validationOptions: { now: timestamp }, receiptOptions: { createdAt: timestamp } });
  expect(interaction.governance.finalDecision).toBe("execution_allowed");
  const receipt = createGovernanceReceipt({ governancePacket: interaction.governance, id: `receipt-${input.receipts.length}`, createdAt: timestamp,
    ...(input.receipts.length ? { previousReceiptHash: input.receipts.at(-1)!.receiptHash } : {}),
    metadata: { memoryObservations: records, executionObservation: { classification: "synthetic_fixture", outcome: "successful_purchase" } } });
  input.receipts.push(receipt); input.host.receiptHashes = { ...input.host.receiptHashes, [receipt.id]: receipt.receiptHash };
  records.forEach((_, i) => input.observations.push(createMemoryObservation(receipt, `/metadata/memoryObservations/${i}`)));
}
function history(count = 3): InternalizationInput {
  const input = empty();
  for (let i = 0; i < count; i++) add(input, [content(`preference-${i}`, { observedAt: time(i) }),
    content(`procedure-${i}`, { category: "procedure", key: "coffee-procedure", value: { vendor: "Vendor A", tool: "cafe.purchase", steps: ["order", "collect"] }, observedAt: time(i) }),
    content(`routine-${i}`, { category: "observed_routine", key: "morning-coffee", value: { requestedAround: "07:30", dayType: "weekday" }, observedAt: time(i) })]);
  return input;
}
function assist(input: InternalizationInput, subjectId = "alice", contextKey = "office") {
  return proposeMemoryAssistedIntent({ history: input, subjectId, contextKey, expression: { id: "new-expression", humanId: subjectId, text: "Get me coffee.", expressedAt: now },
    intentId: "interpretation", objective: "Obtain one coffee within current authority", slots: [{ parameter: "recipe", category: "preference", key: "coffee" }, { parameter: "procedure", category: "procedure", key: "coffee-procedure" }] });
}
function grant(input = history()) {
  const assisted = assist(input);
  const p: DelegationProposal = { version: "delegation-proposal/v1", id: "grant", expression: { id: "new-expression", humanId: "alice", text: "Get me coffee.", expressedAt: now },
    intent: assisted.intent, delegateId: "agent", consequence: "high", permittedActions: [structuredClone(action)], prohibitedActionTypes: [], discretion: "none", delegationRights: "none",
    approvalRequirement: "confirmed_exact_actions", standing: true, validFrom: now, expiresAt: end, activeWindows: [], revocationCondition: "human_revocation_or_host_withdrawal", provenance: {},
    executionRevalidation: { maxEvidenceAgeMs: 1000, maxExecutionDelayMs: 100 },
    currentStanding: { version: "standing-contract/v1", dependencies: [{ id: "price", sourceId: "cafe", pointer: "/price", maxAgeMs: 60_000 }],
      conditions: [{ id: "budget", actionId: action.id, dependencyId: "price", predicate: { operator: "lte", value: 8 } }] } };
  const { provenance, ...body } = p;
  p.provenance = Object.fromEntries(delegationMaterialPaths(body).map(path => {
    const parameter = path.split("/")[3];
    const origin = path.startsWith("/intent/parameters/") ? assisted.parameterProvenance[parameter!] : undefined;
    return [path, origin ? { ...origin, pointer: origin.pointer + path.slice(`/intent/parameters/${parameter}`.length) }
      : { kind: "explicit_expression" as const, sourceId: p.expression.id, pointer: "/text" }];
  }));
  const host: CurrentDelegationContext = { now, humanId: "alice", delegateId: "agent", sourceIds: ["cafe", ...Object.values(assisted.parameterProvenance).map(o => o.sourceId)],
    minimumConsequence: "high", revocations: [], establishedDigests: {}, authorityMap: structuredClone(map) };
  const confirmation = { id: "confirm", humanId: "alice", proposalDigest: hashDelegationProposal(p), decision: "confirm" as const, confirmedAt: now, approvals: [approval] };
  const established = establishDelegation(p, confirmation, host); expect(established.state, established.reasons.join(" ")).toBe("authority_established");
  const delegation = established.delegation!; host.establishedDigests = { grant: delegation.digest };
  return { p, host, confirmation, delegation, assisted };
}
function correction(input: InternalizationInput) {
  add(input, [content("correction", { classification: "explicit", value: { size: "large", cream: 0, sugar: 0 }, observedAt: time(300),
    supersedes: input.observations.filter(o => o.category === "preference").map(o => o.id) })]);
}
function cannotAuthorize(run: () => unknown) { try { const result = run() as { valid?: boolean; allowed?: boolean; state?: string }; expect(result.valid).not.toBe(true); expect(result.allowed).not.toBe(true); expect(result.state).not.toBe("authority_established"); expect(result.state).not.toBe("execution_revalidated"); expect(result.state).not.toBe("standing_valid"); } catch (error) { if (error instanceof Error && error.name === "AssertionError") throw error; } }

describe("internalization malformed-input boundary", () => {
  const request = () => ({ history: history(), subjectId: "alice", contextKey: "office", expression: { id: "request", humanId: "alice", text: "Get coffee", expressedAt: now }, intentId: "intent", objective: "Get coffee", slots: [{ parameter: "recipe", category: "preference" as const, key: "coffee" }] });
  const malformedNames: unknown[] = [["__proto__"], ["constructor"], ["prototype"], 7, {}, new String("coffee"), Symbol("coffee"), null, undefined, true, { toString() { throw new Error("Coercion must not run"); } }, "__proto__", "constructor", "prototype", ""];
  it.each(malformedNames.map((value, i) => [i, value] as const))("rejects malformed parameter name %i before returning metrics", (_, value) => {
    const input = request(); input.slots[0]!.parameter = value as never;
    expect(() => proposeMemoryAssistedIntent(input)).toThrow();
  });
  it.each([[7, "7"], ["recipe", "recipe"]])("rejects coerced or exact duplicate keys %j", (first, second) => {
    const input = request(); input.slots = [first, second].map(parameter => ({ parameter: parameter as string, category: "preference", key: "coffee" }));
    expect(() => proposeMemoryAssistedIntent(input)).toThrow();
  });
  it.each(["recipe", "7", "coffee_recipe", "toString"])("returns canonical ordinary objects for accepted string %s", parameter => {
    const input = request(); input.slots[0]!.parameter = parameter;
    const result = proposeMemoryAssistedIntent(input);
    expect(Object.getPrototypeOf(result.intent.parameters)).toBe(Object.prototype);
    expect(Object.hasOwn(result.intent.parameters, parameter)).toBe(true);
    expect(Object.hasOwn(result.intent.parameters, "cream")).toBe(false);
    expect(result.intent.parameters.cream).toBeUndefined();
    expect(() => assertCanonicalDelegationJson(result)).not.toThrow();
    expect(JSON.parse(stableStringify(result))).toEqual(result);
    expect(JSON.parse(JSON.stringify(result))).toEqual(result);
    expect(result.metrics).toEqual({ requestedParameters: 1, suppliedParameters: 1, remainingClarifications: 0 });
  });
  const badTimes: unknown[] = [[now], 2026, {}, new String(now), null, undefined, true, { toString() { return now; } }];
  it.each(badTimes.map((value, i) => [i, value] as const))("rejects non-string timestamps %i at all new boundaries", (_, value) => {
    const input = request(); input.expression.expressedAt = value as never;
    expect(() => proposeMemoryAssistedIntent(input)).toThrow();
    const clock = history(); clock.host.now = value as never;
    expect(() => evaluateInternalization(clock)).toThrow();
    for (const field of ["observedAt", "createdAt"] as const) {
      const receipt = structuredClone(history().receipts[0]!);
      if (field === "createdAt") receipt.createdAt = value as never;
      else (receipt.metadata!.memoryObservations as unknown as MemoryObservationContent[])[0]!.observedAt = value as never;
      // Rehash canonical coercible values, so rejection cannot rely on a stale receipt hash.
      try { assertCanonicalDelegationJson(receipt); receipt.receiptHash = hashGovernanceReceipt(receipt); } catch { /* Noncanonical values must also be rejected. */ }
      expect(() => createMemoryObservation(receipt, "/metadata/memoryObservations/0")).toThrow();
    }
  });
  const cycle: Record<string, unknown> = {}; cycle.self = cycle;
  const malformedMaterial: unknown[] = [Array(1), Object.assign([], { x: 1 }), undefined, NaN, Infinity, -0, new Date(), new Map(), new Set(), new (class Value { x = 1; })(), Object.defineProperty({}, "x", { enumerable: true, get() { throw new Error("Accessor must not run"); } }), Symbol(), Object.defineProperty({}, "x", { value: 1 }), cycle];
  it.each(malformedMaterial.map((value, i) => [i, value] as const))("rejects noncanonical interpretation material %i", (_, value) => {
    const input = request(); input.history.observations[0]!.value = value as never;
    expect(() => proposeMemoryAssistedIntent(input)).toThrow();
  });
});

describe("receipt-bound internalization", () => {
  it("reproduces the complete snapshot independent of receipt and observation input order",()=>{
    const input=history(), before=structuredClone(input), expected=evaluateInternalization(input);
    expect(evaluateInternalization(input)).toEqual(expected);expect(input).toEqual(before);
    input.observations.reverse();input.receipts.reverse();
    expect(evaluateInternalization(input)).toEqual(expected);expect(verifyInternalization(expected,input)).toBe(true);
  });
  it("pairs early/mature/no-request behavior after 300 synthetic governed purchases without new authority", () => {
    expect(governed.governance.finalDecision).toBe("execution_allowed");
    expect(assist(empty()).metrics).toEqual({ requestedParameters: 2, suppliedParameters: 0, remainingClarifications: 2 });
    const input = history(300), snapshot = evaluateInternalization(input), mature = assist(input);
    expect(snapshot.candidates.map(c => c.supportCount)).toEqual([300,300,300]);
    expect(snapshot.recommendations).toHaveLength(1); expect(snapshot.recommendations[0]!.humanReviewRequired).toBe(true);
    expect(mature.metrics).toEqual({ requestedParameters: 2, suppliedParameters: 2, remainingClarifications: 0 });
    expect(mature.intent.status).toBe("provisional"); expect(mature.authorityEffect).toBe("none");
    expect(mature.parameterProvenance.recipe!.kind).toBe("inference_awaiting_confirmation");
    const { p, host } = grant(input);
    expect(establishDelegation(p, undefined, host).state).toBe("confirmation_required");
    expect(validateApproval(map, action, undefined, { now }).valid).toBe(false);
    expect(bindActionToPermit(action, undefined, { now }).allowed).toBe(false);
    expect(() => proposeMemoryAssistedIntent({ history: input, subjectId: "alice", contextKey: "office", expression: { id: "none", humanId: "alice", text: "", expressedAt: now }, intentId: "x", objective: "coffee", slots: [] })).toThrow();
  });
  it("uses distinct evidence classifications and ignores high confidence as support", () => {
    const input = history(1); expect(evaluateInternalization(input).candidates.every(c => c.state === "candidate")).toBe(true);
    const explicit = empty(); add(explicit, [content("explicit", { classification: "explicit", predictionConfidence: 0 })]);
    const candidate = evaluateInternalization(explicit).candidates[0]!;
    expect(candidate.state).toBe("supported"); expect(candidate.explicitSupportCount).toBe(1); expect(candidate.inferredSupportCount).toBe(0);
  });
  it("counts one receipt once despite many copies of the same inferred claim", () => {
    const input = empty(); add(input, Array.from({length: 10}, (_, i) => content(`copy-${i}`)));
    const c = evaluateInternalization(input).candidates[0]!; expect(c.supportCount).toBe(1); expect(c.state).toBe("candidate");
  });
  it("explicit correction defeats repeated inference without deleting or rewriting history", () => {
    const input = history(20), old = evaluateInternalization(input), before = structuredClone(input.observations); correction(input);
    const current = evaluateInternalization(input);
    expect(current.candidates.find(c => c.category === "preference" && (c.value as { cream: number }).cream === 2)!.state).toBe("superseded");
    expect(assist(input).intent.parameters.recipe).toMatchObject({ cream: 0 });
    expect(input.observations.slice(0,before.length)).toEqual(before);
    expect(verifyInternalization(old,input)).toBe(false);
  });
  it("keeps stale correction from resurrecting superseded preference", () => {
    const input = history(); correction(input); input.host.now = "2026-10-01T00:00:00Z";
    expect(assist(input).metrics.suppliedParameters).toBe(0);
    expect(evaluateInternalization(input).candidates.filter(c => c.state === "superseded")).toHaveLength(1);
  });
  it("keeps contextual preferences and principals separate", () => {
    const input = history(); add(input,[content("home",{contextKey:"home",classification:"explicit",value:{size:"small",cream:0,sugar:0}})]);
    expect(assist(input).intent.parameters.recipe).toEqual(recipe);
    expect(assist(input,"alice","home").intent.parameters.recipe).toMatchObject({size:"small"});
    expect(assist(input,"bob").metrics.suppliedParameters).toBe(0);
  });
  it.each(["value","observedAt","classification","subjectId","contextKey","category","supersedes","receiptHash"])("rejects observation tampering and self-rehash: %s", field => {
    const input=history(), o=input.observations[0]!;
    if(field==="receiptHash") o.source.receiptHash="forged";
    else Object.assign(o,{[field]:field==="value"?{cream:99}:field==="observedAt"?time(1):field==="classification"?"explicit":field==="category"?"procedure":field==="supersedes"?["procedure-0"]:"other"});
    const {digest,...body}=o;o.digest=sha256Stable(body);
    expect(()=>evaluateInternalization(input)).toThrow();
  });
  it("rejects rehashed receipt substitution against the trusted inventory", () => {
    const input=history();input.receipts[0]!.reasonForDecision="forged";input.receipts[0]!.receiptHash=hashGovernanceReceipt(input.receipts[0]);
    expect(()=>evaluateInternalization(input)).toThrow();
  });
  it("rejects an explicit correction aimed at unrelated memory", () => {
    const input=history();add(input,[content("bad-correction",{classification:"explicit",supersedes:["procedure-0"],observedAt:time(300)})]);
    expect(()=>evaluateInternalization(input)).toThrow();
  });
  it("marks conflicting current evidence contested, not majority-authorized", () => {
    const input=history();add(input,[content("conflict",{value:{cream:0},observedAt:time(2)})]);
    expect(evaluateInternalization(input).candidates.filter(c=>c.category==="preference").every(c=>c.state==="contested")).toBe(true);
    expect(assist(input).metrics.suppliedParameters).toBe(1);
  });
  it.each([NaN,Infinity,-0,undefined,()=>1,Object.assign([],{value:1})])("rejects noncanonical memory %#", value=>{
    const input=history();input.observations[0]!.value=value as never;expect(()=>evaluateInternalization(input)).toThrow();
  });
  it("does not trust favorable caller-provided candidates or maturity flags",()=>{
    const input=empty();Object.assign(input,{supported:true,candidates:[{state:"supported",value:recipe}]});
    expect(evaluateInternalization(input).candidates).toEqual([]);
    const snapshot=evaluateInternalization(history());snapshot.candidates[0]!.state="superseded";
    const {digest,...body}=snapshot;snapshot.digest=sha256Stable(body);expect(verifyInternalization(snapshot,history())).toBe(false);
  });
});

describe("memory never grants action authority",()=>{
  it("learns a report procedure without adding external publication to a draft-only delegation",()=>{
    const input=empty();
    for(let i=0;i<3;i++) add(input,[content(`report-${i}`,{category:"procedure",key:"report",value:{steps:["gather source","generate draft","save to approved location","publish externally"]},observedAt:time(i)})]);
    const learned=proposeMemoryAssistedIntent({history:input,subjectId:"alice",contextKey:"office",expression:{id:"report-request",humanId:"alice",text:"Draft a report only.",expressedAt:now},intentId:"report-intent",objective:"Draft a report only",slots:[{parameter:"procedure",category:"procedure",key:"report"}]});
    expect(learned.metrics.suppliedParameters).toBe(1);
    const {p,host}=grant();
    const draft={...action,id:"report",userRequest:"Draft a report only.",tool:"files.write",actionType:"draft_report",target:"approved/report.md",externalFacing:false,metadata:{}};
    p.expression={id:"report-request",humanId:"alice",text:"Draft a report only.",expressedAt:now};p.intent=learned.intent;p.permittedActions=[draft];delete p.currentStanding;delete p.executionRevalidation;
    const {provenance,...body}=p;
    p.provenance=Object.fromEntries(delegationMaterialPaths(body).map(path=>[path,path.startsWith("/intent/parameters/procedure")?{...learned.parameterProvenance.procedure!,pointer:"/value"+path.slice("/intent/parameters/procedure".length)}:{kind:"explicit_expression" as const,sourceId:p.expression.id,pointer:"/text"}]));
    host.sourceIds=[learned.parameterProvenance.procedure!.sourceId];host.authorityMap={...map,roles:[{id:"owner",label:"Owner",scopes:[{id:"draft",tool:draft.tool,actionType:draft.actionType}]}]};
    const result=establishDelegation(p,{id:"report-confirm",humanId:"alice",proposalDigest:hashDelegationProposal(p),decision:"confirm",confirmedAt:now,approvals:[{...approval,binding:createApprovalBinding(draft)}]},host);
    expect(result.state,result.reasons.join(" ")).toBe("authority_established");
    host.establishedDigests={grant:result.delegation!.digest};
    expect(validateDelegatedAction(result.delegation!,draft,host).valid).toBe(true);
    expect(validateDelegatedAction(result.delegation!,{...draft,tool:"cms.publish",actionType:"publish_report",externalFacing:true},host).valid).toBe(false);
  });
  it("cannot turn a human rejection into confirmation using memory",()=>{
    const {p,host,confirmation}=grant(history(10));
    expect(establishDelegation(p,{...confirmation,decision:"reject"},host).state).not.toBe("authority_established");
  });
  it.each(["recommendation","candidate","snapshot"])("cannot use %s as authority",kind=>{
    const historyInput=history(), snapshot=evaluateInternalization(historyInput), object=kind==="recommendation"?snapshot.recommendations[0]:kind==="candidate"?snapshot.candidates[0]:snapshot;
    const {p,host}=grant(historyInput);
    expect(establishDelegation(p,object as never,host).state).not.toBe("authority_established");
    cannotAuthorize(()=>validateApproval(map,action,object as never,{now}));
    cannotAuthorize(()=>bindActionToPermit(action,object as never,{now}));
    cannotAuthorize(()=>evaluateCurrentStanding(object as never));
    cannotAuthorize(()=>revalidateExecution(object as never));
  });
  it("preserves preference, procedure, routine and receipt history after revocation",()=>{
    const input=history(), before=evaluateInternalization(input), {delegation,host}=grant(input);
    host.revocations=[revokeDelegation(delegation,{id:"stop",humanId:"alice",text:"I quit drinking coffee. Stop buying it.",expressedAt:now},host)];
    expect(validateDelegatedAction(delegation,action,host).valid).toBe(false);
    expect(evaluateInternalization(input)).toEqual(before);
    const renewal=establishDelegation(delegation.proposal,{...delegation.confirmation,id:"fresh",confirmedAt:new Date(Date.parse(now)+1).toISOString()},{...host,now:new Date(Date.parse(now)+1).toISOString()});
    expect(renewal.state).toBe("authority_established");expect(evaluateInternalization(input)).toEqual(before);
  });
  it.each(["spend","tool","rights","receiver","procedure"])("cannot widen current authority through remembered %s",attack=>{
    const input=history(), {delegation,host}=grant(input), unchanged=structuredClone(delegation);
    if(attack==="spend") expect(validateDelegatedAction(delegation,{...action,metadata:{...action.metadata,maxSpend:1000}},host).valid).toBe(false);
    if(attack==="tool") expect(validateDelegatedAction(delegation,{...action,tool:"other.purchase"},host).valid).toBe(false);
    if(attack==="receiver") expect(validateDelegatedAction(delegation,action,{...host,delegateId:"other"}).valid).toBe(false);
    if(attack==="rights") {const p=structuredClone(delegation.proposal);Object.assign(p,{delegationRights:"unlimited"});expect(establishDelegation(p,delegation.confirmation,host).state).toBe("authority_rejected");}
    if(attack==="procedure") {
      add(input,[content("publish-procedure",{category:"procedure",key:"report",value:{steps:["gather","draft","save","publish externally"]},classification:"explicit",observedAt:time(300)})]);
      expect(validateDelegatedAction(delegation,{...action,tool:"cms.publish",actionType:"publish",target:"report"},host).valid).toBe(false);
    }
    correction(input);assist(input);expect(delegation).toEqual(unchanged);
  });
  it("memory cannot replace standing evidence or repair revoked execution authority",()=>{
    const input=history(), {delegation,host}=grant(input);
    const evidence=[{id:"quote",sourceId:"cafe",dependencyId:"price",delegationDigest:delegation.digest,action:createApprovalBinding(action),status:"observed" as const,observedAt:now,reference:{kind:"local_artifact" as const,ref:"quote.json"},document:{price:5}}];
    const issued=issueRevalidatedPermit({delegation,action,host,evidence});expect(issued.basis).toBeDefined();
    const request={permit:issued.governance.permit!,basis:issued.basis!,action:issued.governance.permit!.allowedAction,delegation,host,issuedBasisDigests:{[issued.basis!.permitId]:issued.basis!.digest},authorityObservation:{id:"current",observedAt:now,reference:"authority.json",revision:"2"},evidence};
    expect(revalidateExecution(request).state).toBe("execution_revalidated");
    cannotAuthorize(()=>evaluateCurrentStanding({delegation,action,host,evidence:[evaluateInternalization(input)] as never}));
    host.revocations=[revokeDelegation(delegation,{id:"stop",humanId:"alice",text:"Stop",expressedAt:now},host)];
    expect(revalidateExecution(request).state).toBe("execution_defeated");expect(assist(input).metrics.suppliedParameters).toBe(2);
  });
});
