import type { AgentActionProposal } from "@alignment-governance-stack/shared-types";
import { assertActionMetadata } from "@alignment-governance-stack/shared-types";
import { canonicalizeExecutionConstraintSet, sha256Stable } from "./constraints.js";
import type { RuntimeBindingActionField } from "./types.js";

const actionHashFields: RuntimeBindingActionField[] = [
  "assuranceRequirement",
  "tool",
  "actionType",
  "target",
  "environment",
  "reversible",
  "externalFacing",
  "dataSensitivity",
  "requiresApproval",
  "knownApproval",
  "executionConstraints",
  "metadata"
];

export function createActionHash(action: AgentActionProposal): string {
  return sha256Stable(getCanonicalAction(action));
}

export function getCanonicalAction(action: AgentActionProposal): Partial<Record<RuntimeBindingActionField, unknown>> {
  assertActionMetadata(action.metadata);
  return {
    ...(action.assuranceRequirement !== undefined ? { assuranceRequirement: action.assuranceRequirement } : {}),
    tool: action.tool,
    actionType: action.actionType,
    target: action.target,
    environment: action.environment,
    reversible: action.reversible,
    externalFacing: action.externalFacing,
    dataSensitivity: action.dataSensitivity,
    requiresApproval: action.requiresApproval,
    knownApproval: action.knownApproval,
    // Arbitrary metadata may be consumed by executors or gate detectors. Freeze it
    // conservatively; only an empty object retains the legacy hash projection.
    ...(Object.keys(action.metadata).length > 0 ? { metadata: action.metadata } : {}),
    ...(action.executionConstraints !== undefined
      ? { executionConstraints: canonicalizeExecutionConstraintSet(action.executionConstraints) }
      : {})
  };
}

export function getActionHashFields(): RuntimeBindingActionField[] {
  return [...actionHashFields];
}
