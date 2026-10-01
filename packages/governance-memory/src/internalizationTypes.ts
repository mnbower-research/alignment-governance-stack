import type { JsonValue } from "@alignment-governance-stack/shared-types";
import type { GovernanceReceipt } from "@alignment-governance-stack/receipts";
import type { HumanExpression, IntentProposal, DelegationOrigin } from "@alignment-governance-stack/authority-map";

export type MemoryCategory = "preference" | "procedure" | "observed_routine";
/** Host-normalized record retained inside an existing receipt before its hash is computed. */
export interface MemoryObservationContent {
  id: string;
  category: MemoryCategory;
  subjectId: string;
  contextKey: string;
  key: string;
  value: JsonValue;
  classification: "explicit" | "inferred";
  observedAt: string;
  supersedes: string[];
  /** Descriptive only; never used for support, permission or promotion. */
  predictionConfidence?: number;
}
export interface MemoryObservation extends MemoryObservationContent {
  version: "memory-observation/v1";
  source: { receiptId: string; receiptHash: string; pointer: string };
  digest: string;
}
export interface InternalizationInput {
  observations: MemoryObservation[];
  receipts: GovernanceReceipt[];
  host: {
    now: string;
    /** Authenticated source inventory, never reconstructed from untrusted observations. */
    receiptHashes: Readonly<Record<string, string>>;
    maxObservationAgeMs: number;
    minInferredSupport: number;
  };
}
export interface MemoryCandidate {
  category: MemoryCategory;
  subjectId: string;
  contextKey: string;
  key: string;
  value: JsonValue;
  state: "candidate" | "supported" | "contested" | "superseded";
  freshness: "current" | "stale";
  evidence: { observationId: string; digest: string; classification: "explicit" | "inferred"; observedAt: string }[];
  activeSupportIds: string[];
  contradictoryIds: string[];
  supersededIds: string[];
  /** Counts distinct retained receipt hashes, not proof of independent experiences. */
  supportCount: number;
  explicitSupportCount: number;
  inferredSupportCount: number;
  firstObservedAt: string;
  lastObservedAt: string;
  digest: string;
}
export interface InternalizationRecommendation {
  type: "standing_delegation_recommendation";
  candidateDigest: string;
  subjectId: string;
  contextKey: string;
  humanReviewRequired: true;
  authorityEffect: "none";
  rationale: string;
  digest: string;
}
export interface InternalizationSnapshot {
  version: "internalization/v1";
  evaluatedAt: string;
  policy: { maxObservationAgeMs: number; minInferredSupport: number };
  observations: MemoryObservation[];
  candidates: MemoryCandidate[];
  recommendations: InternalizationRecommendation[];
  authorityEffect: "none";
  digest: string;
}
export interface MemoryInterpretationInput {
  history: InternalizationInput;
  expression: HumanExpression;
  subjectId: string;
  contextKey: string;
  intentId: string;
  objective: string;
  /** Explicit host mapping; Core performs no semantic extraction or context generalization. */
  slots: { parameter: string; category: "preference" | "procedure"; key: string }[];
}
export interface MemoryAssistedInterpretation {
  intent: IntentProposal;
  parameterProvenance: Record<string, DelegationOrigin>;
  memoryDigest: string;
  metrics: { requestedParameters: number; suppliedParameters: number; remainingClarifications: number };
  authorityEffect: "none";
  digest: string;
}
