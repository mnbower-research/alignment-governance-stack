import { randomUUID } from "node:crypto";
import type { AgentActionProposal } from "@alignment-governance-stack/shared-types";
import { canonicalizeExecutionConstraintSet, hashExecutionConstraintSet } from "./constraints.js";
import { createActionHash } from "./hashAction.js";
import type { CreateRuntimePermitOptions, RuntimePermit } from "./types.js";

export function createRuntimePermit(
  action: AgentActionProposal,
  options: CreateRuntimePermitOptions = {}
): RuntimePermit {
  const executionConstraints = action.executionConstraints === undefined
    ? undefined
    : canonicalizeExecutionConstraintSet(action.executionConstraints);
  const permit: RuntimePermit = {
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
