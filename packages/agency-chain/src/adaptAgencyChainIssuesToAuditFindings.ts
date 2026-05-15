import type { AuditFinding } from "@alignment-governance-stack/audit-core";
import type { AgencyChainIssue } from "./types.js";

export function adaptAgencyChainIssuesToAuditFindings(issues: AgencyChainIssue[]): AuditFinding[] {
  return issues
    .filter((issue) => issue.taxonomyId !== undefined)
    .map((issue) => ({
      id: `finding-${issue.id.toLowerCase()}`,
      taxonomyId: issue.taxonomyId as string,
      title: `Agency Chain Gap: ${issue.title}`,
      severity: issue.severity,
      confidence: issue.confidence,
      status: issue.confidence === "low" ? "requires_verification" : "potential_signal",
      summary: `Potential agency-chain gap on ${formatToken(issue.linkType)}.`,
      observation: appendLinkContext(issue),
      whyItMatters: issue.whyItMatters,
      auditQuestions: [issue.auditQuestion],
      recommendedRemediations: [issue.recommendedRemediation],
      evidenceRefs: (issue.evidenceRefs ?? []).map((evidenceRef) => ({ ...evidenceRef })),
      relatedControls: [formatToken(issue.linkType)]
    }));
}

function appendLinkContext(issue: AgencyChainIssue): string {
  const linkText = issue.linkId !== undefined ? ` Link ID: ${issue.linkId}.` : "";
  return `${issue.observation}${linkText}`;
}

function formatToken(value: string): string {
  return value.replace(/_/g, " ");
}
