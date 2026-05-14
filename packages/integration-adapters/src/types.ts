import type { DataSensitivity } from "@alignment-governance-stack/shared-types";

export interface IntegrationActionInput {
  id?: string;
  userRequest: string;
  tool: string;
  actionType: string;
  target: string;
  environment?: string;
  reversible?: boolean;
  externalFacing?: boolean;
  dataSensitivity?: DataSensitivity;
  requiresApproval?: boolean;
  knownApproval?: boolean;
  metadata?: Record<string, unknown>;
}

export interface IntegrationGovernanceResponse {
  allowed: boolean;
  decision: string;
  reason: string;
  receiptHash?: string;
  receipt?: unknown;
  details?: Record<string, unknown>;
}
