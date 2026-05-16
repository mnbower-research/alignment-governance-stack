import type {
  AgencyChainMap,
  AuditEvidenceRef,
  AuditFinding,
  GovernanceRealityReport,
  ReportAgencyChainMap,
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
    "## What Was Tested",
    "",
    renderWhatWasTested(report),
    "",
    "## What Was Demonstrated",
    "",
    renderWhatWasDemonstrated(report),
    "",
    "## What Was Not Demonstrated",
    "",
    renderWhatWasNotDemonstrated(report),
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
    renderAgencyChainSection(report),
    ...(report.continuityReview !== undefined
      ? ["", "## Continuity Checks", "", renderContinuityReview(report)]
      : []),
    "",
    "## Finding Summary",
    "",
    renderFindingSummary(report.findings),
    "",
    "## Highest-Risk Finding",
    "",
    renderHighestRiskFinding(report.findings),
    "",
    "## Evidence Summary",
    "",
    renderEvidenceSummary(report),
    "",
    "## Finding Table",
    "",
    renderFindingTable(report.findings),
    "",
    "## Severity and Confidence Definitions",
    "",
    renderSeverityAndConfidenceDefinitions(report),
    "",
    "## Severity Explanation",
    "",
    renderSeverityExplanation(report.findings),
    "",
    "## Findings",
    "",
    renderFindings(report.findings),
    "",
    "## Remediation Summary",
    "",
    renderRemediationSummary(report),
    "",
    "## Remediation Priority",
    "",
    renderRemediationPriority(report),
    "",
    "## Evidence Appendix",
    "",
    renderEvidenceAppendix(report.evidenceAppendix),
    ...(report.selfAuditDisclosure !== undefined
      ? ["", "## Self-Audit Disclosure", "", renderSelfAuditDisclosure(report)]
      : []),
    "",
    "## Known Limitations",
    "",
    renderStringList(report.limitations),
    "",
    "## Machine-Readable Summary",
    "",
    renderMachineReadableSummary(report),
    "",
    "## Non-Accusatory Closing Note",
    "",
    NON_ACCUSATORY_CLOSING_NOTE,
    ""
  ].join("\n");
}

function renderContinuityReview(report: GovernanceRealityReport): string {
  const review = report.continuityReview;
  if (review === undefined) {
    return "";
  }

  const evidence = review.evidence;
  const timeWindow =
    evidence.timeWindow === undefined
      ? "not provided"
      : `${evidence.timeWindow.start ?? "unknown"} to ${evidence.timeWindow.end ?? "unknown"}`;

  return [
    review.summary,
    "",
    "- Continuity checks ask whether governance remained coherent over time; they extend the Governance Reality Report and do not create a separate governance layer.",
    `- Findings added: ${review.findingsAdded}`,
    `- Dimensions checked: ${review.dimensionsChecked.map(formatToken).join(", ")}`,
    `- Receipts analyzed: ${evidence.receiptsAnalyzed}`,
    `- Decisions analyzed: ${evidence.decisionsAnalyzed}`,
    `- PGDL reviews analyzed: ${evidence.pgdlReviewsAnalyzed}`,
    `- Runtime permits analyzed: ${evidence.permitsAnalyzed}`,
    `- Workflow records analyzed: ${evidence.workflowsAnalyzed}`,
    `- Time window: ${timeWindow}`
  ].join("\n");
}

function renderWhatWasTested(report: GovernanceRealityReport): string {
  return [
    `- Scope: ${report.subject.auditScope}`,
    `- Mode: ${formatToken(report.auditMode)}`,
    `- Method count: ${report.methodology.length}`,
    `- Finding count: ${report.findings.length}`
  ].join("\n");
}

function renderWhatWasDemonstrated(report: GovernanceRealityReport): string {
  const demonstrated = report.findings.filter(
    (finding) => finding.status === "confirmed_by_fixture" || finding.status === "resolved"
  );

  if (demonstrated.length === 0) {
    return "No supplied finding is marked as confirmed by fixture or resolved. This is an evidence statement, not a certification.";
  }

  return demonstrated.map((finding) => `- ${finding.id}: ${finding.summary}`).join("\n");
}

function renderWhatWasNotDemonstrated(report: GovernanceRealityReport): string {
  const notDemonstrated = report.findings.filter(
    (finding) => finding.status === "not_demonstrated" || finding.status === "requires_verification" || finding.status === "potential_signal"
  );

  if (notDemonstrated.length === 0) {
    return "No supplied finding is marked as not demonstrated, requiring verification, or potential signal.";
  }

  return notDemonstrated.map((finding) => `- ${finding.id}: ${finding.observation}`).join("\n");
}

function renderHighestRiskFinding(findings: AuditFinding[]): string {
  if (findings.length === 0) {
    return "No findings were supplied.";
  }

  const highest = [...findings].sort((left, right) => severityRank(right.severity) - severityRank(left.severity))[0];
  if (highest === undefined) {
    return "No findings were supplied.";
  }

  return `- ${highest.id}: ${highest.title} (${formatToken(highest.severity)}). ${highest.summary}`;
}

function renderEvidenceSummary(report: GovernanceRealityReport): string {
  const findingEvidenceCount = report.findings.reduce((sum, finding) => sum + finding.evidenceRefs.length, 0);
  const appendixCount = report.evidenceAppendix.length;

  return [
    `- Finding evidence references: ${findingEvidenceCount}`,
    `- Appendix evidence references: ${appendixCount}`,
    "- Evidence and inference should remain separate during human review."
  ].join("\n");
}

function renderFindingTable(findings: AuditFinding[]): string {
  if (findings.length === 0) {
    return "No finding table is available because no findings were supplied.";
  }

  return [
    "| Finding | Severity | Confidence | Status | Taxonomy |",
    "| --- | --- | --- | --- | --- |",
    ...findings.map(
      (finding) =>
        `| ${finding.id} | ${formatToken(finding.severity)} | ${formatToken(finding.confidence)} | ${formatToken(finding.status)} | ${finding.taxonomyId} |`
    )
  ].join("\n");
}

function renderSeverityExplanation(findings: AuditFinding[]): string {
  if (findings.length === 0) {
    return "No severity explanation is available because no findings were supplied.";
  }

  return "Severity reflects the supplied finding severity and should be interpreted with confidence, evidence quality, execution boundary, and remediation priority.";
}

function renderRemediationPriority(report: GovernanceRealityReport): string {
  const items = report.remediationSummary.items.length > 0 ? report.remediationSummary.items : report.remediationPlan;
  if (items.length === 0) {
    return "No remediation priorities were supplied.";
  }

  return items.map((item) => `- ${formatToken(item.priority)}: ${item.findingId} - ${item.action}`).join("\n");
}

function renderMachineReadableSummary(report: GovernanceRealityReport): string {
  const summary = {
    reportId: report.reportId,
    auditMode: report.auditMode,
    overallStatus: report.posture.overallStatus,
    confidence: report.posture.confidence,
    findingCount: report.findings.length,
    highestSeverity: highestSeverity(report.findings)
  };

  return ["```json", JSON.stringify(summary, null, 2), "```"].join("\n");
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

function renderAgencyChainSection(report: GovernanceRealityReport): string {
  if (report.agencyChain !== undefined) {
    return renderDetailedAgencyChainMap(report.agencyChain);
  }

  return renderLegacyAgencyChainMap(report.agencyChainMap);
}

function renderDetailedAgencyChainMap(agencyChain: ReportAgencyChainMap): string {
  return [
    `Overall Chain Status: ${formatTitle(formatToken(agencyChain.overallStatus))}`,
    "",
    `Chain Summary: ${agencyChain.description}`,
    "",
    "**Link Table**",
    "",
    "| Link | Type | Status | Evidence |",
    "| --- | --- | --- | --- |",
    ...agencyChain.links.map(
      (link) =>
        `| ${link.label} | ${formatToken(link.type)} | ${formatToken(link.status)} | ${renderEvidenceCell(link.evidenceRefs ?? [])} |`
    ),
    "",
    "**Broken / Weak Links**",
    "",
    renderAgencyChainIssues(agencyChain),
    "",
    "**Agency Chain Audit Questions**",
    "",
    renderStringList(agencyChain.issues.map((issue) => issue.auditQuestion)),
    "",
    `Conclusion: ${createAgencyChainConclusion(agencyChain)}`
  ].join("\n");
}

function renderAgencyChainIssues(agencyChain: ReportAgencyChainMap): string {
  const issues = agencyChain.issues.filter(
    (issue) => issue.severity === "critical" || issue.severity === "high" || issue.severity === "medium"
  );

  if (issues.length === 0) {
    return "No broken or weak agency-chain links were supplied.";
  }

  return issues
    .map((issue) => {
      const linkText = issue.linkId !== undefined ? ` link: ${issue.linkId};` : "";
      return `- ${issue.id}: ${issue.title} (${formatToken(issue.severity)};${linkText} ${formatToken(issue.linkType)}). ${issue.observation}`;
    })
    .join("\n");
}

function createAgencyChainConclusion(agencyChain: ReportAgencyChainMap): string {
  if (agencyChain.overallStatus === "preserved") {
    return "The agency chain is demonstrated across authority, policy, delegation, runtime constraint, and proof for the provided evidence.";
  }

  if (agencyChain.overallStatus === "partially_preserved") {
    return "The agency chain is partially preserved, with some links requiring verification or remediation.";
  }

  if (agencyChain.overallStatus === "weak") {
    return "The agency chain is present in parts, but weak links require remediation before external reliance.";
  }

  if (agencyChain.overallStatus === "broken") {
    return "The agency chain has one or more broken links requiring human review and remediation before reliance.";
  }

  return "Available evidence is insufficient to determine whether agency is preserved across the workflow.";
}

function renderEvidenceCell(evidenceRefs: AuditEvidenceRef[]): string {
  if (evidenceRefs.length === 0) {
    return "not demonstrated";
  }

  return evidenceRefs.map((evidenceRef) => evidenceRef.id).join(", ");
}

function renderLegacyAgencyChainMap(agencyChainMap: AgencyChainMap | undefined): string {
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

function formatTitle(value: string): string {
  return value.replace(/\b\w/g, (character) => character.toUpperCase());
}

function severityRank(severity: string): number {
  const ranks: Record<string, number> = {
    info: 0,
    low: 1,
    medium: 2,
    high: 3,
    critical: 4
  };

  return ranks[severity] ?? 0;
}

function highestSeverity(findings: AuditFinding[]): string {
  return findings.reduce<string>(
    (highest, finding) => severityRank(finding.severity) > severityRank(highest) ? finding.severity : highest,
    "info"
  );
}
