export type AgencyFingerprintVersion = "agency-fingerprint/v0.1";

export interface AgencyFingerprintInput {
  subjectHumanId?: string;
  subjectOrganizationId?: string;
  delegatedBy: string;
  agentId: string;
  agentRole?: string;
  workflowId?: string;
  workflowScopeHash?: string;
  authorityMapHash?: string;
  policyProfileHash?: string;
  pgdlPacketHash?: string;
  aagDecisionHash?: string;
  approvalRecordHash?: string;
  runtimePermitHash?: string;
  actionHash: string;
  targetHash?: string;
  environment?: string;
  timestamp: string;
  previousFingerprintHash?: string;
  metadata?: Record<string, unknown>;
}

export interface AgencyFingerprint {
  version: AgencyFingerprintVersion;
  fingerprintId: string;
  subjectHumanId?: string;
  subjectOrganizationId?: string;
  delegatedBy: string;
  agentId: string;
  agentRole?: string;
  workflowId?: string;
  workflowScopeHash?: string;
  authorityMapHash?: string;
  policyProfileHash?: string;
  pgdlPacketHash?: string;
  aagDecisionHash?: string;
  approvalRecordHash?: string;
  runtimePermitHash?: string;
  actionHash: string;
  targetHash?: string;
  environment?: string;
  timestamp: string;
  previousFingerprintHash?: string;
  fingerprintHash: string;
  metadata?: Record<string, unknown>;
}

export interface FingerprintVerificationResult {
  valid: boolean;
  expectedHash?: string;
  actualHash?: string;
  errors: string[];
  warnings: string[];
}
