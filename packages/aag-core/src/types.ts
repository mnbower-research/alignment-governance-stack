export type {
  AagDecision,
  AagDetectorName,
  AagDetectorResult,
  AagPacket,
  AgentActionProposal,
  DecisionReceipt
} from "@alignment-governance-stack/shared-types" with { "resolution-mode": "import" };

export type {
  ActionGateInput,
  ActionGateResult,
  GateDecision,
  GateDetectorResult,
  GateDetectorType,
  GateSeverity,
  PolicyProfile,
  ReviewPacket
} from "./actionGate/types";
