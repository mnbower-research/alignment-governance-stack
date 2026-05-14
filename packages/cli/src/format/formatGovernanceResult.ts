import type { GovernanceRuntimePacketWithReceipt } from "@alignment-governance-stack/governance-core";

export function formatGovernanceResult(result: GovernanceRuntimePacketWithReceipt): string {
  const { governance, receipt } = result;
  const lines = [
    "AGS Governance Result",
    `finalDecision: ${governance.finalDecision}`,
    `pgdlDecision: ${governance.pgdl?.decision ?? "not_run"}`,
    `policyResult: ${formatPolicyResult(governance.resolvedPolicy)}`,
    `authorityValidation: ${governance.approvalValidation?.decision ?? "not_supplied"}`,
    `participationQuality: ${governance.participationQuality?.decision ?? "not_supplied"}`,
    `aagDecision: ${governance.aag?.decision ?? "not_run"}`,
    `runtimeBinding: ${formatRuntimeBinding(governance.runtimeBinding)}`,
    `receiptHash: ${receipt.receiptHash}`
  ];

  return lines.join("\n");
}

function formatPolicyResult(
  resolvedPolicy: GovernanceRuntimePacketWithReceipt["governance"]["resolvedPolicy"]
): string {
  if (resolvedPolicy === undefined) {
    return "not_supplied";
  }

  if (resolvedPolicy.hardBoundaryTriggered === true) {
    return `blocked hardBoundaryTriggered=true`;
  }

  if (!resolvedPolicy.allowed) {
    return "blocked";
  }

  if (resolvedPolicy.requiresApproval) {
    return "requires_approval";
  }

  return "allowed";
}

function formatRuntimeBinding(
  runtimeBinding: GovernanceRuntimePacketWithReceipt["governance"]["runtimeBinding"]
): string {
  if (runtimeBinding === undefined) {
    return "not_run";
  }

  return runtimeBinding.allowed ? "allowed" : "denied";
}
