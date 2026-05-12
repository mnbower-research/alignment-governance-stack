export type {
  AagDecision,
  AagDetectorName,
  AagDetectorResult,
  AagPacket,
  AgentActionProposal,
  DecisionReceipt
} from "@agent-action-governance/shared-types";

export interface AagPolicy {
  name: string;
  description: string;
}
