import type {
  ApprovalRule,
  DataSensitivityPolicy,
  EnvironmentPolicy,
  PolicyProfile,
  ToolPolicy
} from "@alignment-governance-stack/policy-profiles";
import type {
  CompanyAlignmentInput,
  CompanyAlignmentProfile,
  CompanyDataClass,
  CompanyDecisionBoundary,
  CompanyEnvironment,
  CompanyTool
} from "./types.js";
import { createCompanyAlignmentProfile } from "./createCompanyAlignmentProfile.js";

export function generatePolicyProfile(
  inputOrProfile: CompanyAlignmentInput | CompanyAlignmentProfile
): PolicyProfile {
  const profile = isCompanyAlignmentProfile(inputOrProfile)
    ? inputOrProfile
    : createCompanyAlignmentProfile(inputOrProfile);

  return {
    id: profile.generatedPolicyProfileId,
    name: `${profile.name} Policy Profile`,
    version: "policy.profile.v0.3-draft",
    ...(profile.description !== undefined ? { description: profile.description } : {}),
    ...(profile.organization !== undefined ? { organization: profile.organization } : {}),
    defaultMode: profile.defaultMode ?? "balanced",
    tools: profile.tools.map(mapToolPolicy),
    environments: profile.environments.map(mapEnvironmentPolicy),
    approvalRules: profile.decisionBoundaries.map(mapApprovalRule),
    dataSensitivity: mergeDataSensitivityPolicies(profile.dataClasses.map(mapDataSensitivityPolicy)),
    receiptRequired: true,
    metadata: {
      generator: "company-profile-generator.v0.3",
      sourceProfileId: profile.id,
      draft: true,
      requiresHumanReview: true,
      values: profile.values.map((value) => ({
        id: value.id,
        label: value.label,
        ...(value.governanceImplication !== undefined
          ? { governanceImplication: value.governanceImplication }
          : {})
      })),
      roles: profile.roles.map((role) => ({
        id: role.id,
        label: role.label,
        ...(role.canApprove !== undefined ? { canApprove: [...role.canApprove] } : {})
      })),
      neverAutomateBoundaries: profile.decisionBoundaries
        .filter((boundary) => boundary.neverAutomate === true)
        .map((boundary) => boundary.id),
      ...(profile.metadata !== undefined ? { sourceMetadata: profile.metadata } : {})
    }
  };
}

function mapToolPolicy(tool: CompanyTool): ToolPolicy {
  return {
    tool: tool.tool,
    allowed: tool.allowed ?? true,
    ...(tool.requiresApproval === true || tool.destructive === true ? { requiresApproval: true } : {}),
    ...(tool.blockedEnvironments !== undefined
      ? { blockedInEnvironments: [...tool.blockedEnvironments] }
      : {}),
    ...(tool.environments !== undefined ? { allowedEnvironments: [...tool.environments] } : {}),
    ...(tool.maxDataSensitivity !== undefined ? { maxDataSensitivity: tool.maxDataSensitivity } : {}),
    ...(tool.externalFacing === false ? { externalFacingAllowed: false } : {}),
    ...(tool.notes !== undefined ? { notes: tool.notes } : {})
  };
}

function mapEnvironmentPolicy(environment: CompanyEnvironment): EnvironmentPolicy {
  const productionLike = environment.productionLike === true;

  return {
    environment: environment.id,
    ...(resolveProductionDefault(environment.requiresApprovalForIrreversible, productionLike)
      ? { requiresApprovalForIrreversible: true }
      : {}),
    ...(resolveProductionDefault(environment.requiresApprovalForExternalFacing, productionLike)
      ? { requiresApprovalForExternalFacing: true }
      : {}),
    ...(resolveProductionDefault(environment.requiresApprovalForHighSensitivity, productionLike)
      ? { requiresApprovalForHighSensitivity: true }
      : {}),
    ...(environment.notes !== undefined ? { notes: environment.notes } : {})
  };
}

function mapDataSensitivityPolicy(dataClass: CompanyDataClass): DataSensitivityPolicy {
  return {
    sensitivity: dataClass.sensitivity,
    ...(dataClass.requiresApproval === true || dataClass.sensitivity === "high"
      ? { requiresApproval: true }
      : {}),
    ...(dataClass.externalSharingAllowed === false ? { externalFacingAllowed: false } : {}),
    ...(dataClass.sensitivity === "medium" || dataClass.sensitivity === "high"
      ? { receiptRequired: true }
      : {}),
    ...(dataClass.notes !== undefined ? { notes: dataClass.notes } : {})
  };
}

function mapApprovalRule(boundary: CompanyDecisionBoundary): ApprovalRule {
  return {
    id: boundary.id,
    when: {
      ...(boundary.tool !== undefined ? { tool: boundary.tool } : {}),
      ...(boundary.actionType !== undefined ? { actionType: boundary.actionType } : {}),
      ...(boundary.environment !== undefined ? { environment: boundary.environment } : {}),
      ...(boundary.dataSensitivity !== undefined ? { dataSensitivity: boundary.dataSensitivity } : {}),
      ...(boundary.externalFacing !== undefined ? { externalFacing: boundary.externalFacing } : {}),
      ...(boundary.reversible !== undefined ? { reversible: boundary.reversible } : {})
    },
    requiresApproval: boundary.requiresHumanApproval,
    ...(boundary.approverRole !== undefined ? { approverRole: boundary.approverRole } : {}),
    reason: boundary.description ?? boundary.label
  };
}

function mergeDataSensitivityPolicies(
  policies: DataSensitivityPolicy[]
): DataSensitivityPolicy[] {
  const bySensitivity = new Map<string, DataSensitivityPolicy>();

  for (const policy of policies) {
    const existing = bySensitivity.get(policy.sensitivity);

    if (existing === undefined) {
      bySensitivity.set(policy.sensitivity, policy);
      continue;
    }

    const externalFacingAllowed =
      existing.externalFacingAllowed === false || policy.externalFacingAllowed === false
        ? false
        : existing.externalFacingAllowed ?? policy.externalFacingAllowed;
    const notes = [existing.notes, policy.notes].filter(Boolean).join(" ");

    bySensitivity.set(policy.sensitivity, {
      sensitivity: policy.sensitivity,
      requiresApproval: existing.requiresApproval === true || policy.requiresApproval === true,
      receiptRequired: existing.receiptRequired === true || policy.receiptRequired === true,
      ...(externalFacingAllowed !== undefined ? { externalFacingAllowed } : {}),
      ...(notes !== "" ? { notes } : {})
    });
  }

  return Array.from(bySensitivity.values());
}

function resolveProductionDefault(
  explicitValue: boolean | undefined,
  productionLike: boolean
): boolean {
  return explicitValue ?? productionLike;
}

function isCompanyAlignmentProfile(
  input: CompanyAlignmentInput | CompanyAlignmentProfile
): input is CompanyAlignmentProfile {
  return "version" in input && input.version === "company.alignment.v0.3";
}
