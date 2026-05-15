import type {
  AgencyChainMap,
  AuditEvidenceRef,
  AuditFinding,
  GovernanceRealityReport,
  RemediationPlanItem
} from "./types.js";
import { NON_ACCUSATORY_CLOSING_NOTE } from "./standardLanguage.js";
import { getTheaterSignalById } from "./taxonomy.js";

export function renderGovernanceRealityReportMarkdown(report: GovernanceRealityReport): string {
  return [
    "# Governance Reality Report",
    "",
    "## Executive Summary",
    "",
    report.executiveSummary,
    "",
    "## Audit Scope",
    "",
    renderAuditScope(report),
    "",
    "## Audit Mode",
    "",
    formatToken(report.auditMode),
    "",
    "## Methodology",
    "",
    renderStringList(report.methodology),
    "",
    "## Limitations",
    "",
    renderStringList([report.disclaimer, ...report.limitations]),
    "",
    "## Overall Assessment",
    "",
    renderPosture(report),
    "",
    "## Agency Chain Map",
    "",
    renderAgencyChainMap(report.agencyChainMap),
    "",
    "## Finding Summary",
    "",
    renderFindingSummary(report.findings),
    "",
    "## Severity and Confidence Definitions",
    "",
    renderSeverityAndConfidenceDefinitions(report),
    "",
    "## Findings",
    "",
    renderFindings(report.findings),
    "",
    "## Remediation Summary",
    "",
    renderRemediationSummary(report),
    "",
    "## Evidence Appendix",
    "",
    renderEvidenceAppendix(report.evidenceAppendix),
    ...(report.selfAuditDisclosure !== undefined
      ? ["", "## Self-Audit Disclosure", "", renderSelfAuditDisclosure(report)]
      : []),
    "",
    "## Non-Accusatory Closing Note",
    "",
    NON_ACCUSATORY_CLOSING_NOTE,
    ""
  ].join("\n");
}

function renderAuditScope(report: GovernanceRealityReport): string {
  const lines = [
    `- Report ID: ${report.reportId}`,
    `- Generated at: ${report.generatedAt}`,
    `- Audit scope: ${report.subject.auditScope}`
  ];

  if (report.subject.organizationName !== undefined) {
    lines.push(`- Organization: ${report.subject.organizationName}`);
  }

  if (report.subject.systemName !== undefined) {
    lines.push(`- System: ${report.subject.systemName}`);
  }

  if (report.subject.workflowName !== undefined) {
    lines.push(`- Workflow: ${report.subject.workflowName}`);
  }

  return lines.join("\n");
}

function renderPosture(report: GovernanceRealityReport): string {
  const lines = [
    `- Overall status: ${formatToken(report.posture.overallStatus)}`,
    `- Confidence: ${formatToken(report.posture.confidence)}`
  ];

  if (report.posture.governanceRealityScore !== undefined) {
    lines.push(`- Governance Reality Score: ${report.posture.governanceRealityScore}`);
  }

  return lines.join("\n");
}

function renderAgencyChainMap(agencyChainMap: AgencyChainMap | undefined): string {
  if (agencyChainMap === undefined) {
    return "No agency chain map was provided. This should be treated as an audit question, not a conclusion.";
  }

  const lines: string[] = [];
  pushOptional(lines, "Intent owner", agencyChainMap.intentOwner);
  pushOptional(lines, "Agent role", agencyChainMap.agentRole);
  pushOptionalList(lines, "Tool access", agencyChainMap.toolAccess);
  pushOptionalList(lines, "Policy constraints", agencyChainMap.policyConstraints);
  pushOptionalList(lines, "Approval authority", agencyChainMap.approvalAuthority);
  pushOptional(lines, "Runtime permit", agencyChainMap.runtimePermit);
  pushOptional(lines, "Execution boundary", agencyChainMap.executionBoundary);
  pushOptional(lines, "Receipt proof", agencyChainMap.receiptProof);
  lines.push(`- Missing links: ${agencyChainMap.missingLinks.length > 0 ? agencyChainMap.missingLinks.join(", ") : "None stated"}`);

  return lines.join("\n");
}

function renderFindings(findings: AuditFinding[]): string {
  if (findings.length === 0) {
    return "No findings were supplied for this local report.";
  }

  return findings.map(renderFinding).join("\n\n");
}

function renderFinding(finding: AuditFinding): string {
  const taxonomyEntry = getTheaterSignalById(finding.taxonomyId);
  const riskSurface = taxonomyEntry?.category ?? "unmapped";

  return [
    `### ${finding.id} - ${finding.title}`,
    "",
    `- Finding ID: ${finding.id}`,
    `- Taxonomy ID: ${finding.taxonomyId}`,
    `- Severity: ${formatToken(finding.severity)}`,
    `- Confidence: ${formatToken(finding.confidence)}`,
    `- Status: ${formatToken(finding.status)}`,
    `- Category / risk surface: ${formatToken(riskSurface)}`,
    `- Summary: ${finding.summary}`,
    "",
    "**Observation**",
    "",
    finding.observation,
    "",
    "**Why It Matters**",
    "",
    finding.whyItMatters,
    "",
    "**Evidence**",
    "",
    renderEvidenceReferences(finding.evidenceRefs),
    "",
    "**Audit Question**",
    "",
    renderStringList(finding.auditQuestions),
    "",
    "**Recommended Remediation**",
    "",
    renderStringList(finding.recommendedRemediations)
  ].join("\n");
}

function renderRemediationSummary(report: GovernanceRealityReport): string {
  return [
    report.remediationSummary.overview,
    "",
    renderRemediationPlan(report.remediationSummary.items.length > 0 ? report.remediationSummary.items : report.remediationPlan)
  ].join("\n");
}

function renderRemediationPlan(remediationPlan: RemediationPlanItem[]): string {
  if (remediationPlan.length === 0) {
    return "No remediation plan items were supplied.";
  }

  return remediationPlan
    .map((item) => {
      const controlText = item.mapsToControl !== undefined ? `; maps to ${item.mapsToControl}` : "";
      return `- ${item.findingId}: ${item.action} Priority: ${formatToken(item.priority)}${controlText}.`;
    })
    .join("\n");
}

function renderEvidenceAppendix(evidenceRefs: AuditEvidenceRef[]): string {
  if (evidenceRefs.length === 0) {
    return "No evidence references were provided. Evidence should be attached before external use.";
  }

  return renderEvidenceReferences(evidenceRefs);
}

function renderEvidenceReferences(evidenceRefs: AuditEvidenceRef[]): string {
  if (evidenceRefs.length === 0) {
    return "No evidence references provided.";
  }

  return evidenceRefs
    .map((evidenceRef) => {
      const details = [
        `type: ${evidenceRef.type}`,
        evidenceRef.sourcePath !== undefined ? `source: ${evidenceRef.sourcePath}` : undefined,
        evidenceRef.excerpt !== undefined ? `quoted excerpt: ${evidenceRef.excerpt}` : undefined
      ].filter((detail): detail is string => detail !== undefined);

      return `- ${evidenceRef.id}: ${evidenceRef.title} (${details.join("; ")})`;
    })
    .join("\n");
}

function renderFindingSummary(findings: AuditFinding[]): string {
  if (findings.length === 0) {
    return "No findings were supplied. This should not be read as certification; it only means no finding objects were provided for this report.";
  }

  const counts = new Map<string, number>();
  for (const finding of findings) {
    counts.set(finding.severity, (counts.get(finding.severity) ?? 0) + 1);
  }

  return ["critical", "high", "medium", "low", "info"]
    .filter((severity) => counts.has(severity))
    .map((severity) => `- ${formatToken(severity)}: ${counts.get(severity)}`)
    .join("\n");
}

function renderSeverityAndConfidenceDefinitions(report: GovernanceRealityReport): string {
  return [
    "**Severity**",
    "",
    `- Critical: ${report.severityDefinitions.critical}`,
    `- High: ${report.severityDefinitions.high}`,
    `- Medium: ${report.severityDefinitions.medium}`,
    `- Low: ${report.severityDefinitions.low}`,
    "",
    "**Confidence**",
    "",
    `- High: ${report.confidenceDefinitions.high}`,
    `- Medium: ${report.confidenceDefinitions.medium}`,
    `- Low: ${report.confidenceDefinitions.low}`
  ].join("\n");
}

function renderSelfAuditDisclosure(report: GovernanceRealityReport): string {
  const disclosure = report.selfAuditDisclosure;
  if (disclosure === undefined) {
    return "";
  }

  return [
    disclosure.scopeDisclosure,
    "",
    "**Strengths**",
    "",
    renderStringList(disclosure.strengths),
    "",
    "**Watch Items / Limitations**",
    "",
    renderStringList(disclosure.watchItems),
    "",
    "**Non-Certification Statement**",
    "",
    disclosure.nonCertificationStatement
  ].join("\n");
}

function renderStringList(values: string[]): string {
  return values.map((value) => `- ${value}`).join("\n");
}

function pushOptional(lines: string[], label: string, value: string | undefined): void {
  if (value !== undefined) {
    lines.push(`- ${label}: ${value}`);
  }
}

function pushOptionalList(lines: string[], label: string, value: string[] | undefined): void {
  if (value !== undefined) {
    lines.push(`- ${label}: ${value.length > 0 ? value.join(", ") : "None stated"}`);
  }
}

function formatToken(value: string): string {
  return value.replace(/_/g, " ");
}
