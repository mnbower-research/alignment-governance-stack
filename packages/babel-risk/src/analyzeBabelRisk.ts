import { canonicalizeForHash, sha256Hex } from "@alignment-governance-stack/receipts";
import {
  demonstrationStatusFromWeakness,
  maxSignalWeight,
  riskFromScore,
  severityFromWeight,
  signalWeight,
  sumSignalWeight
} from "./scoring.js";
import type {
  AgencyChainSignal,
  BabelRiskFinding,
  BabelRiskFindingCategory,
  BabelRiskInput,
  BabelRiskReport,
  BabelRiskSeverity,
  BaseSignal,
  CoordinationSignal,
  GovernanceReportSignal
} from "./types.js";

interface AnalysisContext {
  capabilityMax: number;
  coordinationMax: number;
  authorityMax: number;
  participationMax: number;
  proofMax: number;
  memoryMax: number;
  agencyChainMax: number;
  fingerprintMax: number;
  governanceReportMax: number;
}

export function analyzeBabelRisk(input: BabelRiskInput): BabelRiskReport {
  const findings = createFindings(input);
  const summary = createSummary(input);
  const structuralAscentScore = scoreStructuralAscent(input, findings);
  const generatedAt = readGeneratedAt(input);
  const reportWithoutId = {
    version: "babel-risk/v0.1" as const,
    ...(input.systemId !== undefined ? { systemId: input.systemId } : {}),
    ...(input.organizationId !== undefined ? { organizationId: input.organizationId } : {}),
    ...(input.workflowId !== undefined ? { workflowId: input.workflowId } : {}),
    ...(input.assessmentWindow !== undefined ? { assessmentWindow: input.assessmentWindow } : {}),
    overallRisk: riskFromScore(structuralAscentScore),
    structuralAscentScore,
    findings,
    summary,
    ...(input.metadata !== undefined ? { metadata: input.metadata } : {})
  };
  const reportId = deriveBabelRiskReportId(reportWithoutId);

  return {
    ...reportWithoutId,
    reportId,
    generatedAt
  };
}

function createSummary(input: BabelRiskInput): BabelRiskReport["summary"] {
  return {
    capabilityPressure: severityFromWeight(maxSignalWeight(input.capabilitySignals)),
    coordinationPressure: severityFromWeight(maxSignalWeight(input.coordinationSignals)),
    authorityClarity: demonstrationStatusFromWeakness(maxSignalWeight(input.authoritySignals)),
    participationQuality: demonstrationStatusFromWeakness(maxSignalWeight(input.participationSignals)),
    proofContinuity: demonstrationStatusFromWeakness(
      Math.max(maxSignalWeight(input.proofSignals), maxSignalWeight(input.fingerprintSignals))
    ),
    memoryGovernance: demonstrationStatusFromWeakness(maxSignalWeight(input.memorySignals))
  };
}

function createFindings(input: BabelRiskInput): BabelRiskFinding[] {
  const context = createContext(input);
  const findings: BabelRiskFinding[] = [];

  pushFinding(
    findings,
    shouldFlagCapabilityOutrunsDiscernment(input, context),
    "capability_outruns_discernment",
    "Capability may be outrunning discernment",
    "Capability, autonomy, or scope pressure is high while human participation, proof continuity, authority clarity, or proposal scrutiny is weak or not demonstrated.",
    collectEvidence(input.capabilitySignals, input.participationSignals, input.proofSignals, input.authoritySignals),
    [
      "Add explicit proposal scrutiny evidence before expanding autonomy or scope.",
      "Require meaningful human review with refusal power for high-capability workflows.",
      "Bind high-capability actions to runtime permits, receipts, and agency fingerprints."
    ],
    Math.max(context.capabilityMax, context.participationMax, context.proofMax, context.authorityMax)
  );

  pushFinding(
    findings,
    context.coordinationMax >= 3 && context.authorityMax >= 2,
    "coordination_outruns_authority",
    "Coordination may be outrunning authority",
    "Coordination complexity is high while ownership, stop authority, scoped approval, or delegation maps are unclear.",
    collectEvidence(input.coordinationSignals, input.authoritySignals),
    [
      "Define accountable owners and stop authority for the coordinated workflow.",
      "Attach scoped approval rules to cross-team and multi-agent handoffs.",
      "Review authority maps before expanding coordination surfaces."
    ],
    Math.max(context.coordinationMax, context.authorityMax)
  );

  pushFinding(
    findings,
    hasCoordinationKind(input, "shared_language_without_shared_meaning") ||
      hasAuthorityKind(input, "policy_authority_mismatch"),
    "language_outruns_meaning",
    "Shared governance language may be outrunning shared meaning",
    "Policy, safety, or governance language appears without enough evidence of shared definitions, enforceable authority, or runtime controls.",
    collectEvidence(input.coordinationSignals, input.authoritySignals, input.proofSignals),
    [
      "Define operational meanings for governance terms used by agents and reviewers.",
      "Connect policy language to enforceable authority and runtime controls.",
      "Record examples that show the language changing action outcomes at the consequence boundary."
    ],
    Math.max(context.coordinationMax, context.authorityMax, context.proofMax, 2)
  );

  pushFinding(
    findings,
    context.capabilityMax >= 2 &&
      (hasParticipationKind(input, "rubber_stamp_pattern") ||
        hasParticipationKind(input, "human_near_loop") ||
        hasParticipationKind(input, "approval_after_momentum") ||
        hasParticipationKind(input, "review_without_refusal_power") ||
        context.participationMax >= 3),
    "automation_outruns_participation",
    "Automation may be outrunning participation",
    "Automated workflow pressure is present while human review appears low-context, late, overloaded, or lacking refusal power.",
    collectEvidence(input.capabilitySignals, input.participationSignals),
    [
      "Move review before commitment points and record reviewer context.",
      "Give reviewers explicit refusal and pause authority.",
      "Reduce automation speed or scope where human participation is not demonstrated."
    ],
    Math.max(context.capabilityMax, context.participationMax)
  );

  pushFinding(
    findings,
    hasMemoryRisk(input),
    "memory_outruns_review",
    "Governance memory may be outrunning review",
    "Memory, historical pattern extraction, or governance recommendations appear without a demonstrated human review or approval pathway.",
    collectEvidence(input.memorySignals),
    [
      "Require human review for governance memory recommendations before policy changes.",
      "Record which memory findings were accepted, rejected, or deferred.",
      "Prevent memory outputs from silently mutating governance policy."
    ],
    Math.max(context.memoryMax, 2)
  );

  pushFinding(
    findings,
    context.proofMax >= 2 || context.fingerprintMax >= 2,
    "proof_outruns_reality",
    "Proof artifacts may be outrunning runtime reality",
    "Receipts or reports may exist while runtime binding, decision closure, agency fingerprints, approvals, or action chains are weak, missing, or unlinked.",
    collectEvidence(input.proofSignals, input.fingerprintSignals, input.agencyChainSignals),
    [
      "Link receipts to runtime binding results, permits, decision closure, and agency fingerprints.",
      "Verify that proof artifacts refer to the exact action that reached execution.",
      "Treat unlinked proof as an audit question requiring review."
    ],
    Math.max(context.proofMax, context.fingerprintMax, context.agencyChainMax)
  );

  pushFinding(
    findings,
    hasGovernanceReportKind(input, "repeated_governance_theater_finding") ||
      (context.governanceReportMax >= 3 && (context.authorityMax >= 2 || context.proofMax >= 2)),
    "governance_theater",
    "Governance artifacts may not be live at the consequence boundary",
    "Formal governance artifacts exist, but available signals suggest authority, participation, runtime binding, or proof may not be operating where consequences occur.",
    collectEvidence(input.governanceReportSignals, input.authoritySignals, input.participationSignals, input.proofSignals),
    [
      "Test whether governance artifacts change action outcomes before execution.",
      "Prioritize evidence from runtime boundaries over policy descriptions alone.",
      "Close repeated theater findings with demonstrated remediation evidence."
    ],
    Math.max(context.governanceReportMax, context.authorityMax, context.participationMax, context.proofMax)
  );

  pushFinding(
    findings,
    hasCoordinationKind(input, "dependency_on_single_platform") ||
      hasParticipationKind(input, "overload_pressure") ||
      hasGovernanceReportKind(input, "remediation_not_demonstrated"),
    "dependency_capture",
    "Dependency capture may be reducing independent judgment",
    "The structure may be increasing reliance on a platform, workflow, or automated pattern faster than human understanding, refusal power, or independent review capacity.",
    collectEvidence(input.coordinationSignals, input.participationSignals, input.governanceReportSignals),
    [
      "Preserve independent review paths outside the central dependency.",
      "Document fallback procedures and human-operated alternatives.",
      "Track whether humans can still understand, pause, and refuse the workflow."
    ],
    Math.max(context.coordinationMax, context.participationMax, context.governanceReportMax, 2)
  );

  pushFinding(
    findings,
    hasGovernanceReportKind(input, "self_audit_circularity") ||
      (hasGovernanceReportKind(input, "third_party_review_missing") && context.governanceReportMax >= 3),
    "self_audit_circularity",
    "Validation may be circular",
    "The system's validation appears to depend primarily on its own internal reports, with external or third-party review not demonstrated for higher-impact contexts.",
    collectEvidence(input.governanceReportSignals),
    [
      "Identify which claims require independent review before external reliance.",
      "Separate internal self-audit from third-party validation language.",
      "Record remediation evidence that can be reviewed outside the system that produced it."
    ],
    Math.max(context.governanceReportMax, 2)
  );

  pushFinding(
    findings,
    hasCoordinationKind(input, "centralized_control_plane") && context.authorityMax >= 2,
    "centralized_control_without_accountability",
    "Centralized control may lack matching accountability",
    "A central control plane appears to be expanding across workflows without clear accountability, authority maps, or refusal channels.",
    collectEvidence(input.coordinationSignals, input.authoritySignals, input.participationSignals),
    [
      "Map accountability and stop authority for the control plane.",
      "Require workflow-specific refusal channels and scoped approvals.",
      "Audit whether centralization improves proof continuity or only increases coordination power."
    ],
    Math.max(context.coordinationMax, context.authorityMax)
  );

  return findings.map((finding, index) => ({
    ...finding,
    id: `BR-${String(index + 1).padStart(3, "0")}`
  }));
}

function scoreStructuralAscent(input: BabelRiskInput, findings: BabelRiskFinding[]): number {
  const raw =
    sumSignalWeight(input.capabilitySignals) * 2 +
    sumSignalWeight(input.coordinationSignals) * 2 +
    sumSignalWeight(input.authoritySignals) * 3 +
    sumSignalWeight(input.participationSignals) * 3 +
    sumSignalWeight(input.proofSignals) * 3 +
    sumSignalWeight(input.memorySignals) * 2.5 +
    sumSignalWeight(input.agencyChainSignals) * 3 +
    sumSignalWeight(input.fingerprintSignals) * 3 +
    sumSignalWeight(input.governanceReportSignals) * 2.5 +
    findings.reduce((sum, finding) => sum + (finding.severity === "critical" ? 8 : finding.severity === "high" ? 6 : finding.severity === "medium" ? 4 : 2), 0);

  return Math.max(0, Math.min(100, Math.round(raw * 1.8)));
}

function createContext(input: BabelRiskInput): AnalysisContext {
  return {
    capabilityMax: maxSignalWeight(input.capabilitySignals),
    coordinationMax: maxSignalWeight(input.coordinationSignals),
    authorityMax: maxSignalWeight(input.authoritySignals),
    participationMax: maxSignalWeight(input.participationSignals),
    proofMax: maxSignalWeight(input.proofSignals),
    memoryMax: maxSignalWeight(input.memorySignals),
    agencyChainMax: maxSignalWeight(input.agencyChainSignals),
    fingerprintMax: maxSignalWeight(input.fingerprintSignals),
    governanceReportMax: maxSignalWeight(input.governanceReportSignals)
  };
}

function shouldFlagCapabilityOutrunsDiscernment(input: BabelRiskInput, context: AnalysisContext): boolean {
  const proposalScrutinyMissing =
    input.proofSignals === undefined &&
    input.participationSignals === undefined &&
    input.authoritySignals === undefined;

  return (
    context.capabilityMax >= 3 &&
    (context.participationMax >= 2 ||
      context.proofMax >= 2 ||
      context.authorityMax >= 2 ||
      context.agencyChainMax >= 2 ||
      context.fingerprintMax >= 2 ||
      proposalScrutinyMissing)
  );
}

function pushFinding(
  findings: BabelRiskFinding[],
  shouldPush: boolean,
  category: BabelRiskFindingCategory,
  title: string,
  summary: string,
  evidenceRefs: string[],
  recommendedRemediation: string[],
  weight: number
): void {
  if (!shouldPush) {
    return;
  }

  findings.push({
    id: "BR-000",
    category,
    severity: severityFromWeight(weight),
    confidence: evidenceRefs.length > 0 ? "medium" : "low",
    title,
    summary: `${summary} This is a potential signal requiring human review, not a claim of wrongdoing.`,
    evidenceRefs,
    recommendedRemediation,
    limitations: [
      "This finding is based on supplied structural signals and does not prove legal noncompliance or moral fault.",
      "A low-evidence finding should be treated as an audit question until source evidence is reviewed."
    ]
  });
}

function collectEvidence(...groups: Array<BaseSignal[] | undefined>): string[] {
  const refs = groups.flatMap((group) => group ?? []).flatMap((signal) => signal.evidenceRefs ?? [signal.id]);
  return Array.from(new Set(refs));
}

function hasMemoryRisk(input: BabelRiskInput): boolean {
  return (
    hasMemoryKind(input, "memory_without_review") ||
    hasMemoryKind(input, "self_modifying_governance") ||
    hasMemoryKind(input, "recommendation_without_human_approval") ||
    hasMemoryKind(input, "repeated_unreviewed_pattern") ||
    hasMemoryKind(input, "governance_memory_ignored")
  );
}

function hasCoordinationKind(input: BabelRiskInput, kind: CoordinationSignal["kind"]): boolean {
  return input.coordinationSignals?.some((signal) => signal.kind === kind) ?? false;
}

function hasAuthorityKind(input: BabelRiskInput, kind: NonNullable<BabelRiskInput["authoritySignals"]>[number]["kind"]): boolean {
  return input.authoritySignals?.some((signal) => signal.kind === kind) ?? false;
}

function hasParticipationKind(input: BabelRiskInput, kind: NonNullable<BabelRiskInput["participationSignals"]>[number]["kind"]): boolean {
  return input.participationSignals?.some((signal) => signal.kind === kind) ?? false;
}

function hasMemoryKind(input: BabelRiskInput, kind: NonNullable<BabelRiskInput["memorySignals"]>[number]["kind"]): boolean {
  return input.memorySignals?.some((signal) => signal.kind === kind) ?? false;
}

function hasGovernanceReportKind(input: BabelRiskInput, kind: GovernanceReportSignal["kind"]): boolean {
  return input.governanceReportSignals?.some((signal) => signal.kind === kind) ?? false;
}

export function deriveBabelRiskReportId(reportBody: unknown): string {
  return `babel-risk-${sha256Hex(canonicalizeForHash(reportBody)).slice(0, 16)}`;
}

function readGeneratedAt(input: BabelRiskInput): string {
  const generatedAt = input.metadata?.generatedAt;
  return typeof generatedAt === "string" ? generatedAt : new Date().toISOString();
}
