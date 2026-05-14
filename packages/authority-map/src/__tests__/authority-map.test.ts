import { describe, expect, it } from "vitest";
import type { AgentActionProposal } from "@alignment-governance-stack/shared-types";
import {
  defaultAuthorityMap,
  validateApproval,
  validateAuthorityMap
} from "../index.js";
import type { ApprovalEvidence, AuthorityMap } from "../types.js";

describe("authority map", () => {
  it("validates the default authority map", () => {
    expect(validateAuthorityMap(defaultAuthorityMap)).toEqual({
      valid: true,
      errors: []
    });
  });

  it("fails validation when required fields are missing", () => {
    const result = validateAuthorityMap({ roles: [] } as unknown as AuthorityMap);

    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toContain("id");
    expect(result.errors.join(" ")).toContain("name");
    expect(result.errors.join(" ")).toContain("version");
  });

  it("accepts no evidence when authority is not required", () => {
    const result = validateApproval(defaultAuthorityMap, createSafeReportAction());

    expect(result.valid).toBe(true);
    expect(result.decision).toBe("approval_not_required");
  });

  it("fails when required approval is missing", () => {
    const result = validateApproval(defaultAuthorityMap, createHighSensitivityProductionAction());

    expect(result.valid).toBe(false);
    expect(result.decision).toBe("approval_missing");
  });

  it("fails when approval role is unknown", () => {
    const result = validateApproval(
      defaultAuthorityMap,
      createHighSensitivityProductionAction(),
      createApprovalEvidence({ approverRoleId: "unknown_role" })
    );

    expect(result.valid).toBe(false);
    expect(result.decision).toBe("approval_role_unknown");
  });

  it("fails when approval is expired", () => {
    const result = validateApproval(
      defaultAuthorityMap,
      createHighSensitivityProductionAction(),
      createApprovalEvidence({
        approverRoleId: "security_admin",
        expiresAt: "2026-05-12T09:00:00.000Z"
      }),
      { now: "2026-05-12T10:00:00.000Z" }
    );

    expect(result.valid).toBe(false);
    expect(result.decision).toBe("approval_expired");
  });

  it("accepts matching security admin approval for high sensitivity production actions", () => {
    const result = validateApproval(
      defaultAuthorityMap,
      createHighSensitivityProductionAction(),
      createApprovalEvidence({ approverRoleId: "security_admin" }),
      { now: "2026-05-12T10:00:00.000Z" }
    );

    expect(result.valid).toBe(true);
    expect(result.decision).toBe("approval_valid");
    expect(result.matchedRoleId).toBe("security_admin");
    expect(result.matchedScopeIds?.length).toBeGreaterThan(0);
  });

  it("rejects out-of-scope approvals", () => {
    const result = validateApproval(
      defaultAuthorityMap,
      createDatabaseDeleteAction(),
      createApprovalEvidence({ approverRoleId: "communications_admin" })
    );

    expect(result.valid).toBe(false);
    expect(result.decision).toBe("approval_out_of_scope");
  });

  it("matches targetIncludes case-insensitively", () => {
    const result = validateApproval(
      createTargetAuthorityMap(),
      {
        ...createSafeReportAction(),
        target: "employee_records",
        requiresApproval: true
      },
      createApprovalEvidence({ approverRoleId: "hr_admin" })
    );

    expect(result.valid).toBe(true);
    expect(result.matchedScopeIds).toContain("employee_records_scope");
  });

  it("enforces maxDataSensitivity scope", () => {
    const authorityMap = createMediumDataAuthorityMap();
    const mediumResult = validateApproval(
      authorityMap,
      {
        ...createSafeReportAction(),
        dataSensitivity: "medium",
        requiresApproval: true
      },
      createApprovalEvidence({ approverRoleId: "data_steward" })
    );
    const highResult = validateApproval(
      authorityMap,
      {
        ...createSafeReportAction(),
        dataSensitivity: "high",
        requiresApproval: true
      },
      createApprovalEvidence({ approverRoleId: "data_steward" })
    );

    expect(mediumResult.valid).toBe(true);
    expect(highResult.valid).toBe(false);
    expect(highResult.decision).toBe("approval_out_of_scope");
  });
});

function createSafeReportAction(): AgentActionProposal {
  return {
    id: "safe-report",
    userRequest: "Generate an internal staging report.",
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

function createHighSensitivityProductionAction(): AgentActionProposal {
  return {
    ...createSafeReportAction(),
    id: "high-production-report",
    environment: "production",
    dataSensitivity: "high",
    requiresApproval: true
  };
}

function createDatabaseDeleteAction(): AgentActionProposal {
  return {
    ...createHighSensitivityProductionAction(),
    id: "delete-records",
    tool: "database.delete",
    actionType: "delete_records",
    target: "customer_records",
    reversible: false
  };
}

function createApprovalEvidence(
  overrides: Partial<ApprovalEvidence> = {}
): ApprovalEvidence {
  return {
    id: "approval-1",
    approverId: "user-1",
    approverRoleId: "business_owner",
    approvedAt: "2026-05-14T09:00:00.000Z",
    expiresAt: "2026-06-13T09:00:00.000Z",
    ...overrides
  };
}

function createTargetAuthorityMap(): AuthorityMap {
  return {
    id: "target-authority",
    name: "Target Authority",
    version: "authority.map.v0.5",
    roles: [
      {
        id: "hr_admin",
        label: "HR Admin",
        scopes: [
          {
            id: "employee_records_scope",
            targetIncludes: "Employee"
          }
        ]
      }
    ]
  };
}

function createMediumDataAuthorityMap(): AuthorityMap {
  return {
    id: "medium-data-authority",
    name: "Medium Data Authority",
    version: "authority.map.v0.5",
    roles: [
      {
        id: "data_steward",
        label: "Data Steward",
        scopes: [
          {
            id: "medium_data_scope",
            maxDataSensitivity: "medium"
          }
        ]
      }
    ]
  };
}
