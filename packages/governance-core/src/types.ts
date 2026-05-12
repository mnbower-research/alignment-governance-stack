import type {
  AagPacket,
  AgentActionProposal,
  PgdlPacket
} from "@alignment-governance-stack/shared-types";

export type GovernanceFinalDecision =
  | "rejected_before_gate"
  | "escalated_before_gate"
  | "blocked_by_aag"
  | "approval_required_by_aag"
  | "revision_required_by_aag"
  | "allowed_by_aag";

export interface GovernancePacket {
  originalProposal: AgentActionProposal;
  pgdl: PgdlPacket;
  proposalSentToAag?: AgentActionProposal;
  aag?: AagPacket;
  finalDecision: GovernanceFinalDecision;
  reasonForDecision: string;
}
