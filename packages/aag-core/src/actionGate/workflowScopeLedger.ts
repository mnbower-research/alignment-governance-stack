import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { sha256Stable } from "./stableHash";
import type { GateDecision } from "./types";

export type WorkflowScope = {
  workflowId: string;
  originalIntent: string;
  allowedScope: string[];
  prohibitedScope: string[];
  createdAt: string;
  createdBy?: string;
  metadata?: Record<string, unknown>;
};

export type WorkflowActionEntry = {
  actionId: string;
  workflowId: string;
  actionType: string;
  target?: string;
  decision: GateDecision;
  receiptId?: string;
  riskFlags?: string[];
  createdAt: string;
  summary?: string;
};

export type WorkflowCumulativeRisk = "low" | "medium" | "high";
export type WorkflowScopeStatus =
  | "in_scope"
  | "scope_warning"
  | "scope_violation";

export type WorkflowScopeLedger = {
  workflowId: string;
  originalIntent: string;
  allowedScope: string[];
  prohibitedScope: string[];
  actions: WorkflowActionEntry[];
  cumulativeRisk: WorkflowCumulativeRisk;
  scopeStatus: WorkflowScopeStatus;
  scopeWarnings: string[];
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  metadata?: Record<string, unknown>;
};

export type WorkflowLogPaths = {
  ledgers: string;
  actions: string;
};

export const defaultWorkflowDirectory = path.join(".aag", "workflows");

const warningRiskFlags = new Set([
  "overclaim_risk",
  "legal_claim_risk",
  "incident_claim_risk",
  "roadmap_exposure_risk",
]);

const prohibitedActionTypes = new Set([
  "auto_post",
  "auto_dm",
  "disable_gate",
  "modify_policy",
  "unlock_policy",
  "delete_receipt",
  "disable_audit",
  "disable_receipts",
]);

export function createWorkflowScope(input: {
  originalIntent: string;
  allowedScope: string[];
  prohibitedScope: string[];
  createdBy?: string;
  metadata?: Record<string, unknown>;
}): WorkflowScopeLedger {
  validateWorkflowScopeInput(input);

  const createdAt = new Date().toISOString();
  const workflowId = createWorkflowId({
    originalIntent: input.originalIntent,
    allowedScope: input.allowedScope,
    prohibitedScope: input.prohibitedScope,
    createdAt,
  });

  return evaluateWorkflowScope({
    workflowId,
    originalIntent: input.originalIntent,
    allowedScope: input.allowedScope,
    prohibitedScope: input.prohibitedScope,
    actions: [],
    cumulativeRisk: "low",
    scopeStatus: "in_scope",
    scopeWarnings: [],
    createdAt,
    updatedAt: createdAt,
    ...(input.createdBy ? { createdBy: input.createdBy } : {}),
    ...(input.metadata ? { metadata: input.metadata } : {}),
  });
}

export function appendWorkflowAction(input: {
  ledger: WorkflowScopeLedger;
  action: Omit<WorkflowActionEntry, "createdAt">;
}): WorkflowScopeLedger {
  if (input.action.workflowId !== input.ledger.workflowId) {
    throw new Error("Action workflowId does not match ledger workflowId.");
  }

  const createdAt = new Date().toISOString();
  const nextLedger: WorkflowScopeLedger = {
    ...input.ledger,
    actions: [
      ...input.ledger.actions,
      {
        ...input.action,
        createdAt,
      },
    ],
    updatedAt: createdAt,
  };

  return evaluateWorkflowScope(nextLedger);
}

export function evaluateWorkflowScope(
  ledger: WorkflowScopeLedger,
): WorkflowScopeLedger {
  const warnings: string[] = [];
  let hasViolation = false;
  let hasWarning = false;

  for (const action of ledger.actions) {
    const evaluation = evaluateActionScope(ledger, action);

    warnings.push(...evaluation.warnings);
    hasWarning = hasWarning || evaluation.scopeStatus === "scope_warning";
    hasViolation = hasViolation || evaluation.scopeStatus === "scope_violation";
  }

  const scopeStatus: WorkflowScopeStatus = hasViolation
    ? "scope_violation"
    : hasWarning
      ? "scope_warning"
      : "in_scope";
  const cumulativeRisk: WorkflowCumulativeRisk = hasViolation
    ? "high"
    : hasWarning
      ? "medium"
      : "low";

  return {
    ...ledger,
    cumulativeRisk,
    scopeStatus,
    scopeWarnings: unique(warnings),
  };
}

export function writeWorkflowLedger(
  ledger: WorkflowScopeLedger,
  workflowDirectory = defaultWorkflowDirectory,
): WorkflowLogPaths {
  const paths = ensureWorkflowLogFiles(workflowDirectory);

  appendJsonl(paths.ledgers, ledger);

  return paths;
}

export function writeWorkflowAction(
  action: WorkflowActionEntry,
  workflowDirectory = defaultWorkflowDirectory,
): WorkflowLogPaths {
  const paths = ensureWorkflowLogFiles(workflowDirectory);

  appendJsonl(paths.actions, action);

  return paths;
}

export function writeWorkflowLedgerUpdate(
  ledger: WorkflowScopeLedger,
  action?: WorkflowActionEntry,
  workflowDirectory = defaultWorkflowDirectory,
): WorkflowLogPaths {
  const paths = ensureWorkflowLogFiles(workflowDirectory);

  if (action) {
    appendJsonl(paths.actions, action);
  }

  appendJsonl(paths.ledgers, ledger);

  return paths;
}

export function loadLatestWorkflowLedger(
  workflowId: string,
  workflowDirectory = defaultWorkflowDirectory,
): WorkflowScopeLedger {
  const ledgerPath = path.join(workflowDirectory, "ledgers.jsonl");

  if (!existsSync(ledgerPath)) {
    throw new Error(`No workflow ledgers found for ${workflowId}.`);
  }

  const lines = readFileSync(ledgerPath, "utf8")
    .split("\n")
    .filter((line) => line.trim().length > 0);
  let latest: WorkflowScopeLedger | undefined;

  for (const line of lines) {
    const parsed = JSON.parse(line) as unknown;

    if (isWorkflowScopeLedger(parsed) && parsed.workflowId === workflowId) {
      latest = parsed;
    }
  }

  if (!latest) {
    throw new Error(`Workflow not found: ${workflowId}.`);
  }

  return latest;
}

export function formatWorkflowStartReport(
  ledger: WorkflowScopeLedger,
  ledgerPath = path.join(defaultWorkflowDirectory, "ledgers.jsonl"),
): string {
  return [
    "AAG Workflow Scope Ledger",
    "",
    `Workflow ID: ${ledger.workflowId}`,
    `Intent: ${ledger.originalIntent}`,
    `Status: ${ledger.scopeStatus}`,
    `Cumulative Risk: ${ledger.cumulativeRisk}`,
    "",
    `Ledger written: ${formatDisplayPath(ledgerPath)}`,
  ].join("\n");
}

export function formatWorkflowAddActionReport(
  ledger: WorkflowScopeLedger,
  action: WorkflowActionEntry,
): string {
  return [
    "AAG Workflow Scope Ledger",
    "",
    `Workflow ID: ${ledger.workflowId}`,
    `Added Action: ${action.actionType}`,
    `Decision: ${action.decision}`,
    `Scope Status: ${ledger.scopeStatus}`,
    `Cumulative Risk: ${ledger.cumulativeRisk}`,
  ].join("\n");
}

export function formatWorkflowStatusReport(
  ledger: WorkflowScopeLedger,
): string {
  const lines = [
    "AAG Workflow Scope Ledger",
    "",
    `Workflow ID: ${ledger.workflowId}`,
    `Intent: ${ledger.originalIntent}`,
    `Actions: ${ledger.actions.length}`,
    `Scope Status: ${ledger.scopeStatus}`,
    `Cumulative Risk: ${ledger.cumulativeRisk}`,
  ];

  if (ledger.scopeWarnings.length > 0) {
    lines.push("", "Warnings:", ...ledger.scopeWarnings.map((warning) => `- ${warning}`));
  }

  return lines.join("\n");
}

export function createWorkflowActionId(input: {
  workflowId: string;
  actionType: string;
  target?: string;
  summary?: string;
}): string {
  const hash = sha256Stable({
    ...input,
    createdAt: new Date().toISOString(),
  });

  return `act_${hash.slice("sha256:".length, "sha256:".length + 12)}`;
}

function evaluateActionScope(
  ledger: WorkflowScopeLedger,
  action: WorkflowActionEntry,
): { scopeStatus: WorkflowScopeStatus; warnings: string[] } {
  const warnings: string[] = [];
  let hasViolation = false;
  let hasWarning = false;

  if (isProhibitedAction(ledger, action.actionType)) {
    hasViolation = true;
    warnings.push(`Prohibited action attempted: ${action.actionType}`);
  }

  if (action.decision === "block") {
    hasViolation = true;
    warnings.push("Action was blocked.");
  }

  if (!isActionAllowedByScope(action.actionType, ledger.allowedScope)) {
    hasWarning = true;
    warnings.push(`Action type is not clearly allowed by scope: ${action.actionType}`);
  }

  if (action.target && isTargetUnrelatedToIntent(action.target, ledger.originalIntent)) {
    hasWarning = true;
    warnings.push(`Target appears unrelated to original intent: ${action.target}`);
  }

  if (action.decision === "require_approval") {
    hasWarning = true;
    warnings.push("Action required approval.");
  }

  for (const riskFlag of action.riskFlags ?? []) {
    if (warningRiskFlags.has(riskFlag)) {
      hasWarning = true;
      warnings.push(`Risk flag detected: ${riskFlag}`);
    }

    if (
      riskFlag === "specific_company_claim_risk" &&
      isPublicPostingAction(action.actionType)
    ) {
      hasViolation = true;
      warnings.push("Specific company claim risk detected in public posting action.");
    }
  }

  if (attemptsPublishingWithoutApproval(action)) {
    hasViolation = true;
    warnings.push("Action attempts to publish without human approval.");
  }

  return {
    scopeStatus: hasViolation
      ? "scope_violation"
      : hasWarning
        ? "scope_warning"
        : "in_scope",
    warnings,
  };
}

function validateWorkflowScopeInput(input: {
  originalIntent: string;
  allowedScope: string[];
  prohibitedScope: string[];
}): void {
  if (!input.originalIntent.trim()) {
    throw new Error("originalIntent is required.");
  }

  if (input.allowedScope.length === 0) {
    throw new Error("allowedScope must include at least one item.");
  }
}

function isProhibitedAction(
  ledger: WorkflowScopeLedger,
  actionType: string,
): boolean {
  const normalizedAction = normalizeScopeText(actionType);

  if (prohibitedActionTypes.has(normalizedAction.replace(/\s+/g, "_"))) {
    return true;
  }

  return ledger.prohibitedScope.some((scopeItem) => {
    const normalizedScope = normalizeScopeText(scopeItem);

    return (
      normalizedScope.includes(normalizedAction) ||
      normalizedAction.includes(normalizedScope) ||
      haveSharedActionWords(normalizedAction, normalizedScope)
    );
  });
}

function isActionAllowedByScope(
  actionType: string,
  allowedScope: string[],
): boolean {
  const normalizedAction = normalizeScopeText(actionType);
  const actionWords = meaningfulWords(normalizedAction);

  return allowedScope.some((scopeItem) => {
    const normalizedScope = normalizeScopeText(scopeItem);
    const scopeWords = meaningfulWords(normalizedScope);

    return (
      normalizedScope.includes(normalizedAction) ||
      normalizedAction.includes(normalizedScope) ||
      actionWords.every((word) => scopeWords.includes(word) || scopeWords.includes(`${word}s`))
    );
  });
}

function haveSharedActionWords(left: string, right: string): boolean {
  const leftWords = meaningfulWords(left);
  const rightWords = meaningfulWords(right);

  return leftWords.length > 0 && leftWords.every((word) => rightWords.includes(word));
}

function isTargetUnrelatedToIntent(target: string, originalIntent: string): boolean {
  const targetWords = meaningfulWords(normalizeScopeText(target));
  const intentWords = meaningfulWords(normalizeScopeText(originalIntent));

  if (targetWords.length === 0 || intentWords.length === 0) {
    return false;
  }

  return !targetWords.some((word) => intentWords.includes(word));
}

function attemptsPublishingWithoutApproval(action: WorkflowActionEntry): boolean {
  const actionType = normalizeScopeText(action.actionType).replace(/\s+/g, "_");

  if (
    actionType.startsWith("draft_") ||
    actionType.startsWith("prepare_") ||
    actionType.startsWith("save_")
  ) {
    return false;
  }

  return (
    ["publish", "auto_post", "send_dm", "auto_dm"].some((term) =>
      actionType.includes(term),
    ) && action.decision === "allow"
  );
}

function isPublicPostingAction(actionType: string): boolean {
  const normalized = normalizeScopeText(actionType);

  return /(post|repost|comment|publish|dm|original)/i.test(normalized);
}

function ensureWorkflowLogFiles(workflowDirectory: string): WorkflowLogPaths {
  mkdirSync(workflowDirectory, { recursive: true });

  const paths = {
    ledgers: path.join(workflowDirectory, "ledgers.jsonl"),
    actions: path.join(workflowDirectory, "actions.jsonl"),
  };

  ensureJsonlFile(paths.ledgers);
  ensureJsonlFile(paths.actions);

  return paths;
}

function appendJsonl(filePath: string, value: unknown): void {
  appendFileSync(filePath, `${JSON.stringify(value)}\n`, "utf8");
}

function ensureJsonlFile(filePath: string): void {
  if (!existsSync(filePath)) {
    writeFileSync(filePath, "", "utf8");
  }
}

function createWorkflowId(value: unknown): string {
  const hash = sha256Stable(value);

  return `wf_${hash.slice("sha256:".length, "sha256:".length + 12)}`;
}

function isWorkflowScopeLedger(value: unknown): value is WorkflowScopeLedger {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    typeof (value as WorkflowScopeLedger).workflowId === "string" &&
    Array.isArray((value as WorkflowScopeLedger).actions)
  );
}

function normalizeScopeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function meaningfulWords(value: string): string[] {
  return normalizeScopeText(value)
    .split(" ")
    .filter((word) => word.length > 2)
    .map((word) => singularize(word));
}

function singularize(word: string): string {
  return word.endsWith("s") ? word.slice(0, -1) : word;
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

function formatDisplayPath(filePath: string): string {
  return filePath.replace(/\\/g, "/");
}
