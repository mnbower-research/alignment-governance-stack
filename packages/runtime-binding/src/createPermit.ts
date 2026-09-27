import { randomUUID } from "node:crypto";
import { evaluateAssurance, assuranceDigest, verifyAssuranceEvidence } from "@alignment-governance-stack/assurance";
import type { AgentActionProposal } from "@alignment-governance-stack/shared-types";
import { canonicalizeExecutionConstraintSet, hashExecutionConstraintSet } from "./constraints.js";
import { createActionHash } from "./hashAction.js";
import type { CreateRuntimePermitOptions, RuntimePermit } from "./types.js";

export function createRuntimePermit(
  action: AgentActionProposal,
  options: CreateRuntimePermitOptions = {}
): RuntimePermit {
  const issuedAt = options.issuedAt ?? new Date().toISOString();
  let assurance: RuntimePermit["assurance"];
  if (action.assuranceRequirement || options.assurance) {
    if (!action.assuranceRequirement || !options.assurance || options.aagPacket?.decision !== "allow" ||
        !verifyAssuranceEvidence(options.aagPacket.assurance) || createActionHash(options.aagPacket.proposal) !== createActionHash(action))
      throw new Error("Assurance-protected permits require an allowed AAG packet and current assurance input.");
    assurance = evaluateAssurance(action, { ...options.assurance, evaluatedAt: issuedAt });
    if (assurance.decision !== "satisfied" || assuranceDigest(assurance.binding) !== assuranceDigest(options.aagPacket.assurance.binding) ||
        assurance.digest !== options.aagPacket.assurance.digest) throw new Error("Assurance changed after AAG; reevaluation is required.");
  }
  const executionConstraints = action.executionConstraints === undefined
    ? undefined
    : canonicalizeExecutionConstraintSet(action.executionConstraints);
  const permit: RuntimePermit = {
    ...(assurance ? { assurance } : {}),
    id: `permit-${action.id}-${randomUUID()}`,
    proposalId: action.id,
    actionHash: createActionHash(action),
    ...(executionConstraints !== undefined
      ? {
          executionConstraintHash: hashExecutionConstraintSet(executionConstraints),
          executionConstraints
        }
      : {}),
    allowedAction: {
      ...action,
      ...(executionConstraints !== undefined ? { executionConstraints } : {}),
      metadata: { ...action.metadata }
    },
    issuedAt,
    source: "aag",
    aagDecision: "allow"
  };

  if (options.expiresAt !== undefined) {
    permit.expiresAt = options.expiresAt;
  }
  if (assurance?.validUntil) {
    if (permit.expiresAt !== undefined && !Number.isFinite(Date.parse(permit.expiresAt))) throw new Error("Invalid permit expiry.");
    if (!permit.expiresAt || Date.parse(permit.expiresAt) > Date.parse(assurance.validUntil)) permit.expiresAt = assurance.validUntil;
  }

  if (options.metadata !== undefined) {
    permit.metadata = { ...options.metadata };
  }

  return permit;
}
