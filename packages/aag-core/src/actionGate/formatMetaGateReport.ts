import type { MetaGateDecision, MetaGateInput } from "./metaGate";

export function formatMetaGateReport(options: {
  input: MetaGateInput;
  decision: MetaGateDecision;
  receiptPath?: string;
}): string {
  const lines = [
    "AAG MetaGate",
    "",
    `Action: ${options.input.actionType}`,
    `Target: ${options.input.target}`,
    `Locked: ${options.decision.locked}`,
    `Decision: ${options.decision.decision}`,
    "",
    "Detected:",
    ...options.decision.detectorsTriggered.map((detector) => `- ${detector}`),
    "",
    "Reasons:",
    ...options.decision.reasons.map((reason) => `- ${reason}`),
  ];

  if (options.receiptPath) {
    lines.push("", `Receipt written: ${options.receiptPath.replace(/\\/g, "/")}`);
  }

  return lines.join("\n");
}
