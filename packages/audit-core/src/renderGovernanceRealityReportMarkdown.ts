import type {
  AgencyChainMap,
  AuditEvidenceRef,
  AuditFinding,
  GovernanceRealityReport,
  RemediationPlanItem
} from "./types.js";

export const DEFAULT_GOVERNANCE_REALITY_REPORT_DISCLAIMER =
  "This report identifies potential governance theater signals and evidence gaps based on available inputs. It is not a legal conclusion, compliance certification, accusation of wrongdoing, or finding of unsafe operation. All findings require human review and verification before external use.";

export function renderGovernanceRealityReportMarkdown(report: GovernanceRealityReport): string {
  return [
    "# Governance Reality Report",
    "",
    "## Professional Disclaimer",
    "",
    report.disclaimer,
    "",
    "## Executive Summary",
    "",
    report.executiveSummary,
    "",
    "## Audit Scope",
    "",
    renderAuditScope(report),
    "",
    "## Governance Reality Posture",
    "",
    renderPosture(report),
    "",
    "## Agency Chain Map",
    "",
    renderAgencyChainMap(report.agencyChainMap),
    "",
    "## Key Findings",
    "",
    renderFindings(report.findings),
    "",
    "## Remediation Plan",
    "",
    renderRemediationPlan(report.remediationPlan),
    "",
    "## Evidence Appendix",
    "",
    renderEvidenceAppendix(report.appendices?.evidenceRefs ?? collectEvidenceRefs(report.findings)),
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
    return "No key findings were supplied for this local report.";
  }

  return findings.map(renderFinding).join("\n\n");
}

function renderFinding(finding: AuditFinding): string {
  return [
    `### ${finding.id}: ${finding.title}`,
    "",
    `- Finding ID: ${finding.id}`,
    `- Taxonomy ID: ${finding.taxonomyId}`,
    `- Severity: ${formatToken(finding.severity)}`,
    `- Confidence: ${formatToken(finding.confidence)}`,
    `- Status: ${formatToken(finding.status)}`,
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
    "**Audit Questions**",
    "",
    renderStringList(finding.auditQuestions),
    "",
    "**Recommended Remediation**",
    "",
    renderStringList(finding.recommendedRemediations),
    "",
    "**Evidence References**",
    "",
    renderEvidenceReferences(finding.evidenceRefs)
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
        evidenceRef.excerpt !== undefined ? `excerpt: ${evidenceRef.excerpt}` : undefined
      ].filter((detail): detail is string => detail !== undefined);

      return `- ${evidenceRef.id}: ${evidenceRef.title} (${details.join("; ")})`;
    })
    .join("\n");
}

function renderStringList(values: string[]): string {
  return values.map((value) => `- ${value}`).join("\n");
}

function collectEvidenceRefs(findings: AuditFinding[]): AuditEvidenceRef[] {
  const evidenceRefsById = new Map<string, AuditEvidenceRef>();

  for (const finding of findings) {
    for (const evidenceRef of finding.evidenceRefs) {
      evidenceRefsById.set(evidenceRef.id, evidenceRef);
    }
  }

  return [...evidenceRefsById.values()];
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
