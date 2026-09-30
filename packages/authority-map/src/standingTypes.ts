import type { AgentActionProposal, JsonValue } from "@alignment-governance-stack/shared-types";
import type { ApprovalEvidence } from "./types.js";
import type { CurrentDelegationContext, EstablishedDelegation } from "./delegationTypes.js";

export type StandingScalar = string | number | boolean | null;
export type StandingPredicate =
  | { operator: "eq" | "neq"; value: StandingScalar }
  | { operator: "lte" | "gte"; value: number }
  | { operator: "in"; values: StandingScalar[] }
  | { operator: "exists" | "absent" };
export interface StandingDependency {
  id: string;
  sourceId: string;
  /** JSON Pointer into each retained observation document. */
  pointer: string;
  maxAgeMs: number;
}
export interface StandingCondition {
  id: string;
  actionId: string;
  dependencyId: string;
  predicate: StandingPredicate;
  /** Optional condition horizon, never an extension to evidence freshness. */
  validUntil?: string;
}
export interface StandingContract {
  version: "standing-contract/v1";
  dependencies: StandingDependency[];
  conditions: StandingCondition[];
}
export type StandingActionBinding = NonNullable<ApprovalEvidence["binding"]>;
export interface StandingEvidence {
  id: string;
  dependencyId: string;
  sourceId: string;
  delegationDigest: string;
  action: StandingActionBinding;
  status: "observed" | "unresolved";
  observedAt: string;
  validUntil?: string;
  reference: { kind: "local_artifact" | "external_source" | "unresolved"; ref: string };
  /** Retained supplied content, not independently authenticated external truth. */
  document?: JsonValue;
}
export type StandingState = "standing_valid" | "standing_defeated" | "standing_unresolved";
export interface StandingConditionResult {
  conditionId: string;
  dependencyId: string;
  state: StandingState;
  code: string;
  evidenceIds: string[];
  resolution: "local_resolved" | "external_supplied" | "unresolved";
}
export interface StandingEvaluation {
  version: "standing-evaluation/v1";
  delegation: { id: string; digest: string };
  action: StandingActionBinding;
  evaluatedAt: string;
  state: StandingState;
  standingValidUntil?: string;
  evidence: { id: string; digest: string; reference: StandingEvidence["reference"] }[];
  conditions: StandingConditionResult[];
  findings: { code: string; reason: string }[];
  digest: string;
}
export interface StandingRequest {
  delegation: EstablishedDelegation;
  evidence: StandingEvidence[];
  host: CurrentDelegationContext;
}
export interface EvaluateCurrentStandingInput extends StandingRequest {
  action: AgentActionProposal;
}
