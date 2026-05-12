import { createHash } from "node:crypto";
import { receiptVersion } from "./aagConfig";
import {
  readReceiptChain,
  type ReceiptChainEntry,
  type ReceiptChainSource,
} from "./receiptHashChain";
import { sha256Stable } from "./stableHash";
import type { ActionGateResult, PolicyProfile } from "./types";

export type PolicySourceType =
  | "profile"
  | "config"
  | "default"
  | "metagate"
  | "distribution"
  | "unknown";

export type PolicyProvenance = {
  policyId: string;
  policyName: string;
  policyVersion: string;
  policySource: string;
  policySourceType: PolicySourceType;
  policyHash: string;
  policySnapshotHash: string;
  policyAppliedAt: string;
  matchedRules: string[];
  decisionBasis: string[];
  scopeBasis?: string[];
  configHash?: string;
  profileName?: string;
  profileVersion?: string;
  notes?: string[];
};

export type PolicyProvenanceInput = {
  receipt?: Record<string, unknown>;
  sourceType?: PolicySourceType;
  policyId?: string;
  policyName?: string;
  policyVersion?: string;
  policySource?: string;
  policyHash?: string;
  policyAppliedAt?: string;
  matchedRules?: string[];
  decisionBasis?: string[];
  scopeBasis?: string[];
  configHash?: string;
  profile?: PolicyProfile;
  result?: ActionGateResult;
  profileName?: string;
  profileVersion?: string;
  notes?: string[];
  snapshot?: Record<string, unknown>;
};

export type AttachPolicyProvenanceContext = PolicyProvenanceInput & {
  force?: boolean;
};

export type PolicyProvenanceEntryResult = {
  valid: boolean;
  hasPolicyProvenance: boolean;
  issues: string[];
  policyProvenance?: PolicyProvenance;
};

export type PolicyProvenanceCoverageResult = {
  totalReceiptsScanned: number;
  receiptsWithPolicyProvenance: number;
  legacyReceiptsWithoutPolicyProvenance: number;
  invalidPolicyProvenanceEntries: number;
  uniquePolicyIds: string[];
  uniquePolicyHashes: string[];
  policySourcesFound: string[];
  latestPolicyProvenanceEntry: {
    file: string;
    line?: number;
    policyProvenance: PolicyProvenance;
  } | null;
  valid: boolean;
  issues: Array<{
    file: string;
    line?: number;
    issue: string;
  }>;
};

type PolicyProvenanceCoverageOptions = {
  rootDir?: string;
  receiptsDir?: string;
  distributionReceiptsPath?: string;
  source?: ReceiptChainSource;
};

const sha256HashPattern = /^sha256:[a-f0-9]{64}$/;
const validSourceTypes = new Set<PolicySourceType>([
  "profile",
  "config",
  "default",
  "metagate",
  "distribution",
  "unknown",
]);

export function buildPolicyProvenance(
  input: PolicyProvenanceInput,
): PolicyProvenance {
  const receipt = input.receipt ?? {};
  const profile = input.profile;
  const policySourceType =
    input.sourceType ??
    inferPolicySourceType(receipt, profile);
  const profileName = input.profileName ?? profile?.name;
  const profileVersion = input.profileVersion ?? receiptVersion;
  const policyId =
    input.policyId ??
    profile?.id ??
    stringField(receipt.policyProfile, "id") ??
    policySourceType;
  const policyName =
    input.policyName ??
    profile?.name ??
    stringField(receipt.policyProfile, "name") ??
    defaultPolicyName(policySourceType);
  const policyVersion = input.policyVersion ?? profileVersion;
  const policySource =
    input.policySource ??
    profileName ??
    defaultPolicySource(policySourceType);
  const policyAppliedAt =
    input.policyAppliedAt ??
    stringValue(receipt.createdAt) ??
    new Date().toISOString();
  const matchedRules = uniqueStrings([
    ...(input.matchedRules ?? []),
    ...matchedRulesFromResult(input.result),
    ...matchedRulesFromReceipt(receipt),
  ]);
  const decisionBasis = uniqueStrings([
    ...(input.decisionBasis ?? []),
    ...decisionBasisFromResult(input.result),
    ...decisionBasisFromReceipt(receipt),
  ]);
  const scopeBasis = uniqueStrings([
    ...(input.scopeBasis ?? []),
    ...scopeBasisFromReceipt(receipt),
  ]);
  const configHash = input.configHash ?? stringValue(receipt.configHash);
  const policyHash =
    input.policyHash ??
    stringValue(receipt.policyHash) ??
    sha256Stable({
      policyId,
      policyName,
      policySource,
      policySourceType,
      profile,
      matchedRules,
    });
  const snapshot = {
    policyId,
    policyName,
    policyVersion,
    policySource,
    policySourceType,
    policyHash,
    matchedRules,
    decisionBasis,
    ...(scopeBasis.length > 0 ? { scopeBasis } : {}),
    ...(configHash ? { configHash } : {}),
    ...(profileName ? { profileName } : {}),
    ...(profileVersion ? { profileVersion } : {}),
    ...(input.notes && input.notes.length > 0 ? { notes: input.notes } : {}),
    ...(input.snapshot ?? {}),
  };

  return {
    policyId,
    policyName,
    policyVersion,
    policySource,
    policySourceType,
    policyHash,
    policySnapshotHash: hashPolicySnapshot(snapshot),
    policyAppliedAt,
    matchedRules,
    decisionBasis,
    ...(scopeBasis.length > 0 ? { scopeBasis } : {}),
    ...(configHash ? { configHash } : {}),
    ...(profileName ? { profileName } : {}),
    ...(profileVersion ? { profileVersion } : {}),
    ...(input.notes && input.notes.length > 0 ? { notes: input.notes } : {}),
  };
}

export function canonicalizePolicySnapshot(input: unknown): string {
  return JSON.stringify(sortObjectKeysDeep(input));
}

export function hashPolicySnapshot(input: unknown): string {
  return `sha256:${createHash("sha256")
    .update(canonicalizePolicySnapshot(input))
    .digest("hex")}`;
}

export function attachPolicyProvenance<T>(
  receipt: T,
  context: AttachPolicyProvenanceContext = {},
): T & { policyProvenance: PolicyProvenance } {
  if (!isRecord(receipt)) {
    throw new Error("Policy provenance can only be attached to receipt objects.");
  }

  if (isRecord(receipt.policyProvenance) && !context.force) {
    return receipt as T & { policyProvenance: PolicyProvenance };
  }

  return {
    ...(receipt as T & Record<string, unknown>),
    policyProvenance: buildPolicyProvenance({
      ...context,
      receipt,
    }),
  };
}

export function verifyPolicyProvenance(
  receipt: unknown,
  _options: { strict?: boolean } = {},
): PolicyProvenanceEntryResult {
  if (!isRecord(receipt)) {
    return {
      valid: false,
      hasPolicyProvenance: false,
      issues: ["receipt entry is not a JSON object"],
    };
  }

  if (!isRecord(receipt.policyProvenance)) {
    return {
      valid: true,
      hasPolicyProvenance: false,
      issues: [],
    };
  }

  const issues = validatePolicyProvenance(receipt.policyProvenance);

  return {
    valid: issues.length === 0,
    hasPolicyProvenance: true,
    issues,
    ...(issues.length === 0
      ? { policyProvenance: receipt.policyProvenance as PolicyProvenance }
      : {}),
  };
}

export function verifyPolicyProvenanceCoverage(
  options: PolicyProvenanceCoverageOptions = {},
): PolicyProvenanceCoverageResult {
  const entries = readReceiptChain(options);
  const issues: PolicyProvenanceCoverageResult["issues"] = [];
  const policyIds = new Set<string>();
  const policyHashes = new Set<string>();
  const policySources = new Set<string>();
  let receiptsWithPolicyProvenance = 0;
  let legacyReceiptsWithoutPolicyProvenance = 0;
  let invalidPolicyProvenanceEntries = 0;
  let latestPolicyProvenanceEntry: PolicyProvenanceCoverageResult["latestPolicyProvenanceEntry"] =
    null;

  for (const entry of entries) {
    if (entry.invalidJson) {
      issues.push(locationIssue(entry, "invalid JSON receipt entry"));
      invalidPolicyProvenanceEntries += 1;
      continue;
    }

    const result = verifyPolicyProvenance(entry.receipt);

    if (!result.hasPolicyProvenance) {
      legacyReceiptsWithoutPolicyProvenance += 1;
      if (!result.valid) {
        invalidPolicyProvenanceEntries += 1;
        result.issues.forEach((issue) => issues.push(locationIssue(entry, issue)));
      }
      continue;
    }

    receiptsWithPolicyProvenance += 1;

    if (!result.valid || !result.policyProvenance) {
      invalidPolicyProvenanceEntries += 1;
      result.issues.forEach((issue) => issues.push(locationIssue(entry, issue)));
      continue;
    }

    policyIds.add(result.policyProvenance.policyId);
    policyHashes.add(result.policyProvenance.policyHash);
    policySources.add(result.policyProvenance.policySource);

    if (
      !latestPolicyProvenanceEntry ||
      result.policyProvenance.policyAppliedAt >=
        latestPolicyProvenanceEntry.policyProvenance.policyAppliedAt
    ) {
      latestPolicyProvenanceEntry = {
        file: entry.file,
        ...(entry.line ? { line: entry.line } : {}),
        policyProvenance: result.policyProvenance,
      };
    }
  }

  return {
    totalReceiptsScanned: entries.length,
    receiptsWithPolicyProvenance,
    legacyReceiptsWithoutPolicyProvenance,
    invalidPolicyProvenanceEntries,
    uniquePolicyIds: Array.from(policyIds).sort(),
    uniquePolicyHashes: Array.from(policyHashes).sort(),
    policySourcesFound: Array.from(policySources).sort(),
    latestPolicyProvenanceEntry,
    valid: invalidPolicyProvenanceEntries === 0,
    issues,
  };
}

export function formatPolicyProvenance(
  result: PolicyProvenanceCoverageResult,
): string {
  const lines = [
    "AAG Policy Provenance",
    "",
    `Total receipts scanned: ${result.totalReceiptsScanned}`,
    `Receipts with policyProvenance: ${result.receiptsWithPolicyProvenance}`,
    `Legacy receipts without policyProvenance: ${result.legacyReceiptsWithoutPolicyProvenance}`,
    `Invalid policy provenance entries: ${result.invalidPolicyProvenanceEntries}`,
    `Unique policy IDs: ${result.uniquePolicyIds.length}`,
    `Unique policy hashes: ${result.uniquePolicyHashes.length}`,
    `Policy sources found: ${
      result.policySourcesFound.length > 0
        ? result.policySourcesFound.join(", ")
        : "none"
    }`,
  ];

  if (result.latestPolicyProvenanceEntry) {
    const latest = result.latestPolicyProvenanceEntry.policyProvenance;
    lines.push(
      "",
      "Latest Policy Provenance:",
      `Policy ID: ${latest.policyId}`,
      `Policy Name: ${latest.policyName}`,
      `Policy Source: ${latest.policySource}`,
      `Policy Source Type: ${latest.policySourceType}`,
      `Policy Hash: ${latest.policyHash}`,
      `Policy Snapshot Hash: ${latest.policySnapshotHash}`,
      `Policy Applied At: ${latest.policyAppliedAt}`,
    );
  }

  if (result.legacyReceiptsWithoutPolicyProvenance > 0) {
    lines.push(
      "",
      "Warnings:",
      `- ${result.legacyReceiptsWithoutPolicyProvenance} legacy receipt(s) do not include policyProvenance metadata.`,
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

  lines.push("", result.valid ? "POLICY PROVENANCE PASS" : "POLICY PROVENANCE FAIL");

  return lines.join("\n");
}

function validatePolicyProvenance(value: Record<string, unknown>): string[] {
  const issues: string[] = [];

  if (typeof value.policyId !== "string" || !value.policyId.trim()) {
    issues.push("missing or malformed policyProvenance.policyId");
  }

  if (typeof value.policyName !== "string" || !value.policyName.trim()) {
    issues.push("missing or malformed policyProvenance.policyName");
  }

  if (typeof value.policyVersion !== "string" || !value.policyVersion.trim()) {
    issues.push("missing or malformed policyProvenance.policyVersion");
  }

  if (typeof value.policySource !== "string" || !value.policySource.trim()) {
    issues.push("missing or malformed policyProvenance.policySource");
  }

  if (
    typeof value.policySourceType !== "string" ||
    !validSourceTypes.has(value.policySourceType as PolicySourceType)
  ) {
    issues.push("missing or malformed policyProvenance.policySourceType");
  }

  if (
    typeof value.policyHash !== "string" ||
    !sha256HashPattern.test(value.policyHash)
  ) {
    issues.push("missing or malformed policyProvenance.policyHash");
  }

  if (
    typeof value.policySnapshotHash !== "string" ||
    !sha256HashPattern.test(value.policySnapshotHash)
  ) {
    issues.push("missing or malformed policyProvenance.policySnapshotHash");
  }

  if (
    typeof value.policyAppliedAt !== "string" ||
    Number.isNaN(new Date(value.policyAppliedAt).getTime())
  ) {
    issues.push("missing or malformed policyProvenance.policyAppliedAt");
  }

  if (!Array.isArray(value.matchedRules)) {
    issues.push("missing or malformed policyProvenance.matchedRules");
  }

  if (!Array.isArray(value.decisionBasis)) {
    issues.push("missing or malformed policyProvenance.decisionBasis");
  }

  return issues;
}

function matchedRulesFromResult(result: ActionGateResult | undefined): string[] {
  if (!result) {
    return [];
  }

  return uniqueStrings([
    ...(result.policyProfile?.matchedRule
      ? [`profile:${result.policyProfile.matchedRule}`]
      : []),
    ...(result.primaryIssue ? [`primaryIssue:${result.primaryIssue}`] : []),
    ...result.detectorResults
      .filter((detector) => detector.triggered)
      .map((detector) => `detector:${detector.type}`),
  ]);
}

function matchedRulesFromReceipt(receipt: Record<string, unknown>): string[] {
  const detectors = Array.isArray(receipt.detectorsTriggered)
    ? receipt.detectorsTriggered
    : [];
  const riskFlags = Array.isArray(receipt.riskFlags) ? receipt.riskFlags : [];

  return uniqueStrings([
    ...detectors.map((value) => `detector:${String(value)}`),
    ...riskFlags.map((value) => `riskFlag:${String(value)}`),
    ...(typeof receipt.primaryIssue === "string"
      ? [`primaryIssue:${receipt.primaryIssue}`]
      : []),
    ...(typeof receipt.governanceChangeType === "string"
      ? [`governance:${receipt.governanceChangeType}`]
      : []),
  ]);
}

function decisionBasisFromResult(result: ActionGateResult | undefined): string[] {
  if (!result) {
    return [];
  }

  return uniqueStrings([
    `decision:${result.decision}`,
    `riskLevel:${result.riskLevel}`,
    ...(result.primaryIssue ? [`primaryIssue:${result.primaryIssue}`] : []),
    `recommendedAction:${result.recommendedAction}`,
    ...result.evidence,
    ...(result.policyProfile?.reason ? [result.policyProfile.reason] : []),
  ]);
}

function decisionBasisFromReceipt(receipt: Record<string, unknown>): string[] {
  return uniqueStrings([
    ...(typeof receipt.decision === "string" ? [`decision:${receipt.decision}`] : []),
    ...(typeof receipt.reason === "string" ? [receipt.reason] : []),
    ...(typeof receipt.summary === "string" ? [receipt.summary] : []),
    ...stringArray(receipt.reasons),
    ...stringArray(receipt.changes),
    ...stringArray(receipt.riskFlags).map((flag) => `riskFlag:${flag}`),
    ...stringArray(receipt.whyItMattersToAAG),
    ...(isRecord(receipt.reviewPacket) &&
    typeof receipt.reviewPacket.approvalReason === "string"
      ? [receipt.reviewPacket.approvalReason]
      : []),
    ...(isRecord(receipt.reviewPacket) &&
    typeof receipt.reviewPacket.riskLevel === "string"
      ? [`riskLevel:${receipt.reviewPacket.riskLevel}`]
      : []),
  ]);
}

function scopeBasisFromReceipt(receipt: Record<string, unknown>): string[] {
  return uniqueStrings([
    ...(typeof receipt.workflowId === "string"
      ? [`workflowId:${receipt.workflowId}`]
      : []),
    ...(isRecord(receipt.proposedAction) &&
    typeof receipt.proposedAction.actionType === "string"
      ? [`actionType:${receipt.proposedAction.actionType}`]
      : []),
    ...(isRecord(receipt.proposedAction) &&
    typeof receipt.proposedAction.target === "string"
      ? [`target:${receipt.proposedAction.target}`]
      : []),
    ...(typeof receipt.platform === "string" ? [`platform:${receipt.platform}`] : []),
    ...(typeof receipt.goal === "string" ? [`goal:${receipt.goal}`] : []),
  ]);
}

function inferPolicySourceType(
  receipt: Record<string, unknown>,
  profile: PolicyProfile | undefined,
): PolicySourceType {
  if (receipt.metaGate === true || receipt.receiptType === "metagate_decision") {
    return "metagate";
  }

  if (
    receipt.sourceTextHash ||
    receipt.reviewPacket ||
    receipt.relevanceScore !== undefined
  ) {
    return "distribution";
  }

  if (profile || isRecord(receipt.policyProfile)) {
    return "profile";
  }

  return "default";
}

function defaultPolicyName(sourceType: PolicySourceType): string {
  switch (sourceType) {
    case "metagate":
      return "MetaGate policy";
    case "distribution":
      return "Distribution Copilot policy";
    case "config":
      return "AAG config policy";
    case "profile":
      return "AAG policy profile";
    case "default":
      return "Default Policy";
    case "unknown":
      return "Unknown policy";
  }
}

function defaultPolicySource(sourceType: PolicySourceType): string {
  switch (sourceType) {
    case "metagate":
      return "MetaGate policy";
    case "distribution":
      return "Distribution Copilot policy";
    case "config":
      return "AAG config";
    case "profile":
      return "Policy profile";
    case "default":
      return "Default policy";
    case "unknown":
      return "Unknown policy source";
  }
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

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function stringField(value: unknown, field: string): string | undefined {
  return isRecord(value) ? stringValue(value[field]) : undefined;
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
