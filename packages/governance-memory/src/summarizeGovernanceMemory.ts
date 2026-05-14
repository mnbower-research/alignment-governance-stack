import type { GovernanceMemoryReport } from "./types.js";

export function summarizeGovernanceMemory(report: GovernanceMemoryReport): string {
  const lines = [
    "AGS Governance Memory",
    `receipt count: ${report.receiptCount}`,
    `pattern count: ${report.patterns.length}`,
    `recommendation count: ${report.recommendations.length}`
  ];

  const highSeverityRecommendations = report.recommendations.filter(
    (recommendation) => recommendation.severity === "high"
  );

  if (highSeverityRecommendations.length > 0) {
    lines.push("top high-severity recommendations:");
    for (const recommendation of highSeverityRecommendations.slice(0, 5)) {
      lines.push(`- ${recommendation.type}: ${recommendation.title}`);
    }
  }

  lines.push("All recommendations require human review before any governance change.");

  return lines.join("\n");
}
