import { createHash } from "node:crypto";
import type { AgentActionProposal } from "@alignment-governance-stack/shared-types";
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
  "knownApproval"
];

export function createActionHash(action: AgentActionProposal): string {
  return sha256Stable(getCanonicalAction(action));
}

export function getCanonicalAction(action: AgentActionProposal): Record<RuntimeBindingActionField, unknown> {
  return {
    tool: action.tool,
    actionType: action.actionType,
    target: action.target,
    environment: action.environment,
    reversible: action.reversible,
    externalFacing: action.externalFacing,
    dataSensitivity: action.dataSensitivity,
    requiresApproval: action.requiresApproval,
    knownApproval: action.knownApproval
  };
}

export function getActionHashFields(): RuntimeBindingActionField[] {
  return [...actionHashFields];
}

function sha256Stable(value: unknown): string {
  return `sha256:${createHash("sha256").update(stableStringify(value)).digest("hex")}`;
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(",")}}`;
}
