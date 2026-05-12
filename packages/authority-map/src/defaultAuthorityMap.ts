import type { AuthorityMap } from "./types.js";

export const defaultAuthorityMap: AuthorityMap = {
  id: "default-authority-map",
  name: "Default Authority Map",
  version: "authority.map.v0.5",
  description: "Default deterministic authority roles for AGS approval validation.",
  defaultApprovalTtlMinutes: 1440,
  roles: [
    {
      id: "business_owner",
      label: "Business Owner",
      scopes: [
        {
          id: "business_internal_low_medium",
          externalFacing: false,
          maxDataSensitivity: "medium",
          notes: "Can approve low and medium sensitivity internal business actions."
        }
      ]
    },
    {
      id: "security_admin",
      label: "Security Admin",
      scopes: [
        {
          id: "security_high_sensitivity",
          maxDataSensitivity: "high",
          notes: "Can approve high sensitivity and elevated risk actions."
        },
        {
          id: "security_production_irreversible",
          environment: "production",
          reversible: false,
          notes: "Can approve irreversible production actions."
        },
        {
          id: "security_external_risk",
          externalFacing: true,
          notes: "Can approve external-facing risk when security authority is required."
        }
      ]
    },
    {
      id: "data_owner",
      label: "Data Owner",
      scopes: [
        {
          id: "data_high_sensitivity",
          maxDataSensitivity: "high",
          notes: "Can approve high sensitivity data handling."
        }
      ]
    },
    {
      id: "communications_admin",
      label: "Communications Admin",
      scopes: [
        {
          id: "communications_external",
          externalFacing: true,
          maxDataSensitivity: "medium",
          notes: "Can approve external-facing communication that is not high sensitivity."
        }
      ]
    },
    {
      id: "system_admin",
      label: "System Admin",
      scopes: [
        {
          id: "system_production",
          environment: "production",
          notes: "Can approve production system actions."
        },
        {
          id: "system_database",
          tool: "database.delete",
          notes: "Can approve database delete actions within other applicable controls."
        },
        {
          id: "system_deploy",
          actionType: "deploy",
          environment: "production",
          notes: "Can approve production deploy actions."
        }
      ]
    }
  ]
};

