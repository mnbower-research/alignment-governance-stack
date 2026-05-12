import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import type { SigningKeypair } from "./receipts/signingKeys";
import {
  getDefaultPublicKeyPath,
  loadSigningKeypair,
} from "./receipts/signingKeys";
import { signReceipt } from "./receipts/signReceipt";
import {
  verifySignedReceipt,
} from "./receipts/verifySignedReceipt";
import type { SignedReceiptMetadata } from "./receipts/signedReceiptTypes";
import { sha256Stable } from "./stableHash";
import type { ActionGateInput, ActionGateResult } from "./types";

export type ExecutionPermit = {
  permitVersion: "1.0";
  permitId: string;
  receiptId: string;
  decisionReceiptId?: string;
  actionHash: string;
  decision: "allow";
  issuedAt: string;
  expiresAt: string;
  nonce: string;
  policyHash: string;
  configHash: string;
  signatureMetadata?: SignedReceiptMetadata;
};

export type IssueExecutionPermitArgs = {
  input: ActionGateInput;
  result: Pick<ActionGateResult, "decision">;
  receiptId: string;
  decisionReceiptId?: string;
  policyHash: string;
  configHash: string;
  actionHash?: string;
  issuedAt?: Date | string;
  ttlMs?: number;
  signingKeypair?: SigningKeypair;
};

export type VerifyExecutionPermitResult = {
  valid: boolean;
  reason?: string;
};

const defaultPermitTtlMs = 5 * 60 * 1000;
const sha256Pattern = /^sha256:[a-f0-9]{64}$/;

export function createActionHash(
  proposedAction: ActionGateInput["proposedAction"],
): string {
  return sha256Stable(proposedAction);
}

export function issueExecutionPermit(
  args: IssueExecutionPermitArgs,
): ExecutionPermit {
  if (args.result.decision !== "allow") {
    throw new Error("Execution permits can only be issued for allow decisions.");
  }

  const issuedAt = toDate(args.issuedAt ?? new Date());
  const expiresAt = new Date(issuedAt.getTime() + (args.ttlMs ?? defaultPermitTtlMs));
  const permit: ExecutionPermit = {
    permitVersion: "1.0",
    permitId: `permit_${randomUUID()}`,
    receiptId: args.receiptId,
    ...(args.decisionReceiptId ? { decisionReceiptId: args.decisionReceiptId } : {}),
    actionHash: args.actionHash ?? createActionHash(args.input.proposedAction),
    decision: "allow",
    issuedAt: issuedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    nonce: randomUUID(),
    policyHash: args.policyHash,
    configHash: args.configHash,
  };
  const keypair = args.signingKeypair ?? loadSigningKeypair();

  return keypair ? signReceipt(permit, keypair) : permit;
}

export function verifyExecutionPermit(
  permit: unknown,
  proposedAction: ActionGateInput["proposedAction"],
  options: {
    now?: Date | string;
    publicKeyPem?: string;
    publicKeyPath?: string;
  } = {},
): VerifyExecutionPermitResult {
  if (!isExecutionPermit(permit)) {
    return { valid: false, reason: "malformed execution permit" };
  }

  if (permit.decision !== "allow") {
    return { valid: false, reason: "permit decision is not allow" };
  }

  if (!sha256Pattern.test(permit.actionHash)) {
    return { valid: false, reason: "malformed actionHash" };
  }

  if (!sha256Pattern.test(permit.policyHash)) {
    return { valid: false, reason: "malformed policyHash" };
  }

  if (!sha256Pattern.test(permit.configHash)) {
    return { valid: false, reason: "malformed configHash" };
  }

  const expiresAt = Date.parse(permit.expiresAt);
  const issuedAt = Date.parse(permit.issuedAt);

  if (Number.isNaN(issuedAt) || Number.isNaN(expiresAt)) {
    return { valid: false, reason: "malformed permit timestamp" };
  }

  if (issuedAt > expiresAt) {
    return { valid: false, reason: "permit expires before it is issued" };
  }

  const now = toDate(options.now ?? new Date());

  if (now.getTime() > expiresAt) {
    return { valid: false, reason: "permit expired" };
  }

  if (permit.actionHash !== createActionHash(proposedAction)) {
    return { valid: false, reason: "actionHash mismatch" };
  }

  if (permit.signatureMetadata) {
    const publicKeyPem = options.publicKeyPem ?? readPublicKey(options.publicKeyPath);
    const signatureResult = verifySignedReceipt(
      permit,
      publicKeyPem,
      "execution-permit",
    );

    if (!signatureResult.valid) {
      return {
        valid: false,
        reason: signatureResult.issues[0] ?? "permit signature invalid",
      };
    }
  }

  return { valid: true };
}

function isExecutionPermit(value: unknown): value is ExecutionPermit {
  if (!isRecord(value)) {
    return false;
  }

  return (
    value.permitVersion === "1.0" &&
    typeof value.permitId === "string" &&
    typeof value.receiptId === "string" &&
    (value.decisionReceiptId === undefined ||
      typeof value.decisionReceiptId === "string") &&
    typeof value.actionHash === "string" &&
    value.decision === "allow" &&
    typeof value.issuedAt === "string" &&
    typeof value.expiresAt === "string" &&
    typeof value.nonce === "string" &&
    typeof value.policyHash === "string" &&
    typeof value.configHash === "string"
  );
}

function readPublicKey(publicKeyPath = getDefaultPublicKeyPath()): string | undefined {
  return existsSync(publicKeyPath) ? readFileSync(publicKeyPath, "utf8") : undefined;
}

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
