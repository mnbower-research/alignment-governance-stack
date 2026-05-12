import type { AgentActionProposal } from "./actionProposal.js";
import type { RiskLevel } from "./risk.js";

export type PgdlDecision =
  | "forward_to_aag"
  | "revise_before_aag"
  | "escalate_to_human"
  | "reject_before_aag";

export type AagDecision = "allow" | "require_approval" | "revise_action" | "block";

export type PgdlObjectionCategory =
  | "authority"
  | "scope"
  | "reversibility"
  | "human_judgment"
  | "external_impact"
  | "data_sensitivity"
  | "compliance_theater";

export interface PgdlObjection {
  category: PgdlObjectionCategory;
  message: string;
  severity: RiskLevel;
  question: string;
  reason: string;
  suggestedRevision: string;
}

export interface PgdlPacket {
  originalProposal: AgentActionProposal;
  objections: PgdlObjection[];
  internalizedPrinciple?: string;
  resolvedProposal?: AgentActionProposal;
  decision: PgdlDecision;
  reasonForDecision: string;
}

export type AagDetectorName = string;

export interface AagDetectorResult {
  detector: AagDetectorName;
  triggered: boolean;
  severity: RiskLevel;
  recommendedDecision: AagDecision;
  reason: string;
  evidence?: string[] | Record<string, unknown>;
}

export interface AagPacket {
  proposal: AgentActionProposal;
  detectorResults: AagDetectorResult[];
  decision: AagDecision;
  reasonForDecision: string;
  receiptRequired: boolean;
}
