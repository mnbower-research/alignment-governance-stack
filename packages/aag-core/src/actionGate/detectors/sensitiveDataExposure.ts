import type {
  ActionGateInput,
  GateDetector,
  GateDetectorResult,
} from "../types";

type SensitiveFinding = {
  path: string;
  kind: "secret_field" | "secret_value" | "personal_data";
};

const exposureActionPattern =
  /\b(send|email|message|publish|post|share|upload|log|webhook|notify|slack|sms|http|request)\b/i;
const sensitiveKeyPattern =
  /\b(password|passwd|secret|api[_-]?key|token|access[_-]?token|refresh[_-]?token|private[_-]?key|authorization|cookie|session|ssn|credit[_-]?card|card[_-]?number)\b/i;
const secretValuePattern =
  /(-----BEGIN [A-Z ]+PRIVATE KEY-----|\bAKIA[0-9A-Z]{16}\b|\bsk-[A-Za-z0-9_-]{16,}\b|\bBearer\s+[A-Za-z0-9._-]{16,})/i;
const ssnPattern = /\b\d{3}-\d{2}-\d{4}\b/;
const creditCardPattern = /\b(?:\d[ -]*?){13,19}\b/;
const sensitiveRequestPattern =
  /\b(password|secret|api key|token|private key|ssn|social security|credit card|card number|authorization header|cookie|session)\b/i;

export const detectSensitiveDataExposure: GateDetector = (
  input: ActionGateInput,
): GateDetectorResult => {
  const actionText = getActionText(input);
  const isExposureAction =
    Boolean(input.proposedAction.externalFacing) ||
    exposureActionPattern.test(actionText);

  if (!isExposureAction) {
    return {
      type: "sensitive_data_exposure",
      triggered: false,
      confidence: 0,
      severity: "low",
      evidence: [],
      recommendedDecision: "allow",
    };
  }

  const findings = collectSensitiveFindings(input.proposedAction.payload);
  const evidence = findings.map((finding) =>
    getFindingEvidence(finding, input.proposedAction.externalFacing),
  );

  const requestSensitiveMatch = input.userRequest.match(sensitiveRequestPattern);
  if (requestSensitiveMatch) {
    evidence.push(
      `User request mentions sensitive data category \`${requestSensitiveMatch[0].toLowerCase()}\`, and the proposed action would expose data outside the local action boundary.`,
    );
  }

  const triggered = evidence.length > 0;
  const hasSecret = findings.some((finding) => finding.kind !== "personal_data");

  return {
    type: "sensitive_data_exposure",
    triggered,
    confidence: triggered ? Math.min(0.99, 0.88 + evidence.length * 0.03) : 0,
    severity: triggered && hasSecret ? "critical" : triggered ? "high" : "low",
    evidence,
    recommendedDecision: triggered ? "block" : "allow",
  };
};

function collectSensitiveFindings(
  value: unknown,
  path = "payload",
): SensitiveFinding[] {
  if (value === null || value === undefined) {
    return [];
  }

  if (typeof value === "string") {
    if (secretValuePattern.test(value)) {
      return [{ path, kind: "secret_value" }];
    }

    if (ssnPattern.test(value) || creditCardPattern.test(value)) {
      return [{ path, kind: "personal_data" }];
    }

    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      collectSensitiveFindings(item, `${path}[${index}]`),
    );
  }

  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).flatMap(
      ([key, entryValue]) => {
        const nextPath = `${path}.${key}`;
        const keyFinding = sensitiveKeyPattern.test(key)
          ? [{ path: nextPath, kind: getSensitiveKeyKind(key) }]
          : [];

        return [...keyFinding, ...collectSensitiveFindings(entryValue, nextPath)];
      },
    );
  }

  return [];
}

function getSensitiveKeyKind(key: string): SensitiveFinding["kind"] {
  return /\b(ssn|credit[_-]?card|card[_-]?number)\b/i.test(key)
    ? "personal_data"
    : "secret_field";
}

function getFindingEvidence(
  finding: SensitiveFinding,
  externalFacing: boolean | undefined,
): string {
  const exposureBoundary = externalFacing
    ? "an external-facing action"
    : "a send, publish, upload, log, webhook, or request action";

  if (finding.kind === "personal_data") {
    return `Payload path \`${finding.path}\` appears to contain personal or financial data and would be used in ${exposureBoundary}.`;
  }

  if (finding.kind === "secret_value") {
    return `Payload path \`${finding.path}\` appears to contain a secret value and would be used in ${exposureBoundary}.`;
  }

  return `Payload path \`${finding.path}\` is named like a secret credential and would be used in ${exposureBoundary}.`;
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
