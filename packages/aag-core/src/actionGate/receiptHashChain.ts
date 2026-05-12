import { createHash } from "node:crypto";
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import path from "node:path";
import { defaultReceiptDirectory } from "./aagConfig";

export type ReceiptHashChainMetadata = {
  chainId: string;
  chainIndex: number;
  previousReceiptHash: string | null;
  canonicalPayloadHash: string;
  receiptHash: string;
  hashAlgorithm: "sha256";
  createdAt: string;
};

export type ReceiptChainSource = "receipts" | "distribution" | "all";

export type ReceiptChainEntry = {
  source: "receipts" | "distribution";
  file: string;
  line?: number;
  order: number;
  receipt?: Record<string, unknown>;
  invalidJson?: boolean;
  parseError?: string;
  invalidReceipt?: boolean;
};

export type ReceiptHashChainVerificationResult = {
  totalReceiptsScanned: number;
  chainedReceipts: number;
  legacyUnchainedReceipts: number;
  validChainedReceipts: number;
  invalidJsonEntries: number;
  malformedHashChainEntries: number;
  hashMismatches: number;
  brokenPreviousHashLinks: number;
  missingPreviousHash: number;
  chainCount: number;
  latestReceiptHash: string | null;
  valid: boolean;
  entries: ReceiptChainEntry[];
  issues: Array<{
    file: string;
    line?: number;
    issue: string;
  }>;
};

type AttachHashChainOptions = {
  chainId?: string;
  createdAt?: string;
  force?: boolean;
  rootDir?: string;
  receiptsDir?: string;
  distributionReceiptsPath?: string;
  source?: ReceiptChainSource;
};

type ReadReceiptChainOptions = {
  rootDir?: string;
  receiptsDir?: string;
  distributionReceiptsPath?: string;
  source?: ReceiptChainSource;
};

type VerifyReceiptChainOptions = ReadReceiptChainOptions;

const defaultChainId = "local_receipts";
const hashAlgorithm = "sha256" as const;
const distributionReceiptsPath = path.join(
  ".aag",
  "distribution",
  "receipts.jsonl",
);
const sha256HashPattern = /^sha256:[a-f0-9]{64}$/;

export function sortObjectKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) =>
      item === undefined ? null : sortObjectKeysDeep(item),
    );
  }

  if (value instanceof Date) {
    return value.toISOString();
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

export function canonicalizeReceipt(input: unknown): string {
  return JSON.stringify(sortObjectKeysDeep(input));
}

export function hashString(input: string): string {
  return `sha256:${createHash(hashAlgorithm).update(input).digest("hex")}`;
}

export function hashCanonicalPayload(input: unknown): string {
  return hashString(canonicalizeReceipt(input));
}

export function computeReceiptHash(input: unknown): string {
  const receipt = isRecord(input) ? input : {};
  const hashChain = isRecord(receipt.hashChain) ? receipt.hashChain : undefined;

  if (!hashChain) {
    return hashCanonicalPayload(stripHashChainForPayload(receipt));
  }

  return hashCanonicalPayload(createReceiptHashEnvelope(hashChain));
}

export function stripHashChainForPayload(
  receipt: unknown,
): Record<string, unknown> {
  if (!isRecord(receipt)) {
    return {};
  }

  const {
    hashChain: _hashChain,
    signatureMetadata: _signatureMetadata,
    signedReceipt: _signedReceipt,
    signature: _signature,
    ...payload
  } = receipt;
  return sortObjectKeysDeep(payload) as Record<string, unknown>;
}

export function attachHashChainMetadata<T>(
  receipt: T,
  options: AttachHashChainOptions = {},
): T & { hashChain: ReceiptHashChainMetadata } {
  if (!isRecord(receipt)) {
    throw new Error("Receipt hash chain metadata can only be attached to objects.");
  }

  if (isRecord(receipt.hashChain) && !options.force) {
    return receipt as T & { hashChain: ReceiptHashChainMetadata };
  }

  const chainId = options.chainId ?? defaultChainId;
  const priorReceipt = findLatestChainedReceipt(
    readReceiptChain(options),
    chainId,
  );
  const chainIndex = priorReceipt
    ? getChainIndex(priorReceipt.hashChain) + 1
    : 0;
  const previousReceiptHash = priorReceipt
    ? getReceiptHash(priorReceipt.hashChain)
    : null;
  const createdAt =
    options.createdAt ??
    (typeof receipt.createdAt === "string"
      ? receipt.createdAt
      : new Date().toISOString());
  const payload = stripHashChainForPayload(receipt);
  const canonicalPayloadHash = hashCanonicalPayload(payload);
  const envelope = {
    chainId,
    chainIndex,
    previousReceiptHash,
    canonicalPayloadHash,
    hashAlgorithm,
    createdAt,
  };
  const receiptHash = hashCanonicalPayload(envelope);

  return {
    ...(receipt as T & Record<string, unknown>),
    hashChain: {
      ...envelope,
      receiptHash,
    },
  };
}

export function readReceiptChain(
  options: ReadReceiptChainOptions = {},
): ReceiptChainEntry[] {
  const rootDir = options.rootDir ?? process.cwd();
  const source = options.source ?? "all";
  const entries: ReceiptChainEntry[] = [];
  let order = 0;

  if (source === "receipts" || source === "all") {
    readJsonReceipts(
      resolvePath(rootDir, options.receiptsDir ?? defaultReceiptDirectory),
      entries,
      () => order++,
    );
  }

  if (source === "distribution" || source === "all") {
    readJsonlReceipts(
      resolvePath(rootDir, options.distributionReceiptsPath ?? distributionReceiptsPath),
      entries,
      () => order++,
    );
  }

  return entries;
}

export function verifyReceiptHashChain(
  options: VerifyReceiptChainOptions = {},
): ReceiptHashChainVerificationResult {
  const entries = readReceiptChain(options);
  const issues: ReceiptHashChainVerificationResult["issues"] = [];
  const chainGroups = new Map<string, Record<string, unknown>[]>();
  let legacyUnchainedReceipts = 0;
  let invalidJsonEntries = 0;
  let malformedHashChainEntries = 0;
  let hashMismatches = 0;

  for (const entry of entries) {
    if (entry.invalidJson) {
      invalidJsonEntries += 1;
      issues.push({
        file: formatReportPath(entry.file),
        ...(entry.line ? { line: entry.line } : {}),
        issue: "invalid JSON receipt entry",
      });
      continue;
    }

    if (!entry.receipt) {
      issues.push({
        file: formatReportPath(entry.file),
        ...(entry.line ? { line: entry.line } : {}),
        issue: "receipt entry is not a JSON object",
      });
      continue;
    }

    if (!isRecord(entry.receipt.hashChain)) {
      legacyUnchainedReceipts += 1;
      continue;
    }

    const metadataIssues = validateHashChainMetadata(entry.receipt.hashChain);
    if (metadataIssues.length > 0) {
      malformedHashChainEntries += 1;
      metadataIssues.forEach((issue) => {
        issues.push({
          file: formatReportPath(entry.file),
          ...(entry.line ? { line: entry.line } : {}),
          issue,
        });
      });
      continue;
    }

    const metadata = entry.receipt.hashChain as ReceiptHashChainMetadata;
    const expectedPayloadHash = hashCanonicalPayload(
      stripHashChainForPayload(entry.receipt),
    );
    const expectedReceiptHash = computeReceiptHash(entry.receipt);

    if (metadata.canonicalPayloadHash !== expectedPayloadHash) {
      hashMismatches += 1;
      issues.push({
        file: formatReportPath(entry.file),
        ...(entry.line ? { line: entry.line } : {}),
        issue: "canonicalPayloadHash mismatch",
      });
    }

    if (metadata.receiptHash !== expectedReceiptHash) {
      hashMismatches += 1;
      issues.push({
        file: formatReportPath(entry.file),
        ...(entry.line ? { line: entry.line } : {}),
        issue: "receiptHash mismatch",
      });
    }

    const group = chainGroups.get(metadata.chainId) ?? [];
    group.push(entry.receipt);
    chainGroups.set(metadata.chainId, group);
  }

  let brokenPreviousHashLinks = 0;
  let missingPreviousHash = 0;
  let validChainedReceipts = 0;
  let latestReceiptHash: string | null = null;
  let latestChainIndex = -1;

  for (const [, receipts] of chainGroups) {
    const receiptHashes = new Set(
      receipts.map((receipt) => getReceiptHash(receipt.hashChain)),
    );
    const sortedReceipts = [...receipts].sort((left, right) => {
      const indexDelta =
        getChainIndex(left.hashChain) - getChainIndex(right.hashChain);
      if (indexDelta !== 0) {
        return indexDelta;
      }

      return getHashCreatedAt(left.hashChain).localeCompare(
        getHashCreatedAt(right.hashChain),
      );
    });

    sortedReceipts.forEach((receipt, index) => {
      const metadata = receipt.hashChain;
      const chainIndex = getChainIndex(metadata);
      const previousReceiptHash = getPreviousReceiptHash(metadata);

      if (chainIndex > latestChainIndex) {
        latestChainIndex = chainIndex;
        latestReceiptHash = getReceiptHash(metadata);
      }

      if (index === 0) {
        if (previousReceiptHash !== null) {
          brokenPreviousHashLinks += 1;
          if (!receiptHashes.has(previousReceiptHash)) {
            missingPreviousHash += 1;
          }
          issues.push({
            file: findReceiptEntry(entries, receipt)?.file ?? "unknown",
            issue: "first chained receipt has a previousReceiptHash",
          });
        }
        return;
      }

      const previousReceipt = sortedReceipts[index - 1];
      const expectedPreviousHash = previousReceipt
        ? getReceiptHash(previousReceipt.hashChain)
        : null;
      const expectedChainIndex = previousReceipt
        ? getChainIndex(previousReceipt.hashChain) + 1
        : 0;

      if (chainIndex !== expectedChainIndex) {
        brokenPreviousHashLinks += 1;
        issues.push({
          file: findReceiptEntry(entries, receipt)?.file ?? "unknown",
          issue: "chainIndex does not increment from previous chained receipt",
        });
      }

      if (previousReceiptHash === null) {
        missingPreviousHash += 1;
        issues.push({
          file: findReceiptEntry(entries, receipt)?.file ?? "unknown",
          issue: "missing previousReceiptHash",
        });
        return;
      }

      if (previousReceiptHash !== expectedPreviousHash) {
        brokenPreviousHashLinks += 1;
        if (!receiptHashes.has(previousReceiptHash)) {
          missingPreviousHash += 1;
        }
        issues.push({
          file: findReceiptEntry(entries, receipt)?.file ?? "unknown",
          issue: "previousReceiptHash does not match previous chained receipt",
        });
      }
    });
  }

  const chainedReceipts = Array.from(chainGroups.values()).reduce(
    (total, receipts) => total + receipts.length,
    0,
  );
  const invalidChainedReceiptCount = new Set(
    issues
      .map((issue) => `${issue.file}:${issue.line ?? ""}`)
      .filter(Boolean),
  ).size;

  validChainedReceipts = Math.max(0, chainedReceipts - invalidChainedReceiptCount);

  return {
    totalReceiptsScanned: entries.length,
    chainedReceipts,
    legacyUnchainedReceipts,
    validChainedReceipts,
    invalidJsonEntries,
    malformedHashChainEntries,
    hashMismatches,
    brokenPreviousHashLinks,
    missingPreviousHash,
    chainCount: chainGroups.size,
    latestReceiptHash,
    valid: issues.length === 0,
    entries,
    issues,
  };
}

export function formatReceiptHashChainVerification(
  result: ReceiptHashChainVerificationResult,
): string {
  const lines = [
    "AAG Receipt Hash Chain Verification",
    "",
    `Total receipts scanned: ${result.totalReceiptsScanned}`,
    `Chained receipts: ${result.chainedReceipts}`,
    `Legacy unchained receipts: ${result.legacyUnchainedReceipts}`,
    `Valid chained receipts: ${result.validChainedReceipts}`,
    `Invalid JSON entries: ${result.invalidJsonEntries}`,
    `Hash mismatches: ${result.hashMismatches}`,
    `Broken previous hash links: ${result.brokenPreviousHashLinks}`,
    `Missing previous hash: ${result.missingPreviousHash}`,
    `Chain count: ${result.chainCount}`,
    `Latest receipt hash: ${result.latestReceiptHash ?? "none"}`,
  ];

  if (result.malformedHashChainEntries > 0) {
    lines.splice(
      8,
      0,
      `Malformed hashChain entries: ${result.malformedHashChainEntries}`,
    );
  }

  if (result.legacyUnchainedReceipts > 0) {
    lines.push(
      "",
      "Warnings:",
      `- ${result.legacyUnchainedReceipts} legacy receipt(s) do not include hashChain metadata.`,
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

  lines.push("", result.valid ? "RECEIPT CHAIN PASS" : "RECEIPT CHAIN FAIL");

  return lines.join("\n");
}

function readJsonReceipts(
  receiptsDir: string,
  entries: ReceiptChainEntry[],
  nextOrder: () => number,
): void {
  if (!existsSync(receiptsDir)) {
    return;
  }

  readdirSync(receiptsDir)
    .map((entry) => path.join(receiptsDir, entry))
    .filter((entryPath) => statSync(entryPath).isFile())
    .filter((entryPath) => entryPath.toLowerCase().endsWith(".json"))
    .sort((left, right) => left.localeCompare(right))
    .forEach((file) => {
      try {
        const parsed = JSON.parse(readFileSync(file, "utf8")) as unknown;
        entries.push({
          source: "receipts",
          file,
          order: nextOrder(),
          ...(isRecord(parsed)
            ? { receipt: parsed }
            : { invalidReceipt: true }),
        });
      } catch (error) {
        entries.push({
          source: "receipts",
          file,
          order: nextOrder(),
          invalidJson: true,
          parseError: error instanceof Error ? error.message : String(error),
        });
      }
    });
}

function readJsonlReceipts(
  receiptFile: string,
  entries: ReceiptChainEntry[],
  nextOrder: () => number,
): void {
  if (!existsSync(receiptFile)) {
    return;
  }

  readFileSync(receiptFile, "utf8")
    .split(/\r?\n/)
    .forEach((line, index) => {
      if (!line.trim()) {
        return;
      }

      try {
        const parsed = JSON.parse(line) as unknown;
        entries.push({
          source: "distribution",
          file: receiptFile,
          line: index + 1,
          order: nextOrder(),
          ...(isRecord(parsed)
            ? { receipt: parsed }
            : { invalidReceipt: true }),
        });
      } catch (error) {
        entries.push({
          source: "distribution",
          file: receiptFile,
          line: index + 1,
          order: nextOrder(),
          invalidJson: true,
          parseError: error instanceof Error ? error.message : String(error),
        });
      }
    });
}

function findLatestChainedReceipt(
  entries: ReceiptChainEntry[],
  chainId: string,
): Record<string, unknown> | undefined {
  return entries
    .map((entry) => entry.receipt)
    .filter((receipt): receipt is Record<string, unknown> => Boolean(receipt))
    .filter(hasHashChainRecord)
    .filter((receipt) => receipt.hashChain.chainId === chainId)
    .sort((left, right) => {
      const indexDelta =
        getChainIndex(right.hashChain) - getChainIndex(left.hashChain);
      if (indexDelta !== 0) {
        return indexDelta;
      }

      return getHashCreatedAt(right.hashChain).localeCompare(
        getHashCreatedAt(left.hashChain),
      );
    })[0];
}

function createReceiptHashEnvelope(
  hashChain: Record<string, unknown>,
): Record<string, unknown> {
  return {
    chainId: hashChain.chainId,
    chainIndex: hashChain.chainIndex,
    previousReceiptHash: hashChain.previousReceiptHash,
    canonicalPayloadHash: hashChain.canonicalPayloadHash,
    hashAlgorithm: hashChain.hashAlgorithm,
    createdAt: hashChain.createdAt,
  };
}

function validateHashChainMetadata(
  value: Record<string, unknown>,
): string[] {
  const issues: string[] = [];

  if (typeof value.chainId !== "string" || !value.chainId) {
    issues.push("missing or malformed hashChain.chainId");
  }

  if (
    typeof value.chainIndex !== "number" ||
    !Number.isInteger(value.chainIndex) ||
    value.chainIndex < 0
  ) {
    issues.push("missing or malformed hashChain.chainIndex");
  }

  if (
    value.previousReceiptHash !== null &&
    (typeof value.previousReceiptHash !== "string" ||
      !sha256HashPattern.test(value.previousReceiptHash))
  ) {
    issues.push("missing or malformed hashChain.previousReceiptHash");
  }

  if (
    typeof value.canonicalPayloadHash !== "string" ||
    !sha256HashPattern.test(value.canonicalPayloadHash)
  ) {
    issues.push("missing or malformed hashChain.canonicalPayloadHash");
  }

  if (
    typeof value.receiptHash !== "string" ||
    !sha256HashPattern.test(value.receiptHash)
  ) {
    issues.push("missing or malformed hashChain.receiptHash");
  }

  if (value.hashAlgorithm !== hashAlgorithm) {
    issues.push("missing or malformed hashChain.hashAlgorithm");
  }

  if (typeof value.createdAt !== "string" || !value.createdAt) {
    issues.push("missing or malformed hashChain.createdAt");
  }

  return issues;
}

function findReceiptEntry(
  entries: ReceiptChainEntry[],
  receipt: Record<string, unknown>,
): ReceiptChainEntry | undefined {
  return entries.find((entry) => entry.receipt === receipt);
}

function getChainIndex(value: unknown): number {
  return isRecord(value) && typeof value.chainIndex === "number"
    ? value.chainIndex
    : -1;
}

function getReceiptHash(value: unknown): string {
  return isRecord(value) && typeof value.receiptHash === "string"
    ? value.receiptHash
    : "";
}

function getPreviousReceiptHash(value: unknown): string | null {
  return isRecord(value) &&
    (typeof value.previousReceiptHash === "string" ||
      value.previousReceiptHash === null)
    ? value.previousReceiptHash
    : null;
}

function getHashCreatedAt(value: unknown): string {
  return isRecord(value) && typeof value.createdAt === "string"
    ? value.createdAt
    : "";
}

function resolvePath(rootDir: string, filePath: string): string {
  return path.isAbsolute(filePath) ? filePath : path.resolve(rootDir, filePath);
}

function formatReportPath(file: string): string {
  return path.relative(process.cwd(), file).replace(/\\/g, "/") || file;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasHashChainRecord(
  value: Record<string, unknown>,
): value is Record<string, unknown> & { hashChain: Record<string, unknown> } {
  return isRecord(value.hashChain);
}
