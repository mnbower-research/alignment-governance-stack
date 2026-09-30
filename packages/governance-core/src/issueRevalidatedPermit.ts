import { assertCanonicalDelegationJson, createApprovalBinding, validateDelegatedAction } from "@alignment-governance-stack/authority-map";
import { sha256Stable } from "@alignment-governance-stack/runtime-binding";
import { createGovernanceReceipt } from "@alignment-governance-stack/receipts";
import { evaluateGovernedRuntimeActionWithReceipt } from "./evaluateGovernedRuntimeActionWithReceipt.js";
import type { ExecutionIssuanceBasis, IssueRevalidatedPermitInput, RevalidatedPermitIssuance } from "./executionRevalidationTypes.js";

/** Issues through the existing governance pipeline; never accepts an imported allowance. */
export function issueRevalidatedPermit(input: IssueRevalidatedPermitInput): RevalidatedPermitIssuance {
  assertCanonicalDelegationJson(input);
  const { delegation, action, host, evidence } = input;
  if (!delegation.proposal.executionRevalidation) throw new Error("An explicitly confirmed execution-revalidation policy is required");
  const authority = validateDelegatedAction(delegation, action, host);
  if (!authority.valid) {
    const governance = { originalProposal: action, finalDecision: "execution_denied" as const, reasonForDecision: "Current delegation does not support permit issuance." };
    return { governance, receipt: createGovernanceReceipt({ governancePacket: governance, createdAt: host.now, metadata: { consequence: "not_observed" } }) };
  }
  const binding = createApprovalBinding(action);
  const index = delegation.proposal.permittedActions.findIndex(a => sha256Stable(createApprovalBinding(a)) === sha256Stable(binding));
  const approved = { ...action, knownApproval: true };
  const expiry = input.permitExpiresAt === undefined ? authority.validUntil!
    : new Date(Math.min(Date.parse(input.permitExpiresAt), Date.parse(authority.validUntil!))).toISOString();
  const packet = evaluateGovernedRuntimeActionWithReceipt({ ...input.governance,
    proposal: approved, authorityMap: host.authorityMap, approvalEvidence: delegation.confirmation.approvals[index]!,
    ...(delegation.proposal.currentStanding ? { currentStanding: { delegation, evidence, host } } : {}),
    validationOptions: { now: host.now }, permitOptions: { expiresAt: expiry }, receiptOptions: { createdAt: host.now, metadata: { consequence: "not_observed" } } });
  const permit = packet.governance.permit;
  if (!permit || packet.governance.finalDecision !== "allowed_by_aag") return packet;
  // PGDL may revise a proposal: the actual permitted action must remain in the original authority envelope.
  if (!validateDelegatedAction(delegation, permit.allowedAction, host).valid) throw new Error("Governed proposal changed the confirmed action; no issuance basis may be registered");
  const body: Omit<ExecutionIssuanceBasis, "digest"> = {
    version: "execution-issuance-basis/v1", permitId: permit.id, permitDigest: sha256Stable(permit),
    action: createApprovalBinding(permit.allowedAction), delegation: { id: delegation.proposal.id, digest: delegation.digest },
    receiverId: host.delegateId, issuedAt: permit.issuedAt, validUntil: permit.expiresAt!, issuanceReceiptHash: packet.receipt.receiptHash,
    ...(packet.governance.standing ? { standing: packet.governance.standing } : {})
  };
  assertCanonicalDelegationJson(body);
  return { ...packet, basis: { ...body, digest: sha256Stable(body) } };
}
