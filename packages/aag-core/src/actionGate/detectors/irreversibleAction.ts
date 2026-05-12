import type {
  ActionGateInput,
  GateDetector,
  GateDetectorResult,
} from "../types";

const irreversiblePattern =
  /\b(delete|remove|destroy|drop|purge|wipe|erase|terminate|charge|bill|capture payment|irreversible)\b/i;
const criticalIrreversiblePattern =
  /\b(drop|purge|wipe|destroy|terminate|charge|bill|capture payment)\b/i;

export const detectIrreversibleAction: GateDetector = (
  input: ActionGateInput,
): GateDetectorResult => {
  const actionText = getActionText(input);
  const evidence: string[] = [];

  if (input.proposedAction.reversible === false) {
    evidence.push("Proposed action explicitly sets `reversible` to `false`.");
  }

  const irreversibleMatch = actionText.match(irreversiblePattern)?.[0];
  if (irreversibleMatch) {
    evidence.push(
      `Proposed action contains irreversible operation \`${irreversibleMatch.toLowerCase()}\`.`,
    );
  }

  const triggered = evidence.length > 0;
  const severity = getSeverity(input, actionText);

  return {
    type: "irreversible_action",
    triggered,
    confidence: triggered ? Math.min(0.97, 0.82 + evidence.length * 0.04) : 0,
    severity: triggered ? severity : "low",
    evidence,
    recommendedDecision: triggered ? "require_approval" : "allow",
  };
};

function getSeverity(
  input: ActionGateInput,
  actionText: string,
): GateDetectorResult["severity"] {
  if (
    input.context?.environment === "production" ||
    criticalIrreversiblePattern.test(actionText)
  ) {
    return "critical";
  }

  return "high";
}

function getActionText(input: ActionGateInput): string {
  return [
    input.proposedAction.tool,
    input.proposedAction.actionType,
    input.proposedAction.target,
    stringifyPayload(input.proposedAction.payload),
  ]
    .filter(Boolean)
    .join(" ")
    .replace(/[_-]/g, " ");
}

function stringifyPayload(payload: Record<string, unknown> | undefined): string {
  if (!payload) {
    return "";
  }

  try {
    return JSON.stringify(payload);
  } catch {
    return "";
  }
}
