import type { AgencyChainMap } from "./types.js";

export function summarizeAgencyChain(chain: AgencyChainMap): string {
  const lines = [
    "AGS Agency Chain Map",
    "",
    `chainId: ${chain.chainId}`,
    `overallStatus: ${chain.overallStatus}`,
    `auditMode: ${chain.auditMode}`,
    `subject: ${chain.subject.systemName ?? chain.subject.workflowName ?? chain.subject.auditScope}`,
    `link count: ${chain.links.length}`,
    `issue count: ${chain.issues.length}`,
    ""
  ];

  lines.push("Links:");
  for (const link of chain.links) {
    lines.push(`- ${link.label} (${link.type}): ${link.status}`);
  }

  lines.push("", "Issues:");
  if (chain.issues.length === 0) {
    lines.push("- none");
  } else {
    for (const issue of chain.issues) {
      lines.push(`- ${issue.id}: ${issue.title} [${issue.severity}; ${issue.confidence}]`);
      lines.push(`  audit question: ${issue.auditQuestion}`);
      lines.push(`  remediation: ${issue.recommendedRemediation}`);
    }
  }

  lines.push("", "Note: Agency-chain findings identify potential gaps and questions for verification; they are not accusations.");

  return `${lines.join("\n")}\n`;
}
