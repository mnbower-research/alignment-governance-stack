import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import path from "node:path";
import { defaultReceiptDirectory } from "./aagConfig";

export type AuditResult = {
  scanned: number;
  passed: number;
  failed: number;
  failures: Array<{
    file: string;
    issues: string[];
  }>;
};

const requiredFields = [
  "receiptVersion",
  "createdAt",
  "configHash",
  "policyHash",
  "decision",
];

const sha256HashPattern = /^sha256:[a-f0-9]{64}$/;
const isoTimestampPattern =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const supportedReceiptVersions = new Set([
  "0.9.0",
  "1.0.0",
  "1.1.0",
  "1.2.0",
  "1.3.0",
  "1.4.0",
  "1.5.0",
]);

export function auditReceipts(options: {
  receiptsDir?: string;
} = {}): AuditResult {
  const receiptsDir = options.receiptsDir ?? defaultReceiptDirectory;
  const files = listReceiptFiles(receiptsDir);
  const failures: AuditResult["failures"] = [];

  files.forEach((file) => {
    const issues = auditReceiptFile(file);

    if (issues.length > 0) {
      failures.push({
        file: formatReportPath(file),
        issues,
      });
    }
  });

  return {
    scanned: files.length,
    passed: files.length - failures.length,
    failed: failures.length,
    failures,
  };
}

function listReceiptFiles(receiptsDir: string): string[] {
  if (!existsSync(receiptsDir)) {
    return [];
  }

  return readdirSync(receiptsDir)
    .map((entry) => path.join(receiptsDir, entry))
    .filter((entryPath) => statSync(entryPath).isFile())
    .filter((entryPath) => entryPath.toLowerCase().endsWith(".json"))
    .sort((left, right) => left.localeCompare(right));
}

function auditReceiptFile(file: string): string[] {
  let parsed: unknown;

  try {
    parsed = JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return ["invalid JSON receipt file"];
  }

  if (!isRecord(parsed)) {
    return ["invalid JSON receipt file"];
  }

  return auditReceipt(parsed);
}

function auditReceipt(receipt: Record<string, unknown>): string[] {
  const issues: string[] = [];

  requiredFields.forEach((field) => {
    if (receipt[field] === undefined) {
      issues.push(`missing ${field}`);
    }
  });

  if (
    receipt.receiptVersion !== undefined &&
    (typeof receipt.receiptVersion !== "string" ||
      !supportedReceiptVersions.has(receipt.receiptVersion))
  ) {
    issues.push("unsupported receiptVersion");
  }

  if (
    receipt.createdAt !== undefined &&
    (typeof receipt.createdAt !== "string" ||
      !isValidIsoTimestamp(receipt.createdAt))
  ) {
    issues.push("malformed createdAt");
  }

  if (
    receipt.configHash !== undefined &&
    (typeof receipt.configHash !== "string" ||
      !sha256HashPattern.test(receipt.configHash))
  ) {
    issues.push("malformed configHash");
  }

  if (
    receipt.policyHash !== undefined &&
    (typeof receipt.policyHash !== "string" ||
      !sha256HashPattern.test(receipt.policyHash))
  ) {
    issues.push("malformed policyHash");
  }

  return issues;
}

function isValidIsoTimestamp(value: string): boolean {
  if (!isoTimestampPattern.test(value)) {
    return false;
  }

  const timestamp = new Date(value);

  return !Number.isNaN(timestamp.getTime()) && timestamp.toISOString() === value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function formatReportPath(file: string): string {
  return path.relative(process.cwd(), file).replace(/\\/g, "/") || file;
}
