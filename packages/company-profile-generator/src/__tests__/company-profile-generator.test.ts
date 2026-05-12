import { describe, expect, it } from "vitest";
import type { AgentActionProposal } from "@alignment-governance-stack/shared-types";
import {
  resolvePolicyForAction,
  validatePolicyProfile
} from "@alignment-governance-stack/policy-profiles";
import {
  createCompanyAlignmentProfile,
  exampleCompanyAlignmentInput,
  generatePolicyProfile,
  validateCompanyAlignmentInput
} from "../index.js";
import type { CompanyAlignmentInput } from "../types.js";

describe("company profile generator", () => {
  it("validates a complete company alignment input", () => {
    const result = validateCompanyAlignmentInput(exampleCompanyAlignmentInput);

    expect(result).toEqual({
      valid: true,
      errors: []
    });
  });

  it("fails validation when id and name are missing", () => {
    const result = validateCompanyAlignmentInput({} as CompanyAlignmentInput);

    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toContain("id");
    expect(result.errors.join(" ")).toContain("name");
  });

  it("creates a normalized company alignment profile", () => {
    const profile = createCompanyAlignmentProfile({
      id: "minimal-company",
      name: "Minimal Company"
    });

    expect(profile.version).toBe("company.alignment.v0.3");
    expect(profile.generatedPolicyProfileId).toBe("minimal-company.policy");
    expect(profile.values).toEqual([]);
    expect(profile.roles).toEqual([]);
    expect(profile.tools).toEqual([]);
    expect(profile.dataClasses).toEqual([]);
    expect(profile.environments).toEqual([]);
    expect(profile.decisionBoundaries).toEqual([]);
  });

  it("maps tool inventory into tool policy", () => {
    const policy = generatePolicyProfile({
      id: "tool-company",
      name: "Tool Company",
      tools: [
        {
          tool: "database.delete",
          destructive: true,
          requiresApproval: true,
          blockedEnvironments: ["production"]
        }
      ]
    });

    const toolPolicy = policy.tools?.find((entry) => entry.tool === "database.delete");

    expect(toolPolicy).toBeDefined();
    expect(toolPolicy?.requiresApproval).toBe(true);
    expect(toolPolicy?.blockedInEnvironments).toContain("production");
  });

  it("maps production-like environments to approval defaults", () => {
    const policy = generatePolicyProfile({
      id: "environment-company",
      name: "Environment Company",
      environments: [
        {
          id: "production",
          label: "Production",
          productionLike: true
        }
      ]
    });

    const environmentPolicy = policy.environments?.find((entry) => entry.environment === "production");

    expect(environmentPolicy?.requiresApprovalForIrreversible).toBe(true);
    expect(environmentPolicy?.requiresApprovalForExternalFacing).toBe(true);
    expect(environmentPolicy?.requiresApprovalForHighSensitivity).toBe(true);
  });

  it("maps high sensitivity data classes to data sensitivity policy", () => {
    const policy = generatePolicyProfile({
      id: "data-company",
      name: "Data Company",
      dataClasses: [
        {
          id: "customer_pii",
          label: "Customer PII",
          sensitivity: "high",
          externalSharingAllowed: false
        }
      ]
    });

    const sensitivityPolicy = policy.dataSensitivity?.find((entry) => entry.sensitivity === "high");

    expect(sensitivityPolicy?.requiresApproval).toBe(true);
    expect(sensitivityPolicy?.externalFacingAllowed).toBe(false);
    expect(sensitivityPolicy?.receiptRequired).toBe(true);
  });

  it("maps decision boundaries to approval rules", () => {
    const policy = generatePolicyProfile({
      id: "boundary-company",
      name: "Boundary Company",
      decisionBoundaries: [
        {
          id: "approve_exports",
          label: "Approve exports",
          actionType: "export_data",
          environment: "production",
          requiresHumanApproval: true,
          approverRole: "security_admin"
        }
      ]
    });

    const rule = policy.approvalRules?.find((entry) => entry.id === "approve_exports");

    expect(rule).toBeDefined();
    expect(rule?.when.actionType).toBe("export_data");
    expect(rule?.when.environment).toBe("production");
    expect(rule?.requiresApproval).toBe(true);
    expect(rule?.approverRole).toBe("security_admin");
  });

  it("generates a valid PolicyProfile", () => {
    const policy = generatePolicyProfile(exampleCompanyAlignmentInput);

    expect(validatePolicyProfile(policy)).toEqual({
      valid: true,
      errors: []
    });
  });

  it("generated PolicyProfile resolves approval for production exports", () => {
    const policy = generatePolicyProfile(exampleCompanyAlignmentInput);
    const result = resolvePolicyForAction(policy, createProductionExportAction());

    expect(result.requiresApproval).toBe(true);
    expect(result.matchedRules).toContain("approve_exports");
  });
});

function createProductionExportAction(): AgentActionProposal {
  return {
    id: "production-export",
    userRequest: "Export production customer data.",
    tool: "data.export",
    actionType: "export_data",
    target: "customer_records",
    environment: "production",
    reversible: true,
    externalFacing: false,
    dataSensitivity: "high",
    requiresApproval: true,
    knownApproval: false,
    metadata: {}
  };
}
