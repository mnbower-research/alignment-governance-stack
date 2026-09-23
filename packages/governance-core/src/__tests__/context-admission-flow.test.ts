import { afterEach, describe, expect, it, vi } from "vitest";
import { evaluateGovernedRuntimeActionWithReceipt } from "../evaluateGovernedRuntimeActionWithReceipt.js";
import { evaluateGovernedAction } from "../evaluateGovernedAction.js";
import { evaluateContextAdmission } from "@alignment-governance-stack/context-admission";
import { createActionHash } from "@alignment-governance-stack/runtime-binding";
import { evaluateAag } from "@alignment-governance-stack/aag-core";
import { createGovernanceReceipt, verifyGovernanceReceipt } from "@alignment-governance-stack/receipts";
import { verifyAgencyFingerprint } from "@alignment-governance-stack/agency-fingerprint";
import type { AgentActionProposal, ContextAdmissionRequest } from "@alignment-governance-stack/shared-types";
import { readFileSync } from "node:fs";

const proposal: AgentActionProposal = {
  id: "context-report", userRequest: "Generate a weekly summary report.", tool: "report.generate", actionType: "generate_report",
  target: "weekly_summary", environment: "dev", reversible: true, externalFacing: false, dataSensitivity: "low",
  requiresApproval: false, knownApproval: false, metadata: {}
};
function context(): ContextAdmissionRequest {
  return JSON.parse(readFileSync(new URL("../../../../examples/context-admission/valid-temporal-relay.json", import.meta.url), "utf8")) as ContextAdmissionRequest;
}

describe("context-dependent governance", () => {
  afterEach(() => vi.useRealTimers());
  it("preserves existing callers with no context dependency", () => {
    const result = evaluateGovernedAction(proposal);
    expect(result.finalDecision).toBe("allowed_by_aag");
    expect(result.contextAdmission).toBeUndefined();
  });
  it("links material context to PGDL, AAG, receipt and fingerprint", () => {
    const result = evaluateGovernedRuntimeActionWithReceipt({ proposal, runtimeAction: proposal, contextAdmission: context(),
      permitOptions: { issuedAt: "2026-09-19T12:00:00Z" }, validationOptions: { now: "2026-09-19T12:00:00Z" },
      receiptOptions: { createdAt: "2026-09-19T12:00:00Z" },
      agencyFingerprintOptions: { input: { subjectHumanId: "owner", delegatedBy: "owner", agentId: "agent-b", timestamp: "2026-09-19T12:00:00Z" } }
    });
    expect(result.governance.finalDecision).toBe("execution_allowed");
    expect(result.governance.pgdl?.contextAdmission?.decision).toBe("admit");
    expect(result.governance.aag?.contextAdmission?.decision).toBe("admit");
    expect(result.receipt.contextAdmission?.contextLineageDigest).toBe(result.agencyFingerprint?.contextLineageDigest);
    expect(verifyGovernanceReceipt(result.receipt).valid).toBe(true);
    expect(verifyAgencyFingerprint(result.agencyFingerprint!).valid).toBe(true);
    result.receipt.contextAdmission!.artifacts[0]!.revoked = true;
    expect(verifyGovernanceReceipt(result.receipt).valid).toBe(false);
  });
  it("rejects divergent stage admission snapshots when constructing a receipt", () => {
    const governance = evaluateGovernedAction({ proposal, contextAdmission: context() });
    governance.aag!.contextAdmission = { ...governance.contextAdmission!, policyId: "different-policy" };
    expect(() => createGovernanceReceipt({ governancePacket: governance })).toThrow("canonical run admission");
  });
  it("does not issue a permit for unresolved context even with approval booleans", () => {
    const request = context(); request.artifacts[0]!.revoked = true;
    const result = evaluateGovernedRuntimeActionWithReceipt({ proposal: { ...proposal, knownApproval: true }, runtimeAction: proposal, contextAdmission: request });
    expect(result.governance.finalDecision).toBe("rejected_before_gate");
    expect(result.governance.permit).toBeUndefined();
    expect(result.receipt.contextAdmission?.decision).toBe("reject");
  });
  it("blocks reference-only context from authorizing an operational use", () => {
    const request = context(); request.requestedUse.mode = "reference"; request.validationEvidence = []; request.policy.requireValidation = false;
    expect(evaluateGovernedAction({ proposal, contextAdmission: request }).finalDecision).toBe("blocked_by_aag");
  });
  it("rejects target substitution and unresolved failures directly at AAG", () => {
    const evidence = evaluateContextAdmission(context());
    expect(evaluateAag({ ...proposal, target: "other" }, evidence).decision).toBe("block");
    evidence.decision = "require_validation";
    expect(evaluateAag(proposal, evidence).decision).toBe("block");
  });
  it("caps permit expiration and re-evaluates at the supplied runtime time", () => {
    const result = evaluateGovernedRuntimeActionWithReceipt({ proposal, runtimeAction: proposal, contextAdmission: context(),
      permitOptions: { expiresAt: "2027-01-01T00:00:00Z" }, validationOptions: { now: context().evaluatedAt } });
    expect(result.governance.permit?.expiresAt).toBe("2026-09-19T13:00:00.000Z");
    const stale = evaluateGovernedRuntimeActionWithReceipt({ proposal, runtimeAction: proposal, contextAdmission: context(),
      validationOptions: { now: "2026-09-19T13:00:00.000Z" } });
    expect(stale.governance.permit).toBeUndefined();
    expect(stale.governance.finalDecision).toBe("escalated_before_gate");
  });
  it.each([undefined, {}])("uses the current clock when runtime options do not supply now: %s", validationOptions => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2030-01-01T00:00:00Z"));
    const result = evaluateGovernedRuntimeActionWithReceipt({ proposal, runtimeAction: proposal, contextAdmission: context(),
      ...(validationOptions !== undefined ? { validationOptions } : {}) });
    expect(result.governance.finalDecision).toBe("rejected_before_gate");
    expect(result.governance.permit).toBeUndefined();
  });
  it("blocks historical reports at standalone AAG without a trusted fresh check", () => {
    const evidence = evaluateContextAdmission(context());
    expect(evaluateAag(proposal, evidence).decision).toBe("block");
    evidence.contextLineageDigest = "sha256:" + "0".repeat(64);
    expect(evaluateAag(proposal, evidence).decision).toBe("block");
  });
  it.each([
    { executionConstraints: { version: "execution-constraints/v0.1" as const, constraints: { budgetAmount: { type: "exact_number" as const, value: 250 } } } },
    { reversible: false }, { externalFacing: true }, { dataSensitivity: "high" as const }, { knownApproval: true }
  ])("requires new admission when canonical action fields change: %j", change => {
    const action = { ...proposal, ...change };
    const result = evaluateGovernedRuntimeActionWithReceipt({ proposal: action, runtimeAction: action, contextAdmission: context(), validationOptions: { now: context().evaluatedAt } });
    expect(result.governance.finalDecision).not.toBe("execution_allowed");
    expect(result.governance.permit).toBeUndefined();
  });
  it("allows the attested budget and denies escalation using the same context", () => {
    const approved: AgentActionProposal = { ...proposal, executionConstraints: {
      version: "execution-constraints/v0.1", constraints: { budgetAmount: { type: "exact_number", value: 25 } }
    } };
    const request = context(); request.requestedUse.action!.actionHash = createActionHash(approved);
    for (const evidence of request.validationEvidence!) evidence.use = structuredClone(request.requestedUse);
    const options = { contextAdmission: request, validationOptions: { now: request.evaluatedAt } };
    expect(evaluateGovernedRuntimeActionWithReceipt({ ...options, proposal: approved, runtimeAction: approved }).governance.finalDecision).toBe("execution_allowed");
    const escalated: AgentActionProposal = { ...approved, executionConstraints: {
      version: "execution-constraints/v0.1", constraints: { budgetAmount: { type: "exact_number", value: 250 } }
    } };
    const denied = evaluateGovernedRuntimeActionWithReceipt({ ...options, proposal: escalated, runtimeAction: escalated });
    expect(denied.governance.finalDecision).toBe("blocked_by_aag");
    expect(denied.governance.permit).toBeUndefined();
  });
  it("refuses a fingerprint for a different receiving agent", () => {
    expect(() => evaluateGovernedRuntimeActionWithReceipt({ proposal, runtimeAction: proposal, contextAdmission: context(),
      validationOptions: { now: context().evaluatedAt },
      agencyFingerprintOptions: { input: { subjectHumanId: "owner", delegatedBy: "owner", agentId: "agent-c" } }
    })).toThrow("must match the admitted context receiver");
  });
  it("requires fresh admission for a PGDL rewrite", () => {
    const request = context();
    const destructive = { ...proposal, tool: "database.delete", actionType: "delete_records" };
    request.requestedUse.action!.tool = destructive.tool; request.requestedUse.action!.actionType = destructive.actionType;
    for (const evidence of request.validationEvidence!) evidence.use = structuredClone(request.requestedUse);
    const result = evaluateGovernedAction({ proposal: destructive, contextAdmission: request });
    expect(result.pgdl?.decision).toBe("revise_before_aag");
    expect(result.finalDecision).toBe("blocked_by_aag");
  });
});
