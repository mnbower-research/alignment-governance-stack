import type { AgentActionProposal, AssuranceInput, AssuranceRiskLevel, ValidatorAttestation } from "@alignment-governance-stack/shared-types" with { "resolution-mode": "import" };
import { createDefaultAssurancePolicy, createAssuranceBinding, createValidatorAttestation, riskDimensions } from "../index.js";
export const now = "2026-09-23T12:00:00.000Z";
export function fixture(level: AssuranceRiskLevel = "low"): { action: AgentActionProposal; input: AssuranceInput } {
  const policy = createDefaultAssurancePolicy();
  const action: AgentActionProposal = {
    id: "review-1", userRequest: "Generate an internal operational report", tool: "report.generate", actionType: "generate_report", target: "reports/internal", environment: "staging", reversible: true,
    externalFacing: false, dataSensitivity: "low", requiresApproval: false, knownApproval: false, metadata: {},
    executionConstraints: { version: "execution-constraints/v0.1", constraints: { amount: { type: "exact_number", value: 500 }, resource: { type: "identifier", value: "account-a" }, scope: { type: "exact_string", value: "internal" } } },
    assuranceRequirement: { policyId: policy.id, policyVersion: policy.version }
  };
  const input: AssuranceInput = { caseId: "case-1", authorityDomain: "operations", policy,
    risk: Object.fromEntries(riskDimensions.map(d => [d, { value: d === "consequenceSeverity" ? level : "low", source: "host_supplied", evidenceRefs: ["risk-review"] }])),
    validators: Array.from({ length: 4 }, (_, i) => ({ id: `v${i}`, subjectId: `person-or-process-${i}`, type: i === 0 ? "human" : "agent", roles: ["reviewer", "supervisor"], authorityDomains: ["operations"], independenceGroup: `group-${i}`, revoked: false })),
    attestations: [], resolutions: [], historyComplete: true, evaluatedAt: now
  };
  return { action, input };
}
export function attest(action: AgentActionProposal, input: AssuranceInput, validatorId = "v0", changes: Partial<Omit<ValidatorAttestation, "version" | "digest">> = {}): ValidatorAttestation {
  const v = input.validators.find(v => v.id === validatorId)!;
  return createValidatorAttestation({ id: `attestation-${validatorId}`, validatorId, validatorType: v.type, role: "reviewer", authorityDomain: "operations", independenceGroup: v.independenceGroup,
    verdict: "approve", binding: createAssuranceBinding(action, input), policyVersion: input.policy.version, evidenceRefs: ["review"], createdAt: "2026-09-23T11:59:00.000Z", expiresAt: "2026-09-23T12:30:00.000Z", revoked: false, rationale: "Reviewed supplied evidence.", lineage: [], ...changes });
}
