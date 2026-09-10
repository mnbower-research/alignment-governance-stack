import type { AgentActionProposal } from "@alignment-governance-stack/shared-types";
import { canonicalizeExecutionConstraintSet, sha256Stable } from "./constraints.js";
import type { RuntimeBindingActionField } from "./types.js";

const actionHashFields: RuntimeBindingActionField[] = [
  "tool",
  "actionType",
  "target",
  "environment",
  "reversible",
  "externalFacing",
  "dataSensitivity",
  "requiresApproval",
  "knownApproval",
  "executionConstraints"
];

export function createActionHash(action: AgentActionProposal): string {
  return sha256Stable(getCanonicalAction(action));
}

export function getCanonicalAction(action: AgentActionProposal): Partial<Record<RuntimeBindingActionField, unknown>> {
  return {
    tool: action.tool,
    actionType: action.actionType,
    target: action.target,
    environment: action.environment,
    reversible: action.reversible,
    externalFacing: action.externalFacing,
    dataSensitivity: action.dataSensitivity,
    requiresApproval: action.requiresApproval,
    knownApproval: action.knownApproval,
    ...(action.executionConstraints !== undefined
      ? { executionConstraints: canonicalizeExecutionConstraintSet(action.executionConstraints) }
      : {})
  };
}

export function getActionHashFields(): RuntimeBindingActionField[] {
  return [...actionHashFields];
}
