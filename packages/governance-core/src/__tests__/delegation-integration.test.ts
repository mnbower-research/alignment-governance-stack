import { expect, it } from "vitest";
import { createApprovalBinding, delegationMaterialPaths, establishDelegation, hashDelegationProposal, validateDelegatedAction } from "@alignment-governance-stack/authority-map";
import type { DelegationProposal, DelegationHostContext } from "@alignment-governance-stack/authority-map";
import type { AgentActionProposal } from "@alignment-governance-stack/shared-types";
import { evaluateGovernedRuntimeActionWithReceipt } from "../evaluateGovernedRuntimeActionWithReceipt.js";

it("carries an established human delegation through existing approval, AAG, binding and receipt machinery", () => {
  const now = "2026-09-30T09:00:00.000Z", expiresAt = "2026-09-30T09:10:00.000Z";
  const action: AgentActionProposal = { id: "read-notes", userRequest: "Read README.md.", tool: "filesystem.readFile",
    actionType: "read_file", target: "README.md", environment: "dev", reversible: true, externalFacing: false,
    dataSensitivity: "low", requiresApproval: true, knownApproval: false, metadata: { delegationId: "read-grant" } };
  const p: DelegationProposal = { version: "delegation-proposal/v1", id: "read-grant", expression: { id: "request", humanId: "owner", text: action.userRequest, expressedAt: now },
    intent: { id: "intent", status: "provisional", expressionId: "request", objective: "Read README", parameters: {}, preferences: {}, constraints: [], unresolved: [], confidence: 0.5 },
    delegateId: "reader", consequence: "low", permittedActions: [action], prohibitedActionTypes: ["write_file"], discretion: "none",
    delegationRights: "none", approvalRequirement: "confirmed_exact_actions", standing: false, validFrom: now, expiresAt,
    activeWindows: [], revocationCondition: "human_revocation_or_host_withdrawal", provenance: {} };
  const { provenance: _, ...material } = p;
  p.provenance = Object.fromEntries(delegationMaterialPaths(material).map(path => [path, { kind: "explicit_expression", sourceId: "request", pointer: "/text" }]));
  const host: DelegationHostContext = { now, revocations: [], humanId: "owner", sourceIds: [], minimumConsequence: "low", authorityMap: {
    id: "origin", name: "Owner", version: "1", roles: [{ id: "owner", label: "Owner", scopes: [{ id: "read", tool: action.tool, actionType: action.actionType }] }] } };
  const approval = { id: "review", approverId: "owner", approverRoleId: "owner", approvedAt: now, expiresAt, binding: createApprovalBinding(action) };
  const established = establishDelegation(p, { id: "confirmation", humanId: "owner", decision: "confirm", confirmedAt: now,
    proposalDigest: hashDelegationProposal(p), approvals: [approval] }, host);
  expect(established.state).toBe("authority_established");
  const d = established.delegation!;
  const validation = validateDelegatedAction(d, action, { ...host, delegateId: "reader", establishedDigests: { [p.id]: d.digest }, revocations: [] });
  expect(validation.valid).toBe(true);
  // Host must perform this opt-in check, retain the artifact, and cap permit lifetime.
  if (!validation.valid) throw new Error("Delegation denied");
  const approvedAction = { ...action, knownApproval: validation.valid };
  const result = evaluateGovernedRuntimeActionWithReceipt({ proposal: approvedAction, runtimeAction: approvedAction,
    authorityMap: host.authorityMap, approvalEvidence: approval, validationOptions: { now },
    permitOptions: { issuedAt: now, expiresAt: validation.validUntil! },
    receiptOptions: { createdAt: now, metadata: { delegationRef: validation.delegationRef } } });
  expect(result.governance.finalDecision).toBe("execution_allowed");
  expect(result.receipt.metadata?.delegationRef).toEqual({ id: p.id, digest: d.digest });
});
