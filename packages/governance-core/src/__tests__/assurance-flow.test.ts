import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { evaluateGovernedRuntimeActionWithReceipt } from "../index.js";
import { createActionHash, createRuntimePermit, validateRuntimePermit } from "@alignment-governance-stack/runtime-binding";
import { evaluateAag } from "@alignment-governance-stack/aag-core";
import { createAssuranceBinding, createValidatorAttestation } from "@alignment-governance-stack/assurance";
import { verifyGovernanceReceipt } from "@alignment-governance-stack/receipts";
import { defaultAuthorityMap } from "@alignment-governance-stack/authority-map";
import type { AssuranceEvaluationRequest, ContextAdmissionRequest } from "@alignment-governance-stack/shared-types";
const now = "2026-09-23T12:00:00.000Z";
function fixture(name = "low-risk"): AssuranceEvaluationRequest { return JSON.parse(readFileSync(new URL(`../../../../examples/assurance/${name}.json`, import.meta.url), "utf8")); }
function run(request: AssuranceEvaluationRequest) { return evaluateGovernedRuntimeActionWithReceipt({ proposal: request.action, runtimeAction: request.action, assurance: request.assurance, validationOptions: { now }, receiptOptions: { createdAt: now } }); }
describe("assurance in the actual governance path", () => {
  it("allows an unchanged reviewed action and records the entire assurance path", () => {
    const result = run(fixture()); expect(result.governance.finalDecision).toBe("execution_allowed");
    expect(result.receipt.assurance?.decision).toBe("satisfied"); expect(result.receipt.aag?.assurance).toEqual(result.receipt.assurance);
    expect(result.governance.permit?.assurance).toEqual(result.receipt.assurance); expect(verifyGovernanceReceipt(result.receipt).valid).toBe(true);
  });
  it("blocks AAG when mandatory assurance input is omitted", () => { expect(evaluateAag(fixture().action).decision).toBe("block"); });
  it("blocks direct permit creation without an allowed assurance-aware AAG decision", () => {
    const f = fixture(); expect(() => createRuntimePermit(f.action)).toThrow();
    expect(() => createRuntimePermit(f.action, { assurance: f.assurance })).toThrow();
  });
  it("fails closed at standalone AAG for malformed attestations", () => {
    const f = fixture(); f.assurance.attestations[0]!.expiresAt = "invalid";
    expect(evaluateAag(f.action, undefined, undefined, f.assurance).decision).toBe("block");
  });
  it("does not derive legitimate authority from unanimous validators", () => {
    const f = fixture("high-risk"); f.action.requiresApproval = true;
    f.assurance.attestations = f.assurance.attestations.map(a => { const { digest: _d, version: _v, ...body } = a; return createValidatorAttestation({ ...body, binding: createAssuranceBinding(f.action, f.assurance) }); });
    const r = evaluateGovernedRuntimeActionWithReceipt({ proposal: f.action, runtimeAction: f.action, assurance: f.assurance, authorityMap: defaultAuthorityMap, validationOptions: { now } });
    expect(r.governance.finalDecision).not.toBe("execution_allowed"); expect(r.governance.permit).toBeUndefined();
  });
  it("preserves complete refusal history and issues no permit after approval shopping", () => {
    const r = run(fixture("denial-history")); expect(r.governance.finalDecision).toBe("blocked_by_aag"); expect(r.governance.permit).toBeUndefined();
    expect(r.receipt.assurance?.unresolvedDenialIds).toEqual(["review-validator-3"]); expect(r.receipt.assurance?.attestations).toHaveLength(4); expect(verifyGovernanceReceipt(r.receipt).valid).toBe(true);
  });
  it("retains the fresh runtime rejection alongside the earlier satisfied assurance in the receipt", () => {
    const f = fixture(); const current = structuredClone(f.assurance); current.validators[0]!.revoked = true;
    const r = evaluateGovernedRuntimeActionWithReceipt({ proposal: f.action, runtimeAction: f.action, assurance: f.assurance, validationOptions: { now, assurance: current } });
    expect(r.receipt.finalDecision).toBe("execution_denied"); expect(r.receipt.assurance?.decision).toBe("satisfied");
    expect(r.receipt.runtimeBinding?.assurance?.decision).not.toBe("satisfied");
    expect(r.receipt.runtimeBinding?.assurance?.findings.some(f => f.code === "attestation_revoked")).toBe(true);
  });
  it("does not revoke a permit merely because optional fresh evidence changes the selected quorum", () => {
    const f = fixture(); const permit = run(f).governance.permit!;
    const original = f.assurance.attestations[0]!; const validator = f.assurance.validators[1]!;
    const { digest: _d, version: _v, ...body } = original;
    f.assurance.attestations.push(createValidatorAttestation({ ...body, id: "optional-longer", validatorId: validator.id, validatorType: validator.type, independenceGroup: validator.independenceGroup, expiresAt: "2026-09-23T13:00:00.000Z" }));
    expect(validateRuntimePermit(f.action, permit, { now, assurance: f.assurance }).allowed).toBe(true);
  });
  it.each(["target", "amount", "scope", "environment", "resource", "action", "policy", "risk", "requirements", "revocation", "expiry", "history", "omitted-input", "stripped-permit", "stripped-requirement"])("denies runtime %s substitution through the public API", mutation => {
    const f = fixture(); const permit = run(f).governance.permit!; const action = structuredClone(f.action); let clock = now;
    if (mutation === "target") action.target = "account-b";
    if (mutation === "amount") action.executionConstraints!.constraints.amount = { type: "exact_number", value: 5000 };
    if (mutation === "scope" || mutation === "resource") action.executionConstraints!.constraints[mutation] = { type: "exact_string", value: "other" };
    if (mutation === "environment") action.environment = "production";
    if (mutation === "action") action.actionType = "transfer";
    if (mutation === "policy") f.assurance.policy.version = "changed";
    if (mutation === "risk") f.assurance.risk.financialExposure!.value = "high";
    if (mutation === "requirements") f.assurance.policy.requirements.low.ttlMs -= 1;
    if (mutation === "revocation") f.assurance.validators[0]!.revoked = true;
    if (mutation === "expiry") clock = permit.assurance!.validUntil!;
    if (mutation === "history") f.assurance.attestations = [];
    if (mutation === "stripped-permit") delete permit.assurance;
    if (mutation === "stripped-requirement") delete action.assuranceRequirement;
    const options = mutation === "omitted-input" ? { now: clock } : { now: clock, assurance: f.assurance };
    expect(validateRuntimePermit(action, permit, options).allowed).toBe(false);
  });
  it("requires admitted context and sufficient assurance independently", () => {
    const f = fixture(); const context = JSON.parse(readFileSync(new URL("../../../../examples/context-admission/valid-temporal-relay.json", import.meta.url), "utf8")) as ContextAdmissionRequest;
    context.evaluatedAt = now;
    context.requestedUse.action = { proposalId: f.action.id, tool: f.action.tool, actionType: f.action.actionType, target: f.action.target, environment: f.action.environment, actionHash: createActionHash(f.action) };
    for (const a of context.artifacts) { a.expiresAt = "2026-10-01T00:00:00.000Z"; if (a.provenance) a.provenance.authorityExpiresAt = a.expiresAt; }
    for (const e of context.validationEvidence ?? []) { e.use = structuredClone(context.requestedUse); e.expiresAt = "2026-10-01T00:00:00.000Z"; }
    const evaluate = () => evaluateGovernedRuntimeActionWithReceipt({ proposal: f.action, runtimeAction: f.action, assurance: f.assurance, contextAdmission: context, validationOptions: { now } });
    expect(evaluate().governance.finalDecision).toBe("execution_allowed");
    f.assurance.attestations = []; const r = evaluate(); expect(r.governance.contextAdmission?.decision).toBe("admit"); expect(r.governance.finalDecision).toBe("blocked_by_aag");
    context.artifacts[0]!.revoked = true; expect(evaluate().governance.finalDecision).toBe("rejected_before_gate");
  });
});
