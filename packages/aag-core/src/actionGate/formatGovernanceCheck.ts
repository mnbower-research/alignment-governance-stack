import type { GovernanceCheckResult } from "./governanceWeakening";

export function formatGovernanceCheck(options: {
  result: GovernanceCheckResult;
  receiptPath?: string;
}): string {
  const detected =
    options.result.detectorsTriggered.length > 0
      ? options.result.detectorsTriggered.join(", ")
      : "none";
  const lines = [
    "AAG Governance Check",
    "",
    `Locked: ${options.result.locked}`,
    `Decision: ${options.result.decision}`,
    `Detected: ${detected}`,
    `Change: ${options.result.changes[0]}`,
  ];

  if (options.receiptPath) {
    lines.push("", `Receipt written: ${options.receiptPath.replace(/\\/g, "/")}`);
  }

  return lines.join("\n");
}
