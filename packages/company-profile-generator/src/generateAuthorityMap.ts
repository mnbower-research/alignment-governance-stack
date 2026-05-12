import {
  defaultAuthorityMap,
  type AuthorityMap,
  type AuthorityRole,
  type AuthorityScope
} from "@alignment-governance-stack/authority-map";
import type {
  CompanyAlignmentInput,
  CompanyAlignmentProfile,
  CompanyRole
} from "./types.js";
import { createCompanyAlignmentProfile } from "./createCompanyAlignmentProfile.js";

export function generateAuthorityMap(
  inputOrProfile: CompanyAlignmentInput | CompanyAlignmentProfile
): AuthorityMap {
  const profile = isCompanyAlignmentProfile(inputOrProfile)
    ? inputOrProfile
    : createCompanyAlignmentProfile(inputOrProfile);

  if (profile.roles.length === 0) {
    return {
      ...defaultAuthorityMap,
      id: `${profile.id}.authority`,
      name: `${profile.name} Authority Map`,
      ...(profile.organization !== undefined ? { metadata: { organization: profile.organization } } : {})
    };
  }

  return {
    id: `${profile.id}.authority`,
    name: `${profile.name} Authority Map`,
    version: "authority.map.v0.5-draft",
    ...(profile.description !== undefined ? { description: profile.description } : {}),
    roles: profile.roles.map(mapAuthorityRole),
    metadata: {
      generator: "company-profile-generator.v0.5",
      sourceProfileId: profile.id,
      draft: true,
      requiresHumanReview: true,
      ...(profile.organization !== undefined ? { organization: profile.organization } : {})
    }
  };
}

function mapAuthorityRole(role: CompanyRole): AuthorityRole {
  return {
    id: role.id,
    label: role.label,
    ...(role.notes !== undefined ? { description: role.notes } : {}),
    scopes: mapCanApproveScopes(role.canApprove ?? []),
    metadata: {
      sourceRoleId: role.id,
      canApprove: [...(role.canApprove ?? [])]
    }
  };
}

function mapCanApproveScopes(canApprove: string[]): AuthorityScope[] {
  const scopes = canApprove.flatMap(mapCanApproveScope);

  if (scopes.length > 0) {
    return scopes;
  }

  return [
    {
      id: "business_owner_default",
      maxDataSensitivity: "medium",
      externalFacing: false,
      notes: "Default internal business approval scope."
    }
  ];
}

function mapCanApproveScope(value: string): AuthorityScope[] {
  if (value === "high_sensitivity") {
    return [
      {
        id: "high_sensitivity",
        maxDataSensitivity: "high"
      }
    ];
  }

  if (value === "external_facing") {
    return [
      {
        id: "external_facing",
        externalFacing: true
      }
    ];
  }

  if (value === "production") {
    return [
      {
        id: "production",
        environment: "production"
      }
    ];
  }

  if (value === "irreversible") {
    return [
      {
        id: "irreversible",
        reversible: false
      }
    ];
  }

  if (value === "database") {
    return [
      {
        id: "database_delete",
        tool: "database.delete"
      },
      {
        id: "database_export",
        tool: "data.export"
      }
    ];
  }

  if (value === "employee_data") {
    return [
      {
        id: "employee_data",
        targetIncludes: "employee",
        maxDataSensitivity: "high"
      }
    ];
  }

  return [];
}

function isCompanyAlignmentProfile(
  input: CompanyAlignmentInput | CompanyAlignmentProfile
): input is CompanyAlignmentProfile {
  return "version" in input && input.version === "company.alignment.v0.3";
}

