import { expect, it } from "vitest";
import { createApprovalBinding, delegationMaterialPaths, establishDelegation, hashDelegationProposal, evaluateCurrentStanding } from "@alignment-governance-stack/authority-map";
import type { DelegationProposal, CurrentDelegationContext, StandingEvidence } from "@alignment-governance-stack/authority-map";
import type { AgentActionProposal } from "@alignment-governance-stack/shared-types";
import { bindActionToPermit } from "@alignment-governance-stack/runtime-binding";
import { evaluateGovernedRuntimeActionWithReceipt } from "../evaluateGovernedRuntimeActionWithReceipt.js";

function fixture() {
  const now = "2026-09-30T09:00:00.000Z", expiresAt = "2026-09-30T10:00:00.000Z";
  const action: AgentActionProposal = { id: "deploy", userRequest: "Deploy service release v1 to staging.", tool: "ci.deploy",
    actionType: "deploy_release", target: "service", environment: "staging", reversible: true, externalFacing: false,
    dataSensitivity: "low", requiresApproval: true, knownApproval: false, metadata: { delegationId: "grant", releaseId: "v1" } };
  const p: DelegationProposal = { version: "delegation-proposal/v1", id: "grant", expression: { id: "request", humanId: "owner", text: action.userRequest, expressedAt: now },
    intent: { id: "intent", status: "provisional", expressionId: "request", objective: "Deploy to staging", parameters: {}, preferences: {}, constraints: [], unresolved: [], confidence: 1 },
    delegateId: "deployer", consequence: "high", permittedActions: [action], prohibitedActionTypes: [], discretion: "none", delegationRights: "none", approvalRequirement: "confirmed_exact_actions",
    standing: false, validFrom: now, expiresAt, activeWindows: [], revocationCondition: "human_revocation_or_host_withdrawal", provenance: {},
    currentStanding: { version: "standing-contract/v1", dependencies: [{ id: "environment", sourceId: "inventory", pointer: "/environment", maxAgeMs: 30_000 }],
      conditions: [{ id: "staging-only", actionId: action.id, dependencyId: "environment", predicate: { operator: "eq", value: "staging" } }] } };
  const { provenance, ...body } = p;
  p.provenance = Object.fromEntries(delegationMaterialPaths(body).map(path => [path, { kind: "explicit_expression", sourceId: "request", pointer: "/text" }]));
  const host: CurrentDelegationContext = { now, humanId: "owner", delegateId: "deployer", sourceIds: ["inventory"], revocations: [], establishedDigests: {}, minimumConsequence: "high",
    authorityMap: { id: "origin", name: "Owner", version: "1", roles: [{ id: "owner", label: "Owner", scopes: [{ id: "deploy", tool: action.tool, actionType: action.actionType }] }] } };
  const approval = { id: "approval", approverId: "owner", approverRoleId: "owner", approvedAt: now, expiresAt, binding: createApprovalBinding(action) };
  const established = establishDelegation(p, { id: "confirmation", humanId: "owner", decision: "confirm", confirmedAt: now, proposalDigest: hashDelegationProposal(p), approvals: [approval] }, host);
  expect(established.state).toBe("authority_established");
  const delegation = established.delegation!; host.establishedDigests = { grant: delegation.digest };
  const evidence: StandingEvidence[] = [{ id: "observation", dependencyId: "environment", sourceId: "inventory", delegationDigest: delegation.digest, action: createApprovalBinding(action),
    status: "observed", observedAt: now, reference: { kind: "local_artifact", ref: "inventory.json" }, document: { environment: "staging" } }];
  // Establish authority before supplying PGDL's existing approval status flag.
  expect(evaluateCurrentStanding({ delegation, evidence, host, action }).state).toBe("standing_valid");
  const approvedAction = { ...action, knownApproval: true };
  return { proposal: approvedAction, runtimeAction: structuredClone(approvedAction), authorityMap: host.authorityMap, approvalEvidence: approval,
    currentStanding: { delegation, evidence, host }, validationOptions: { now }, permitOptions: { expiresAt }, receiptOptions: { createdAt: now } };
}

it("continues through AAG, binding and receipt with a standing-capped permit", () => {
  const input = fixture(), result = evaluateGovernedRuntimeActionWithReceipt(input);
  expect(result.governance.finalDecision, result.governance.reasonForDecision).toBe("execution_allowed");
  expect(result.governance.aag?.decision).toBe("allow");
  expect(result.governance.permit!.expiresAt).toBe("2026-09-30T09:00:30.000Z");
  expect(result.receipt.metadata?.currentStanding).toEqual(result.governance.standing);
  expect(bindActionToPermit(input.runtimeAction, result.governance.permit!, { now: "2026-09-30T09:00:30.000Z" }).allowed).toBe(false);
});
it.each(["defeated", "missing", "stale", "substituted", "purpose", "malformed"])("issues no permit for %s standing/runtime evidence", attack => {
  const input = fixture();
  if (attack === "defeated") input.currentStanding.evidence[0]!.document = { environment: "production" };
  if (attack === "missing") input.currentStanding.evidence = [];
  if (attack === "stale") input.validationOptions.now = "2026-09-30T09:00:30.000Z";
  if (attack === "substituted") input.runtimeAction.metadata = { releaseId: "v2" };
  if (attack === "purpose") input.runtimeAction.userRequest = "Deploy any release";
  if (attack === "malformed") input.currentStanding.evidence[0]!.document = { environment: undefined } as never;
  const result = evaluateGovernedRuntimeActionWithReceipt(input);
  expect(result.governance.finalDecision).toBe("execution_denied");
  expect(result.governance.permit).toBeUndefined();
  expect(result.governance.runtimeBinding).toBeUndefined();
});
it("does not permit receipt metadata to override the evaluated standing result", () => {
  const input = fixture(); input.currentStanding.evidence = [];
  const result = evaluateGovernedRuntimeActionWithReceipt({ ...input, receiptOptions: { ...input.receiptOptions, metadata: { currentStanding: { state: "standing_valid" } } } });
  expect(result.receipt.metadata?.currentStanding).toMatchObject({ state: "standing_unresolved" });
});

it("preserves existing AAG objections even when standing is favorable", () => {
  const input = fixture();
  // Change all authority bindings coherently, retaining the existing narrowing-word detector behavior.
  const p = input.currentStanding.delegation.proposal;
  p.permittedActions[0]!.userRequest = "Deploy service release v1 to staging only.";
  const approval = { ...input.approvalEvidence, binding: createApprovalBinding(p.permittedActions[0]!) };
  const confirmation = { ...input.currentStanding.delegation.confirmation, proposalDigest: hashDelegationProposal(p), approvals: [approval] };
  const d = establishDelegation(p, confirmation, input.currentStanding.host).delegation!;
  input.currentStanding.delegation = d;
  input.currentStanding.host.establishedDigests = { grant: d.digest };
  input.proposal.userRequest = p.permittedActions[0]!.userRequest;
  input.runtimeAction.userRequest = input.proposal.userRequest;
  input.approvalEvidence = approval;
  input.currentStanding.evidence[0]!.delegationDigest = d.digest;
  input.currentStanding.evidence[0]!.action = createApprovalBinding(input.proposal);
  const result = evaluateGovernedRuntimeActionWithReceipt(input);
  expect(result.governance.standing?.state).toBe("standing_valid");
  expect(result.governance.finalDecision).toBe("revision_required_by_aag");
  expect(result.governance.permit).toBeUndefined();
});
