import type { DataSensitivity } from "@alignment-governance-stack/shared-types";
import type { PolicyDefaultMode } from "@alignment-governance-stack/policy-profiles";

export interface CompanyValue {
  id: string;
  label: string;
  description?: string;
  governanceImplication?: string;
}

export interface CompanyRole {
  id: string;
  label: string;
  canApprove?: string[];
  notes?: string;
}

export interface CompanyTool {
  tool: string;
  label?: string;
  allowed?: boolean;
  requiresApproval?: boolean;
  externalFacing?: boolean;
  destructive?: boolean;
  environments?: string[];
  blockedEnvironments?: string[];
  maxDataSensitivity?: DataSensitivity;
  notes?: string;
}

export interface CompanyDataClass {
  id: string;
  label: string;
  sensitivity: DataSensitivity;
  externalSharingAllowed?: boolean;
  requiresApproval?: boolean;
  notes?: string;
}

export interface CompanyEnvironment {
  id: string;
  label: string;
  productionLike?: boolean;
  requiresApprovalForIrreversible?: boolean;
  requiresApprovalForExternalFacing?: boolean;
  requiresApprovalForHighSensitivity?: boolean;
  notes?: string;
}

export interface CompanyDecisionBoundary {
  id: string;
  label: string;
  description?: string;
  actionType?: string;
  tool?: string;
  environment?: string;
  dataSensitivity?: DataSensitivity;
  externalFacing?: boolean;
  reversible?: boolean;
  requiresHumanApproval: boolean;
  approverRole?: string;
  neverAutomate?: boolean;
}

export interface CompanyAlignmentInput {
  id: string;
  name: string;
  organization?: string;
  description?: string;
  values?: CompanyValue[];
  roles?: CompanyRole[];
  tools?: CompanyTool[];
  dataClasses?: CompanyDataClass[];
  environments?: CompanyEnvironment[];
  decisionBoundaries?: CompanyDecisionBoundary[];
  defaultMode?: PolicyDefaultMode;
  metadata?: Record<string, unknown>;
}

export interface CompanyAlignmentProfile {
  id: string;
  name: string;
  organization?: string;
  version: "company.alignment.v0.3";
  description?: string;
  values: CompanyValue[];
  roles: CompanyRole[];
  tools: CompanyTool[];
  dataClasses: CompanyDataClass[];
  environments: CompanyEnvironment[];
  decisionBoundaries: CompanyDecisionBoundary[];
  generatedPolicyProfileId: string;
  defaultMode?: PolicyDefaultMode;
  metadata?: Record<string, unknown>;
}

export interface CompanyAlignmentInputValidationResult {
  valid: boolean;
  errors: string[];
}
