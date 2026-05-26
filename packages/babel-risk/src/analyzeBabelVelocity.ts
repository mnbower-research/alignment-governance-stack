import { canonicalizeForHash, sha256Hex } from "@alignment-governance-stack/receipts";
import { riskFromScore, severityFromWeight } from "./scoring.js";
import type { BabelRiskSeverity, DemonstrationStatus } from "./types.js";
import type {
  AuthorityCoverageEvent,
  BabelVelocityFinding,
  BabelVelocityFindingCategory,
  BabelVelocityInput,
  BabelVelocityReport,
  DecisionThroughputEvent,
  GovernanceAbsorptionMetrics,
  GovernanceCapacitySignal,
  GovernanceClosureEvent,
  ProofCompletenessEvent,
  RemediationEvent,
  TemporalBabelRiskWindow
} from "./velocityTypes.js";

const consequenceWeights: Record<BabelRiskSeverity, number> = {
  low: 1,
  medium: 2,
  high: 4,
  critical: 8
};

const closureStatusMultipliers: Record<GovernanceClosureEvent["closureStatus"], number> = {
  closed: 1,
  partially_closed: 0.5,
  not_closed: 0,
  invalid: 0
};

const participationMultipliers: Record<GovernanceClosureEvent["participationQuality"], number> = {
  meaningful: 1,
  partial: 0.6,
  weak: 0.25,
  rubber_stamp: 0.05,
  not_demonstrated: 0
};

export function analyzeBabelVelocity(input: BabelVelocityInput): BabelVelocityReport {
  const windows = input.windows.map(calculateGovernanceAbsorptionMetrics);
  const findings = createVelocityFindings(input, windows);
  const current = windows[windows.length - 1];
  const previous = windows.length >= 2 ? windows[windows.length - 2] : undefined;
  const generatedAt = readGeneratedAt(input);
  const currentClosureRatio = current?.governanceClosureRatio ?? 1;
  const reportWithoutId = {
    version: "babel-velocity/v0.1" as const,
    ...(input.systemId !== undefined ? { systemId: input.systemId } : {}),
    ...(input.organizationId !== undefined ? { organizationId: input.organizationId } : {}),
    ...(input.workflowId !== undefined ? { workflowId: input.workflowId } : {}),
    windows,
    overallVelocityRisk: determineOverallVelocityRisk(current, previous, findings),
    currentClosureRatio,
    ...(previous !== undefined ? { previousClosureRatio: previous.governanceClosureRatio } : {}),
    ...(current !== undefined && previous !== undefined
      ? {
          closureRatioDelta: current.governanceClosureRatio - previous.governanceClosureRatio,
          decisionLoadDelta: current.riskWeightedDecisionRatePerHour - previous.riskWeightedDecisionRatePerHour,
          closureRateDelta: current.qualityWeightedClosureRatePerHour - previous.qualityWeightedClosureRatePerHour,
          capacityDelta: current.estimatedAbsorptionCapacityPerHour - previous.estimatedAbsorptionCapacityPerHour
        }
      : {}),
    absorptionStatus: current === undefined ? "not_enough_data" : absorptionStatus(current.governanceClosureRatio),
    findings,
    summary: createVelocitySummary(windows),
    ...(input.metadata !== undefined ? { metadata: input.metadata } : {})
  };
  const reportId = deriveBabelVelocityReportId(reportWithoutId);

  return {
    ...reportWithoutId,
    reportId,
    generatedAt
  };
}

export function calculateGovernanceAbsorptionMetrics(window: TemporalBabelRiskWindow): GovernanceAbsorptionMetrics {
  const durationHours = calculateDurationHours(window.from, window.to);
  const riskWeightedDecisionLoad = window.decisionEvents.reduce(
    (sum, event) => sum + consequenceWeights[event.consequenceLevel],
    0
  );
  const riskWeightedDecisionRatePerHour = safeDivide(riskWeightedDecisionLoad, durationHours);
  const qualityWeightedClosureLoad = window.closureEvents.reduce(
    (sum, event) => sum + calculateClosureWeight(event),
    0
  );
  const qualityWeightedClosureRatePerHour = safeDivide(qualityWeightedClosureLoad, durationHours);
  const governanceClosureRatio = safeClosureRatio(
    qualityWeightedClosureRatePerHour,
    riskWeightedDecisionRatePerHour
  );
  const estimatedAbsorptionCapacityPerHour = estimateAbsorptionCapacityPerHour(
    qualityWeightedClosureRatePerHour,
    window.capacitySignals
  );
  const capacityUtilization = safeUtilization(
    riskWeightedDecisionRatePerHour,
    estimatedAbsorptionCapacityPerHour
  );
  const averageClosureLagHours = calculateAverageClosureLagHours(window);
  const openRemediationLoad = calculateRemediationLoad(window.remediationEvents, "open");
  const staleRemediationLoad = calculateRemediationLoad(window.remediationEvents, "stale");

  return {
    windowId: window.id,
    from: window.from,
    to: window.to,
    durationHours,
    rawDecisionCount: window.decisionEvents.length,
    riskWeightedDecisionLoad,
    riskWeightedDecisionRatePerHour,
    rawClosureCount: window.closureEvents.length,
    qualityWeightedClosureLoad,
    qualityWeightedClosureRatePerHour,
    governanceClosureRatio,
    estimatedAbsorptionCapacityPerHour,
    capacityUtilization,
    ...(averageClosureLagHours !== undefined ? { averageClosureLagHours } : {}),
    openRemediationLoad,
    staleRemediationLoad,
    proofCompletenessScore: averageProofCompletenessScore(window.proofEvents),
    authorityCoverageScore: averageAuthorityCoverageScore(window.authorityCoverageEvents),
    participationQualityScore: averageParticipationQualityScore(window.closureEvents)
  };
}

function createVelocityFindings(
  input: BabelVelocityInput,
  windows: GovernanceAbsorptionMetrics[]
): BabelVelocityFinding[] {
  const findings: BabelVelocityFinding[] = [];
  const current = windows[windows.length - 1];
  const previous = windows.length >= 2 ? windows[windows.length - 2] : undefined;
  const currentWindow = input.windows[input.windows.length - 1];
  const previousWindow = input.windows.length >= 2 ? input.windows[input.windows.length - 2] : undefined;

  if (current === undefined) {
    return findings;
  }

  pushFinding(
    findings,
    current.governanceClosureRatio < 1,
    "decision_rate_exceeds_closure_rate",
    "Decision tempo exceeds meaningful governance closure",
    "Risk-weighted decision throughput is higher than quality-weighted governance closure capacity in the current window.",
    collectWindowEvidence(currentWindow),
    [
      "Reduce consequential decision throughput until meaningful review can close the loop.",
      "Increase reviewer bandwidth, refusal authority, context quality, and proof verification capacity.",
      "Separate low-risk automation from high-consequence workflows when calculating review load."
    ],
    severityForRatio(current.governanceClosureRatio)
  );

  pushFinding(
    findings,
    previous !== undefined && current.governanceClosureRatio < previous.governanceClosureRatio - 0.05,
    "closure_ratio_declining",
    "Governance closure ratio is declining",
    "The current window shows a lower governance closure ratio than the previous window, indicating that meaningful closure may be falling behind decision tempo.",
    collectWindowEvidence(previousWindow, currentWindow),
    [
      "Investigate why meaningful closure is declining before expanding agent scope.",
      "Track closure ratio as a release and operations readiness signal.",
      "Prioritize closure quality over raw approval counts."
    ],
    severityForDelta(previous, current)
  );

  pushFinding(
    findings,
    previous !== undefined &&
      current.rawClosureCount > previous.rawClosureCount &&
      (current.qualityWeightedClosureRatePerHour < previous.qualityWeightedClosureRatePerHour ||
        current.governanceClosureRatio < previous.governanceClosureRatio),
    "raw_approvals_mask_meaningful_closure_decline",
    "Raw approvals may be masking meaningful closure decline",
    "Raw closure events increased while quality-weighted closure rate or closure ratio declined. Rubber-stamp approvals do not count as full closures.",
    collectWindowEvidence(previousWindow, currentWindow),
    [
      "Report quality-weighted closure alongside raw approval counts.",
      "Audit approval context, refusal power, timing before commitment, authority validity, and scope match.",
      "Treat approval volume increases as a risk signal when participation quality declines."
    ],
    "high"
  );

  pushFinding(
    findings,
    previous !== undefined &&
      current.riskWeightedDecisionRatePerHour > previous.riskWeightedDecisionRatePerHour + 0.01,
    "risk_weighted_load_accelerating",
    "Risk-weighted decision load is accelerating",
    "The current window has higher consequence-weighted decision throughput than the previous window.",
    collectDecisionEvidence(currentWindow),
    [
      "Review whether governance capacity increased before accepting higher consequence-weighted throughput.",
      "Use consequence-weighted load rather than raw action counts for release readiness.",
      "Throttle high-consequence workflows when closure ratio declines."
    ],
    current.riskWeightedDecisionRatePerHour > (previous?.riskWeightedDecisionRatePerHour ?? 0) * 1.5 ? "high" : "medium"
  );

  pushFinding(
    findings,
    previous?.averageClosureLagHours !== undefined &&
      current.averageClosureLagHours !== undefined &&
      current.averageClosureLagHours > previous.averageClosureLagHours + 0.25,
    "review_lag_increasing",
    "Review lag is increasing",
    "Matched decision-to-closure lag increased across windows, which can indicate that review capacity is falling behind decision tempo.",
    collectClosureEvidence(currentWindow),
    [
      "Track average and high-percentile review lag for consequential workflows.",
      "Move review earlier in the workflow before commitment points.",
      "Add reviewer capacity or reduce decision throughput where lag rises."
    ],
    current.averageClosureLagHours !== undefined && current.averageClosureLagHours >= 24 ? "high" : "medium"
  );

  pushFinding(
    findings,
    previous !== undefined &&
      current.openRemediationLoad + current.staleRemediationLoad >
        previous.openRemediationLoad + previous.staleRemediationLoad,
    "remediation_backlog_growing",
    "Remediation backlog is growing",
    "Open or stale risk-weighted remediation load increased across windows.",
    collectRemediationEvidence(currentWindow),
    [
      "Dedicate capacity to close high-severity remediation before expanding automation.",
      "Track stale remediation as governance debt.",
      "Require evidence before marking remediation complete."
    ],
    current.staleRemediationLoad >= 8 ? "critical" : "high"
  );

  pushFinding(
    findings,
    (previous !== undefined && current.authorityCoverageScore < previous.authorityCoverageScore - 0.05) ||
      hasAuthorityCoverageGap(currentWindow),
    "authority_coverage_lagging_scope",
    "Authority coverage may be lagging scope",
    "Authority coverage is declining or the current window includes missing, ambiguous, or stale authority coverage.",
    collectAuthorityEvidence(currentWindow),
    [
      "Update authority maps before expanding workflow scope.",
      "Close ambiguous or stale authority records with accountable human owners.",
      "Treat uncovered high-consequence decisions as governance debt."
    ],
    current.authorityCoverageScore < 0.5 ? "high" : "medium"
  );

  pushFinding(
    findings,
    previous !== undefined && current.proofCompletenessScore < previous.proofCompletenessScore - 0.05,
    "proof_completeness_declining",
    "Proof completeness is declining",
    "Receipt, runtime binding, decision closure, agency fingerprint, or authority evidence completeness declined across windows.",
    collectProofEvidence(currentWindow),
    [
      "Require proof completeness checks for consequential actions.",
      "Link receipts, runtime binding, Decision Closure, Agency Fingerprints, and authority evidence.",
      "Investigate proof decline before relying on aggregate governance reports."
    ],
    current.proofCompletenessScore < 0.5 ? "high" : "medium"
  );

  pushFinding(
    findings,
    previous !== undefined &&
      current.riskWeightedDecisionRatePerHour > previous.riskWeightedDecisionRatePerHour + 0.01 &&
      current.estimatedAbsorptionCapacityPerHour <= previous.estimatedAbsorptionCapacityPerHour + 0.01,
    "capacity_ceiling_not_expanding",
    "Governance capacity ceiling is not expanding with decision load",
    "Decision load increased while estimated absorption capacity stayed flat or declined.",
    collectCapacityEvidence(currentWindow),
    [
      "Increase meaningful review, remediation, authority maintenance, and proof verification capacity before adding throughput.",
      "Add explicit capacity signals instead of assuming reviewers can absorb more decisions.",
      "Pause scope expansion where capacity does not grow with load."
    ],
    current.capacityUtilization > 1.5 ? "critical" : "high"
  );

  pushFinding(
    findings,
    previous !== undefined &&
      current.rawClosureCount > 0 &&
      current.governanceClosureRatio < previous.governanceClosureRatio - 0.05 &&
      current.participationQualityScore < 0.5,
    "locally_valid_globally_drowning",
    "Locally valid approvals may still be globally drowning",
    "Closure events exist and may be formally closed, but quality-weighted governance closure is declining. Locally valid approvals can still produce a globally drowning governance system.",
    collectClosureEvidence(currentWindow),
    [
      "Evaluate closure quality at the system level, not only event-by-event.",
      "Raise the standard for meaningful participation where aggregate closure ratio declines.",
      "Use quality-weighted closure ratio as a required audit signal for high-throughput workflows."
    ],
    current.governanceClosureRatio < 0.5 ? "critical" : "high"
  );

  return findings.map((finding, index) => ({
    ...finding,
    id: `BV-${String(index + 1).padStart(3, "0")}`
  }));
}

function pushFinding(
  findings: BabelVelocityFinding[],
  shouldPush: boolean,
  category: BabelVelocityFindingCategory,
  title: string,
  summary: string,
  evidenceRefs: string[],
  recommendedRemediation: string[],
  severity: BabelRiskSeverity
): void {
  if (!shouldPush) {
    return;
  }

  findings.push({
    id: "BV-000",
    category,
    severity,
    confidence: evidenceRefs.length > 0 ? "medium" : "low",
    title,
    summary: `${summary} This is a human-reviewable velocity signal, not a legal conclusion, moral accusation, or production-readiness guarantee.`,
    evidenceRefs,
    recommendedRemediation,
    limitations: [
      "Velocity findings depend on supplied temporal events and evidence quality.",
      "The report does not approve, block, execute actions, or mutate governance inputs."
    ]
  });
}

function determineOverallVelocityRisk(
  current: GovernanceAbsorptionMetrics | undefined,
  previous: GovernanceAbsorptionMetrics | undefined,
  findings: BabelVelocityFinding[]
): BabelRiskSeverity {
  if (current === undefined) {
    return "low";
  }

  const findingLoad = findings.reduce((sum, finding) => sum + consequenceWeights[finding.severity], 0);
  const ratioRisk =
    current.governanceClosureRatio < 0.5 ? 32 : current.governanceClosureRatio < 0.75 ? 22 : current.governanceClosureRatio < 1 ? 12 : 0;
  const utilizationRisk =
    current.capacityUtilization > 1.5 ? 24 : current.capacityUtilization > 1 ? 16 : current.capacityUtilization > 0.75 ? 8 : 0;
  const backlogRisk = Math.min(16, (current.openRemediationLoad + current.staleRemediationLoad) * 1.5);
  const trendRisk =
    previous !== undefined && current.governanceClosureRatio < previous.governanceClosureRatio - 0.05 ? 10 : 0;
  const proofAuthorityRisk =
    (current.proofCompletenessScore < 0.5 ? 8 : 0) + (current.authorityCoverageScore < 0.5 ? 8 : 0);

  return riskFromScore(Math.min(100, ratioRisk + utilizationRisk + backlogRisk + trendRisk + proofAuthorityRisk + findingLoad));
}

function createVelocitySummary(windows: GovernanceAbsorptionMetrics[]): BabelVelocityReport["summary"] {
  const current = windows[windows.length - 1];
  const previous = windows.length >= 2 ? windows[windows.length - 2] : undefined;

  return {
    decisionTempo: current === undefined ? "low" : severityFromWeight(Math.min(4, current.riskWeightedDecisionRatePerHour)),
    closureCapacity: current === undefined ? "not_demonstrated" : closureCapacityStatus(current.governanceClosureRatio),
    closureTrend: trendFor(previous?.governanceClosureRatio, current?.governanceClosureRatio, true),
    proofTrend: trendFor(previous?.proofCompletenessScore, current?.proofCompletenessScore, true),
    authorityCoverageTrend: trendFor(previous?.authorityCoverageScore, current?.authorityCoverageScore, true)
  };
}

function absorptionStatus(ratio: number): BabelVelocityReport["absorptionStatus"] {
  if (ratio >= 1) {
    return "keeping_pace";
  }

  if (ratio >= 0.75) {
    return "strained";
  }

  if (ratio >= 0.5) {
    return "falling_behind";
  }

  return "structurally_drowning";
}

function closureCapacityStatus(ratio: number): DemonstrationStatus {
  if (ratio >= 1) {
    return "strong";
  }

  if (ratio >= 0.75) {
    return "partial";
  }

  if (ratio >= 0.5) {
    return "weak";
  }

  return "not_demonstrated";
}

function trendFor(previous: number | undefined, current: number | undefined, higherIsBetter: boolean): "improving" | "stable" | "declining" | "not_enough_data" {
  if (previous === undefined || current === undefined) {
    return "not_enough_data";
  }

  const delta = current - previous;
  if (Math.abs(delta) <= 0.05) {
    return "stable";
  }

  return higherIsBetter ? (delta > 0 ? "improving" : "declining") : delta < 0 ? "improving" : "declining";
}

function severityForRatio(ratio: number): BabelRiskSeverity {
  if (ratio < 0.5) {
    return "critical";
  }

  if (ratio < 0.75) {
    return "high";
  }

  return "medium";
}

function severityForDelta(
  previous: GovernanceAbsorptionMetrics | undefined,
  current: GovernanceAbsorptionMetrics
): BabelRiskSeverity {
  if (previous === undefined) {
    return "low";
  }

  const delta = current.governanceClosureRatio - previous.governanceClosureRatio;
  if (delta <= -0.4) {
    return "critical";
  }

  if (delta <= -0.2) {
    return "high";
  }

  return "medium";
}

function calculateClosureWeight(event: GovernanceClosureEvent): number {
  let weight = closureStatusMultipliers[event.closureStatus] * participationMultipliers[event.participationQuality];

  if (event.authorityValid === false) {
    weight *= 0.25;
  }

  if (event.beforeCommitment === false) {
    weight *= 0.5;
  }

  if (event.refusalPowerDemonstrated === false) {
    weight *= 0.5;
  }

  if (event.contextSufficient === false) {
    weight *= 0.6;
  }

  if (event.scopeMatched === false) {
    weight *= 0.5;
  }

  return weight;
}

function estimateAbsorptionCapacityPerHour(
  closureRate: number,
  capacitySignals: GovernanceCapacitySignal[] | undefined
): number {
  if (capacitySignals === undefined || capacitySignals.length === 0) {
    return roundMetric(closureRate);
  }

  const factor = average(capacitySignals.map((signal) => capacityFactor(signal.capacityLevel)));
  const values = capacitySignals
    .map((signal) => signal.value)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0);
  const valueCapacity = values.length > 0 ? average(values) : closureRate;
  const evidenceBoundCapacity = valueCapacity > closureRate ? closureRate + (valueCapacity - closureRate) * 0.5 : valueCapacity;

  return roundMetric(Math.max(0, evidenceBoundCapacity * factor));
}

function capacityFactor(level: DemonstrationStatus): number {
  if (level === "strong") {
    return 1.15;
  }

  if (level === "partial") {
    return 1;
  }

  if (level === "weak") {
    return 0.75;
  }

  return 0.5;
}

function calculateDurationHours(from: string, to: string): number {
  const fromMs = Date.parse(from);
  const toMs = Date.parse(to);
  if (!Number.isFinite(fromMs) || !Number.isFinite(toMs) || toMs <= fromMs) {
    return 1;
  }

  return roundMetric((toMs - fromMs) / 3_600_000);
}

function calculateAverageClosureLagHours(window: TemporalBabelRiskWindow): number | undefined {
  const decisionById = new Map(window.decisionEvents.map((event) => [event.id, event]));
  const lags: number[] = [];

  for (const closure of window.closureEvents) {
    for (const decisionId of closure.relatedDecisionIds ?? []) {
      const decision = decisionById.get(decisionId);
      if (decision === undefined) {
        continue;
      }

      const decisionMs = Date.parse(decision.timestamp);
      const closureMs = Date.parse(closure.timestamp);
      if (Number.isFinite(decisionMs) && Number.isFinite(closureMs) && closureMs >= decisionMs) {
        lags.push((closureMs - decisionMs) / 3_600_000);
      }
    }
  }

  return lags.length > 0 ? roundMetric(average(lags)) : undefined;
}

function calculateRemediationLoad(
  events: RemediationEvent[] | undefined,
  status: "open" | "stale"
): number {
  return (events ?? [])
    .filter((event) => event.status === status || (status === "open" && event.status === "not_demonstrated"))
    .reduce((sum, event) => sum + consequenceWeights[event.severity], 0);
}

function averageProofCompletenessScore(events: ProofCompletenessEvent[] | undefined): number {
  if (events === undefined || events.length === 0) {
    return 1;
  }

  return roundMetric(average(events.map((event) => completenessScore(event.completeness))));
}

function averageAuthorityCoverageScore(events: AuthorityCoverageEvent[] | undefined): number {
  if (events === undefined || events.length === 0) {
    return 1;
  }

  return roundMetric(average(events.map((event) => authorityScore(event))));
}

function averageParticipationQualityScore(events: GovernanceClosureEvent[]): number {
  if (events.length === 0) {
    return 1;
  }

  return roundMetric(average(events.map((event) => participationMultipliers[event.participationQuality])));
}

function completenessScore(value: ProofCompletenessEvent["completeness"]): number {
  if (value === "complete") {
    return 1;
  }

  if (value === "partial") {
    return 0.65;
  }

  if (value === "weak") {
    return 0.35;
  }

  return 0;
}

function authorityScore(event: AuthorityCoverageEvent): number {
  let score = event.coverage === "covered" ? 1 : event.coverage === "partial" ? 0.65 : event.coverage === "weak" ? 0.35 : 0;

  if (event.missingAuthority === true) {
    score *= 0.25;
  }

  if (event.ambiguousAuthority === true) {
    score *= 0.6;
  }

  if (event.staleAuthority === true) {
    score *= 0.6;
  }

  return score;
}

function hasAuthorityCoverageGap(window: TemporalBabelRiskWindow | undefined): boolean {
  return (
    window?.authorityCoverageEvents?.some(
      (event) =>
        event.coverage === "weak" ||
        event.coverage === "not_demonstrated" ||
        event.missingAuthority === true ||
        event.ambiguousAuthority === true ||
        event.staleAuthority === true
    ) ?? false
  );
}

function collectWindowEvidence(...windows: Array<TemporalBabelRiskWindow | undefined>): string[] {
  return Array.from(
    new Set(
      windows.flatMap((window) => [
        ...collectDecisionEvidence(window),
        ...collectClosureEvidence(window),
        ...collectCapacityEvidence(window),
        ...collectProofEvidence(window),
        ...collectAuthorityEvidence(window),
        ...collectRemediationEvidence(window)
      ])
    )
  );
}

function collectDecisionEvidence(window: TemporalBabelRiskWindow | undefined): string[] {
  return collectRefs(window?.decisionEvents);
}

function collectClosureEvidence(window: TemporalBabelRiskWindow | undefined): string[] {
  return collectRefs(window?.closureEvents);
}

function collectCapacityEvidence(window: TemporalBabelRiskWindow | undefined): string[] {
  return collectRefs(window?.capacitySignals);
}

function collectProofEvidence(window: TemporalBabelRiskWindow | undefined): string[] {
  return collectRefs(window?.proofEvents);
}

function collectAuthorityEvidence(window: TemporalBabelRiskWindow | undefined): string[] {
  return collectRefs(window?.authorityCoverageEvents);
}

function collectRemediationEvidence(window: TemporalBabelRiskWindow | undefined): string[] {
  return collectRefs(window?.remediationEvents);
}

function collectRefs(events: Array<{ id: string; evidenceRefs?: string[] }> | undefined): string[] {
  return (events ?? []).flatMap((event) => event.evidenceRefs ?? [event.id]);
}

function safeClosureRatio(closureRate: number, decisionRate: number): number {
  if (decisionRate === 0) {
    return closureRate > 0 ? 1 : 1;
  }

  return roundMetric(Math.min(10, closureRate / decisionRate));
}

function safeUtilization(decisionRate: number, capacity: number): number {
  if (capacity === 0) {
    return decisionRate === 0 ? 0 : 100;
  }

  return roundMetric(Math.min(100, decisionRate / capacity));
}

function safeDivide(numerator: number, denominator: number): number {
  if (denominator === 0) {
    return 0;
  }

  return roundMetric(numerator / denominator);
}

function average(values: number[]): number {
  return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function roundMetric(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

export function deriveBabelVelocityReportId(reportBody: unknown): string {
  return `babel-velocity-${sha256Hex(canonicalizeForHash(reportBody)).slice(0, 16)}`;
}

function readGeneratedAt(input: BabelVelocityInput): string {
  const generatedAt = input.metadata?.generatedAt;
  return typeof generatedAt === "string" ? generatedAt : new Date().toISOString();
}
