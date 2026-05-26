import type { BabelRiskFinding, BabelRiskReport } from "./types.js";

export function renderBabelRiskReportMarkdown(report: BabelRiskReport): string {
  return [
    "# Structural Babel Risk Report",
    "",
    "## Executive Summary",
    "",
    `Overall risk: ${formatToken(report.overallRisk)}.`,
    `Structural ascent score: ${report.structuralAscentScore}/100.`,
    "Structural Babel Detection asks whether capability and coordination are scaling faster than agency, discernment, authority clarity, and accountability.",
    "",
    "## Scope",
    "",
    renderScope(report),
    "",
    "## Summary",
    "",
    renderSummary(report),
    "",
    "## Finding Summary",
    "",
    renderFindingSummary(report.findings),
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
    renderLimitations(report),
    "",
    "## Machine-Readable Summary",
    "",
    renderMachineReadableSummary(report),
    ""
  ].join("\n");
}

function renderScope(report: BabelRiskReport): string {
  const lines = [
    `- Report ID: ${report.reportId}`,
    `- Generated at: ${report.generatedAt}`,
    `- System ID: ${report.systemId ?? "not provided"}`,
    `- Organization ID: ${report.organizationId ?? "not provided"}`,
    `- Workflow ID: ${report.workflowId ?? "not provided"}`
  ];

  if (report.assessmentWindow !== undefined) {
    lines.push(`- Assessment window: ${report.assessmentWindow.from ?? "unknown"} to ${report.assessmentWindow.to ?? "unknown"}`);
  }

  return lines.join("\n");
}

function renderSummary(report: BabelRiskReport): string {
  return [
    `- Capability pressure: ${formatToken(report.summary.capabilityPressure)}`,
    `- Coordination pressure: ${formatToken(report.summary.coordinationPressure)}`,
    `- Authority clarity: ${formatToken(report.summary.authorityClarity)}`,
    `- Participation quality: ${formatToken(report.summary.participationQuality)}`,
    `- Proof continuity: ${formatToken(report.summary.proofContinuity)}`,
    `- Memory governance: ${formatToken(report.summary.memoryGovernance)}`
  ].join("\n");
}

function renderFindingSummary(findings: BabelRiskFinding[]): string {
  if (findings.length === 0) {
    return "No Babel risk findings were generated from the supplied signals. This is not certification; it only reflects the provided evidence.";
  }

  const counts = new Map<string, number>();
  for (const finding of findings) {
    counts.set(finding.severity, (counts.get(finding.severity) ?? 0) + 1);
  }

  return ["critical", "high", "medium", "low"]
    .filter((severity) => counts.has(severity))
    .map((severity) => `- ${severity}: ${counts.get(severity)}`)
    .join("\n");
}

function renderFindings(findings: BabelRiskFinding[]): string {
  if (findings.length === 0) {
    return "No findings were generated. Human review should still confirm that authority, participation, proof, and memory governance are demonstrated.";
  }

  return findings.map(renderFinding).join("\n\n");
}

function renderFinding(finding: BabelRiskFinding): string {
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

function renderRemediation(findings: BabelRiskFinding[]): string {
  const remediations = findings.flatMap((finding) =>
    finding.recommendedRemediation.map((item) => `${finding.id}: ${item}`)
  );

  if (remediations.length === 0) {
    return "- Maintain evidence that authority, participation, runtime binding, fingerprints, receipts, and governance memory review remain live as the system scales.";
  }

  return renderList(remediations);
}

function renderLimitations(report: BabelRiskReport): string {
  return renderList([
    "Structural Babel Detection does not block actions, approve actions, execute tools, or mutate governance inputs.",
    "Findings are potential signals for human review and do not claim legal noncompliance, moral guilt, or external wrongdoing.",
    "A low score does not certify safety, correctness, compliance, or production readiness.",
    `The report is based on ${report.findings.length} generated finding(s) from supplied structural signals.`
  ]);
}

function renderMachineReadableSummary(report: BabelRiskReport): string {
  return [
    "```json",
    JSON.stringify(
      {
        reportId: report.reportId,
        overallRisk: report.overallRisk,
        structuralAscentScore: report.structuralAscentScore,
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
  if (values.length === 0) {
    return "- none supplied";
  }

  return values.map((value) => `- ${value}`).join("\n");
}

function formatToken(value: string): string {
  return value.replace(/_/g, " ");
}
