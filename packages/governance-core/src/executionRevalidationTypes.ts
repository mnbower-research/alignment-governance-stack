import type { AgentActionProposal, AssuranceInput } from "@alignment-governance-stack/shared-types";
import type { RuntimePermit } from "@alignment-governance-stack/runtime-binding";
import type { CurrentDelegationContext, EstablishedDelegation, StandingActionBinding, StandingEvaluation, StandingEvidence } from "@alignment-governance-stack/authority-map";
import type { EvaluateGovernedRuntimeActionInput, GovernanceRuntimePacketWithReceipt } from "./types.js";

/** Immutable issuance evidence, not a second permit. Host registers its digest by permit ID. */
export interface ExecutionIssuanceBasis {
  version: "execution-issuance-basis/v1";
  permitId: string;
  permitDigest: string;
  action: StandingActionBinding;
  delegation: { id: string; digest: string };
  receiverId: string;
  issuedAt: string;
  validUntil: string;
  issuanceReceiptHash: string;
  standing?: StandingEvaluation;
  digest: string;
}
export interface IssueRevalidatedPermitInput {
  delegation: EstablishedDelegation;
  action: AgentActionProposal;
  host: CurrentDelegationContext;
  evidence: StandingEvidence[];
  permitExpiresAt?: string;
  governance?: Pick<EvaluateGovernedRuntimeActionInput, "policyProfile" | "contextAdmission" | "assurance" | "humanParticipation">;
}
export interface RevalidatedPermitIssuance extends GovernanceRuntimePacketWithReceipt {
  basis?: ExecutionIssuanceBasis;
}
export interface ExecutionAuthorityObservation {
  id: string;
  observedAt: string;
  reference: string;
  /** Host version token; retained for future compare-and-act, not independently authenticated. */
  revision: string;
}
export interface ExecutionRevalidationRequest {
  permit: RuntimePermit;
  basis: ExecutionIssuanceBasis;
  action: AgentActionProposal;
  delegation: EstablishedDelegation;
  host: CurrentDelegationContext;
  /** Trusted issuer registry, separate from the supplied basis. */
  issuedBasisDigests: Readonly<Record<string, string>>;
  authorityObservation: ExecutionAuthorityObservation;
  evidence: StandingEvidence[];
  assurance?: AssuranceInput;
}
export interface ExecutionRevalidationResult {
  version: "execution-revalidation/v1";
  state: "execution_revalidated" | "execution_defeated" | "execution_unresolved";
  permit: { id: string; digest: string; actionHash: string };
  issuanceBasisDigest: string;
  delegation: { id: string; digest: string };
  action: StandingActionBinding;
  receiverId: string;
  evaluatedAt: string;
  executionValidUntil?: string;
  authorityInputDigest: string;
  evidenceDigest: string;
  authorityObservation: ExecutionAuthorityObservation;
  standing?: StandingEvaluation;
  findings: { code: string; reason: string }[];
  consequence: "not_observed";
  digest: string;
}
