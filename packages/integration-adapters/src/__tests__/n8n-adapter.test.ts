import { describe, expect, it } from "vitest";
import {
  createN8nWebhookResponse,
  mapN8nActionToProposal,
  n8nTemplates
} from "../index.js";

describe("n8n integration adapter", () => {
  it("maps action input to AgentActionProposal", () => {
    const mapped = mapN8nActionToProposal({
      metadata: { workflowId: "wf-1" },
      action: {
        userRequest: "Generate a weekly internal report.",
        tool: "report.generate",
        actionType: "generate_internal_report",
        target: "weekly_usage_summary"
      }
    });

    expect(mapped.proposal.id).toMatch(/^n8n-action-/);
    expect(mapped.proposal.environment).toBe("staging");
    expect(mapped.proposal.reversible).toBe(true);
    expect(mapped.proposal.externalFacing).toBe(false);
    expect(mapped.proposal.dataSensitivity).toBe("low");
    expect(mapped.proposal.requiresApproval).toBe(false);
    expect(mapped.proposal.knownApproval).toBe(false);
    expect(mapped.proposal.metadata).toEqual({ workflowId: "wf-1" });
  });

  it("throws on missing required fields", () => {
    expect(() =>
      mapN8nActionToProposal({
        action: {
          userRequest: "Generate a weekly internal report.",
          tool: "report.generate",
          actionType: "generate_internal_report",
          target: ""
        }
      })
    ).toThrow("target");
  });

  it("preserves execution constraints from proposal and runtime fallback", () => {
    const mapped = mapN8nActionToProposal({
      proposal: {
        ...safeProposal(),
        executionConstraints: {
          version: "execution-constraints/v0.1",
          constraints: {
            reportId: { type: "identifier", namespace: "report", value: "weekly_usage_summary" }
          }
        }
      },
      runtimeAction: {
        metadata: { runtime: true }
      }
    });

    expect(mapped.proposal.executionConstraints?.constraints.reportId).toMatchObject({
      type: "identifier",
      value: "weekly_usage_summary"
    });
    expect(mapped.runtimeAction?.executionConstraints).toEqual(mapped.proposal.executionConstraints);
  });

  it("maps runtimeAction with fallback defaults", () => {
    const mapped = mapN8nActionToProposal({
      proposal: safeProposal(),
      runtimeAction: {
        tool: "database.delete"
      }
    });

    expect(mapped.runtimeAction).toBeDefined();
    expect(mapped.runtimeAction?.tool).toBe("database.delete");
    expect(mapped.runtimeAction?.actionType).toBe("generate_internal_report");
    expect(mapped.runtimeAction?.target).toBe("weekly_usage_summary");
    expect(mapped.runtimeAction?.environment).toBe("staging");
  });

  it("safe n8n input creates allowed proceed response", () => {
    const response = createN8nWebhookResponse({
      proposal: safeProposal(),
      runtimeAction: safeProposal()
    });

    expect(response.json.allowed).toBe(true);
    expect(response.json.nextStep).toBe("proceed");
    expect(response.json.receiptHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("dangerous delete creates non-proceed response", () => {
    const dangerousDelete = dangerousDeleteProposal();
    const response = createN8nWebhookResponse({
      proposal: dangerousDelete,
      runtimeAction: dangerousDelete
    });

    expect(response.json.allowed).toBe(false);
    expect(["stop", "request_approval", "escalate"]).toContain(response.json.nextStep);
    expect(response.json.receiptHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("runtime substitution maps to stop", () => {
    const response = createN8nWebhookResponse({
      proposal: safeProposal(),
      runtimeAction: {
        tool: "database.delete"
      }
    });

    expect(response.json.allowed).toBe(false);
    expect(response.json.nextStep).toBe("stop");
    expect(response.json.decision).toBe("execution_denied");
  });

  it("hard boundary maps to stop", () => {
    const response = createN8nWebhookResponse({
      proposal: {
        ...dangerousDeleteProposal(),
        target: "employee_records"
      },
      policyProfile: hardBoundaryPolicyProfile()
    });

    expect(response.json.allowed).toBe(false);
    expect(response.json.nextStep).toBe("stop");
    expect(response.json.decision).toBe("blocked_by_policy");
  });

  it("approval-required maps to request_approval", () => {
    const response = createN8nWebhookResponse({
      proposal: {
        ...safeProposal(),
        id: "approval-required-report",
        requiresApproval: true,
        knownApproval: true
      },
      authorityMap: authorityMap()
    });

    expect(response.json.allowed).toBe(false);
    expect(response.json.nextStep).toBe("request_approval");
    expect(response.json.decision).toBe("approval_required_by_authority");
  });

  it("exports n8n template metadata", () => {
    expect(n8nTemplates.governanceWebhook.fileName).toBe("ags-governance-webhook.workflow.json");
    expect(n8nTemplates.beforeHttpRequest.fileName).toBe("ags-before-http-request.workflow.json");
  });
});

function safeProposal() {
  return {
    id: "safe-internal-report",
    userRequest: "Generate a weekly internal usage report.",
    tool: "report.generate",
    actionType: "generate_internal_report",
    target: "weekly_usage_summary",
    environment: "staging",
    reversible: true,
    externalFacing: false,
    dataSensitivity: "low" as const,
    requiresApproval: false,
    knownApproval: false,
    metadata: {}
  };
}

function dangerousDeleteProposal() {
  return {
    id: "dangerous-delete",
    userRequest: "Delete inactive customer records in production.",
    tool: "database.delete",
    actionType: "delete_records",
    target: "customer_records",
    environment: "production",
    reversible: false,
    externalFacing: false,
    dataSensitivity: "high" as const,
    requiresApproval: true,
    knownApproval: false,
    metadata: {}
  };
}

function hardBoundaryPolicyProfile() {
  return {
    id: "n8n-hard-boundary-policy",
    name: "n8n Hard Boundary Policy",
    version: "0.9.0",
    defaultMode: "balanced",
    receiptRequired: true,
    hardBoundaries: [
      {
        id: "never_auto_employee_records",
        label: "Never automate employee records",
        when: {
          targetIncludes: "employee"
        },
        effect: "block",
        reason: "Employee record actions require human-owned handling.",
        source: "manual_policy"
      }
    ]
  };
}

function authorityMap() {
  return {
    id: "n8n-authority-map",
    name: "n8n Authority Map",
    version: "0.9.0",
    roles: [
      {
        id: "business_owner",
        label: "Business Owner",
        scopes: [
          {
            id: "business_internal_low_medium",
            externalFacing: false,
            maxDataSensitivity: "medium"
          }
        ]
      }
    ]
  };
}

