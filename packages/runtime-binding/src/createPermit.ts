import { randomUUID } from "node:crypto";
import type { AgentActionProposal } from "@alignment-governance-stack/shared-types";
import { createActionHash } from "./hashAction.js";
import type { CreateRuntimePermitOptions, RuntimePermit } from "./types.js";

export function createRuntimePermit(
  action: AgentActionProposal,
  options: CreateRuntimePermitOptions = {}
): RuntimePermit {
  const permit: RuntimePermit = {
    id: `permit-${action.id}-${randomUUID()}`,
    proposalId: action.id,
    actionHash: createActionHash(action),
    allowedAction: { ...action, metadata: { ...action.metadata } },
    issuedAt: options.issuedAt ?? new Date().toISOString(),
    source: "aag",
    aagDecision: "allow"
  };

  if (options.expiresAt !== undefined) {
    permit.expiresAt = options.expiresAt;
  }

  if (options.metadata !== undefined) {
    permit.metadata = { ...options.metadata };
  }

  return permit;
}
