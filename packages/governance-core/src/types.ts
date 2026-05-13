import type {
  AagPacket,
  AgentActionProposal,
  PgdlPacket
} from "@alignment-governance-stack/shared-types";
import type {
  CreateRuntimePermitOptions,
  RuntimeBindingResult,
  RuntimePermit,
  ValidateRuntimePermitOptions
} from "@alignment-governance-stack/runtime-binding";
import type { GovernanceReceipt } from "@alignment-governance-stack/receipts";
import type {
  PolicyProfile,
  PolicyProfileValidationResult,
  ResolvedActionPolicy
} from "@alignment-governance-stack/policy-profiles";
import type {
  ApprovalEvidence,
  ApprovalValidationResult,
  AuthorityMap
} from "@alignment-governance-stack/authority-map";
import type {
  HumanParticipationInput,
  HumanParticipationPolicy,
  HumanParticipationResult
} from "@alignment-governance-stack/human-participation";

export type GovernanceFinalDecision =
  | "policy_invalid"
  | "blocked_by_policy"
  | "approval_required_by_authority"
  | "insufficient_human_participation"
  | "rejected_before_gate"
  | "escalated_before_gate"
  | "blocked_by_aag"
  | "approval_required_by_aag"
  | "revision_required_by_aag"
  | "allowed_by_aag"
  | "execution_allowed"
  | "execution_denied";

export interface EvaluateGovernedActionInput {
  proposal: AgentActionProposal;
  policyProfile?: PolicyProfile;
  authorityMap?: AuthorityMap;
  approvalEvidence?: ApprovalEvidence;
  humanParticipation?: {
    input?: Omit<HumanParticipationInput, "action">;
    policy?: HumanParticipationPolicy;
  };
}

export interface GovernancePacket {
  originalProposal: AgentActionProposal;
  pgdl?: PgdlPacket;
  proposalSentToAag?: AgentActionProposal;
  resolvedPolicy?: ResolvedActionPolicy;
  policyProfileValidation?: PolicyProfileValidationResult;
  approvalValidation?: ApprovalValidationResult;
  participationQuality?: HumanParticipationResult;
  aag?: AagPacket;
  finalDecision: GovernanceFinalDecision;
  reasonForDecision: string;
}

export interface EvaluateGovernedRuntimeActionInput {
  proposal: AgentActionProposal;
  policyProfile?: PolicyProfile;
  authorityMap?: AuthorityMap;
  approvalEvidence?: ApprovalEvidence;
  humanParticipation?: {
    input?: Omit<HumanParticipationInput, "action">;
    policy?: HumanParticipationPolicy;
  };
  runtimeAction?: AgentActionProposal;
  permitOptions?: CreateRuntimePermitOptions;
  validationOptions?: ValidateRuntimePermitOptions;
}

export interface EvaluateGovernedRuntimeActionWithReceiptInput extends EvaluateGovernedRuntimeActionInput {
  receiptOptions?: {
    id?: string;
    createdAt?: string;
    previousReceiptHash?: string;
    metadata?: Record<string, unknown>;
  };
}

export interface GovernanceRuntimePacket {
  originalProposal: AgentActionProposal;
  pgdl?: PgdlPacket;
  proposalSentToAag?: AgentActionProposal;
  resolvedPolicy?: ResolvedActionPolicy;
  policyProfileValidation?: PolicyProfileValidationResult;
  approvalValidation?: ApprovalValidationResult;
  participationQuality?: HumanParticipationResult;
  aag?: AagPacket;
  permit?: RuntimePermit;
  runtimeAction?: AgentActionProposal;
  runtimeBinding?: RuntimeBindingResult;
  finalDecision: GovernanceFinalDecision;
  reasonForDecision: string;
}

export interface GovernanceRuntimePacketWithReceipt {
  governance: GovernanceRuntimePacket;
  receipt: GovernanceReceipt;
}
