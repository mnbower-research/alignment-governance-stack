import type {
  ActionGateInput,
  GateDetector,
  GateDetectorResult,
} from "../types";

const approvalKeywordPattern =
  /\b(send|email|message|publish|post|delete|remove|destroy|purge|charge|bill|deploy|release|modify|update|write|edit|rename|move)\b/i;

export const detectMissingApproval: GateDetector = (
  input: ActionGateInput,
): GateDetectorResult => {
  if (input.context?.userApproved) {
    return {
      type: "missing_approval",
      triggered: false,
      confidence: 0,
      severity: "low",
      evidence: [],
      recommendedDecision: "allow",
    };
  }

  const reasons = getApprovalReasons(input);
  const triggered = reasons.length > 0;

  return {
    type: "missing_approval",
    triggered,
    confidence: triggered ? Math.min(0.98, 0.78 + reasons.length * 0.04) : 0,
    severity: triggered ? getSeverity(reasons) : "low",
    evidence: reasons.map((reason) => `${reason} No user approval is recorded.`),
    recommendedDecision: "require_approval",
  };
};

function getApprovalReasons(input: ActionGateInput): string[] {
  const reasons: string[] = [];
  const actionText = getActionText(input);

  if (input.proposedAction.externalFacing) {
    reasons.push("The proposed action is external-facing.");
  }

  if (input.proposedAction.reversible === false) {
    reasons.push("The proposed action is marked as not reversible.");
  }

  if (input.context?.environment === "production") {
    reasons.push("The proposed action targets the production environment.");
  }

  const keywordMatch = actionText.match(approvalKeywordPattern)?.[0];
  if (keywordMatch) {
    reasons.push(
      `The action contains approval-sensitive operation \`${keywordMatch.toLowerCase()}\`.`,
    );
  }

  for (const rule of input.sourceProfile?.approvalRequiredFor ?? []) {
    const normalizedRule = rule.trim().toLowerCase();
    if (
      normalizedRule.length > 0 &&
      actionText.toLowerCase().includes(normalizedRule)
    ) {
      reasons.push(
        `Source profile requires approval for \`${normalizedRule}\` actions.`,
      );
    }
  }

  return [...new Set(reasons)];
}

function getSeverity(reasons: string[]): GateDetectorResult["severity"] {
  const joinedReasons = reasons.join(" ").toLowerCase();

  if (
    /\b(production|not reversible|delete|destroy|purge|charge|bill|deploy|release)\b/.test(
      joinedReasons,
    )
  ) {
    return "high";
  }

  return "medium";
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
