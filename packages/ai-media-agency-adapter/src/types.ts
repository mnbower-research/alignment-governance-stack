import type { ApprovalEvidence, AuthorityMap } from "@alignment-governance-stack/authority-map";
import type { DecisionClosureArtifact } from "@alignment-governance-stack/decision-closure";
import type {
  EvaluateGovernedRuntimeActionWithReceiptInput,
  GovernanceRuntimePacketWithReceipt
} from "@alignment-governance-stack/governance-core";
import type {
  HumanParticipationInput,
  HumanParticipationPolicy
} from "@alignment-governance-stack/human-participation";
import type { PolicyProfile } from "@alignment-governance-stack/policy-profiles";
import type {
  AgentActionProposal,
  DataSensitivity,
  ExecutionConstraintSet
} from "@alignment-governance-stack/shared-types";

export type AgencyAgentRole =
  | "chief_of_staff"
  | "market_intelligence"
  | "creative"
  | "growth_monetization"
  | "production"
  | "analytics";

export type AgencyBusinessActionType =
  | "paid_content_test"
  | "create_content_draft"
  | "analyze_market"
  | "analyze_campaign"
  | "public_post"
  | "external_direct_message"
  | "access_credentials"
  | "modify_governance_policy"
  | "approve_own_action"
  | "synthetic_identity_claim";

export interface AgencyExperimentWindow {
  startsAt: string;
  endsAt: string;
}

export interface AgencyRiskMetadata {
  risks: string[];
  objections: string[];
  alternatives: string[];
  rollbackPlan: string;
  dataSensitivityRationale?: string;
}

export interface AgencyBusinessProposal {
  id: string;
  objectiveId: string;
  propertyId: string;
  agentId: string;
  agentRole: AgencyAgentRole;
  businessActionType: AgencyBusinessActionType;
  campaignId?: string;
  contentId?: string;
  platform?: string;
  tool: string;
  actionType: string;
  target: string;
  environment: string;
  budgetAmount?: number;
  budgetCurrency?: string;
  expectedOutcome: string;
  experimentWindow: AgencyExperimentWindow;
  reversible: boolean;
  externalFacing: boolean;
  dataSensitivity: DataSensitivity;
  requiresApproval: boolean;
  knownApproval: boolean;
  executionConstraints?: ExecutionConstraintSet;
  risk: AgencyRiskMetadata;
  metadata?: Record<string, unknown>;
}

export interface AgencyGovernanceInput {
  proposal: AgencyBusinessProposal;
  runtimeProposal?: AgencyBusinessProposal;
  policyProfile?: PolicyProfile;
  authorityMap?: AuthorityMap;
  approvalEvidence?: ApprovalEvidence;
  humanParticipation?: {
    input?: Omit<HumanParticipationInput, "action">;
    policy?: HumanParticipationPolicy;
  };
  permitOptions?: EvaluateGovernedRuntimeActionWithReceiptInput["permitOptions"];
  validationOptions?: EvaluateGovernedRuntimeActionWithReceiptInput["validationOptions"];
  receiptOptions?: EvaluateGovernedRuntimeActionWithReceiptInput["receiptOptions"];
  agencyFingerprintOptions?: EvaluateGovernedRuntimeActionWithReceiptInput["agencyFingerprintOptions"];
}

export type AgencyNextStep =
  | "proceed_simulated"
  | "request_approval"
  | "request_revision"
  | "escalate"
  | "stop";

export interface AgencyMetadataBindingLimitation {
  protectedByRuntimeBinding: false;
  fields: string[];
  reason: string;
}

export interface AgencyGovernanceResponse {
  allowed: boolean;
  nextStep: AgencyNextStep;
  decision: string;
  reason: string;
  proposal: AgentActionProposal;
  runtimeAction?: AgentActionProposal;
  governance: GovernanceRuntimePacketWithReceipt["governance"];
  receipt: GovernanceRuntimePacketWithReceipt["receipt"];
  agencyFingerprint?: GovernanceRuntimePacketWithReceipt["agencyFingerprint"];
  decisionClosureArtifact?: DecisionClosureArtifact;
  metadataBindingLimitation: AgencyMetadataBindingLimitation;
}

export interface SimulatedAgencyExecutionRecord {
  id: string;
  proposalId: string;
  executed: boolean;
  mode: "simulation_only";
  networkCallsMade: 0;
  reason: string;
}
