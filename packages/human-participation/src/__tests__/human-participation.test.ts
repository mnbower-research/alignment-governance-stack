import { describe, expect, it } from "vitest";
import type { AgentActionProposal } from "@alignment-governance-stack/shared-types";
import {
  evaluateParticipationQuality,
  validateParticipationInput
} from "../index.js";
import type { HumanParticipationInput } from "../types.js";

describe("human participation quality", () => {
  it("returns participation_not_required for safe actions without approval", () => {
    const result = evaluateParticipationQuality({
      action: createSafeAction()
    });

    expect(result.decision).toBe("participation_not_required");
    expect(result.meaningful).toBe(true);
  });

  it("returns participation_input_invalid for missing action", () => {
    const result = evaluateParticipationQuality({} as unknown as HumanParticipationInput);

    expect(validateParticipationInput({} as unknown as HumanParticipationInput).valid).toBe(false);
    expect(result.decision).toBe("participation_input_invalid");
    expect(result.meaningful).toBe(false);
    expect(result.recommendedAction).toBe("escalate");
  });

  it("returns insufficient_participation when required participation has no response", () => {
    const result = evaluateParticipationQuality({
      action: createHighRiskAction()
    });

    expect(result.decision).toBe("insufficient_participation");
    expect(result.risk).toBe("high");
    expect(result.signals.map((signal) => signal.id)).toContain("missing_human_response");
  });

  it("flags high-risk fast approval without reason as likely rubber stamp", () => {
    const result = evaluateParticipationQuality({
      action: createHighRiskAction(),
      humanResponse: {
        decision: "approve",
        responseTimeSeconds: 1
      }
    });

    expect(result.decision).toBe("likely_rubber_stamp");
    expect(result.meaningful).toBe(false);
    expect(result.recommendedAction).toBe("block_until_meaningful_review");
  });

  it("accepts high-risk approval with reason, context, objections, and adequate time", () => {
    const result = evaluateParticipationQuality({
      action: createHighRiskAction(),
      presentedContext: {
        riskSummary: "Production customer data export requires careful review.",
        objectionsPresented: true,
        reversibilityPresented: true,
        dataSensitivityPresented: true
      },
      humanResponse: {
        decision: "approve",
        reason: "Reviewed the scoped report request and confirmed it is limited to approved internal data.",
        responseTimeSeconds: 45
      }
    });

    expect(result.decision).toBe("meaningful_participation");
    expect(result.meaningful).toBe(true);
  });

  it("treats rejection with reason as meaningful participation", () => {
    const result = evaluateParticipationQuality({
      action: createHighRiskAction(),
      presentedContext: {
        riskSummary: "Risk was presented.",
        objectionsPresented: true
      },
      humanResponse: {
        decision: "reject",
        reason: "The request is too broad for this approval window."
      }
    });

    expect(result.decision).toBe("meaningful_participation");
    expect(result.meaningful).toBe(true);
  });

  it("treats requested revision with question and evidence request as meaningful", () => {
    const result = evaluateParticipationQuality({
      action: createHighRiskAction(),
      humanResponse: {
        decision: "request_revision",
        askedQuestion: true,
        requestedEvidence: true
      }
    });

    expect(result.decision).toBe("meaningful_participation");
    expect(result.meaningful).toBe(true);
  });

  it("flags invalid authority as insufficient participation", () => {
    const result = evaluateParticipationQuality({
      action: createHighRiskAction(),
      context: {
        authorityValid: false
      },
      humanResponse: {
        decision: "approve",
        reason: "Approved after review.",
        responseTimeSeconds: 45
      }
    });

    expect(result.decision).toBe("insufficient_participation");
    expect(result.signals.map((signal) => signal.id)).toContain("invalid_authority");
  });

  it("signals missing reversibility context for irreversible actions", () => {
    const result = evaluateParticipationQuality({
      action: createHighRiskAction(),
      presentedContext: {
        riskSummary: "Risk was presented.",
        objectionsPresented: true,
        dataSensitivityPresented: true
      },
      humanResponse: {
        decision: "approve",
        reason: "The production change is reviewed and scoped to the requested target.",
        responseTimeSeconds: 45
      }
    });

    expect(result.signals.map((signal) => signal.id)).toContain("reversibility_context_missing");
  });

  it("signals missing data sensitivity context for high sensitivity actions", () => {
    const result = evaluateParticipationQuality({
      action: createHighRiskAction(),
      presentedContext: {
        riskSummary: "Risk was presented.",
        objectionsPresented: true,
        reversibilityPresented: true
      },
      humanResponse: {
        decision: "approve",
        reason: "The production change is reviewed and scoped to the requested target.",
        responseTimeSeconds: 45
      }
    });

    expect(result.signals.map((signal) => signal.id)).toContain("data_sensitivity_context_missing");
  });
});

function createSafeAction(): AgentActionProposal {
  return {
    id: "safe-report",
    userRequest: "Generate an internal report.",
    tool: "report.generate",
    actionType: "generate_internal_report",
    target: "weekly_usage",
    environment: "staging",
    reversible: true,
    externalFacing: false,
    dataSensitivity: "low",
    requiresApproval: false,
    knownApproval: false,
    metadata: {}
  };
}

function createHighRiskAction(): AgentActionProposal {
  return {
    ...createSafeAction(),
    id: "high-risk-action",
    environment: "production",
    reversible: false,
    dataSensitivity: "high",
    requiresApproval: true,
    knownApproval: true
  };
}

