import type { BabelVelocityFinding, BabelVelocityReport } from "./velocityTypes.js";

export function renderBabelVelocityReportMarkdown(report: BabelVelocityReport): string {
  return [
    "# Governance Absorption Capacity / Babel Velocity Report",
    "",
    "## Executive Summary",
    "",
    `Overall velocity risk: ${formatToken(report.overallVelocityRisk)}.`,
    `Absorption status: ${formatToken(report.absorptionStatus)}.`,
    `Current governance closure ratio: ${report.currentClosureRatio}.`,
    "A system becomes Babel-shaped when its decision tempo exceeds its governance absorption capacity.",
    "Babel Velocity asks whether the gap is widening.",
    "",
    "## Scope",
    "",
    renderScope(report),
    "",
    "## Current Metrics",
    "",
    renderCurrentMetrics(report),
    "",
    "## Window Metrics",
    "",
    renderWindowTable(report),
    "",
    "## Trend Deltas",
    "",
    renderTrendDeltas(report),
    "",
    "## Findings",
    "",
    renderFindings(report.findings),
    "",
    "## Recommended Remediation",
    "",
    renderRemediation(report.findings),
    "",
    "## Limitations",
    "",
    renderLimitations(),
    "",
    "## Machine-Readable Summary",
    "",
    renderMachineReadableSummary(report),
    ""
  ].join("\n");
}

function renderScope(report: BabelVelocityReport): string {
  return [
    `- Report ID: ${report.reportId}`,
    `- Generated at: ${report.generatedAt}`,
    `- System ID: ${report.systemId ?? "not provided"}`,
    `- Organization ID: ${report.organizationId ?? "not provided"}`,
    `- Workflow ID: ${report.workflowId ?? "not provided"}`
  ].join("\n");
}

function renderCurrentMetrics(report: BabelVelocityReport): string {
  const current = report.windows[report.windows.length - 1];
  if (current === undefined) {
    return "- No temporal windows were supplied.";
  }

  return [
    `- Closure ratio: ${current.governanceClosureRatio}`,
    `- Capacity utilization: ${current.capacityUtilization}`,
    `- Risk-weighted decision rate/hour: ${current.riskWeightedDecisionRatePerHour}`,
    `- Quality-weighted closure rate/hour: ${current.qualityWeightedClosureRatePerHour}`,
    `- Estimated absorption capacity/hour: ${current.estimatedAbsorptionCapacityPerHour}`,
    `- Average closure lag hours: ${current.averageClosureLagHours ?? "not demonstrated"}`,
    `- Open remediation load: ${current.openRemediationLoad}`,
    `- Stale remediation load: ${current.staleRemediationLoad}`,
    `- Proof completeness score: ${current.proofCompletenessScore}`,
    `- Authority coverage score: ${current.authorityCoverageScore}`,
    `- Participation quality score: ${current.participationQualityScore}`
  ].join("\n");
}

function renderWindowTable(report: BabelVelocityReport): string {
  if (report.windows.length === 0) {
    return "No window metrics are available.";
  }

  return [
    "| Window | Decision rate/hr | Closure rate/hr | Closure ratio | Capacity/hr | Utilization | Proof | Authority |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
    ...report.windows.map(
      (window) =>
        `| ${window.windowId} | ${window.riskWeightedDecisionRatePerHour} | ${window.qualityWeightedClosureRatePerHour} | ${window.governanceClosureRatio} | ${window.estimatedAbsorptionCapacityPerHour} | ${window.capacityUtilization} | ${window.proofCompletenessScore} | ${window.authorityCoverageScore} |`
    )
  ].join("\n");
}

function renderTrendDeltas(report: BabelVelocityReport): string {
  return [
    `- Previous closure ratio: ${report.previousClosureRatio ?? "not enough data"}`,
    `- Closure ratio delta: ${report.closureRatioDelta ?? "not enough data"}`,
    `- Decision load delta: ${report.decisionLoadDelta ?? "not enough data"}`,
    `- Closure rate delta: ${report.closureRateDelta ?? "not enough data"}`,
    `- Capacity delta: ${report.capacityDelta ?? "not enough data"}`,
    `- Closure trend: ${formatToken(report.summary.closureTrend)}`,
    `- Proof trend: ${formatToken(report.summary.proofTrend)}`,
    `- Authority coverage trend: ${formatToken(report.summary.authorityCoverageTrend)}`
  ].join("\n");
}

function renderFindings(findings: BabelVelocityFinding[]): string {
  if (findings.length === 0) {
    return "No Babel Velocity findings were generated from the supplied temporal windows. This is not certification; it only reflects the provided evidence.";
  }

  return findings.map(renderFinding).join("\n\n");
}

function renderFinding(finding: BabelVelocityFinding): string {
  return [
    `### ${finding.id} - ${finding.title}`,
    "",
    `- Category: ${formatToken(finding.category)}`,
    `- Severity: ${formatToken(finding.severity)}`,
    `- Confidence: ${formatToken(finding.confidence)}`,
    `- Evidence: ${finding.evidenceRefs.length > 0 ? finding.evidenceRefs.join(", ") : "not demonstrated"}`,
    "",
    finding.summary,
    "",
    "**Recommended Remediation**",
    "",
    renderList(finding.recommendedRemediation),
    "",
    "**Limitations**",
    "",
    renderList(finding.limitations ?? [])
  ].join("\n");
}

function renderRemediation(findings: BabelVelocityFinding[]): string {
  const remediations = findings.flatMap((finding) =>
    finding.recommendedRemediation.map((item) => `${finding.id}: ${item}`)
  );

  if (remediations.length === 0) {
    return "- Maintain evidence that meaningful human review, remediation, authority maintenance, and proof verification can keep pace with consequential agent decisions.";
  }

  return renderList(remediations);
}

function renderLimitations(): string {
  return renderList([
    "This report is deterministic and signal-based; it does not execute actions or mutate governance inputs.",
    "Rubber-stamp approvals do not count as full closures, but participation quality still depends on supplied evidence.",
    "Low-risk internal actions and high-consequence external actions do not carry the same denominator weight.",
    "Findings are human-reviewable audit signals, not legal conclusions, moral accusations, safety guarantees, or production-readiness certifications."
  ]);
}

function renderMachineReadableSummary(report: BabelVelocityReport): string {
  return [
    "```json",
    JSON.stringify(
      {
        reportId: report.reportId,
        overallVelocityRisk: report.overallVelocityRisk,
        absorptionStatus: report.absorptionStatus,
        currentClosureRatio: report.currentClosureRatio,
        windowCount: report.windows.length,
        findingCount: report.findings.length,
        categories: report.findings.map((finding) => finding.category)
      },
      null,
      2
    ),
    "```"
  ].join("\n");
}

function renderList(values: string[]): string {
  return values.map((value) => `- ${value}`).join("\n");
}

function formatToken(value: string): string {
  return value.replace(/_/g, " ");
}
