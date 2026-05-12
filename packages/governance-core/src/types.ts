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

export type GovernanceFinalDecision =
  | "rejected_before_gate"
  | "escalated_before_gate"
  | "blocked_by_aag"
  | "approval_required_by_aag"
  | "revision_required_by_aag"
  | "allowed_by_aag"
  | "execution_allowed"
  | "execution_denied";

export interface GovernancePacket {
  originalProposal: AgentActionProposal;
  pgdl: PgdlPacket;
  proposalSentToAag?: AgentActionProposal;
  aag?: AagPacket;
  finalDecision: GovernanceFinalDecision;
  reasonForDecision: string;
}

export interface EvaluateGovernedRuntimeActionInput {
  proposal: AgentActionProposal;
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
  pgdl: PgdlPacket;
  proposalSentToAag?: AgentActionProposal;
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
