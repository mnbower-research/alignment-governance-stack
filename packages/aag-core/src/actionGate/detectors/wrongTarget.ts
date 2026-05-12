import type {
  ActionGateInput,
  GateDetector,
  GateDetectorResult,
  GateSeverity,
} from "../types";

const emailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const urlPattern = /\bhttps?:\/\/[^\s"'<>]+/gi;
const pathPattern =
  /(?:[A-Za-z]:\\|\.{1,2}[\\/]|\/)?(?:[\w.-]+[\\/])+[\w.-]+/g;
const impactfulActionPattern =
  /\b(send|email|message|publish|share|delete|remove|deploy|charge|modify|update|write|move|rename)\b/i;

export const detectWrongTarget: GateDetector = (
  input: ActionGateInput,
): GateDetectorResult => {
  const actionText = getActionText(input);
  const evidence: string[] = [];

  const requestEmails = collectMatches(input.userRequest, emailPattern);
  const actionEmails = collectMatches(actionText, emailPattern);

  if (
    requestEmails.length > 0 &&
    actionEmails.length > 0 &&
    !hasOverlap(requestEmails, actionEmails)
  ) {
    evidence.push(
      `User request names ${formatList(
        requestEmails,
      )}, but proposed action targets ${formatList(actionEmails)}.`,
    );
  }

  const requestUrls = collectMatches(input.userRequest, urlPattern);
  const actionUrls = collectMatches(actionText, urlPattern);

  if (
    requestUrls.length > 0 &&
    actionUrls.length > 0 &&
    !hasOverlap(requestUrls, actionUrls)
  ) {
    evidence.push(
      `User request references ${formatList(
        requestUrls,
      )}, but proposed action targets ${formatList(actionUrls)}.`,
    );
  }

  const requestPaths = collectMatches(input.userRequest, pathPattern);
  const actionPaths = collectMatches(actionText, pathPattern);

  if (
    requestPaths.length > 0 &&
    actionPaths.length > 0 &&
    !hasOverlap(requestPaths, actionPaths)
  ) {
    evidence.push(
      `User request references path ${formatList(
        requestPaths,
      )}, but proposed action targets ${formatList(actionPaths)}.`,
    );
  }

  const triggered = evidence.length > 0;
  const severity = getSeverity(input, triggered);

  return {
    type: "wrong_target",
    triggered,
    confidence: triggered ? getConfidence(evidence.length, severity) : 0,
    severity,
    evidence,
    recommendedDecision: triggered
      ? "block"
      : "allow",
  };
};

function getActionText(input: ActionGateInput): string {
  return [
    input.proposedAction.tool,
    input.proposedAction.actionType,
    input.proposedAction.target,
    stringifyPayload(input.proposedAction.payload),
  ]
    .filter(Boolean)
    .join(" ");
}

function collectMatches(text: string, pattern: RegExp): string[] {
  const matches = text.match(pattern) ?? [];
  return [...new Set(matches.map((match) => normalizeTarget(match)))];
}

function hasOverlap(left: string[], right: string[]): boolean {
  const rightSet = new Set(right);
  return left.some((item) => rightSet.has(item));
}

function getSeverity(
  input: ActionGateInput,
  triggered: boolean,
): GateSeverity {
  if (!triggered) {
    return "low";
  }

  const actionText = getActionText(input);
  const impactful =
    input.proposedAction.externalFacing ||
    input.proposedAction.reversible === false ||
    impactfulActionPattern.test(actionText);

  return impactful ? "critical" : "high";
}

function getConfidence(evidenceCount: number, severity: GateSeverity): number {
  const base = severity === "critical" ? 0.92 : 0.84;
  return Math.min(0.98, base + evidenceCount * 0.02);
}

function formatList(values: string[]): string {
  return values.map((value) => `\`${value}\``).join(", ");
}

function normalizeTarget(value: string): string {
  return value.trim().replace(/[),.;]+$/g, "").toLowerCase();
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
