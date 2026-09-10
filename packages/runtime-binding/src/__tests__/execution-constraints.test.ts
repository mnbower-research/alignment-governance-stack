import { describe, expect, it } from "vitest";
import type { AgentActionProposal, ExecutionConstraintSet } from "@alignment-governance-stack/shared-types";
import {
  bindActionToPermit,
  createActionHash,
  createRuntimePermit,
  hashExecutionConstraintSet,
  validateRuntimePermit
} from "../index.js";

describe("Runtime Binding execution constraints", () => {
  it("keeps proposals without execution constraints backward compatible", () => {
    const action = createReportAction();
    const runtimeAction = {
      ...action,
      metadata: {
        budgetAmount: 250,
        campaignId: "metadata-only-change"
      }
    };
    const permit = createRuntimePermit(action, { issuedAt: "2026-01-01T00:00:00.000Z" });

    const result = validateRuntimePermit(runtimeAction, permit);

    expect(permit.executionConstraintHash).toBeUndefined();
    expect(result.allowed).toBe(true);
  });

  it("allows an exact action with bound execution constraints", () => {
    const action = createAgencyAction();
    const permit = createRuntimePermit(action, { issuedAt: "2026-01-01T00:00:00.000Z" });

    const result = bindActionToPermit(action, permit);

    expect(result.allowed).toBe(true);
    expect(permit.executionConstraintHash).toBe(hashExecutionConstraintSet(action.executionConstraints!));
    expect(permit.allowedAction.executionConstraints).toEqual(action.executionConstraints);
  });

  it.each([
    ["budget amount", "budgetAmount", { type: "exact_number", value: 250 }],
    ["budget currency", "budgetCurrency", { type: "exact_string", value: "EUR" }],
    ["platform", "platform", { type: "exact_string", value: "tiktok" }],
    ["property", "propertyId", { type: "identifier", namespace: "agency.property", value: "virtual-property-c" }],
    ["campaign", "campaignId", { type: "identifier", namespace: "agency.campaign", value: "campaign-002" }],
    ["content", "contentId", { type: "identifier", namespace: "agency.content", value: "content-002" }],
    ["audience", "audience", { type: "exact_string", value: "audience-segment-beta" }]
  ])("denies %s substitution when it is represented as a bound constraint", (_label, key, replacement) => {
    const permittedAction = createAgencyAction();
    const runtimeAction = withConstraint(permittedAction, key, replacement);
    const permit = createRuntimePermit(permittedAction);

    const result = validateRuntimePermit(runtimeAction, permit);

    expect(result.allowed).toBe(false);
    expect(result.failures.map((failure) => failure.code)).toEqual(
      expect.arrayContaining(["action_hash_mismatch", "execution_constraint_value_mismatch"])
    );
  });

  it("denies missing bound constraints", () => {
    const permittedAction = createAgencyAction();
    const runtimeAction = {
      ...permittedAction,
      executionConstraints: undefined
    };
    const permit = createRuntimePermit(permittedAction);

    const result = validateRuntimePermit(runtimeAction, permit);

    expect(result.allowed).toBe(false);
    expect(result.failures.map((failure) => failure.code)).toEqual(
      expect.arrayContaining(["action_hash_mismatch", "execution_constraint_missing"])
    );
  });

  it("denies bound constraint type substitution", () => {
    const permittedAction = createAgencyAction();
    const runtimeAction = withConstraint(permittedAction, "budgetAmount", { type: "exact_string", value: "25" });
    const permit = createRuntimePermit(permittedAction);

    const result = validateRuntimePermit(runtimeAction, permit);

    expect(result.failures.map((failure) => failure.code)).toEqual(
      expect.arrayContaining(["action_hash_mismatch", "execution_constraint_type_mismatch"])
    );
  });

  it("denies numeric range widening", () => {
    const permittedAction = withConstraint(createReportAction(), "spendLimit", {
      type: "numeric_range",
      min: 0,
      max: 25,
      unit: "USD"
    });
    const runtimeAction = withConstraint(permittedAction, "spendLimit", {
      type: "numeric_range",
      min: 0,
      max: 250,
      unit: "USD"
    });
    const permit = createRuntimePermit(permittedAction);

    const result = validateRuntimePermit(runtimeAction, permit);

    expect(result.failures.map((failure) => failure.code)).toEqual(
      expect.arrayContaining(["action_hash_mismatch", "execution_constraint_range_expansion"])
    );
  });

  it("denies string set expansion", () => {
    const permittedAction = withConstraint(createReportAction(), "allowedAudiences", {
      type: "string_set",
      values: ["audience-segment-alpha"]
    });
    const runtimeAction = withConstraint(permittedAction, "allowedAudiences", {
      type: "string_set",
      values: ["audience-segment-alpha", "audience-segment-beta"]
    });
    const permit = createRuntimePermit(permittedAction);

    const result = validateRuntimePermit(runtimeAction, permit);

    expect(result.failures.map((failure) => failure.code)).toEqual(
      expect.arrayContaining(["action_hash_mismatch", "execution_constraint_set_expansion"])
    );
  });

  it("denies time window widening", () => {
    const permittedAction = createAgencyAction();
    const runtimeAction = withConstraint(permittedAction, "experimentWindow", {
      type: "time_window",
      startsAt: "2026-09-09T10:00:00.000Z",
      endsAt: "2026-09-18T10:00:00.000Z"
    });
    const permit = createRuntimePermit(permittedAction);

    const result = validateRuntimePermit(runtimeAction, permit);

    expect(result.failures.map((failure) => failure.code)).toEqual(
      expect.arrayContaining(["action_hash_mismatch", "execution_constraint_time_window_expansion"])
    );
  });

  it("canonicalizes constraint key and set ordering before hashing", () => {
    const first = withConstraints(createReportAction(), {
      version: "execution-constraints/v0.1",
      constraints: {
        allowedAudiences: { type: "string_set", values: ["beta", "alpha", "alpha"] },
        budgetCurrency: { type: "exact_string", value: "USD" }
      }
    });
    const second = withConstraints(createReportAction(), {
      version: "execution-constraints/v0.1",
      constraints: {
        budgetCurrency: { type: "exact_string", value: "USD" },
        allowedAudiences: { type: "string_set", values: ["alpha", "beta"] }
      }
    });

    expect(createActionHash(first)).toBe(createActionHash(second));
    expect(hashExecutionConstraintSet(first.executionConstraints!)).toBe(hashExecutionConstraintSet(second.executionConstraints!));
  });

  it("does not deny ordinary metadata mutations when bound constraints are unchanged", () => {
    const permittedAction = createAgencyAction();
    const runtimeAction = {
      ...permittedAction,
      metadata: {
        ...permittedAction.metadata,
        budgetAmount: 999,
        platform: "metadata-only-tiktok"
      }
    };
    const permit = createRuntimePermit(permittedAction);

    const result = validateRuntimePermit(runtimeAction, permit);

    expect(result.allowed).toBe(true);
  });

  it("changes the action hash when a bound constraint changes", () => {
    const permittedAction = createAgencyAction();
    const runtimeAction = withConstraint(permittedAction, "budgetAmount", { type: "exact_number", value: 26 });

    expect(createActionHash(runtimeAction)).not.toBe(createActionHash(permittedAction));
  });

  it("keeps permit expiration authoritative alongside execution constraints", () => {
    const action = createAgencyAction();
    const permit = createRuntimePermit(action, {
      issuedAt: "2026-01-01T00:00:00.000Z",
      expiresAt: "2026-01-01T00:05:00.000Z"
    });

    const result = validateRuntimePermit(action, permit, { now: "2026-01-01T00:06:00.000Z" });

    expect(result.allowed).toBe(false);
    expect(result.failures.map((failure) => failure.code)).toContain("expired_permit");
  });

  it("continues to deny canonical tool, target, and environment substitutions", () => {
    const permittedAction = createAgencyAction();
    const runtimeAction = {
      ...permittedAction,
      tool: "ads.live.create_campaign",
      target: "virtual-property-b/content-test-001/audience-segment-beta",
      environment: "production"
    };
    const permit = createRuntimePermit(permittedAction);

    const result = validateRuntimePermit(runtimeAction, permit);

    expect(result.failures.map((failure) => failure.code)).toEqual(
      expect.arrayContaining(["tool_mismatch", "target_mismatch", "environment_mismatch"])
    );
  });

  it("allows a non-agency deployment action with generic constraints", () => {
    const action = withConstraints(createReportAction(), {
      version: "execution-constraints/v0.1",
      constraints: {
        serviceId: { type: "identifier", namespace: "deployment.service", value: "checkout-api" },
        region: { type: "enum", value: "us-west-2", allowedValues: ["us-west-2", "us-east-1"] },
        releaseWindow: {
          type: "time_window",
          startsAt: "2026-04-01T10:00:00.000Z",
          endsAt: "2026-04-01T11:00:00.000Z"
        }
      }
    });
    const permit = createRuntimePermit(action);

    expect(validateRuntimePermit(action, permit).allowed).toBe(true);
  });
});

function createReportAction(): AgentActionProposal {
  return {
    id: "safe-internal-report",
    userRequest: "Generate a weekly internal usage report.",
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

function createAgencyAction(): AgentActionProposal {
  return withConstraints(
    {
      id: "agency-simulated-spend",
      userRequest: "Simulate one paid content test.",
      tool: "ads.sandbox.create_campaign",
      actionType: "create_paid_content_test",
      target: "virtual-property-b/content-test-001/audience-segment-alpha",
      environment: "staging",
      reversible: true,
      externalFacing: false,
      dataSensitivity: "low",
      requiresApproval: true,
      knownApproval: true,
      metadata: {
        budgetAmount: 25,
        budgetCurrency: "USD",
        platform: "youtube",
        propertyId: "virtual-property-b",
        campaignId: "campaign-001",
        contentId: "content-test-001",
        audience: "audience-segment-alpha"
      }
    },
    {
      version: "execution-constraints/v0.1",
      constraints: {
        budgetAmount: { type: "exact_number", value: 25 },
        budgetCurrency: { type: "exact_string", value: "USD" },
        platform: { type: "exact_string", value: "youtube" },
        propertyId: { type: "identifier", namespace: "agency.property", value: "virtual-property-b" },
        campaignId: { type: "identifier", namespace: "agency.campaign", value: "campaign-001" },
        contentId: { type: "identifier", namespace: "agency.content", value: "content-test-001" },
        audience: { type: "exact_string", value: "audience-segment-alpha" },
        experimentWindow: {
          type: "time_window",
          startsAt: "2026-09-10T10:00:00.000Z",
          endsAt: "2026-09-17T10:00:00.000Z"
        }
      }
    }
  );
}

function withConstraint(
  action: AgentActionProposal,
  key: string,
  constraint: ExecutionConstraintSet["constraints"][string]
): AgentActionProposal {
  return withConstraints(action, {
    version: "execution-constraints/v0.1",
    constraints: {
      ...(action.executionConstraints?.constraints ?? {}),
      [key]: constraint
    },
    ...(action.executionConstraints?.metadata !== undefined ? { metadata: action.executionConstraints.metadata } : {})
  });
}

function withConstraints(action: AgentActionProposal, executionConstraints: ExecutionConstraintSet): AgentActionProposal {
  return {
    ...action,
    executionConstraints
  };
}
