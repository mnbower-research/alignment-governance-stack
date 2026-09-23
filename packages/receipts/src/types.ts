import type {
  AagPacket,
  AgentActionProposal,
  PgdlPacket
} from "@alignment-governance-stack/shared-types";
import type {
  RuntimeBindingResult,
  RuntimePermit
} from "@alignment-governance-stack/runtime-binding";
import type {
  PolicyProfileValidationResult,
  ResolvedActionPolicy
} from "@alignment-governance-stack/policy-profiles";
import type { ApprovalValidationResult } from "@alignment-governance-stack/authority-map";
import type { HumanParticipationResult } from "@alignment-governance-stack/human-participation";

export type GovernanceReceiptVersion = "ags.receipt.v0.1";

export interface ReceiptGovernancePacket {
  contextAdmission?: import("@alignment-governance-stack/shared-types").ContextAdmissionEvidence;
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
  finalDecision: string;
  reasonForDecision: string;
}

export interface GovernanceReceiptInput {
  governancePacket: ReceiptGovernancePacket;
  id?: string;
  previousReceiptHash?: string;
  createdAt?: string;
  metadata?: Record<string, unknown>;
}

export interface GovernanceReceipt {
  contextAdmission?: import("@alignment-governance-stack/shared-types").ContextAdmissionEvidence;
  id: string;
  version: GovernanceReceiptVersion;
  createdAt: string;
  previousReceiptHash?: string;
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
  finalDecision: string;
  reasonForDecision: string;
  metadata?: Record<string, unknown>;
  receiptHash: string;
}

export interface GovernanceReceiptVerificationResult {
  valid: boolean;
  expectedHash: string;
  actualHash: string;
  reason: string;
}
