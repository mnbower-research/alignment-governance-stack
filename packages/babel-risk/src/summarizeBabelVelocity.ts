import type { BabelVelocityReport } from "./velocityTypes.js";

export function summarizeBabelVelocity(report: BabelVelocityReport): string {
  const lines = [
    "AGS Babel Velocity Report",
    "",
    `reportId: ${report.reportId}`,
    `overallVelocityRisk: ${report.overallVelocityRisk}`,
    `absorptionStatus: ${report.absorptionStatus}`,
    `currentClosureRatio: ${report.currentClosureRatio}`,
    `window count: ${report.windows.length}`,
    `finding count: ${report.findings.length}`,
    "",
    "Current metrics:"
  ];

  const current = report.windows[report.windows.length - 1];
  if (current === undefined) {
    lines.push("- no windows supplied");
  } else {
    lines.push(`- riskWeightedDecisionRatePerHour: ${current.riskWeightedDecisionRatePerHour}`);
    lines.push(`- qualityWeightedClosureRatePerHour: ${current.qualityWeightedClosureRatePerHour}`);
    lines.push(`- capacityUtilization: ${current.capacityUtilization}`);
    lines.push(`- proofCompletenessScore: ${current.proofCompletenessScore}`);
    lines.push(`- authorityCoverageScore: ${current.authorityCoverageScore}`);
  }

  lines.push("", "Findings:");
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
    "Note: Babel Velocity asks whether meaningful governance closure can keep pace with consequential agent decisions."
  );

  return `${lines.join("\n")}\n`;
}
