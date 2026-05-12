import type { AgentActionProposal } from "@alignment-governance-stack/shared-types";

export type RuntimeBindingDecision = "execution_allowed" | "execution_denied";

export type RuntimeBindingFailureCode =
  | "missing_permit"
  | "permit_not_allowed"
  | "expired_permit"
  | "action_hash_mismatch"
  | "tool_mismatch"
  | "action_type_mismatch"
  | "target_mismatch"
  | "environment_mismatch"
  | "reversibility_mismatch"
  | "external_impact_mismatch"
  | "data_sensitivity_mismatch"
  | "approval_requirement_mismatch";

export interface RuntimeBindingFailure {
  code: RuntimeBindingFailureCode;
  reason: string;
  expected?: unknown;
  actual?: unknown;
}

export interface RuntimePermit {
  id: string;
  proposalId: string;
  actionHash: string;
  allowedAction: AgentActionProposal;
  issuedAt: string;
  expiresAt?: string;
  source: "aag";
  aagDecision: "allow";
  metadata?: Record<string, unknown>;
}

export interface RuntimeBindingResult {
  decision: RuntimeBindingDecision;
  allowed: boolean;
  permit?: RuntimePermit;
  failures: RuntimeBindingFailure[];
  reasonForDecision: string;
}

export interface CreateRuntimePermitOptions {
  issuedAt?: string;
  expiresAt?: string;
  metadata?: Record<string, unknown>;
}

export interface ValidateRuntimePermitOptions {
  now?: string;
}

export type RuntimeBindingActionField =
  | "tool"
  | "actionType"
  | "target"
  | "environment"
  | "reversible"
  | "externalFacing"
  | "dataSensitivity"
  | "requiresApproval"
  | "knownApproval";
