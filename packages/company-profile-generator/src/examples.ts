import type { CompanyAlignmentInput } from "./types.js";

export const exampleCompanyAlignmentInput: CompanyAlignmentInput = {
  id: "example-company",
  name: "Example Company",
  organization: "Example Company",
  description: "Example structured governance inputs for deterministic policy profile generation.",
  defaultMode: "balanced",
  values: [
    {
      id: "customer-trust",
      label: "Customer trust",
      governanceImplication: "Require review before exposing customer data externally."
    }
  ],
  roles: [
    {
      id: "security_admin",
      label: "Security Admin",
      canApprove: ["export_data", "production_change"]
    }
  ],
  tools: [
    {
      tool: "database.delete",
      label: "Database Delete",
      destructive: true,
      requiresApproval: true,
      blockedEnvironments: ["production"],
      maxDataSensitivity: "medium"
    },
    {
      tool: "data.export",
      label: "Data Export",
      requiresApproval: true,
      maxDataSensitivity: "high"
    }
  ],
  dataClasses: [
    {
      id: "customer_pii",
      label: "Customer PII",
      sensitivity: "high",
      externalSharingAllowed: false,
      requiresApproval: true
    }
  ],
  environments: [
    {
      id: "production",
      label: "Production",
      productionLike: true
    }
  ],
  decisionBoundaries: [
    {
      id: "approve_exports",
      label: "Approve production exports",
      actionType: "export_data",
      environment: "production",
      requiresHumanApproval: true,
      approverRole: "security_admin"
    }
  ]
};
