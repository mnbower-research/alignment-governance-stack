import type { AgentActionProposal } from "@agent-action-governance/shared-types";

export interface ActionPermit {
  id: string;
  proposalId: string;
  tool: string;
  actionType: string;
  target: string;
  environment: string;
  expiresAt: string;
}

export interface RuntimeAction {
  proposalId: string;
  tool: string;
  actionType: string;
  target: string;
  environment: string;
  metadata: Record<string, unknown>;
}

export interface PermitValidationResult {
  valid: boolean;
  reason: string;
}

export type PermitSourceProposal = Pick<
  AgentActionProposal,
  "id" | "tool" | "actionType" | "target" | "environment"
>;
