import { createHash, sign } from "node:crypto";
import type { SigningKeypair } from "./signingKeys";
import type { SignedReceiptMetadata } from "./signedReceiptTypes";

const omittedSigningFields = new Set([
  "signatureMetadata",
  "signedReceipt",
  "signature",
]);

export function canonicalizeForSigning(receipt: unknown): string {
  return JSON.stringify(sortForSigning(receipt));
}

export function hashCanonicalReceipt(canonicalString: string): string {
  return `sha256:${createHash("sha256").update(canonicalString).digest("hex")}`;
}

export function signReceipt<T>(
  receipt: T,
  keypair: SigningKeypair,
): T & { signatureMetadata: SignedReceiptMetadata } {
  const canonicalString = canonicalizeForSigning(receipt);
  const canonicalReceiptHash = hashCanonicalReceipt(canonicalString);
  const signature = sign(
    null,
    Buffer.from(canonicalString),
    keypair.privateKeyPem,
  ).toString("base64");

  return {
    ...(receipt as T & Record<string, unknown>),
    signatureMetadata: {
      signatureVersion: "1.0",
      signatureAlgorithm: "ed25519",
      signedAt: new Date().toISOString(),
      keyId: keypair.metadata.keyId,
      publicKeyFingerprint: keypair.metadata.publicKeyFingerprint,
      canonicalReceiptHash,
      signature,
    },
  };
}

export function stripSigningMetadata(value: unknown): unknown {
  return sortForSigning(value);
}

function sortForSigning(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) =>
      item === undefined ? null : sortForSigning(item),
    );
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (isRecord(value)) {
    const sorted: Record<string, unknown> = {};

    Object.keys(value)
      .filter((key) => !omittedSigningFields.has(key))
      .sort((left, right) => left.localeCompare(right))
      .forEach((key) => {
        const entryValue = value[key];
        if (entryValue !== undefined) {
          sorted[key] = sortForSigning(entryValue);
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
