import type { EffectiveAagConfig } from "./aagConfig";

export function formatLockStatus(options: {
  config: EffectiveAagConfig;
  configHash: string;
  policyHash: string;
}): string {
  const lines = ["AAG Lock Status", "", `Locked: ${options.config.locked}`];

  if (options.config.locked) {
    if (options.config.lockReason) {
      lines.push(`Reason: ${options.config.lockReason}`);
    }

    if (options.config.lockedAt) {
      lines.push(`Locked At: ${options.config.lockedAt}`);
    }

    if (options.config.lockedBy) {
      lines.push(`Locked By: ${options.config.lockedBy}`);
    }
  }

  lines.push(`Config Hash: ${options.configHash}`);
  lines.push(`Policy Hash: ${options.policyHash}`);

  return lines.join("\n");
}
