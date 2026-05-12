import { createHash, generateKeyPairSync } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import type { SigningKeyMetadata } from "./signedReceiptTypes";

export type SigningKeypair = {
  metadata: SigningKeyMetadata;
  publicKeyPem: string;
  privateKeyPem: string;
};

const privateKeyFilename = "aag-ed25519-private.pem";
const publicKeyFilename = "aag-ed25519-public.pem";
const metadataFilename = "aag-ed25519-key.json";

export function getDefaultAagKeyDir(): string {
  return path.join(".aag", "keys");
}

export function ensureSigningKeypair(
  keyDir = getDefaultAagKeyDir(),
): SigningKeypair {
  const existing = loadSigningKeypair(keyDir);

  if (existing) {
    return existing;
  }

  mkdirSync(keyDir, { recursive: true });

  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const publicKeyPem = publicKey.export({
    type: "spki",
    format: "pem",
  }).toString();
  const privateKeyPem = privateKey.export({
    type: "pkcs8",
    format: "pem",
  }).toString();
  const publicKeyPath = path.join(keyDir, publicKeyFilename);
  const privateKeyPath = path.join(keyDir, privateKeyFilename);
  const metadataPath = path.join(keyDir, metadataFilename);
  const publicKeyFingerprint = getPublicKeyFingerprint(publicKeyPem);
  const metadata: SigningKeyMetadata = {
    keyId: getKeyId(publicKeyFingerprint),
    algorithm: "ed25519",
    publicKeyFingerprint,
    createdAt: new Date().toISOString(),
    publicKeyPath,
    privateKeyPath,
  };

  writeFileSync(publicKeyPath, publicKeyPem, "utf8");
  writeFileSync(privateKeyPath, privateKeyPem, {
    encoding: "utf8",
    mode: 0o600,
  });
  writeFileSync(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, "utf8");

  return {
    metadata,
    publicKeyPem,
    privateKeyPem,
  };
}

export function loadSigningKeypair(
  keyDir = getDefaultAagKeyDir(),
): SigningKeypair | undefined {
  const publicKeyPath = path.join(keyDir, publicKeyFilename);
  const privateKeyPath = path.join(keyDir, privateKeyFilename);
  const metadataPath = path.join(keyDir, metadataFilename);

  if (
    !existsSync(publicKeyPath) ||
    !existsSync(privateKeyPath) ||
    !existsSync(metadataPath)
  ) {
    return undefined;
  }

  const publicKeyPem = readFileSync(publicKeyPath, "utf8");
  const privateKeyPem = readFileSync(privateKeyPath, "utf8");
  const parsed = JSON.parse(readFileSync(metadataPath, "utf8")) as unknown;

  if (!isSigningKeyMetadata(parsed)) {
    throw new Error(`Malformed signing key metadata: ${metadataPath}`);
  }

  return {
    metadata: parsed,
    publicKeyPem,
    privateKeyPem,
  };
}

export function getPublicKeyFingerprint(publicKeyPem: string): string {
  return `sha256:${createHash("sha256").update(publicKeyPem).digest("hex")}`;
}

export function getKeyId(publicKeyFingerprint: string): string {
  const hex = publicKeyFingerprint.replace(/^sha256:/, "");

  return `aag-ed25519-${hex.slice(0, 12)}`;
}

export function getDefaultPublicKeyPath(
  keyDir = getDefaultAagKeyDir(),
): string {
  return path.join(keyDir, publicKeyFilename);
}

function isSigningKeyMetadata(value: unknown): value is SigningKeyMetadata {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.keyId === "string" &&
    value.algorithm === "ed25519" &&
    typeof value.publicKeyFingerprint === "string" &&
    typeof value.createdAt === "string" &&
    (value.publicKeyPath === undefined ||
      typeof value.publicKeyPath === "string") &&
    (value.privateKeyPath === undefined ||
      typeof value.privateKeyPath === "string")
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
