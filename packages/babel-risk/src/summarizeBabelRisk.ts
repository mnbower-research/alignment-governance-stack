import type { BabelRiskReport } from "./types.js";

export function summarizeBabelRisk(report: BabelRiskReport): string {
  const lines = [
    "AGS Structural Babel Risk Report",
    "",
    `reportId: ${report.reportId}`,
    `overallRisk: ${report.overallRisk}`,
    `structuralAscentScore: ${report.structuralAscentScore}`,
    `systemId: ${report.systemId ?? "not provided"}`,
    `organizationId: ${report.organizationId ?? "not provided"}`,
    `workflowId: ${report.workflowId ?? "not provided"}`,
    `finding count: ${report.findings.length}`,
    "",
    "Summary:",
    `- capabilityPressure: ${report.summary.capabilityPressure}`,
    `- coordinationPressure: ${report.summary.coordinationPressure}`,
    `- authorityClarity: ${report.summary.authorityClarity}`,
    `- participationQuality: ${report.summary.participationQuality}`,
    `- proofContinuity: ${report.summary.proofContinuity}`,
    `- memoryGovernance: ${report.summary.memoryGovernance}`,
    "",
    "Findings:"
  ];

  if (report.findings.length === 0) {
    lines.push("- none");
  } else {
    for (const finding of report.findings) {
      lines.push(`- ${finding.id}: ${finding.title} [${finding.severity}; ${finding.confidence}]`);
      lines.push(`  category: ${finding.category}`);
      lines.push(`  remediation: ${finding.recommendedRemediation[0] ?? "human review required"}`);
    }
  }

  lines.push(
    "",
    "Note: Structural Babel Detection does not block actions. It produces human-reviewable findings."
  );

  return `${lines.join("\n")}\n`;
}
