import { describe, expect, it } from "vitest";
import type { AgentActionProposal } from "@alignment-governance-stack/shared-types";
import { bindActionToPermit, createRuntimePermit, validateRuntimePermit } from "../index.js";

describe("Runtime Binding v0.1 permit validation", () => {
  it("allows the exact permitted action", () => {
    const action = createReviewAction();
    const permit = createRuntimePermit(action, { issuedAt: "2026-01-01T00:00:00.000Z" });

    const result = validateRuntimePermit(action, permit);

    expect(result.decision).toBe("execution_allowed");
    expect(result.allowed).toBe(true);
    expect(result.failures).toHaveLength(0);
  });

  it("denies execution when the permit is missing", () => {
    const result = validateRuntimePermit(createReviewAction());

    expect(result.decision).toBe("execution_denied");
    expect(result.allowed).toBe(false);
    expect(result.failures.map((failure) => failure.code)).toContain("missing_permit");
  });

  it("denies tool substitution", () => {
    const permittedAction = createReviewAction();
    const runtimeAction = {
      ...permittedAction,
      tool: "database.delete"
    };
    const permit = createRuntimePermit(permittedAction);

    const result = bindActionToPermit(runtimeAction, permit);

    expect(result.decision).toBe("execution_denied");
    expect(result.failures.map((failure) => failure.code)).toEqual(
      expect.arrayContaining(["action_hash_mismatch", "tool_mismatch"])
    );
  });

  it("denies target substitution", () => {
    const permittedAction = createReviewAction();
    const runtimeAction = {
      ...permittedAction,
      target: "all_customer_records"
    };
    const permit = createRuntimePermit(permittedAction);

    const result = validateRuntimePermit(runtimeAction, permit);

    expect(result.decision).toBe("execution_denied");
    expect(result.failures.map((failure) => failure.code)).toContain("target_mismatch");
  });

  it("denies external impact escalation", () => {
    const permittedAction = createReviewAction();
    const runtimeAction = {
      ...permittedAction,
      externalFacing: true
    };
    const permit = createRuntimePermit(permittedAction);

    const result = validateRuntimePermit(runtimeAction, permit);

    expect(result.decision).toBe("execution_denied");
    expect(result.failures.map((failure) => failure.code)).toContain("external_impact_mismatch");
  });

  it("denies data sensitivity escalation", () => {
    const permittedAction = {
      ...createReviewAction(),
      dataSensitivity: "low" as const
    };
    const runtimeAction = {
      ...permittedAction,
      dataSensitivity: "high" as const
    };
    const permit = createRuntimePermit(permittedAction);

    const result = validateRuntimePermit(runtimeAction, permit);

    expect(result.decision).toBe("execution_denied");
    expect(result.failures.map((failure) => failure.code)).toContain("data_sensitivity_mismatch");
  });

  it("denies expired permits", () => {
    const action = createReviewAction();
    const permit = createRuntimePermit(action, {
      issuedAt: "2026-01-01T00:00:00.000Z",
      expiresAt: "2026-01-01T00:05:00.000Z"
    });

    const result = validateRuntimePermit(action, permit, {
      now: "2026-01-01T00:06:00.000Z"
    });

    expect(result.decision).toBe("execution_denied");
    expect(result.failures.map((failure) => failure.code)).toContain("expired_permit");
  });

  it("denies bypassing a PGDL revised action with the original dangerous action", () => {
    const permittedAction = createReviewAction();
    const runtimeAction: AgentActionProposal = {
      ...permittedAction,
      tool: "database.delete",
      actionType: "delete_records",
      reversible: false
    };
    const permit = createRuntimePermit(permittedAction);

    const result = bindActionToPermit(runtimeAction, permit);

    expect(result.decision).toBe("execution_denied");
    expect(result.failures.map((failure) => failure.code)).toEqual(
      expect.arrayContaining([
        "action_hash_mismatch",
        "tool_mismatch",
        "action_type_mismatch",
        "reversibility_mismatch"
      ])
    );
  });
});

function createReviewAction(): AgentActionProposal {
  return {
    id: "review-inactive-customer-records",
    userRequest: "Review inactive customer records.",
    tool: "review.generate",
    actionType: "generate_review_packet",
    target: "inactive_customer_records",
    environment: "production",
    reversible: true,
    externalFacing: false,
    dataSensitivity: "medium",
    requiresApproval: false,
    knownApproval: true,
    metadata: {
      pgdlRevision: true
    }
  };
}
