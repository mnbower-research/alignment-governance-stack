import { verify } from "node:crypto";
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import path from "node:path";
import { defaultReceiptDirectory } from "../aagConfig";
import {
  canonicalizeForSigning,
  hashCanonicalReceipt,
} from "./signReceipt";
import {
  getDefaultPublicKeyPath,
  getPublicKeyFingerprint,
} from "./signingKeys";
import type {
  SignedReceiptMetadata,
  SignedReceiptVerificationResult,
} from "./signedReceiptTypes";

export type SignedReceiptsDirectoryVerificationResult = {
  valid: boolean;
  receiptsScanned: number;
  signedReceipts: number;
  unsignedLegacyReceipts: number;
  validSignatures: number;
  invalidSignatures: number;
  missingPublicKeys: number;
  malformedReceipts: number;
  results: SignedReceiptVerificationResult[];
  issues: string[];
};

export function verifySignedReceipt(
  receipt: unknown,
  publicKeyPem: string | undefined,
  receiptPath: string,
): SignedReceiptVerificationResult {
  const issues: string[] = [];
  const metadata = getSignatureMetadata(receipt);
  const publicKeyFound = typeof publicKeyPem === "string" && publicKeyPem.length > 0;

  if (!metadata) {
    return {
      valid: false,
      receiptPath,
      signaturePresent: false,
      publicKeyFound,
      canonicalReceiptHashMatches: false,
      signatureValid: false,
      issues: ["missing signatureMetadata"],
    };
  }

  if (metadata.signatureAlgorithm !== "ed25519") {
    issues.push("unsupported signature algorithm");
  }

  if (!publicKeyFound) {
    issues.push("public key not found");
  }

  const canonicalString = canonicalizeForSigning(receipt);
  const expectedHash = hashCanonicalReceipt(canonicalString);
  const canonicalReceiptHashMatches =
    metadata.canonicalReceiptHash === expectedHash;

  if (!canonicalReceiptHashMatches) {
    issues.push("canonicalReceiptHash mismatch");
  }

  let fingerprintMatches = false;
  let signatureValid = false;

  if (publicKeyPem) {
    const publicKeyFingerprint = getPublicKeyFingerprint(publicKeyPem);
    fingerprintMatches =
      publicKeyFingerprint === metadata.publicKeyFingerprint;

    if (!fingerprintMatches) {
      issues.push("public key fingerprint mismatch");
    }

    try {
      signatureValid = verify(
        null,
        Buffer.from(canonicalString),
        publicKeyPem,
        Buffer.from(metadata.signature, "base64"),
      );
    } catch {
      signatureValid = false;
    }
  }

  if (!signatureValid) {
    issues.push("signature verification failed");
  }

  return {
    valid:
      issues.length === 0 &&
      publicKeyFound &&
      fingerprintMatches &&
      canonicalReceiptHashMatches &&
      signatureValid,
    receiptPath,
    keyId: metadata.keyId,
    algorithm: metadata.signatureAlgorithm,
    signaturePresent: true,
    publicKeyFound,
    canonicalReceiptHashMatches,
    signatureValid,
    issues,
  };
}

export function verifySignedReceiptsInDirectory(
  receiptsDir = defaultReceiptDirectory,
  publicKeyPath = getDefaultPublicKeyPath(),
): SignedReceiptsDirectoryVerificationResult {
  const files = listReceiptFiles(receiptsDir);
  const publicKeyPem = existsSync(publicKeyPath)
    ? readFileSync(publicKeyPath, "utf8")
    : undefined;
  const results: SignedReceiptVerificationResult[] = [];
  const issues: string[] = [];
  let unsignedLegacyReceipts = 0;
  let malformedReceipts = 0;
  let missingPublicKeys = 0;

  for (const file of files) {
    let parsed: unknown;

    try {
      parsed = JSON.parse(readFileSync(file, "utf8"));
    } catch {
      malformedReceipts += 1;
      issues.push(`${formatReportPath(file)}: invalid JSON receipt`);
      continue;
    }

    if (!isRecord(parsed)) {
      malformedReceipts += 1;
      issues.push(`${formatReportPath(file)}: receipt is not a JSON object`);
      continue;
    }

    if (!isRecord(parsed.signatureMetadata)) {
      unsignedLegacyReceipts += 1;
      continue;
    }

    const result = verifySignedReceipt(parsed, publicKeyPem, file);
    results.push(result);

    if (!result.publicKeyFound) {
      missingPublicKeys += 1;
    }

    result.issues.forEach((issue) => {
      issues.push(`${formatReportPath(file)}: ${issue}`);
    });
  }

  const validSignatures = results.filter((result) => result.valid).length;
  const invalidSignatures = results.length - validSignatures;

  return {
    valid: malformedReceipts === 0 && invalidSignatures === 0 && missingPublicKeys === 0,
    receiptsScanned: files.length,
    signedReceipts: results.length,
    unsignedLegacyReceipts,
    validSignatures,
    invalidSignatures,
    missingPublicKeys,
    malformedReceipts,
    results,
    issues,
  };
}

export function formatSignedReceiptVerification(
  result: SignedReceiptsDirectoryVerificationResult,
): string {
  const lines = [
    "AAG Signed Receipt Verification",
    "",
    `Receipts scanned: ${result.receiptsScanned}`,
    `Signed receipts: ${result.signedReceipts}`,
    `Unsigned legacy receipts: ${result.unsignedLegacyReceipts}`,
    `Valid signatures: ${result.validSignatures}`,
    `Invalid signatures: ${result.invalidSignatures}`,
    `Missing public keys: ${result.missingPublicKeys}`,
    `Malformed receipts: ${result.malformedReceipts}`,
  ];

  if (result.unsignedLegacyReceipts > 0) {
    lines.push(
      "",
      "Warnings:",
      `- ${result.unsignedLegacyReceipts} unsigned legacy receipt(s) were reported but did not fail verification.`,
    );
  }

  if (result.issues.length > 0) {
    lines.push("", "Issues:");
    result.issues.forEach((issue) => lines.push(`- ${issue}`));
  }

  lines.push("", result.valid ? "SIGNED RECEIPTS PASS" : "SIGNED RECEIPTS FAIL");

  return lines.join("\n");
}

function getSignatureMetadata(
  receipt: unknown,
): SignedReceiptMetadata | undefined {
  if (!isRecord(receipt) || !isRecord(receipt.signatureMetadata)) {
    return undefined;
  }

  const metadata = receipt.signatureMetadata;

  if (
    typeof metadata.signatureVersion !== "string" ||
    metadata.signatureAlgorithm !== "ed25519" ||
    typeof metadata.signedAt !== "string" ||
    typeof metadata.keyId !== "string" ||
    typeof metadata.publicKeyFingerprint !== "string" ||
    typeof metadata.canonicalReceiptHash !== "string" ||
    typeof metadata.signature !== "string"
  ) {
    return undefined;
  }

  return metadata as SignedReceiptMetadata;
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

function formatReportPath(file: string): string {
  return path.relative(process.cwd(), file).replace(/\\/g, "/") || file;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
