import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { ActionGateInput, ActionGateResult } from "../types";

const defaultLogPath = "logs/action-gate-decisions.jsonl";
const redactedCredentialAccess = "[redacted: possible credential access]";
const truncatedSuffix = "...[truncated]";

const sensitiveKeyPattern =
  /\b(password|passwd|pwd|secret|token|api[_-]?key|apikey|private[_-]?key|authorization|cookie|session|ssh|credential|access[_-]?key)\b/i;

const credentialValuePatterns = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/i,
  /\b[A-Z0-9_]*SECRET[A-Z0-9_]*\s*=/i,
  /\b[A-Z0-9_]*TOKEN[A-Z0-9_]*\s*=/i,
  /\b[A-Z0-9_]*PASSWORD[A-Z0-9_]*\s*=/i,
  /\bAWS_ACCESS_KEY_ID\s*=/i,
  /\bauthorization\s*:\s*(bearer|basic)\b/i,
  /\bcookie\s*:/i,
  /\b(api[_-]?key|token|password|secret|session)\s*[:=]\s*\S+/i,
  /\b\.env\b/i,
  /(?:^|\s|["'])~?\/?\.ssh\/[A-Za-z0-9_.-]+/i,
  /\bid_rsa\b/i,
  /\bid_ed25519\b/i,
  /\b(?:sk|pk|rk)_[A-Za-z0-9]{20,}\b/i,
  /\b[A-Za-z0-9+/=_-]{40,}\b/,
];

const commandKeyPattern = /\b(command|cmd|script|shell|args|argv)\b/i;

type PayloadSummary = Record<string, unknown> | null;

export function logDecision(
  input: ActionGateInput,
  result: ActionGateResult,
): void {
  if (decisionLoggingIsDisabled()) {
    return;
  }

  const logPath = getDecisionLogPath();
  const entry = {
    timestamp: new Date().toISOString(),
    decision: result.decision,
    riskLevel: result.riskLevel,
    primaryIssue: result.primaryIssue,
    confidence: result.confidence,
    tool: input.proposedAction.tool,
    actionType: input.proposedAction.actionType,
    target: input.proposedAction.target ?? null,
    reversible: input.proposedAction.reversible ?? null,
    externalFacing: input.proposedAction.externalFacing ?? null,
    environment: input.context?.environment ?? null,
    userApproved: input.context?.userApproved ?? null,
    recommendedAction: result.recommendedAction,
    evidence: result.evidence,
    triggeredDetectors: result.detectorResults
      .filter((detectorResult) => detectorResult.triggered)
      .map((detectorResult) => detectorResult.type),
    payloadSummary: createRedactedPayloadSummary(input.proposedAction.payload),
  };

  mkdirSync(dirname(logPath), { recursive: true });
  appendFileSync(logPath, `${JSON.stringify(entry)}\n`, "utf8");
}

export function createRedactedPayloadSummary(
  payload: ActionGateInput["proposedAction"]["payload"],
): PayloadSummary {
  if (!payload) {
    return null;
  }

  return Object.fromEntries(
    Object.entries(payload).map(([key, value]) => [
      key,
      summarizePayloadValue(key, value),
    ]),
  );
}

function summarizePayloadValue(key: string, value: unknown): unknown {
  if (sensitiveKeyPattern.test(key)) {
    return redactedCredentialAccess;
  }

  if (typeof value === "string") {
    return summarizeStringValue(key, value);
  }

  if (Array.isArray(value)) {
    return `[array length=${value.length}]`;
  }

  if (value && typeof value === "object") {
    return `[object keys=${Object.keys(value).join(",")}]`;
  }

  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    value === null
  ) {
    return value;
  }

  return typeof value;
}

function summarizeStringValue(key: string, value: string): string {
  if (containsCredentialLikeText(value)) {
    return redactedCredentialAccess;
  }

  const preview = truncateString(value);

  if (commandKeyPattern.test(key)) {
    return preview;
  }

  return preview;
}

function containsCredentialLikeText(value: string): boolean {
  return credentialValuePatterns.some((pattern) => pattern.test(value));
}

function truncateString(value: string): string {
  if (value.length <= 80) {
    return value;
  }

  return `${value.slice(0, 80)}${truncatedSuffix}`;
}

function decisionLoggingIsDisabled(): boolean {
  return process.env.AAG_DISABLE_DECISION_LOGS?.toLowerCase() === "true";
}

function getDecisionLogPath(): string {
  return process.env.AAG_DECISION_LOG_PATH || defaultLogPath;
}
