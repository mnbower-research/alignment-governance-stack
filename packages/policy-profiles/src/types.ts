import type { AgentActionProposal, DataSensitivity } from "@alignment-governance-stack/shared-types";

export type PolicyDefaultMode = "permissive" | "balanced" | "strict";

export type SuggestedPolicyDecision = "allow" | "require_approval" | "revise_action" | "block";

export interface ToolPolicy {
  tool: string;
  allowed: boolean;
  requiresApproval?: boolean;
  blockedInEnvironments?: string[];
  allowedEnvironments?: string[];
  maxDataSensitivity?: DataSensitivity;
  externalFacingAllowed?: boolean;
  notes?: string;
}

export interface EnvironmentPolicy {
  environment: string;
  requiresApprovalForIrreversible?: boolean;
  requiresApprovalForExternalFacing?: boolean;
  requiresApprovalForHighSensitivity?: boolean;
  blockedTools?: string[];
  notes?: string;
}

export interface ApprovalRuleWhen {
  tool?: string;
  actionType?: string;
  environment?: string;
  reversible?: boolean;
  externalFacing?: boolean;
  dataSensitivity?: DataSensitivity;
}

export interface HardBoundaryRuleWhen extends ApprovalRuleWhen {
  targetIncludes?: string;
}

export interface ApprovalRule {
  id: string;
  when: ApprovalRuleWhen;
  requiresApproval: boolean;
  approverRole?: string;
  reason: string;
}

export interface DataSensitivityPolicy {
  sensitivity: DataSensitivity;
  requiresApproval?: boolean;
  externalFacingAllowed?: boolean;
  receiptRequired?: boolean;
  notes?: string;
}

export interface HardBoundaryRule {
  id: string;
  label: string;
  description?: string;
  when: HardBoundaryRuleWhen;
  effect: "block";
  reason: string;
  source?: "company_alignment_profile" | "manual_policy";
  metadata?: Record<string, unknown>;
}

export interface PolicyProfile {
  id: string;
  name: string;
  version: string;
  description?: string;
  organization?: string;
  defaultMode: PolicyDefaultMode;
  tools?: ToolPolicy[];
  environments?: EnvironmentPolicy[];
  approvalRules?: ApprovalRule[];
  dataSensitivity?: DataSensitivityPolicy[];
  hardBoundaries?: HardBoundaryRule[];
  receiptRequired?: boolean;
  metadata?: Record<string, unknown>;
}

export interface ResolvedActionPolicy {
  allowed: boolean;
  requiresApproval: boolean;
  receiptRequired: boolean;
  reasons: string[];
  matchedRules: string[];
  suggestedDecision?: SuggestedPolicyDecision;
  hardBoundaryTriggered?: boolean;
  blockingBoundaryIds?: string[];
}

export interface PolicyProfileValidationResult {
  valid: boolean;
  errors: string[];
}

export type PolicyAction = AgentActionProposal;
