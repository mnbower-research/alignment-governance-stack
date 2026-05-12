import { describe, expect, it } from "vitest";
import type { AgentActionProposal } from "@alignment-governance-stack/shared-types";
import {
  defaultPolicyProfile,
  resolvePolicyForAction,
  validatePolicyProfile
} from "../index.js";
import type { PolicyProfile } from "../types.js";

describe("policy profiles", () => {
  it("validates the default profile", () => {
    expect(validatePolicyProfile(defaultPolicyProfile)).toEqual({
      valid: true,
      errors: []
    });
  });

  it("fails validation when required fields are missing", () => {
    const result = validatePolicyProfile({} as PolicyProfile);

    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toContain("id");
    expect(result.errors.join(" ")).toContain("name");
    expect(result.errors.join(" ")).toContain("version");
    expect(result.errors.join(" ")).toContain("defaultMode");
  });

  it("allows a safe internal report under the default balanced profile", () => {
    const result = resolvePolicyForAction(defaultPolicyProfile, createSafeInternalReport());

    expect(result.allowed).toBe(true);
    expect(result.requiresApproval).toBe(false);
    expect(result.receiptRequired).toBe(true);
    expect(result.suggestedDecision).toBe("allow");
  });

  it("requires approval for production irreversible actions", () => {
    const result = resolvePolicyForAction(defaultPolicyProfile, {
      ...createSafeInternalReport(),
      id: "production-delete",
      tool: "database.delete",
      actionType: "delete_records",
      environment: "production",
      reversible: false,
      dataSensitivity: "medium"
    });

    expect(result.allowed).toBe(true);
    expect(result.requiresApproval).toBe(true);
    expect(result.suggestedDecision).toBe("require_approval");
    expect(result.reasons.join(" ")).toMatch(/irreversible|Production/i);
  });

  it("blocks high sensitivity external-facing actions", () => {
    const result = resolvePolicyForAction(defaultPolicyProfile, {
      ...createSafeInternalReport(),
      id: "external-sensitive-email",
      tool: "email.send",
      actionType: "send_email",
      environment: "production",
      reversible: false,
      externalFacing: true,
      dataSensitivity: "high"
    });

    expect(result.allowed).toBe(false);
    expect(result.suggestedDecision).toBe("block");
    expect(result.reasons.join(" ")).toMatch(/High sensitivity external-facing/i);
  });

  it("blocks an explicitly blocked tool policy", () => {
    const profile: PolicyProfile = {
      ...defaultPolicyProfile,
      tools: [
        {
          tool: "database.delete",
          allowed: false
        }
      ]
    };

    const result = resolvePolicyForAction(profile, {
      ...createSafeInternalReport(),
      id: "blocked-delete",
      tool: "database.delete",
      actionType: "delete_records"
    });

    expect(result.allowed).toBe(false);
    expect(result.suggestedDecision).toBe("block");
    expect(result.matchedRules).toContain("tool:database.delete");
    expect(result.reasons.join(" ")).toMatch(/blocked/i);
  });

  it("matches approval rules for specific actions", () => {
    const profile: PolicyProfile = {
      ...defaultPolicyProfile,
      approvalRules: [
        {
          id: "production-export-review",
          when: {
            actionType: "export_data",
            environment: "production"
          },
          requiresApproval: true,
          approverRole: "data-governance-lead",
          reason: "Production data exports require data governance review."
        }
      ]
    };

    const result = resolvePolicyForAction(profile, {
      ...createSafeInternalReport(),
      id: "production-export",
      tool: "data.export",
      actionType: "export_data",
      environment: "production",
      dataSensitivity: "medium"
    });

    expect(result.requiresApproval).toBe(true);
    expect(result.matchedRules).toContain("production-export-review");
  });

  it("blocks matching actions with hard boundaries", () => {
    const profile = createHardBoundaryProfile();

    const result = resolvePolicyForAction(profile, {
      ...createSafeInternalReport(),
      id: "delete-employee-records",
      actionType: "delete_records",
      target: "employee_records"
    });

    expect(result.allowed).toBe(false);
    expect(result.suggestedDecision).toBe("block");
    expect(result.hardBoundaryTriggered).toBe(true);
    expect(result.blockingBoundaryIds).toContain("never_auto_delete_employee_records");
    expect(result.matchedRules).toContain("never_auto_delete_employee_records");
    expect(result.reasons.join(" ")).toContain("Employee records must not be automatically deleted.");
  });

  it("does not block nonmatching hard boundary actions", () => {
    const profile = createHardBoundaryProfile();

    const result = resolvePolicyForAction(profile, {
      ...createSafeInternalReport(),
      id: "report-employee-records",
      actionType: "generate_report",
      target: "employee_records"
    });

    expect(result.allowed).toBe(true);
    expect(result.hardBoundaryTriggered).toBeUndefined();
    expect(result.blockingBoundaryIds).toBeUndefined();
    expect(result.matchedRules).not.toContain("never_auto_delete_employee_records");
  });

  it("matches hard boundary targetIncludes case-insensitively", () => {
    const profile: PolicyProfile = {
      ...defaultPolicyProfile,
      hardBoundaries: [
        {
          id: "never_auto_delete_employee_records",
          label: "Never auto-delete employee records",
          when: {
            actionType: "delete_records",
            targetIncludes: "Employee"
          },
          effect: "block",
          reason: "Employee records must not be automatically deleted."
        }
      ]
    };

    const result = resolvePolicyForAction(profile, {
      ...createSafeInternalReport(),
      id: "delete-employee-records",
      actionType: "delete_records",
      target: "employee_records"
    });

    expect(result.allowed).toBe(false);
    expect(result.hardBoundaryTriggered).toBe(true);
  });
});

function createHardBoundaryProfile(): PolicyProfile {
  return {
    ...defaultPolicyProfile,
    hardBoundaries: [
      {
        id: "never_auto_delete_employee_records",
        label: "Never auto-delete employee records",
        when: {
          actionType: "delete_records",
          targetIncludes: "employee"
        },
        effect: "block",
        reason: "Employee records must not be automatically deleted."
      }
    ]
  };
}

function createSafeInternalReport(): AgentActionProposal {
  return {
    id: "safe-internal-report",
    userRequest: "Generate a weekly usage summary.",
    tool: "report.generate",
    actionType: "generate_internal_report",
    target: "weekly_usage_summary",
    environment: "staging",
    reversible: true,
    externalFacing: false,
    dataSensitivity: "low",
    requiresApproval: false,
    knownApproval: false,
    metadata: {}
  };
}
