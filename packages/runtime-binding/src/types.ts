import type {
  AgentActionProposal,
  ExecutionConstraintSet
} from "@alignment-governance-stack/shared-types";

export type RuntimeBindingDecision = "execution_allowed" | "execution_denied";

export type RuntimeBindingFailureCode =
  | "assurance_invalid"
  | "missing_permit"
  | "permit_not_allowed"
  | "expired_permit"
  | "invalid_clock"
  | "action_hash_mismatch"
  | "tool_mismatch"
  | "action_type_mismatch"
  | "target_mismatch"
  | "environment_mismatch"
  | "reversibility_mismatch"
  | "external_impact_mismatch"
  | "data_sensitivity_mismatch"
  | "approval_requirement_mismatch"
  | "execution_constraint_missing"
  | "execution_constraint_unexpected"
  | "execution_constraint_value_mismatch"
  | "execution_constraint_type_mismatch"
  | "execution_constraint_range_expansion"
  | "execution_constraint_set_expansion"
  | "execution_constraint_time_window_expansion";

export interface RuntimeBindingFailure {
  code: RuntimeBindingFailureCode;
  reason: string;
  expected?: unknown;
  actual?: unknown;
}

export interface RuntimePermit {
  assurance?: import("@alignment-governance-stack/shared-types").AssuranceEvidence;
  id: string;
  proposalId: string;
  actionHash: string;
  executionConstraintHash?: string;
  executionConstraints?: ExecutionConstraintSet;
  allowedAction: AgentActionProposal;
  issuedAt: string;
  expiresAt?: string;
  source: "aag";
  aagDecision: "allow";
  metadata?: Record<string, unknown>;
}

export interface RuntimeBindingResult {
  /** Fresh assurance evaluation at this boundary, distinct from the permit's earlier evaluation. */
  assurance?: import("@alignment-governance-stack/shared-types").AssuranceEvidence;
  decision: RuntimeBindingDecision;
  allowed: boolean;
  permit?: RuntimePermit;
  failures: RuntimeBindingFailure[];
  reasonForDecision: string;
}

export interface CreateRuntimePermitOptions {
  assurance?: import("@alignment-governance-stack/shared-types").AssuranceInput;
  aagPacket?: import("@alignment-governance-stack/shared-types").AagPacket;
  issuedAt?: string;
  expiresAt?: string;
  metadata?: Record<string, unknown>;
}

export interface ValidateRuntimePermitOptions {
  assurance?: import("@alignment-governance-stack/shared-types").AssuranceInput;
  now?: string;
}

export type RuntimeBindingActionField =
  | "assuranceRequirement"
  | "tool"
  | "actionType"
  | "target"
  | "environment"
  | "reversible"
  | "externalFacing"
  | "dataSensitivity"
  | "requiresApproval"
  | "knownApproval"
  | "executionConstraints";
