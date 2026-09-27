import type { AgentActionProposal } from "./actionProposal.js";

export type AssuranceRiskLevel = "low" | "medium" | "high" | "critical";
export type RiskDimension = "consequenceSeverity" | "irreversibility" | "uncertainty" | "blastRadius" | "sensitivity" | "financialExposure" | "externalConsequence" | "authorityDomainSensitivity" | "contextConfidence" | "novelty";
/** Levels describe declared concern: high contextConfidence means high concern about confidence. */
export interface RiskFact {
  value: AssuranceRiskLevel | "unknown";
  source: "host_supplied" | "derived" | "unknown";
  evidenceRefs: string[];
}
export type RiskVector = Partial<Record<RiskDimension, RiskFact>>;
export type ValidatorType = "human" | "agent" | "system" | "organization";
/** Trusted host registry, never populated from attestation display names. */
export interface AssuranceValidator {
  id: string;
  subjectId: string;
  type: ValidatorType;
  roles: string[];
  authorityDomains: string[];
  independenceGroup: string;
  revoked: boolean;
}
export interface AssuranceSlot {
  id: string;
  role?: string;
  authorityDomain?: string;
  independenceGroup?: string;
  validatorType?: ValidatorType;
}
export interface AssuranceRequirement {
  minimumAttestations: number;
  slots: AssuranceSlot[];
  distinctGroups: boolean;
  mandatoryHuman: boolean;
  unanimity: boolean;
  denialBlocks: boolean;
  requiredEvidence: string[];
  maxAgeMs: number;
  ttlMs: number;
  /** Slot IDs in the required review order; each must be satisfied by a different subject. */
  sequence: string[];
  onInsufficient: "insufficient" | "request_validation" | "escalate";
}
export interface AssurancePolicy {
  id: string;
  version: string;
  materialDimensions: RiskDimension[];
  requirements: Record<AssuranceRiskLevel, AssuranceRequirement>;
  /** Denials persist across expiry/revocation unless this explicit policy exception applies. */
  denialExpiry: "persist" | "attestation_expiry";
  resolutionRoles: Partial<Record<"material_revision" | "escalation" | "override", string[]>>;
}
export interface AssuranceRequirementRef { policyId: string; policyVersion: string }
export interface AssuranceBinding {
  authorityDomain: string;
  caseId: string;
  proposalId: string;
  target: string;
  actionDigest: string;
  riskDigest: string;
  policyDigest: string;
  requirementDigest: string;
  riskLevel: AssuranceRiskLevel | "unknown";
}
export interface ValidatorAttestation {
  version: "assurance-attestation/v0.1";
  id: string;
  validatorId: string;
  validatorType: ValidatorType;
  role: string;
  authorityDomain: string;
  independenceGroup: string;
  verdict: "approve" | "deny" | "abstain" | "request_revision";
  binding: AssuranceBinding;
  policyVersion: string;
  evidenceRefs: string[];
  createdAt: string;
  expiresAt: string;
  revoked: boolean;
  revokedAt?: string;
  rationale: string;
  lineage: string[];
  digest: string;
}
export interface AssuranceResolution {
  id: string;
  kind: "material_revision" | "escalation" | "override";
  attestationIds: string[];
  binding: AssuranceBinding;
  resolverId: string;
  createdAt: string;
  expiresAt: string;
  rationale: string;
  evidenceRefs: string[];
}
/** All fields except attestation artifacts are trusted receiving-host inputs. */
export interface AssuranceInput {
  authorityDomain: string;
  caseId: string;
  risk: RiskVector;
  policy: AssurancePolicy;
  validators: AssuranceValidator[];
  attestations: ValidatorAttestation[];
  resolutions: AssuranceResolution[];
  historyComplete: boolean;
  evaluatedAt: string;
}
export type AssuranceDecision = "satisfied" | "insufficient" | "request_validation" | "request_revision" | "escalate" | "blocked";
export interface AssuranceFinding { code: string; reason: string; attestationId?: string }
export interface AssuranceEvidence {
  version: "assurance-evidence/v0.1";
  historyComplete: boolean;
  binding: AssuranceBinding;
  evaluatedAt: string;
  validUntil?: string;
  risk: RiskVector;
  policy: AssurancePolicy;
  requirement: AssuranceRequirement;
  validators: AssuranceValidator[];
  attestations: ValidatorAttestation[];
  resolutions: AssuranceResolution[];
  acceptedAttestationIds: string[];
  rejectedAttestations: Array<{ id: string; reasons: string[] }>;
  unresolvedDenialIds: string[];
  resolvedDenials: Array<{ attestationId: string; resolutionId: string }>;
  slotAssignments: Record<string, string>;
  independenceGroups: string[];
  decision: AssuranceDecision;
  findings: AssuranceFinding[];
  digest: string;
}
export interface AssuranceEvaluationRequest { action: AgentActionProposal; assurance: AssuranceInput }
