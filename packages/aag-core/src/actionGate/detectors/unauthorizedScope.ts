import type {
  ActionGateInput,
  GateDetector,
  GateDetectorResult,
  GateSeverity,
} from "../types";

const readOnlyRequestPattern =
  /\b(read|review|inspect|list|show|summarize|analyze|explain|plan|draft|preview|check)\b/i;
const narrowRequestPattern =
  /\b(only|just|specific|single|this file|current file|read-only|read only|dry run|without changing|no changes)\b/i;
const modifyingActionPattern =
  /\b(write|modify|update|delete|remove|destroy|deploy|send|email|publish|charge|edit|move|rename|commit|push|apply|install)\b/i;
const broadTargetPattern =
  /\b(all|entire|whole|every|repository|repo|project|workspace|organization|org-wide|global)\b/i;

export const detectUnauthorizedScope: GateDetector = (
  input: ActionGateInput,
): GateDetectorResult => {
  const requestText = input.userRequest;
  const actionText = getActionText(input);
  const evidence: string[] = [];
  let severity: GateSeverity = "low";

  for (const rule of input.sourceProfile?.nonNegotiables ?? []) {
    if (violatesNonNegotiable(rule, input)) {
      evidence.push(
        `Source profile non-negotiable \`${rule}\` conflicts with the proposed action.`,
      );
      severity = "critical";
    }
  }

  if (
    (readOnlyRequestPattern.test(requestText) ||
      narrowRequestPattern.test(requestText)) &&
    modifyingActionPattern.test(actionText)
  ) {
    evidence.push(
      "User request is read-only or narrowly scoped, but the proposed action would modify, publish, send, deploy, or charge.",
    );
    severity = maxSeverity(severity, "high");
  }

  if (
    narrowRequestPattern.test(requestText) &&
    broadTargetPattern.test(actionText)
  ) {
    evidence.push(
      "User request contains a narrowing term, but the proposed action targets a broad workspace, repository, project, or organization scope.",
    );
    severity = maxSeverity(severity, "medium");
  }

  const triggered = evidence.length > 0;

  return {
    type: "unauthorized_scope",
    triggered,
    confidence: triggered ? getConfidence(severity, evidence.length) : 0,
    severity: triggered ? severity : "low",
    evidence,
    recommendedDecision: triggered ? "revise_action" : "allow",
  };
};

function violatesNonNegotiable(rule: string, input: ActionGateInput): boolean {
  const normalizedRule = rule.toLowerCase();

  if (!/\b(never|do not|don't|must not|no)\b/.test(normalizedRule)) {
    return false;
  }

  const ruleSignals = getRuleSignals(normalizedRule);
  if (ruleSignals.length === 0) {
    return false;
  }

  const actionText = [
    getActionText(input),
    input.context?.environment,
    input.proposedAction.externalFacing ? "external-facing" : "",
    input.proposedAction.reversible === false ? "irreversible" : "",
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return ruleSignals.every((signal) => actionText.includes(signal));
}

function getRuleSignals(rule: string): string[] {
  const knownSignals = [
    "production",
    "prod",
    "delete",
    "remove",
    "destroy",
    "deploy",
    "release",
    "external",
    "email",
    "send",
    "publish",
    "charge",
    "payment",
    "secret",
    "password",
    "token",
    "pii",
  ];

  return knownSignals.filter((signal) => rule.includes(signal));
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

function maxSeverity(
  currentSeverity: GateSeverity,
  nextSeverity: GateSeverity,
): GateSeverity {
  const rank: Record<GateSeverity, number> = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1,
  };

  return rank[nextSeverity] > rank[currentSeverity]
    ? nextSeverity
    : currentSeverity;
}

function getConfidence(severity: GateSeverity, evidenceCount: number): number {
  const base = severity === "critical" ? 0.9 : severity === "high" ? 0.82 : 0.74;
  return Math.min(0.97, base + evidenceCount * 0.03);
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
