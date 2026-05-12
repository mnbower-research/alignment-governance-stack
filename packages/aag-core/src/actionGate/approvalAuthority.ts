import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  readReceiptChain,
  type ReceiptChainEntry,
  type ReceiptChainSource,
} from "./receiptHashChain";

export type AuthorityRiskLevel = "low" | "medium" | "high" | "critical";

export type AuthorityDecision =
  | "valid"
  | "missing_authority"
  | "out_of_scope"
  | "expired"
  | "requires_second_approval"
  | "unknown";

export type ApprovalAuthorityRule = {
  authorityId: string;
  authorityName: string;
  role: string;
  source: string;
  allowedActionTypes: string[];
  allowedRiskLevels: AuthorityRiskLevel[];
  allowedTargets: string[];
  allowedScopes: string[];
  canApproveIrreversible: boolean;
  canApproveExternalPosting: boolean;
  requiresSecondApprovalAboveRisk: AuthorityRiskLevel | null;
  expiresAt: string | null;
  notes?: string[];
};

export type ApprovalAuthorityMap = {
  authorityMapVersion: "1.0.0";
  defaultMode: "require_explicit_authority";
  authorities: ApprovalAuthorityRule[];
};

export type ApprovalAuthorityMetadata = {
  authorityId: string | null;
  authorityName: string | null;
  authoritySource: string;
  authorityRole?: string;
  authorityValidAtDecision: boolean;
  authorityMatched: boolean;
  authorityDecision: AuthorityDecision;
  authorityBasis: string[];
  authoritySnapshotHash: string;
  authorityAppliedAt: string;
  actionType?: string;
  target?: string;
  riskLevel?: string;
  scope?: string;
  requiresSecondApproval?: boolean;
  notes?: string[];
};

export type ApprovalAuthorityInput = {
  authorityId?: string | null;
  authorityName?: string | null;
  authorityMap?: ApprovalAuthorityMap;
  authorityAppliedAt?: string;
  actionType?: string;
  target?: string;
  riskLevel?: string;
  scope?: string;
  irreversible?: boolean;
  externalPosting?: boolean;
  secondApprovalPresent?: boolean;
  receipt?: Record<string, unknown>;
  notes?: string[];
};

export type ApprovalAuthorityResult = ApprovalAuthorityMetadata;

export type ApprovalAuthorityValidationResult = {
  valid: boolean;
  hasApprovalAuthority: boolean;
  issues: string[];
  approvalAuthority?: ApprovalAuthorityMetadata;
};

export type ApprovalAuthorityCoverageResult = {
  totalReceiptsScanned: number;
  receiptsWithApprovalAuthority: number;
  legacyReceiptsWithoutApprovalAuthority: number;
  invalidApprovalAuthorityEntries: number;
  validAuthorityDecisions: number;
  missingAuthorityDecisions: number;
  outOfScopeAuthorityDecisions: number;
  expiredAuthorityDecisions: number;
  secondApprovalRequiredDecisions: number;
  uniqueAuthorityIds: string[];
  authoritySourcesFound: string[];
  latestAuthorityEntry: {
    file: string;
    line?: number;
    approvalAuthority: ApprovalAuthorityMetadata;
  } | null;
  valid: boolean;
  issues: Array<{
    file: string;
    line?: number;
    issue: string;
  }>;
};

export type ApprovalAuthorityCoverageOptions = {
  rootDir?: string;
  receiptsDir?: string;
  distributionReceiptsPath?: string;
  source?: ReceiptChainSource;
};

export const defaultAuthorityMapPath = path.join(
  ".aag",
  "authority-map.json",
);

const validAuthorityDecisions = new Set<AuthorityDecision>([
  "valid",
  "missing_authority",
  "out_of_scope",
  "expired",
  "requires_second_approval",
  "unknown",
]);
const sha256HashPattern = /^sha256:[a-f0-9]{64}$/;
const riskOrder: AuthorityRiskLevel[] = ["low", "medium", "high", "critical"];

export function buildDefaultAuthorityMap(): ApprovalAuthorityMap {
  return {
    authorityMapVersion: "1.0.0",
    defaultMode: "require_explicit_authority",
    authorities: [
      {
        authorityId: "local-founder",
        authorityName: "Local Founder",
        role: "owner",
        source: "local_default",
        allowedActionTypes: [
          "comment_on_post",
          "repost_with_comment",
          "send_email",
          "launch_copilot_demo",
          "save_opportunity",
          "draft_comment",
          "draft_repost",
        ],
        allowedRiskLevels: ["low", "medium", "high"],
        allowedTargets: ["linkedin", "x", "demo", "local", "teammate@example.test"],
        allowedScopes: ["distribution", "demo", "governance"],
        canApproveIrreversible: false,
        canApproveExternalPosting: true,
        requiresSecondApprovalAboveRisk: "high",
        expiresAt: null,
        notes: ["Default local development authority. Replace in production."],
      },
    ],
  };
}

export function loadAuthorityMap(options: {
  authorityMapPath?: string;
  rootDir?: string;
} = {}): ApprovalAuthorityMap {
  const rootDir = options.rootDir ?? process.cwd();
  const authorityMapPath = resolvePath(
    rootDir,
    options.authorityMapPath ?? defaultAuthorityMapPath,
  );

  if (!existsSync(authorityMapPath)) {
    return buildDefaultAuthorityMap();
  }

  const parsed = JSON.parse(readFileSync(authorityMapPath, "utf8")) as unknown;

  if (!isAuthorityMap(parsed)) {
    throw new Error(`Invalid authority map: ${authorityMapPath}`);
  }

  return parsed;
}

export function canonicalizeAuthoritySnapshot(input: unknown): string {
  return JSON.stringify(sortObjectKeysDeep(input));
}

export function hashAuthoritySnapshot(input: unknown): string {
  return `sha256:${createHash("sha256")
    .update(canonicalizeAuthoritySnapshot(input))
    .digest("hex")}`;
}

export function evaluateApprovalAuthority(
  input: ApprovalAuthorityInput,
  authorityMap: ApprovalAuthorityMap,
): ApprovalAuthorityResult {
  const receipt = input.receipt ?? {};
  const authorityAppliedAt =
    input.authorityAppliedAt ??
    stringValue(receipt.createdAt) ??
    new Date().toISOString();
  const actionType = input.actionType ?? inferActionType(receipt);
  const target = normalizeTarget(input.target ?? inferTarget(receipt));
  const riskLevel = normalizeRiskLevel(input.riskLevel ?? inferRiskLevel(receipt));
  const scope = input.scope ?? inferScope(receipt);
  const irreversible = input.irreversible ?? inferIrreversible(receipt);
  const externalPosting = input.externalPosting ?? inferExternalPosting(receipt);
  const requestedAuthorityId = input.authorityId ?? null;
  const authority = requestedAuthorityId
    ? authorityMap.authorities.find(
        (entry) => entry.authorityId === requestedAuthorityId,
      )
    : undefined;
  const authorityBasis: string[] = [];
  let authorityDecision: AuthorityDecision = "unknown";
  let authorityMatched = false;
  let authorityValidAtDecision = false;
  let requiresSecondApproval = false;

  if (!requestedAuthorityId) {
    authorityDecision = "missing_authority";
    authorityBasis.push("No approving authority was provided.");
  } else if (!authority) {
    authorityDecision = "missing_authority";
    authorityBasis.push(`Authority not found: ${requestedAuthorityId}`);
  } else {
    authorityMatched = true;
    authorityBasis.push(`Authority matched: ${authority.authorityId}`);

    if (isExpired(authority.expiresAt, authorityAppliedAt)) {
      authorityDecision = "expired";
      authorityBasis.push(`Authority expired at ${authority.expiresAt}.`);
    } else if (
      !isAllowed(actionType, authority.allowedActionTypes) ||
      !isAllowed(target, authority.allowedTargets) ||
      !isAllowed(scope, authority.allowedScopes) ||
      !isRiskAllowed(riskLevel, authority.allowedRiskLevels) ||
      (irreversible && !authority.canApproveIrreversible) ||
      (externalPosting && !authority.canApproveExternalPosting)
    ) {
      authorityDecision = "out_of_scope";
      authorityBasis.push(...outOfScopeReasons({
        authority,
        actionType,
        target,
        scope,
        riskLevel,
        irreversible,
        externalPosting,
      }));
    } else if (
      needsSecondApproval(riskLevel, authority.requiresSecondApprovalAboveRisk) ||
      (irreversible && !input.secondApprovalPresent)
    ) {
      requiresSecondApproval = true;
      authorityDecision = input.secondApprovalPresent
        ? "valid"
        : "requires_second_approval";
      authorityValidAtDecision = input.secondApprovalPresent === true;
      authorityBasis.push(
        input.secondApprovalPresent
          ? "Second approval requirement was satisfied."
          : "Second approval is required for this authority context.",
      );
    } else {
      authorityDecision = "valid";
      authorityValidAtDecision = true;
      authorityBasis.push("Authority is valid for this action context.");
    }
  }

  const snapshot = {
    authorityId: requestedAuthorityId,
    authorityName: authority?.authorityName ?? input.authorityName ?? null,
    authoritySource: authority?.source ?? "unknown",
    authorityRole: authority?.role,
    authorityDecision,
    authorityMatched,
    authorityValidAtDecision,
    authorityAppliedAt,
    actionType,
    target,
    riskLevel,
    scope,
    irreversible,
    externalPosting,
    requiresSecondApproval,
    authorityMapVersion: authorityMap.authorityMapVersion,
    defaultMode: authorityMap.defaultMode,
    authority,
  };

  return {
    authorityId: authority?.authorityId ?? requestedAuthorityId,
    authorityName: authority?.authorityName ?? input.authorityName ?? null,
    authoritySource: authority?.source ?? "unknown",
    ...(authority?.role ? { authorityRole: authority.role } : {}),
    authorityValidAtDecision,
    authorityMatched,
    authorityDecision,
    authorityBasis: uniqueStrings([...authorityBasis, ...(input.notes ?? [])]),
    authoritySnapshotHash: hashAuthoritySnapshot(snapshot),
    authorityAppliedAt,
    ...(actionType ? { actionType } : {}),
    ...(target ? { target } : {}),
    ...(riskLevel ? { riskLevel } : {}),
    ...(scope ? { scope } : {}),
    ...(requiresSecondApproval ? { requiresSecondApproval } : {}),
    ...(authority?.notes || input.notes
      ? { notes: uniqueStrings([...(authority?.notes ?? []), ...(input.notes ?? [])]) }
      : {}),
  };
}

export function attachApprovalAuthority<T>(
  receipt: T,
  context: ApprovalAuthorityInput & { force?: boolean } = {},
): T & { approvalAuthority: ApprovalAuthorityMetadata } {
  if (!isRecord(receipt)) {
    throw new Error("Approval authority can only be attached to receipt objects.");
  }

  if (isRecord(receipt.approvalAuthority) && !context.force) {
    return receipt as T & { approvalAuthority: ApprovalAuthorityMetadata };
  }

  const authorityMap = context.authorityMap ?? loadAuthorityMap();
  const approvalAuthority = evaluateApprovalAuthority(
    {
      ...context,
      receipt,
    },
    authorityMap,
  );

  return {
    ...(receipt as T & Record<string, unknown>),
    approvalAuthority,
  };
}

export function validateApprovalAuthority(
  receipt: unknown,
): ApprovalAuthorityValidationResult {
  if (!isRecord(receipt)) {
    return {
      valid: false,
      hasApprovalAuthority: false,
      issues: ["receipt entry is not a JSON object"],
    };
  }

  if (!isRecord(receipt.approvalAuthority)) {
    return {
      valid: true,
      hasApprovalAuthority: false,
      issues: [],
    };
  }

  const issues = validateApprovalAuthorityMetadata(receipt.approvalAuthority);

  return {
    valid: issues.length === 0,
    hasApprovalAuthority: true,
    issues,
    ...(issues.length === 0
      ? {
          approvalAuthority:
            receipt.approvalAuthority as ApprovalAuthorityMetadata,
        }
      : {}),
  };
}

export function scanApprovalAuthorityCoverage(
  options: ApprovalAuthorityCoverageOptions = {},
): ApprovalAuthorityCoverageResult {
  const entries = readReceiptChain(options);
  const issues: ApprovalAuthorityCoverageResult["issues"] = [];
  const authorityIds = new Set<string>();
  const authoritySources = new Set<string>();
  let receiptsWithApprovalAuthority = 0;
  let legacyReceiptsWithoutApprovalAuthority = 0;
  let invalidApprovalAuthorityEntries = 0;
  let validAuthorityDecisions = 0;
  let missingAuthorityDecisions = 0;
  let outOfScopeAuthorityDecisions = 0;
  let expiredAuthorityDecisions = 0;
  let secondApprovalRequiredDecisions = 0;
  let latestAuthorityEntry: ApprovalAuthorityCoverageResult["latestAuthorityEntry"] =
    null;

  for (const entry of entries) {
    if (entry.invalidJson) {
      invalidApprovalAuthorityEntries += 1;
      issues.push(locationIssue(entry, "invalid JSON receipt entry"));
      continue;
    }

    const result = validateApprovalAuthority(entry.receipt);

    if (!result.hasApprovalAuthority) {
      legacyReceiptsWithoutApprovalAuthority += 1;
      if (!result.valid) {
        invalidApprovalAuthorityEntries += 1;
        result.issues.forEach((issue) => issues.push(locationIssue(entry, issue)));
      }
      continue;
    }

    receiptsWithApprovalAuthority += 1;

    if (!result.valid || !result.approvalAuthority) {
      invalidApprovalAuthorityEntries += 1;
      result.issues.forEach((issue) => issues.push(locationIssue(entry, issue)));
      continue;
    }

    const metadata = result.approvalAuthority;
    if (metadata.authorityId) {
      authorityIds.add(metadata.authorityId);
    }
    authoritySources.add(metadata.authoritySource);

    if (metadata.authorityDecision === "valid") {
      validAuthorityDecisions += 1;
    }
    if (metadata.authorityDecision === "missing_authority") {
      missingAuthorityDecisions += 1;
    }
    if (metadata.authorityDecision === "out_of_scope") {
      outOfScopeAuthorityDecisions += 1;
    }
    if (metadata.authorityDecision === "expired") {
      expiredAuthorityDecisions += 1;
    }
    if (metadata.authorityDecision === "requires_second_approval") {
      secondApprovalRequiredDecisions += 1;
    }

    if (
      !latestAuthorityEntry ||
      metadata.authorityAppliedAt >=
        latestAuthorityEntry.approvalAuthority.authorityAppliedAt
    ) {
      latestAuthorityEntry = {
        file: entry.file,
        ...(entry.line ? { line: entry.line } : {}),
        approvalAuthority: metadata,
      };
    }
  }

  return {
    totalReceiptsScanned: entries.length,
    receiptsWithApprovalAuthority,
    legacyReceiptsWithoutApprovalAuthority,
    invalidApprovalAuthorityEntries,
    validAuthorityDecisions,
    missingAuthorityDecisions,
    outOfScopeAuthorityDecisions,
    expiredAuthorityDecisions,
    secondApprovalRequiredDecisions,
    uniqueAuthorityIds: Array.from(authorityIds).sort(),
    authoritySourcesFound: Array.from(authoritySources).sort(),
    latestAuthorityEntry,
    valid: invalidApprovalAuthorityEntries === 0,
    issues,
  };
}

export function formatApprovalAuthorityCoverage(
  result: ApprovalAuthorityCoverageResult,
): string {
  const lines = [
    "AAG Approval Authority Map",
    "",
    `Total receipts scanned: ${result.totalReceiptsScanned}`,
    `Receipts with approvalAuthority: ${result.receiptsWithApprovalAuthority}`,
    `Legacy receipts without approvalAuthority: ${result.legacyReceiptsWithoutApprovalAuthority}`,
    `Invalid approvalAuthority entries: ${result.invalidApprovalAuthorityEntries}`,
    `Valid authority decisions: ${result.validAuthorityDecisions}`,
    `Missing authority decisions: ${result.missingAuthorityDecisions}`,
    `Out-of-scope authority decisions: ${result.outOfScopeAuthorityDecisions}`,
    `Expired authority decisions: ${result.expiredAuthorityDecisions}`,
    `Second approval required decisions: ${result.secondApprovalRequiredDecisions}`,
    `Unique authority IDs: ${result.uniqueAuthorityIds.length}`,
    `Authority sources found: ${
      result.authoritySourcesFound.length > 0
        ? result.authoritySourcesFound.join(", ")
        : "none"
    }`,
  ];

  if (result.latestAuthorityEntry) {
    const latest = result.latestAuthorityEntry.approvalAuthority;
    lines.push(
      "",
      "Latest Authority Entry:",
      `Authority ID: ${latest.authorityId ?? "none"}`,
      `Authority Name: ${latest.authorityName ?? "none"}`,
      `Authority Source: ${latest.authoritySource}`,
      `Authority Decision: ${latest.authorityDecision}`,
      `Authority Valid At Decision: ${latest.authorityValidAtDecision}`,
      `Authority Snapshot Hash: ${latest.authoritySnapshotHash}`,
      `Authority Applied At: ${latest.authorityAppliedAt}`,
    );
  }

  if (result.legacyReceiptsWithoutApprovalAuthority > 0) {
    lines.push(
      "",
      "Warnings:",
      `- ${result.legacyReceiptsWithoutApprovalAuthority} legacy receipt(s) do not include approvalAuthority metadata.`,
    );
  }

  if (result.issues.length > 0) {
    lines.push("", "Issues:");
    result.issues.forEach((issue) => {
      const location = issue.line
        ? `${formatReportPath(issue.file)}:${issue.line}`
        : formatReportPath(issue.file);
      lines.push(`- ${location} - ${issue.issue}`);
    });
  }

  lines.push("", result.valid ? "AUTHORITY MAP PASS" : "AUTHORITY MAP FAIL");

  return lines.join("\n");
}

function validateApprovalAuthorityMetadata(
  value: Record<string, unknown>,
): string[] {
  const issues: string[] = [];

  if (
    value.authorityId !== null &&
    value.authorityId !== undefined &&
    typeof value.authorityId !== "string"
  ) {
    issues.push("missing or malformed approvalAuthority.authorityId");
  }

  if (
    value.authorityName !== null &&
    value.authorityName !== undefined &&
    typeof value.authorityName !== "string"
  ) {
    issues.push("missing or malformed approvalAuthority.authorityName");
  }

  if (typeof value.authoritySource !== "string" || !value.authoritySource) {
    issues.push("missing or malformed approvalAuthority.authoritySource");
  }

  if (typeof value.authorityValidAtDecision !== "boolean") {
    issues.push(
      "missing or malformed approvalAuthority.authorityValidAtDecision",
    );
  }

  if (typeof value.authorityMatched !== "boolean") {
    issues.push("missing or malformed approvalAuthority.authorityMatched");
  }

  if (
    typeof value.authorityDecision !== "string" ||
    !validAuthorityDecisions.has(value.authorityDecision as AuthorityDecision)
  ) {
    issues.push("missing or malformed approvalAuthority.authorityDecision");
  }

  if (!Array.isArray(value.authorityBasis)) {
    issues.push("missing or malformed approvalAuthority.authorityBasis");
  }

  if (
    typeof value.authoritySnapshotHash !== "string" ||
    !sha256HashPattern.test(value.authoritySnapshotHash)
  ) {
    issues.push("missing or malformed approvalAuthority.authoritySnapshotHash");
  }

  if (
    typeof value.authorityAppliedAt !== "string" ||
    Number.isNaN(new Date(value.authorityAppliedAt).getTime())
  ) {
    issues.push("missing or malformed approvalAuthority.authorityAppliedAt");
  }

  return issues;
}

function outOfScopeReasons(input: {
  authority: ApprovalAuthorityRule;
  actionType?: string;
  target?: string;
  scope?: string;
  riskLevel?: AuthorityRiskLevel;
  irreversible: boolean;
  externalPosting: boolean;
}): string[] {
  const reasons: string[] = [];

  if (!isAllowed(input.actionType, input.authority.allowedActionTypes)) {
    reasons.push(`Action type is outside authority: ${input.actionType ?? "unknown"}`);
  }
  if (!isAllowed(input.target, input.authority.allowedTargets)) {
    reasons.push(`Target is outside authority: ${input.target ?? "unknown"}`);
  }
  if (!isAllowed(input.scope, input.authority.allowedScopes)) {
    reasons.push(`Scope is outside authority: ${input.scope ?? "unknown"}`);
  }
  if (!isRiskAllowed(input.riskLevel, input.authority.allowedRiskLevels)) {
    reasons.push(`Risk level is outside authority: ${input.riskLevel ?? "unknown"}`);
  }
  if (input.irreversible && !input.authority.canApproveIrreversible) {
    reasons.push("Irreversible action is outside authority.");
  }
  if (input.externalPosting && !input.authority.canApproveExternalPosting) {
    reasons.push("External posting is outside authority.");
  }

  return reasons.length > 0 ? reasons : ["Authority is out of scope."];
}

function isAllowed(value: string | undefined, allowedValues: string[]): boolean {
  if (!value) {
    return false;
  }

  return allowedValues.includes(value) || allowedValues.includes("*");
}

function isRiskAllowed(
  riskLevel: AuthorityRiskLevel | undefined,
  allowedRiskLevels: AuthorityRiskLevel[],
): boolean {
  return Boolean(riskLevel && allowedRiskLevels.includes(riskLevel));
}

function isExpired(expiresAt: string | null, authorityAppliedAt: string): boolean {
  if (!expiresAt) {
    return false;
  }

  return new Date(expiresAt).getTime() < new Date(authorityAppliedAt).getTime();
}

function needsSecondApproval(
  riskLevel: AuthorityRiskLevel | undefined,
  threshold: AuthorityRiskLevel | null,
): boolean {
  if (!riskLevel || !threshold) {
    return false;
  }

  return riskOrder.indexOf(riskLevel) > riskOrder.indexOf(threshold);
}

function inferActionType(receipt: Record<string, unknown>): string | undefined {
  if (isRecord(receipt.reviewPacket) && typeof receipt.reviewPacket.proposedAction === "string") {
    return receipt.reviewPacket.proposedAction;
  }

  if (isRecord(receipt.proposedAction) && typeof receipt.proposedAction.actionType === "string") {
    return receipt.proposedAction.actionType;
  }

  return stringValue(receipt.actionType);
}

function inferTarget(receipt: Record<string, unknown>): string | undefined {
  if (typeof receipt.platform === "string") {
    return receipt.platform;
  }

  if (isRecord(receipt.proposedAction) && typeof receipt.proposedAction.target === "string") {
    return receipt.proposedAction.target;
  }

  return stringValue(receipt.target);
}

function inferRiskLevel(
  receipt: Record<string, unknown>,
): AuthorityRiskLevel | undefined {
  if (
    isRecord(receipt.reviewPacket) &&
    typeof receipt.reviewPacket.riskLevel === "string"
  ) {
    return normalizeRiskLevel(receipt.reviewPacket.riskLevel);
  }

  if (typeof receipt.riskLevel === "string") {
    return normalizeRiskLevel(receipt.riskLevel);
  }

  if (receipt.decision === "block") {
    return "high";
  }

  if (receipt.decision === "require_approval") {
    return "medium";
  }

  return "low";
}

function inferScope(receipt: Record<string, unknown>): string | undefined {
  if (receipt.metaGate === true || receipt.receiptType === "metagate_decision") {
    return "governance";
  }

  if (receipt.sourceTextHash || receipt.platform || receipt.goal) {
    return "distribution";
  }

  if (isRecord(receipt.proposedAction)) {
    const actionType = stringValue(receipt.proposedAction.actionType);
    if (actionType?.includes("demo")) {
      return "demo";
    }
  }

  return "local";
}

function inferIrreversible(receipt: Record<string, unknown>): boolean {
  return (
    (isRecord(receipt.proposedAction) &&
      receipt.proposedAction.reversible === false) ||
    /delete|disable|unlock|modify_policy|modify_config/i.test(
      `${inferActionType(receipt) ?? ""} ${stringValue(receipt.target) ?? ""}`,
    )
  );
}

function inferExternalPosting(receipt: Record<string, unknown>): boolean {
  return (
    Boolean(receipt.platform) ||
    (isRecord(receipt.proposedAction) &&
      receipt.proposedAction.externalFacing === true) ||
    /post|repost|comment|dm|email/i.test(inferActionType(receipt) ?? "")
  );
}

function normalizeTarget(value: string | undefined): string | undefined {
  return value?.toLowerCase();
}

function normalizeRiskLevel(
  value: string | undefined,
): AuthorityRiskLevel | undefined {
  if (
    value === "low" ||
    value === "medium" ||
    value === "high" ||
    value === "critical"
  ) {
    return value;
  }

  return undefined;
}

function isAuthorityMap(value: unknown): value is ApprovalAuthorityMap {
  return (
    isRecord(value) &&
    value.authorityMapVersion === "1.0.0" &&
    value.defaultMode === "require_explicit_authority" &&
    Array.isArray(value.authorities)
  );
}

function locationIssue(
  entry: ReceiptChainEntry,
  issue: string,
): { file: string; line?: number; issue: string } {
  return {
    file: entry.file,
    ...(entry.line ? { line: entry.line } : {}),
    issue,
  };
}

function sortObjectKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) =>
      item === undefined ? null : sortObjectKeysDeep(item),
    );
  }

  if (isRecord(value)) {
    const sorted: Record<string, unknown> = {};

    Object.keys(value)
      .sort((left, right) => left.localeCompare(right))
      .forEach((key) => {
        const entryValue = value[key];
        if (entryValue !== undefined) {
          sorted[key] = sortObjectKeysDeep(entryValue);
        }
      });

    return sorted;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  return null;
}

function resolvePath(rootDir: string, filePath: string): string {
  return path.isAbsolute(filePath) ? filePath : path.resolve(rootDir, filePath);
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean)),
  );
}

function formatReportPath(file: string): string {
  return file.replace(/\\/g, "/");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
