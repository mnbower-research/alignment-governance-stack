import type { ApprovalEvidence } from "@alignment-governance-stack/authority-map";
import type { HumanParticipationInput } from "@alignment-governance-stack/human-participation";
import type { ExecutionConstraintSet } from "@alignment-governance-stack/shared-types";
import type { AgencyBusinessProposal } from "./types.js";

export function createGrowthAgent25DollarSandboxTestProposal(
  overrides: Partial<AgencyBusinessProposal> = {}
): AgencyBusinessProposal {
  const base: AgencyBusinessProposal = {
    id: "growth-agent-25-dollar-virtual-property-b-test",
    objectiveId: "objective-profitable-ai-influencer-properties",
    propertyId: "virtual-property-b",
    agentId: "growth-agent-001",
    agentRole: "growth_monetization",
    businessActionType: "paid_content_test",
    campaignId: "campaign-virtual-property-b-test-001",
    contentId: "content-test-001",
    platform: "youtube",
    tool: "ads.sandbox.create_campaign",
    actionType: "create_paid_content_test",
    target: "virtual-property-b/content-test-001/audience-segment-alpha",
    environment: "staging",
    budgetAmount: 25,
    budgetCurrency: "USD",
    expectedOutcome:
      "Simulate a USD 25 paid content test for Virtual Property B content-test-001 against audience segment alpha.",
    experimentWindow: {
      startsAt: "2026-09-10T10:00:00.000Z",
      endsAt: "2026-09-17T10:00:00.000Z"
    },
    reversible: true,
    externalFacing: false,
    dataSensitivity: "low",
    requiresApproval: true,
    knownApproval: false,
    risk: {
      risks: [
        "Could normalize spend-like action without exact CEO approval.",
        "Could later be confused with live platform execution if not clearly simulation-only."
      ],
      objections: [
        "Budget and campaign details must be represented as bound execution constraints before any runtime authorization.",
        "The test must not call an ad platform or use payment credentials."
      ],
      alternatives: [
        "Create a no-spend content draft.",
        "Run organic-only simulated analytics.",
        "Ask CEO to revise target or budget before simulation."
      ],
      rollbackPlan: "No live side effects exist; delete or mark the simulation record superseded."
    },
    metadata: {
      audience: "audience-segment-alpha",
      syntheticPersonaDisclosure: "Virtual Property B is a synthetic/AI identity."
    }
  };
  const proposal = { ...base, ...overrides };

  return {
    ...proposal,
    executionConstraints: overrides.executionConstraints ?? createAgencyExecutionConstraints(proposal)
  };
}

export function createAgencyExecutionConstraints(proposal: AgencyBusinessProposal): ExecutionConstraintSet {
  return {
    version: "execution-constraints/v0.1",
    constraints: {
      objectiveId: { type: "identifier", namespace: "agency.objective", value: proposal.objectiveId },
      propertyId: { type: "identifier", namespace: "agency.property", value: proposal.propertyId },
      businessActionType: { type: "exact_string", value: proposal.businessActionType },
      ...(proposal.campaignId !== undefined
        ? { campaignId: { type: "identifier" as const, namespace: "agency.campaign", value: proposal.campaignId } }
        : {}),
      ...(proposal.contentId !== undefined
        ? { contentId: { type: "identifier" as const, namespace: "agency.content", value: proposal.contentId } }
        : {}),
      ...(proposal.platform !== undefined
        ? { platform: { type: "exact_string" as const, value: proposal.platform } }
        : {}),
      ...(proposal.budgetAmount !== undefined
        ? { budgetAmount: { type: "exact_number" as const, value: proposal.budgetAmount } }
        : {}),
      ...(proposal.budgetCurrency !== undefined
        ? { budgetCurrency: { type: "exact_string" as const, value: proposal.budgetCurrency } }
        : {}),
      audience: {
        type: "exact_string",
        value: typeof proposal.metadata?.audience === "string" ? proposal.metadata.audience : proposal.target
      },
      experimentWindow: {
        type: "time_window",
        startsAt: proposal.experimentWindow.startsAt,
        endsAt: proposal.experimentWindow.endsAt
      }
    },
    metadata: {
      source: "ai-media-agency-adapter/v0.1",
      simulationOnly: true
    }
  };
}

export function createExactCeoApprovalEvidence(
  overrides: Partial<ApprovalEvidence> = {}
): ApprovalEvidence {
  return {
    id: "approval-ceo-virtual-property-b-25-dollar-test",
    approverId: "ceo-human-principal",
    approverRoleId: "ceo",
    approvedAt: "2026-09-10T09:30:00.000Z",
    approvalKind: "simulated_spend_test",
    reason:
      "Approved exactly one simulation-only USD 25 sandbox content test for Virtual Property B content-test-001 on youtube.",
    metadata: {
      singleUse: true,
      objectiveId: "objective-profitable-ai-influencer-properties",
      propertyId: "virtual-property-b",
      campaignId: "campaign-virtual-property-b-test-001",
      contentId: "content-test-001",
      platform: "youtube",
      budgetAmount: 25,
      budgetCurrency: "USD",
      environment: "staging",
      experimentWindow: {
        startsAt: "2026-09-10T10:00:00.000Z",
        endsAt: "2026-09-17T10:00:00.000Z"
      }
    },
    ...overrides
  };
}

export function createMeaningfulCeoParticipationInput(): Omit<HumanParticipationInput, "action"> {
  return {
    context: {
      requiredApproval: true,
      authorityValid: true,
      highRisk: true,
      externalFacing: false,
      highSensitivity: false,
      irreversible: false,
      production: false
    },
    presentedContext: {
      pgdlSummary: "PGDL reviewed the simulated spend proposal before AAG.",
      policySummary: "Phase 1 policy requires CEO approval for every spend-like action.",
      riskSummary:
        "This is a simulation-only USD 25 spend-like test. No network call, live ad spend, public posting, external direct message, payment credential, or social credential is allowed.",
      alternativesPresented: true,
      objectionsPresented: true,
      reversibilityPresented: true,
      dataSensitivityPresented: true,
      hardBoundaryPresented: true
    },
    humanResponse: {
      decision: "approve",
      reason:
        "Approved this exact simulation-only test after reviewing the objective, agent, property, campaign, content, platform, target, USD 25 budget, experiment window, risks, objections, alternatives, rollback, and data sensitivity.",
      reviewedAt: "2026-09-10T09:35:00.000Z",
      responseTimeSeconds: 90,
      askedQuestion: true,
      requestedEvidence: true
    }
  };
}
