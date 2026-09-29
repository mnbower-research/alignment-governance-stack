import type { AgentActionProposal, AssurancePolicy, AssuranceRequirement, AssuranceRiskLevel, RiskDimension, RiskVector } from "@alignment-governance-stack/shared-types" with { "resolution-mode": "import" };

export const riskDimensions: RiskDimension[] = ["consequenceSeverity", "irreversibility", "uncertainty", "blastRadius", "sensitivity", "financialExposure", "externalConsequence", "authorityDomainSensitivity", "contextConfidence", "novelty"];
export const riskLevels: AssuranceRiskLevel[] = ["low", "medium", "high", "critical"];
/** Canonical JSON for assurance artifacts. Non-JSON inputs are rejected by the public schema. */
export function canonicalAssurance(value: unknown): string {
  return JSON.stringify(value, (_key, item: unknown) => item && typeof item === "object" && !Array.isArray(item)
    ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) : item);
}
export function reviewedAction(action: AgentActionProposal): unknown {
  const { metadata, knownApproval: _approval, ...fields } = action;
  const bound = { ...fields, ...(Object.keys(metadata).length > 0 ? { metadata } : {}) };
  return bound;
}
export function evaluateRisk(action: AgentActionProposal, supplied: RiskVector, policy: AssurancePolicy): { risk: RiskVector; level: AssuranceRiskLevel | "unknown"; unknown: RiskDimension[] } {
  const risk: RiskVector = structuredClone(supplied);
  const floors: Partial<Record<RiskDimension, AssuranceRiskLevel>> = {
    irreversibility: action.reversible ? "low" : "high",
    sensitivity: action.dataSensitivity,
    externalConsequence: action.externalFacing ? "medium" : "low"
  };
  for (const dimension of riskDimensions) {
    const floor = floors[dimension];
    if (risk[dimension] === undefined && floor) risk[dimension] = { value: floor, source: "derived", evidenceRefs: [`action:${dimension}`] };
    risk[dimension] ??= { value: "unknown", source: "unknown", evidenceRefs: [] };
    const fact = risk[dimension]!;
    // A known core field supplies a floor, not an upper bound on an explicitly unknown concern.
    if (floor && fact.value !== "unknown" && riskLevels.indexOf(fact.value) < riskLevels.indexOf(floor))
      risk[dimension] = { value: floor, source: "derived", evidenceRefs: [`action:${dimension}`] };
  }
  const material = new Set([...policy.materialDimensions, "consequenceSeverity", "irreversibility", "sensitivity", "externalConsequence"] as RiskDimension[]);
  const unknown = [...material].filter(d => risk[d]?.value === "unknown" || risk[d]?.source === "unknown").sort();
  const rank = Math.max(0, ...[...material].map(d => riskLevels.indexOf(risk[d]!.value as AssuranceRiskLevel)));
  return { risk, level: unknown.length ? "unknown" : riskLevels[rank]!, unknown };
}
const requirement = (count: number, human: boolean, maxAgeMs: number): AssuranceRequirement => ({
  minimumAttestations: count, slots: [], distinctGroups: true, mandatoryHuman: human, unanimity: true,
  denialBlocks: true, requiredEvidence: ["review"], maxAgeMs, ttlMs: maxAgeMs,
  sequence: [], onInsufficient: "request_validation"
});
export function createDefaultAssurancePolicy(): AssurancePolicy {
  return {
    id: "risk-scaled-assurance", version: "1", materialDimensions: [...riskDimensions],
    requirements: { low: requirement(1, false, 3_600_000), medium: requirement(2, false, 1_800_000), high: requirement(3, true, 900_000), critical: requirement(4, true, 300_000) },
    denialExpiry: "persist", resolutionRoles: {}
  };
}
