import type {
  ActionGateInput,
  GateDetector,
  GateDetectorResult,
} from "../types";

const planningIntentPattern =
  /\b(plan|draft|summarize|analyze|review|explain|outline|compare|inspect)\b/i;
const executionActionPattern =
  /\b(send|email|publish|deploy|delete|remove|charge|bill|purchase|buy|notify|invite)\b/i;
const impactfulActionPattern =
  /\b(send|email|publish|deploy|delete|remove|charge|bill|purchase|buy|notify|invite|modify|update|write|edit)\b/i;
const stopWords = new Set([
  "the",
  "and",
  "for",
  "with",
  "this",
  "that",
  "from",
  "into",
  "onto",
  "only",
  "just",
  "please",
  "would",
  "could",
  "should",
  "action",
  "tool",
  "target",
  "payload",
]);

export const detectObjectiveDrift: GateDetector = (
  input: ActionGateInput,
): GateDetectorResult => {
  const intentText = [
    input.userRequest,
    input.agentPlan,
    input.sourceProfile?.systemObjective,
  ]
    .filter(Boolean)
    .join(" ");
  const actionText = getActionText(input);
  const evidence: string[] = [];

  if (
    planningIntentPattern.test(input.userRequest) &&
    executionActionPattern.test(actionText)
  ) {
    evidence.push(
      "User request asks for planning, drafting, review, or analysis, but proposed action would execute an external or destructive operation.",
    );
  }

  const intentKeywords = getKeywords(intentText);
  const actionKeywords = getKeywords(actionText);
  const overlapCount = countOverlap(intentKeywords, actionKeywords);
  const impactful =
    input.proposedAction.externalFacing ||
    input.proposedAction.reversible === false ||
    impactfulActionPattern.test(actionText);

  if (
    impactful &&
    intentKeywords.length >= 3 &&
    actionKeywords.length >= 2 &&
    overlapCount === 0
  ) {
    evidence.push(
      "Proposed action has no meaningful keyword overlap with the user request, agent plan, or system objective while attempting an impactful operation.",
    );
  }

  const triggered = evidence.length > 0;

  return {
    type: "objective_drift",
    triggered,
    confidence: triggered ? Math.min(0.94, 0.76 + evidence.length * 0.05) : 0,
    severity: triggered ? "medium" : "low",
    evidence,
    recommendedDecision: triggered ? "revise_action" : "allow",
  };
};

function getKeywords(text: string): string[] {
  const words = text.toLowerCase().match(/\b[a-z0-9][a-z0-9_-]{2,}\b/g) ?? [];
  return [...new Set(words.filter((word) => !stopWords.has(word)))];
}

function countOverlap(left: string[], right: string[]): number {
  const rightSet = new Set(right);
  return left.filter((word) => rightSet.has(word)).length;
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
