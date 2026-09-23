import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { evaluateGovernedRuntimeAction } from "../index.js";
import { createApprovalBinding, validateApproval, type AuthorityMap, type ApprovalEvidence } from "@alignment-governance-stack/authority-map";
import { createRuntimePermit, validateRuntimePermit } from "@alignment-governance-stack/runtime-binding";
import { evaluateContextAdmission } from "@alignment-governance-stack/context-admission";
import type { AgentActionProposal, ContextAdmissionRequest } from "@alignment-governance-stack/shared-types";
const now = "2026-09-19T12:00:00.000Z";
const action: AgentActionProposal = { id: "context-report", userRequest: "Generate a weekly summary report.", tool: "report.generate", actionType: "generate_report", target: "weekly_summary", environment: "dev", reversible: true, externalFacing: false, dataSensitivity: "low", requiresApproval: false, knownApproval: false, metadata: {} };
const map: AuthorityMap = { id: "map", name: "Review", version: "1", defaultApprovalTtlMinutes: 5, roles: [{ id: "owner", label: "Owner", scopes: [{ id: "report", tool: "report.generate", targetIncludes: "weekly_" }] }] };
function approval(p = action): ApprovalEvidence { return { id: "approval", approverId: "human", approverRoleId: "owner", approvedAt: now, binding: createApprovalBinding(p) }; }
describe("release blocker public contracts", () => {
  it.each(["reject", "escalate", "request_revision"] as const)("human %s prevents direct execution", decision => {
    const result = evaluateGovernedRuntimeAction({ proposal: action, runtimeAction: action, humanParticipation: { input: { humanResponse: { decision, reason: "Stop and review this action." } } } });
    expect(result.finalDecision).not.toBe("execution_allowed"); expect(result.permit).toBeUndefined(); expect(result.aag).toBeUndefined();
  });
  it("rejects stale approval with a default TTL, including on a new action", () => {
    const old = { ...approval(), approvedAt: "2000-01-01T00:00:00Z" };
    const p = { ...action, id: "new", target: "weekly_new", requiresApproval: true, knownApproval: true };
    expect(validateApproval(map, p, old, { now }).decision).toBe("approval_expired");
    expect(evaluateGovernedRuntimeAction({ proposal: p, runtimeAction: p, authorityMap: map, approvalEvidence: old, validationOptions: { now } }).permit).toBeUndefined();
  });
  it.each([
    { target: "weekly_other" }, { id: "other-use" }, { userRequest: "A different purpose" },
    { executionConstraints: { version: "execution-constraints/v0.1" as const, constraints: { budget: { type: "exact_number" as const, value: 250 } } } }
  ])("rejects material approval substitution %j", changed => {
    expect(validateApproval(map, { ...action, ...changed }, approval(), { now }).decision).toBe("approval_binding_mismatch");
  });
  it("rejects legacy unbound evidence", () => {
    const { binding: _, ...unbound } = approval(); expect(validateApproval(map, action, unbound, { now }).valid).toBe(false);
  });
  it.each(["not-a-date", ""])("rejects malformed approval expiration %s", expiresAt => {
    expect(validateApproval(map, action, { ...approval(), expiresAt }, { now }).decision).toBe("approval_invalid");
  });
  it("caps permits at the effective approval expiry", () => {
    const p = { ...action, requiresApproval: true, knownApproval: true };
    const result = evaluateGovernedRuntimeAction({ proposal: p, runtimeAction: p, authorityMap: map, approvalEvidence: approval(p), validationOptions: { now }, permitOptions: { expiresAt: "2030-01-01T00:00:00Z" } });
    expect(result.finalDecision).toBe("execution_allowed"); expect(result.permit?.expiresAt).toBe("2026-09-19T12:05:00.000Z");
  });
  it.each(["not-a-date", ""])("fails closed for invalid host clock %s", badClock => {
    const permit = createRuntimePermit(action);
    expect(validateRuntimePermit(action, permit, { now: badClock }).allowed).toBe(false);
    expect(evaluateGovernedRuntimeAction({ proposal: action, runtimeAction: action, validationOptions: { now: badClock } }).permit).toBeUndefined();
    expect(validateApproval(map, action, approval(), { now: badClock }).valid).toBe(false);
  });
  it("uses the exclusive expiration boundary for admission, approval and binding", () => {
    const request = JSON.parse(readFileSync(new URL("../../../../examples/context-admission/valid-temporal-relay.json", import.meta.url), "utf8")) as ContextAdmissionRequest;
    request.artifacts[0]!.expiresAt = now; request.evaluatedAt = now;
    expect(evaluateContextAdmission(request).decision).toBe("reject");
    expect(validateApproval(map, action, { ...approval(), approvedAt: "2026-09-19T11:55:00.000Z" }, { now }).decision).toBe("approval_expired");
    const permit = createRuntimePermit(action, { expiresAt: now });
    expect(validateRuntimePermit(action, permit, { now }).allowed).toBe(false);
    expect(validateRuntimePermit(action, permit, { now: "2026-09-19T11:59:59.999Z" }).allowed).toBe(true);
  });
});
