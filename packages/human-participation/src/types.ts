import type { ApprovalEvidence } from "@alignment-governance-stack/authority-map";
import type { AgentActionProposal } from "@alignment-governance-stack/shared-types";

export interface HumanParticipationInput {
  approvalEvidence?: ApprovalEvidence;
  action: AgentActionProposal;
  presentedContext?: {
    pgdlSummary?: string;
    policySummary?: string;
    aagSummary?: string;
    riskSummary?: string;
    alternativesPresented?: boolean;
    objectionsPresented?: boolean;
    reversibilityPresented?: boolean;
    dataSensitivityPresented?: boolean;
    hardBoundaryPresented?: boolean;
  };
  humanResponse?: {
    decision: "approve" | "reject" | "request_revision" | "escalate";
    reason?: string;
    reviewedAt?: string;
    responseTimeSeconds?: number;
    editedProposal?: boolean;
    askedQuestion?: boolean;
    requestedEvidence?: boolean;
    selectedAlternative?: boolean;
  };
  context?: {
    requiredApproval?: boolean;
    authorityValid?: boolean;
    highRisk?: boolean;
    production?: boolean;
    irreversible?: boolean;
    externalFacing?: boolean;
    highSensitivity?: boolean;
  };
  metadata?: Record<string, unknown>;
}

export interface HumanParticipationPolicy {
  id: string;
  name: string;
  version: string;
  minReasonLengthForHighRisk?: number;
  minReviewSecondsForHighRisk?: number;
  minReviewSecondsDefault?: number;
  requireReasonForHighRisk?: boolean;
  requireContextForHighRisk?: boolean;
  requireAlternativesForHighRisk?: boolean;
  requireObjectionsForHighRisk?: boolean;
  metadata?: Record<string, unknown>;
}

export interface HumanParticipationSignal {
  id: string;
  label: string;
  severity: "low" | "medium" | "high";
  reason: string;
}

export type ParticipationQualityDecision =
  | "meaningful_participation"
  | "insufficient_participation"
  | "likely_rubber_stamp"
  | "participation_not_required"
  | "participation_input_invalid";

export type ParticipationRisk = "low" | "medium" | "high";

export type HumanParticipationRecommendedAction =
  | "continue"
  | "request_reason"
  | "request_review"
  | "request_revision"
  | "escalate"
  | "block_until_meaningful_review";

export interface HumanParticipationResult {
  decision: ParticipationQualityDecision;
  risk: ParticipationRisk;
  meaningful: boolean;
  signals: HumanParticipationSignal[];
  reasons: string[];
  recommendedAction: HumanParticipationRecommendedAction;
  metadata?: Record<string, unknown>;
}

export interface HumanParticipationInputValidationResult {
  valid: boolean;
  errors: string[];
}

