import path from "node:path";

export const receiptVersion = "1.5.0";
export const defaultReceiptDirectory = path.join(".aag", "receipts");
export const defaultConfigPath = path.join(".aag", "config.json");

export type EffectiveAagConfig = {
  project: "agent-action-gate";
  version: typeof receiptVersion;
  receiptVersion: typeof receiptVersion;
  receiptDirectory: string;
  decisionEngine: "detectors-with-policy-profile";
  detectors: string[];
  locked: boolean;
  lockReason?: string;
  lockedAt?: string;
  lockedBy?: string;
  defaultDecision?: string;
  enabled?: boolean;
  receipts?: {
    enabled?: boolean;
    directory?: string;
  };
  audit?: Record<string, unknown>;
  allowlists?: unknown;
  description?: string;
};

export type AagConfigInput = Record<string, unknown>;

export function createEffectiveAagConfig(options: {
  config?: AagConfigInput;
  receiptDirectory?: string;
  detectorIds?: string[];
}): EffectiveAagConfig {
  const config = options.config ?? {};
  validateRawLockedAt(config.lockedAt);
  const receipts = isRecord(config.receipts) ? config.receipts : undefined;
  const receiptDirectory =
    getString(receipts?.directory) ??
    getString(config.receiptDirectory) ??
    options.receiptDirectory ??
    defaultReceiptDirectory;
  const effectiveConfig: EffectiveAagConfig = {
    project: "agent-action-gate",
    version: receiptVersion,
    receiptVersion,
    receiptDirectory,
    decisionEngine: "detectors-with-policy-profile",
    detectors: getStringArray(config.detectors) ?? options.detectorIds ?? [],
    locked: config.locked === true,
    ...(getString(config.lockReason)
      ? { lockReason: getString(config.lockReason) }
      : {}),
    ...(getString(config.lockedAt)
      ? { lockedAt: getString(config.lockedAt) }
      : {}),
    ...(getString(config.lockedBy)
      ? { lockedBy: getString(config.lockedBy) }
      : {}),
    ...(getString(config.defaultDecision)
      ? { defaultDecision: getString(config.defaultDecision) }
      : {}),
    ...(typeof config.enabled === "boolean"
      ? { enabled: config.enabled }
      : {}),
    ...(receipts
      ? {
          receipts: {
            ...(typeof receipts.enabled === "boolean"
              ? { enabled: receipts.enabled }
              : {}),
            ...(getString(receipts.directory)
              ? { directory: getString(receipts.directory) }
              : {}),
          },
        }
      : {}),
    ...(isRecord(config.audit) ? { audit: config.audit } : {}),
    ...(config.allowlists !== undefined ? { allowlists: config.allowlists } : {}),
    ...(getString(config.description)
      ? { description: getString(config.description) }
      : {}),
  };

  validateEffectiveAagConfig(effectiveConfig);

  return effectiveConfig;
}

function validateRawLockedAt(value: unknown): void {
  if (value === undefined) {
    return;
  }

  if (typeof value !== "string" || !isValidIsoTimestamp(value)) {
    throw new Error("lockedAt must be an ISO timestamp.");
  }
}

export function validateEffectiveAagConfig(config: EffectiveAagConfig): void {
  if (config.lockedAt && !isValidIsoTimestamp(config.lockedAt)) {
    throw new Error("lockedAt must be an ISO timestamp.");
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function getStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    return undefined;
  }

  return value;
}

function isValidIsoTimestamp(value: string): boolean {
  const timestamp = new Date(value);

  return !Number.isNaN(timestamp.getTime()) && timestamp.toISOString() === value;
}
