import type {
  EvaluateGovernedRuntimeActionWithReceiptInput,
  GovernanceRuntimePacketWithReceipt
} from "@alignment-governance-stack/governance-core";
import type { AgentActionProposal } from "@alignment-governance-stack/shared-types";
import type { IntegrationActionInput } from "../types.js";

export interface N8nActionInput {
  action?: IntegrationActionInput;
  proposal?: Partial<AgentActionProposal>;
  runtimeAction?: Partial<AgentActionProposal>;
  policyProfile?: unknown;
  authorityMap?: unknown;
  approvalEvidence?: unknown;
  humanParticipation?: unknown;
  metadata?: Record<string, unknown>;
}

export interface N8nMappedGovernanceInput {
  proposal: AgentActionProposal;
  runtimeAction?: AgentActionProposal;
  policyProfile?: unknown;
  authorityMap?: unknown;
  approvalEvidence?: unknown;
  humanParticipation?: unknown;
}

export type N8nGovernanceNextStep =
  | "proceed"
  | "stop"
  | "request_approval"
  | "request_revision"
  | "escalate";

export interface N8nGovernanceResponse {
  json: {
    allowed: boolean;
    decision: string;
    reason: string;
    receiptHash?: string;
    governance?: unknown;
    receipt?: unknown;
    nextStep: N8nGovernanceNextStep;
  };
}

export interface N8nTemplateMetadata {
  id: string;
  name: string;
  description: string;
  fileName: string;
}

export type N8nGovernanceResult = GovernanceRuntimePacketWithReceipt;

export type N8nGovernanceCoreInput = EvaluateGovernedRuntimeActionWithReceiptInput;
