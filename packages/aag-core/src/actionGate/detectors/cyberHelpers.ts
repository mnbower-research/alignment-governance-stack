import type { ActionGateInput } from "../types";

const terminalToolPattern =
  /\b(shell|terminal|cli|command|cmd|powershell|bash|zsh|sh|exec|process|spawn|script|system)\b/i;

export function getPayloadText(input: ActionGateInput): string {
  const payload = input.proposedAction.payload;

  if (!payload) {
    return "";
  }

  try {
    return JSON.stringify(payload);
  } catch {
    return "";
  }
}

export function getCommandText(input: ActionGateInput): string {
  const payload = input.proposedAction.payload ?? {};
  const commandFields = [
    "command",
    "cmd",
    "script",
    "args",
    "argv",
    "input",
    "query",
    "body",
  ];
  const commandParts = commandFields
    .map((field) => payload[field])
    .filter((value) => value !== undefined)
    .map((value) => stringifyValue(value));

  return [
    input.proposedAction.tool,
    input.proposedAction.actionType,
    input.proposedAction.target,
    ...commandParts,
  ]
    .filter(Boolean)
    .join(" ")
    .replace(/[_-]/g, " ");
}

export function isTerminalLikeTool(tool: string): boolean {
  return terminalToolPattern.test(tool.replace(/[_-]/g, " "));
}

export function targetIsAuthorized(input: ActionGateInput): boolean {
  const authorizedTargets = input.context?.authorizedTargets;

  if (!authorizedTargets || authorizedTargets.length === 0) {
    return false;
  }

  const actionTarget = normalizeTarget(input.proposedAction.target);
  const actionText = normalizeTarget(getCommandText(input));

  return authorizedTargets.some((target) => {
    const normalizedTarget = normalizeTarget(target);
    return (
      normalizedTarget.length > 0 &&
      (actionTarget.includes(normalizedTarget) ||
        actionText.includes(normalizedTarget))
    );
  });
}

export function actionTypeIsAuthorized(input: ActionGateInput): boolean {
  const authorizedActionTypes = input.context?.authorizedActionTypes;

  if (!authorizedActionTypes || authorizedActionTypes.length === 0) {
    return false;
  }

  const actionType = normalizeTarget(input.proposedAction.actionType);
  const commandText = normalizeTarget(getCommandText(input));

  return authorizedActionTypes.some((authorizedActionType) => {
    const normalizedActionType = normalizeTarget(authorizedActionType);
    return (
      normalizedActionType.length > 0 &&
      (actionType.includes(normalizedActionType) ||
        commandText.includes(normalizedActionType))
    );
  });
}

export function containsAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

function stringifyValue(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}

function normalizeTarget(value: string | undefined): string {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/+$/g, "");
}
