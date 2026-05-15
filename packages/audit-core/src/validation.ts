import { findProhibitedAccusatoryLanguage } from "./prohibitedLanguage.js";
import { isValidTheaterSignalId } from "./taxonomy.js";
import type {
  AuditEvidenceRef,
  AuditFinding,
  AuditValidationIssue,
  AuditValidationResult,
  GovernanceRealityReport,
  RemediationPlanItem
} from "./types.js";

const auditSeverities = ["info", "low", "medium", "high", "critical"];
const auditConfidences = ["low", "medium", "high"];
const auditModes = [
  "public_source_review",
  "client_provided_evidence_review",
  "internal_self_audit",
  "workflow_review"
];
const findingStatuses = [
  "potential_signal",
  "requires_verification",
  "not_demonstrated",
  "confirmed_by_fixture",
  "resolved"
];
const evidenceTypes = [
  "document",
  "policy",
  "receipt",
  "runtime_result",
  "redteam_case",
  "dogfood_case",
  "manual_note",
  "public_claim"
];
const reportStatuses = [
  "insufficient_evidence",
  "early_review",
  "needs_attention",
  "partially_supported",
  "strongly_supported"
];
const remediationPriorities = ["low", "medium", "high", "urgent"];
const controlNames = [
  "PGDL",
  "AAG",
  "Runtime Binding",
  "Receipts",
  "Authority Map",
  "Human Participation",
  "Governance Memory",
  "Alignment Gap Detector"
];

export function validateAuditFinding(finding: unknown): AuditValidationResult {
  const errors: AuditValidationIssue[] = [];
  const warnings: AuditValidationIssue[] = [];

  if (!isRecord(finding)) {
    return {
      valid: false,
      errors: [{ path: "$", message: "Audit finding must be an object." }],
      warnings
    };
  }

  requireString(finding, "id", "$.id", errors);
  const taxonomyId = requireString(finding, "taxonomyId", "$.taxonomyId", errors);
  if (taxonomyId !== undefined && !isValidTheaterSignalId(taxonomyId)) {
    errors.push({ path: "$.taxonomyId", message: `Unknown taxonomy ID: ${taxonomyId}.` });
  }

  requireString(finding, "title", "$.title", errors);
  requireString(finding, "summary", "$.summary", errors);
  requireString(finding, "observation", "$.observation", errors);
  requireString(finding, "whyItMatters", "$.whyItMatters", errors);
  requireEnum(finding, "severity", "$.severity", auditSeverities, errors);
  requireEnum(finding, "confidence", "$.confidence", auditConfidences, errors);
  requireEnum(finding, "status", "$.status", findingStatuses, errors);
  requireNonEmptyStringArray(finding, "auditQuestions", "$.auditQuestions", errors);
  requireNonEmptyStringArray(
    finding,
    "recommendedRemediations",
    "$.recommendedRemediations",
    errors
  );

  if (!Array.isArray(finding.evidenceRefs)) {
    errors.push({ path: "$.evidenceRefs", message: "Evidence references array is required, even when empty." });
  } else {
    finding.evidenceRefs.forEach((evidenceRef, index) =>
      validateEvidenceRef(evidenceRef, `$.evidenceRefs[${index}]`, errors)
    );
  }

  errors.push(...findProhibitedAccusatoryLanguage(finding));

  return { valid: errors.length === 0, errors, warnings };
}

export function validateGovernanceRealityReport(report: unknown): AuditValidationResult {
  const errors: AuditValidationIssue[] = [];
  const warnings: AuditValidationIssue[] = [];

  if (!isRecord(report)) {
    return {
      valid: false,
      errors: [{ path: "$", message: "Governance Reality Report must be an object." }],
      warnings
    };
  }

  requireString(report, "reportId", "$.reportId", errors);
  requireEnum(report, "auditMode", "$.auditMode", auditModes, errors);
  const generatedAt = requireString(report, "generatedAt", "$.generatedAt", errors);
  if (generatedAt !== undefined && Number.isNaN(Date.parse(generatedAt))) {
    errors.push({ path: "$.generatedAt", message: "generatedAt must be an ISO-compatible date string." });
  }

  if (!isRecord(report.subject)) {
    errors.push({ path: "$.subject", message: "subject is required." });
  } else {
    requireString(report.subject, "auditScope", "$.subject.auditScope", errors);
  }

  requireString(report, "disclaimer", "$.disclaimer", errors);
  requireString(report, "executiveSummary", "$.executiveSummary", errors);
  requireNonEmptyStringArray(report, "limitations", "$.limitations", errors);
  requireNonEmptyStringArray(report, "methodology", "$.methodology", errors);

  validateDefinitionMap(
    report.severityDefinitions,
    "$.severityDefinitions",
    ["critical", "high", "medium", "low"],
    errors
  );
  validateDefinitionMap(
    report.confidenceDefinitions,
    "$.confidenceDefinitions",
    ["high", "medium", "low"],
    errors
  );

  if (!isRecord(report.posture)) {
    errors.push({ path: "$.posture", message: "posture is required." });
  } else {
    requireEnum(report.posture, "overallStatus", "$.posture.overallStatus", reportStatuses, errors);
    requireEnum(report.posture, "confidence", "$.posture.confidence", auditConfidences, errors);
    if (
      report.posture.governanceRealityScore !== undefined &&
      (typeof report.posture.governanceRealityScore !== "number" ||
        report.posture.governanceRealityScore < 0 ||
        report.posture.governanceRealityScore > 100)
    ) {
      errors.push({
        path: "$.posture.governanceRealityScore",
        message: "governanceRealityScore must be a number from 0 to 100 when provided."
      });
    }
  }

  if (!Array.isArray(report.findings)) {
    errors.push({ path: "$.findings", message: "findings array is required." });
  } else {
    report.findings.forEach((finding, index) => {
      const result = validateAuditFinding(finding);
      for (const error of result.errors) {
        errors.push({ path: `$.findings[${index}]${error.path.slice(1)}`, message: error.message });
      }
    });
  }

  if (report.agencyChainMap !== undefined) {
    if (!isRecord(report.agencyChainMap)) {
      errors.push({ path: "$.agencyChainMap", message: "agencyChainMap must be an object when provided." });
    } else if (!Array.isArray(report.agencyChainMap.missingLinks)) {
      errors.push({ path: "$.agencyChainMap.missingLinks", message: "missingLinks array is required." });
    }
  }

  if (report.agencyChain !== undefined) {
    validateReportAgencyChain(report.agencyChain, "$.agencyChain", errors);
  }

  if (!Array.isArray(report.remediationPlan)) {
    errors.push({ path: "$.remediationPlan", message: "remediationPlan array is required." });
  } else {
    report.remediationPlan.forEach((item, index) =>
      validateRemediationPlanItem(item, `$.remediationPlan[${index}]`, errors)
    );
  }

  if (!isRecord(report.remediationSummary)) {
    errors.push({ path: "$.remediationSummary", message: "remediationSummary is required." });
  } else {
    requireString(report.remediationSummary, "overview", "$.remediationSummary.overview", errors);
    if (!Array.isArray(report.remediationSummary.items)) {
      errors.push({ path: "$.remediationSummary.items", message: "remediationSummary.items array is required." });
    }
  }

  if (!Array.isArray(report.evidenceAppendix)) {
    errors.push({ path: "$.evidenceAppendix", message: "evidenceAppendix array is required." });
  } else {
    report.evidenceAppendix.forEach((evidenceRef, index) =>
      validateEvidenceRef(evidenceRef, `$.evidenceAppendix[${index}]`, errors)
    );
  }

  if (report.selfAuditDisclosure !== undefined) {
    validateSelfAuditDisclosure(report.selfAuditDisclosure, "$.selfAuditDisclosure", errors);
  }

  if (report.appendices !== undefined) {
    if (!isRecord(report.appendices)) {
      errors.push({ path: "$.appendices", message: "appendices must be an object when provided." });
    } else if (!Array.isArray(report.appendices.evidenceRefs)) {
      errors.push({ path: "$.appendices.evidenceRefs", message: "appendix evidenceRefs array is required." });
    }
  }

  errors.push(...findProhibitedAccusatoryLanguage(report));

  return { valid: errors.length === 0, errors, warnings };
}

function validateReportAgencyChain(value: unknown, path: string, errors: AuditValidationIssue[]): void {
  if (!isRecord(value)) {
    errors.push({ path, message: "agencyChain must be an object when provided." });
    return;
  }

  requireString(value, "chainId", `${path}.chainId`, errors);
  requireString(value, "description", `${path}.description`, errors);
  requireEnum(
    value,
    "overallStatus",
    `${path}.overallStatus`,
    ["preserved", "partially_preserved", "weak", "broken", "insufficient_evidence"],
    errors
  );

  if (!Array.isArray(value.links)) {
    errors.push({ path: `${path}.links`, message: "agencyChain.links array is required." });
  }

  if (!Array.isArray(value.issues)) {
    errors.push({ path: `${path}.issues`, message: "agencyChain.issues array is required." });
  }
}

function validateDefinitionMap(
  value: unknown,
  path: string,
  keys: readonly string[],
  errors: AuditValidationIssue[]
): void {
  if (!isRecord(value)) {
    errors.push({ path, message: "Definition map is required." });
    return;
  }

  for (const key of keys) {
    requireString(value, key, `${path}.${key}`, errors);
  }
}

function validateSelfAuditDisclosure(value: unknown, path: string, errors: AuditValidationIssue[]): void {
  if (!isRecord(value)) {
    errors.push({ path, message: "selfAuditDisclosure must be an object when provided." });
    return;
  }

  requireString(value, "scopeDisclosure", `${path}.scopeDisclosure`, errors);
  requireNonEmptyStringArray(value, "strengths", `${path}.strengths`, errors);
  requireNonEmptyStringArray(value, "watchItems", `${path}.watchItems`, errors);
  requireString(value, "nonCertificationStatement", `${path}.nonCertificationStatement`, errors);
}

function validateEvidenceRef(value: unknown, path: string, errors: AuditValidationIssue[]): void {
  if (!isRecord(value)) {
    errors.push({ path, message: "Evidence reference must be an object." });
    return;
  }

  requireString(value, "id", `${path}.id`, errors);
  requireEnum(value, "type", `${path}.type`, evidenceTypes, errors);
  requireString(value, "title", `${path}.title`, errors);
}

function validateRemediationPlanItem(value: unknown, path: string, errors: AuditValidationIssue[]): void {
  if (!isRecord(value)) {
    errors.push({ path, message: "Remediation plan item must be an object." });
    return;
  }

  requireString(value, "findingId", `${path}.findingId`, errors);
  requireEnum(value, "priority", `${path}.priority`, remediationPriorities, errors);
  requireString(value, "action", `${path}.action`, errors);

  if (value.mapsToControl !== undefined) {
    requireEnum(value, "mapsToControl", `${path}.mapsToControl`, controlNames, errors);
  }
}

function requireString(
  value: Record<string, unknown>,
  key: string,
  path: string,
  errors: AuditValidationIssue[]
): string | undefined {
  const field = value[key];
  if (typeof field !== "string" || field.trim().length === 0) {
    errors.push({ path, message: `${key} is required.` });
    return undefined;
  }

  return field;
}

function requireEnum(
  value: Record<string, unknown>,
  key: string,
  path: string,
  allowed: readonly string[],
  errors: AuditValidationIssue[]
): void {
  const field = value[key];
  if (typeof field !== "string" || !allowed.includes(field)) {
    errors.push({ path, message: `${key} must be one of: ${allowed.join(", ")}.` });
  }
}

function requireNonEmptyStringArray(
  value: Record<string, unknown>,
  key: string,
  path: string,
  errors: AuditValidationIssue[]
): void {
  const field = value[key];
  if (!Array.isArray(field) || field.length === 0 || field.some((item) => typeof item !== "string" || item.trim().length === 0)) {
    errors.push({ path, message: `${key} must contain at least one non-empty string.` });
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function assertValidGovernanceRealityReport(report: GovernanceRealityReport): GovernanceRealityReport {
  const result = validateGovernanceRealityReport(report);
  if (!result.valid) {
    throw new Error(result.errors.map((error) => `${error.path}: ${error.message}`).join("\n"));
  }

  return report;
}

export function assertValidAuditFinding(finding: AuditFinding): AuditFinding {
  const result = validateAuditFinding(finding);
  if (!result.valid) {
    throw new Error(result.errors.map((error) => `${error.path}: ${error.message}`).join("\n"));
  }

  return finding;
}
