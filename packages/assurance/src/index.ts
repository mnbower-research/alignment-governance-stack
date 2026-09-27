import { createHash } from "node:crypto";
import type { AgentActionProposal, AssuranceBinding, AssuranceEvidence, AssuranceInput, ValidatorAttestation } from "@alignment-governance-stack/shared-types" with { "resolution-mode": "import" };
import { canonicalAssurance, evaluateRisk, reviewedAction } from "./model.js";
import { attestationShape, evidenceShape, inputShape, policyShape, riskShape } from "./schema.js";
import { consistentEvidence } from "./evidenceConsistency.js";
export { createDefaultAssurancePolicy, evaluateRisk, riskDimensions, riskLevels } from "./model.js";
export { evaluateAssurance } from "./evaluate.js";
export type { AssuranceRiskLevel, RiskDimension, RiskFact, RiskVector, ValidatorType, AssuranceValidator, AssuranceSlot, AssuranceRequirement, AssurancePolicy, AssuranceRequirementRef, AssuranceBinding, ValidatorAttestation, AssuranceResolution, AssuranceInput, AssuranceDecision, AssuranceFinding, AssuranceEvidence, AssuranceEvaluationRequest } from "@alignment-governance-stack/shared-types" with { "resolution-mode": "import" };

export const assuranceDigest = (value: unknown): string => `sha256:${createHash("sha256").update(canonicalAssurance(value)).digest("hex")}`;
export function createAssuranceBinding(action: AgentActionProposal, input: Pick<AssuranceInput, "caseId" | "authorityDomain" | "risk" | "policy">): AssuranceBinding {
  if (!policyShape(input.policy) || !riskShape(input.risk) || !input.caseId?.trim() || !input.authorityDomain?.trim()) throw new Error("Invalid assurance binding inputs.");
  const evaluated = evaluateRisk(action, input.risk, input.policy);
  return { caseId: input.caseId, authorityDomain: input.authorityDomain, proposalId: action.id, target: action.target,
    actionDigest: assuranceDigest(reviewedAction(action)), riskDigest: assuranceDigest(evaluated.risk),
    policyDigest: assuranceDigest(input.policy), requirementDigest: assuranceDigest(input.policy.requirements[evaluated.level === "unknown" ? "critical" : evaluated.level]), riskLevel: evaluated.level };
}
export function createValidatorAttestation(input: Omit<ValidatorAttestation, "version" | "digest">): ValidatorAttestation {
  const body = { ...structuredClone(input), version: "assurance-attestation/v0.1" as const };
  const attestation = { ...body, digest: assuranceDigest(body) };
  if (!attestationShape(attestation)) throw new Error("Invalid validator attestation.");
  return attestation;
}
export function verifyValidatorAttestation(value: unknown): value is ValidatorAttestation {
  if (!attestationShape(value)) return false;
  const { digest, ...body } = value;
  return digest === assuranceDigest(body);
}
export function verifyAssuranceEvidence(value: unknown): value is AssuranceEvidence {
  if (!evidenceShape(value) || !consistentEvidence(value) || !value.attestations.every(verifyValidatorAttestation)) return false;
  if (value.binding.policyDigest !== assuranceDigest(value.policy) || value.binding.riskDigest !== assuranceDigest(value.risk) || value.binding.requirementDigest !== assuranceDigest(value.requirement)) return false;
  const { digest, ...body } = value;
  return digest === assuranceDigest(body);
}
export function assertAssuranceInput(value: unknown): asserts value is AssuranceInput {
  if (!inputShape(value)) throw new Error("Malformed assurance input, policy, identity, risk provenance or validity window.");
}
