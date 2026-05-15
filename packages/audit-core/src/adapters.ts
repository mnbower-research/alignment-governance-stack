import { getTheaterSignalById } from "./taxonomy.js";
import type { AuditEvidenceRef, AuditFinding, AuditFindingStatus } from "./types.js";

export interface AlignmentGapLike {
  id: string;
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  recommendation: string;
  affectedItems?: string[];
}

export interface EvalResultLike {
  id: string;
  title: string;
  passed: boolean;
  failures: string[];
  actual?: {
    runtimeAllowed?: boolean;
    receiptValid?: boolean;
    participationDecision?: string;
    runtimeFailureCodes?: string[];
  };
}

export interface ReceiptVerificationLike {
  valid: boolean;
  reason: string;
  expectedHash?: string;
  actualHash?: string;
}

export interface HumanParticipationResultLike {
  decision: string;
  risk: "low" | "medium" | "high";
  meaningful: boolean;
  signals?: Array<{ id: string; label: string; severity: "low" | "medium" | "high"; reason: string }>;
  reasons?: string[];
}

export function alignmentGapToAuditFinding(gap: AlignmentGapLike): AuditFinding {
  const taxonomyId = mapAlignmentGapTypeToTaxonomyId(gap.type);
  const taxonomyEntry = getRequiredTaxonomyEntry(taxonomyId);

  return {
    id: `finding-${gap.id}`,
    taxonomyId,
    title: gap.title,
    severity: gap.severity,
    confidence: "medium",
    status: "requires_verification",
    summary: `Alignment gap signal mapped from ${gap.type}.`,
    observation: gap.description,
    whyItMatters: taxonomyEntry.whyItMatters,
    auditQuestions: taxonomyEntry.defaultAuditQuestions,
    recommendedRemediations: [gap.recommendation, ...taxonomyEntry.recommendedRemediations],
    evidenceRefs: [
      {
        id: `evidence-${gap.id}`,
        type: "manual_note",
        title: `Alignment gap detector output for ${gap.id}`,
        ...(gap.affectedItems !== undefined ? { excerpt: gap.affectedItems.join(", ") } : {})
      }
    ],
    relatedControls: [taxonomyEntry.category]
  };
}

export function redTeamResultToAuditFinding(result: EvalResultLike): AuditFinding | undefined {
  if (result.passed) {
    return undefined;
  }

  const taxonomyId = result.actual?.runtimeAllowed === true ? "TG-003" : "TG-007";
  const taxonomyEntry = getRequiredTaxonomyEntry(taxonomyId);

  return {
    id: `finding-redteam-${result.id}`,
    taxonomyId,
    title: `Red-team case requires review: ${result.title}`,
    severity: taxonomyEntry.defaultSeverity,
    confidence: "medium",
    status: "confirmed_by_fixture",
    summary: "A deterministic red-team fixture did not meet the expected governance outcome.",
    observation: result.failures.join(" ") || "The red-team case requires human review.",
    whyItMatters: taxonomyEntry.whyItMatters,
    auditQuestions: taxonomyEntry.defaultAuditQuestions,
    recommendedRemediations: taxonomyEntry.recommendedRemediations,
    evidenceRefs: [fixtureEvidenceRef(result.id, "redteam_case", result.title)],
    ...(result.actual?.runtimeFailureCodes !== undefined
      ? { relatedRuntimeRisks: result.actual.runtimeFailureCodes }
      : {})
  };
}

export function expectedBlockToAuditFinding(result: EvalResultLike): AuditFinding | undefined {
  if (result.passed) {
    return undefined;
  }

  const taxonomyEntry = getRequiredTaxonomyEntry("TG-004");

  return {
    id: `finding-expected-block-${result.id}`,
    taxonomyId: taxonomyEntry.id,
    title: `Expected block requires review: ${result.title}`,
    severity: "high",
    confidence: "medium",
    status: "confirmed_by_fixture",
    summary: "A fixture expected a block or escalation that was not demonstrated by the actual result.",
    observation: result.failures.join(" ") || "The expected block behavior was not demonstrated.",
    whyItMatters: taxonomyEntry.whyItMatters,
    auditQuestions: taxonomyEntry.defaultAuditQuestions,
    recommendedRemediations: taxonomyEntry.recommendedRemediations,
    evidenceRefs: [fixtureEvidenceRef(result.id, "dogfood_case", result.title)]
  };
}

export function receiptVerificationFailureToAuditFinding(
  verification: ReceiptVerificationLike,
  evidence: Partial<AuditEvidenceRef> = {}
): AuditFinding | undefined {
  if (verification.valid) {
    return undefined;
  }

  const taxonomyEntry = getRequiredTaxonomyEntry("TG-005");
  const excerpt = evidence.excerpt ?? summarizeReceiptHashes(verification);

  return {
    id: evidence.id !== undefined ? `finding-${evidence.id}` : "finding-receipt-integrity-gap",
    taxonomyId: taxonomyEntry.id,
    title: taxonomyEntry.title,
    severity: taxonomyEntry.defaultSeverity,
    confidence: "high",
    status: "confirmed_by_fixture",
    summary: "Receipt verification did not demonstrate integrity for the supplied evidence.",
    observation: verification.reason,
    whyItMatters: taxonomyEntry.whyItMatters,
    auditQuestions: taxonomyEntry.defaultAuditQuestions,
    recommendedRemediations: taxonomyEntry.recommendedRemediations,
    evidenceRefs: [
      {
        id: evidence.id ?? "receipt-verification-result",
        type: evidence.type ?? "receipt",
        title: evidence.title ?? "Receipt verification result",
        ...(evidence.sourcePath !== undefined ? { sourcePath: evidence.sourcePath } : {}),
        ...(excerpt !== undefined ? { excerpt } : {})
      }
    ]
  };
}

export function humanParticipationIssueToAuditFinding(
  participation: HumanParticipationResultLike,
  evidence: Partial<AuditEvidenceRef> = {}
): AuditFinding | undefined {
  if (participation.meaningful && participation.risk !== "high") {
    return undefined;
  }

  const taxonomyId = participation.decision === "likely_rubber_stamp" ? "TG-002" : "TG-011";
  const taxonomyEntry = getRequiredTaxonomyEntry(taxonomyId);
  const status: AuditFindingStatus = participation.meaningful ? "potential_signal" : "not_demonstrated";
  const excerpt = evidence.excerpt ?? participation.signals?.map((signal) => signal.label).join(", ");

  return {
    id: evidence.id !== undefined ? `finding-${evidence.id}` : `finding-human-participation-${participation.decision}`,
    taxonomyId,
    title: taxonomyEntry.title,
    severity: participation.risk === "high" ? "high" : taxonomyEntry.defaultSeverity,
    confidence: "medium",
    status,
    summary: "Human participation quality requires verification from available inputs.",
    observation: participation.reasons?.join(" ") ?? "Participation result did not demonstrate meaningful review.",
    whyItMatters: taxonomyEntry.whyItMatters,
    auditQuestions: taxonomyEntry.defaultAuditQuestions,
    recommendedRemediations: taxonomyEntry.recommendedRemediations,
    evidenceRefs: [
      {
        id: evidence.id ?? "human-participation-result",
        type: evidence.type ?? "manual_note",
        title: evidence.title ?? "Human participation result",
        ...(evidence.sourcePath !== undefined ? { sourcePath: evidence.sourcePath } : {}),
        ...(excerpt !== undefined ? { excerpt } : {})
      }
    ]
  };
}

function mapAlignmentGapTypeToTaxonomyId(type: string): string {
  const mapping: Record<string, string> = {
    missing_stop_authority: "TG-001",
    review_required_without_participation_policy: "TG-011",
    hard_boundary_override_claim: "TG-004",
    policy_allows_what_company_boundary_forbids: "TG-006",
    missing_authority_for_required_approval: "TG-006",
    approval_rule_without_role: "TG-006",
    role_scope_too_broad: "TG-006",
    production_irreversible_without_authority: "TG-009",
    ambiguous_never_automate_boundary: "TG-004",
    conflicting_tool_and_boundary: "TG-006",
    external_sharing_conflict: "TG-008",
    high_sensitivity_without_authority: "TG-006",
    data_class_tool_sensitivity_mismatch: "TG-008",
    unowned_high_risk_tool: "TG-001",
    unowned_high_sensitivity_data: "TG-001",
    inconsistent_environment_rules: "TG-008",
    permissive_default_with_strict_values: "TG-006"
  };

  return mapping[type] ?? "TG-006";
}

function getRequiredTaxonomyEntry(taxonomyId: string) {
  const taxonomyEntry = getTheaterSignalById(taxonomyId);

  if (taxonomyEntry === undefined) {
    throw new Error(`Missing taxonomy entry: ${taxonomyId}`);
  }

  return taxonomyEntry;
}

function fixtureEvidenceRef(id: string, type: "redteam_case" | "dogfood_case", title: string): AuditEvidenceRef {
  return {
    id: `fixture-${id}`,
    type,
    title
  };
}

function summarizeReceiptHashes(verification: ReceiptVerificationLike): string | undefined {
  if (verification.expectedHash === undefined && verification.actualHash === undefined) {
    return undefined;
  }

  return `expected=${verification.expectedHash ?? "not provided"} actual=${verification.actualHash ?? "not provided"}`;
}
