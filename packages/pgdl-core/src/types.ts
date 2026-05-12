export type {
  AgentActionProposal,
  PgdlDecision,
  PgdlObjection,
  PgdlObjectionCategory,
  PgdlPacket
} from "@alignment-governance-stack/shared-types";

export interface PgdlPolicy {
  name: string;
  description: string;
}

export interface PgdlProposalAnalysis {
  proposalId: string;
  policyName: string;
  destructive: boolean;
  externalSendOrPublish: boolean;
  broadScope: boolean;
  production: boolean;
}
