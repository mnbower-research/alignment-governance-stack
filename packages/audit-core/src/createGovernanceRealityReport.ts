import { DEFAULT_GOVERNANCE_REALITY_REPORT_DISCLAIMER } from "./renderGovernanceRealityReportMarkdown.js";
import { validateGovernanceRealityReport } from "./validation.js";
import type {
  AuditFinding,
  AuditValidationResult,
  GovernanceRealityReport,
  RemediationPlanItem,
  SimplifiedAuditReportInput
} from "./types.js";

export interface CreateGovernanceRealityReportOptions {
  generatedAt?: string;
  includeRawInputs?: boolean;
}

export interface CreateGovernanceRealityReportResult {
  report?: GovernanceRealityReport;
  validation: AuditValidationResult;
}

export function createGovernanceRealityReport(
  input: GovernanceRealityReport | SimplifiedAuditReportInput | unknown,
  options: CreateGovernanceRealityReportOptions = {}
): CreateGovernanceRealityReportResult {
  if (!isRecord(input)) {
    return {
      validation: {
        valid: false,
        errors: [{ path: "$", message: "Audit report input must be an object." }],
        warnings: []
      }
    };
  }

  const report = looksLikeFullReport(input)
    ? normalizeFullReport(input as unknown as GovernanceRealityReport, options)
    : normalizeSimplifiedInput(input as Partial<SimplifiedAuditReportInput>, options);
  const validation = validateGovernanceRealityReport(report);

  return validation.valid ? { report, validation } : { report, validation };
}

function normalizeFullReport(
  input: GovernanceRealityReport,
  options: CreateGovernanceRealityReportOptions
): GovernanceRealityReport {
  const findings = Array.isArray(input.findings) ? input.findings : [];

  return {
    ...input,
    generatedAt: input.generatedAt ?? options.generatedAt ?? new Date().toISOString(),
    disclaimer: input.disclaimer ?? DEFAULT_GOVERNANCE_REALITY_REPORT_DISCLAIMER,
    remediationPlan: input.remediationPlan ?? createRemediationPlan(findings),
    appendices: input.appendices ?? createAppendices(findings, options.includeRawInputs ? input : undefined)
  };
}

function normalizeSimplifiedInput(
  input: Partial<SimplifiedAuditReportInput>,
  options: CreateGovernanceRealityReportOptions
): GovernanceRealityReport {
  const generatedAt = input.generatedAt ?? options.generatedAt ?? new Date().toISOString();
  const findings = Array.isArray(input.findings) ? input.findings : [];
  const subject = input.subject ?? { auditScope: "Unspecified local audit scope" };
  const remediationPlan = input.remediationPlan ?? createRemediationPlan(findings);

  return {
    reportId: input.reportId ?? createReportId(subject.auditScope, generatedAt),
    generatedAt,
    subject,
    disclaimer: DEFAULT_GOVERNANCE_REALITY_REPORT_DISCLAIMER,
    executiveSummary: input.executiveSummary ?? createExecutiveSummary(findings),
    posture: createPosture(input.posture, findings),
    findings,
    ...(input.agencyChainMap !== undefined ? { agencyChainMap: input.agencyChainMap } : {}),
    remediationPlan,
    appendices:
      input.appendices ??
      createAppendices(findings, options.includeRawInputs ? input.rawInputs ?? input : undefined)
  };
}

function createReportId(auditScope: string, generatedAt: string): string {
  const scopeSlug = auditScope
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 48)
    .replace(/^-|-$/g, "");
  const dateSlug = generatedAt.slice(0, 10);

  return `grr-${dateSlug}-${scopeSlug.length > 0 ? scopeSlug : "local-review"}`;
}

function createExecutiveSummary(findings: AuditFinding[]): string {
  if (findings.length === 0) {
    return "Available inputs support an early Governance Reality Report with no audit findings supplied. This does not certify the system; it indicates that no specific theater signal was provided for this local report.";
  }

  const highOrCriticalCount = findings.filter(
    (finding) => finding.severity === "high" || finding.severity === "critical"
  ).length;

  if (highOrCriticalCount > 0) {
    return `Available inputs identify ${findings.length} audit finding(s), including ${highOrCriticalCount} high or critical item(s) requiring verification and remediation planning before external reliance.`;
  }

  return `Available inputs identify ${findings.length} audit finding(s). The findings should be reviewed by humans before external use or governance claims.`;
}

function createPosture(
  posture: Partial<GovernanceRealityReport["posture"]> | undefined,
  findings: AuditFinding[]
): GovernanceRealityReport["posture"] {
  return {
    overallStatus: posture?.overallStatus ?? inferOverallStatus(findings),
    confidence: posture?.confidence ?? inferConfidence(findings),
    ...(posture?.governanceRealityScore !== undefined
      ? { governanceRealityScore: posture.governanceRealityScore }
      : {})
  };
}

function inferOverallStatus(findings: AuditFinding[]): GovernanceRealityReport["posture"]["overallStatus"] {
  if (findings.length === 0) {
    return "strongly_supported";
  }

  if (findings.some((finding) => finding.severity === "critical" || finding.severity === "high")) {
    return "needs_attention";
  }

  if (findings.some((finding) => finding.status === "not_demonstrated")) {
    return "insufficient_evidence";
  }

  if (findings.some((finding) => finding.severity === "medium")) {
    return "early_review";
  }

  return "partially_supported";
}

function inferConfidence(findings: AuditFinding[]): GovernanceRealityReport["posture"]["confidence"] {
  if (findings.length === 0) {
    return "medium";
  }

  if (findings.some((finding) => finding.confidence === "high")) {
    return "high";
  }

  if (findings.every((finding) => finding.confidence === "low")) {
    return "low";
  }

  return "medium";
}

function createRemediationPlan(findings: AuditFinding[]): RemediationPlanItem[] {
  return findings.map((finding) => {
    const recommendedRemediations = Array.isArray(finding.recommendedRemediations)
      ? finding.recommendedRemediations
      : [];
    const mapsToControl = typeof finding.taxonomyId === "string" ? inferControl(finding.taxonomyId) : undefined;
    const item: RemediationPlanItem = {
      findingId: typeof finding.id === "string" ? finding.id : "unvalidated-finding",
      priority: mapSeverityToPriority(finding.severity),
      action: recommendedRemediations[0] ?? "Review the finding and define an evidence-backed remediation."
    };

    if (mapsToControl !== undefined) {
      item.mapsToControl = mapsToControl;
    }

    return item;
  });
}

function mapSeverityToPriority(severity: AuditFinding["severity"]): RemediationPlanItem["priority"] {
  if (severity === "critical") {
    return "urgent";
  }

  if (severity === "high") {
    return "high";
  }

  if (severity === "medium") {
    return "medium";
  }

  return "low";
}

function inferControl(taxonomyId: string): RemediationPlanItem["mapsToControl"] | undefined {
  const controlsByTaxonomyId: Record<string, RemediationPlanItem["mapsToControl"]> = {
    "TG-001": "Authority Map",
    "TG-002": "Human Participation",
    "TG-003": "Runtime Binding",
    "TG-004": "AAG",
    "TG-005": "Receipts",
    "TG-006": "Authority Map",
    "TG-007": "PGDL",
    "TG-008": "Runtime Binding",
    "TG-009": "AAG",
    "TG-010": "Governance Memory",
    "TG-011": "Human Participation",
    "TG-012": "AAG"
  };

  return controlsByTaxonomyId[taxonomyId];
}

function collectEvidenceRefs(findings: AuditFinding[]) {
  const evidenceRefsById = new Map<string, AuditFinding["evidenceRefs"][number]>();

  for (const finding of findings) {
    if (!Array.isArray(finding.evidenceRefs)) {
      continue;
    }

    for (const evidenceRef of finding.evidenceRefs) {
      evidenceRefsById.set(evidenceRef.id, evidenceRef);
    }
  }

  return [...evidenceRefsById.values()];
}

function createAppendices(
  findings: AuditFinding[],
  rawInputs: unknown | undefined
): NonNullable<GovernanceRealityReport["appendices"]> {
  return {
    evidenceRefs: collectEvidenceRefs(findings),
    ...(rawInputs !== undefined ? { rawInputs } : {})
  };
}

function looksLikeFullReport(input: Record<string, unknown>): boolean {
  return "reportId" in input && "posture" in input && "remediationPlan" in input;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
