import { describe, expect, it } from "vitest";
import { detectAlignmentGaps } from "@alignment-governance-stack/company-profile-generator";
import { validateDecisionClosureArtifact } from "@alignment-governance-stack/decision-closure";
import { verifyAgencyFingerprint } from "@alignment-governance-stack/agency-fingerprint";
import { validateAuthorityMap } from "@alignment-governance-stack/authority-map";
import { validatePolicyProfile } from "@alignment-governance-stack/policy-profiles";
import { verifyGovernanceReceipt } from "@alignment-governance-stack/receipts";
import {
  createAgencyGovernanceResponse,
  createExactCeoApprovalEvidence,
  createGrowthAgent25DollarSandboxTestProposal,
  createMeaningfulCeoParticipationInput,
  createSimulatedAgencyExecutionRecord,
  mapAgencyProposalToActionProposal,
  phase1AgencyAuthorityMap,
  phase1AgencyPolicyProfile,
  phase1CompanyAlignmentInput,
  phase1HumanParticipationPolicy
} from "../index.js";

const permitOptions = {
  issuedAt: "2026-09-10T10:00:00.000Z",
  expiresAt: "2026-09-10T11:00:00.000Z"
};
const validationOptions = {
  now: "2026-09-10T10:05:00.000Z"
};

describe("AI media agency adapter", () => {
  it("maps a Phase 1 agency proposal to AgentActionProposal without changing the canonical schema", () => {
    const agencyProposal = createGrowthAgent25DollarSandboxTestProposal();
    const proposal = mapAgencyProposalToActionProposal(agencyProposal);

    expect(proposal).toMatchObject({
      id: agencyProposal.id,
      tool: "ads.sandbox.create_campaign",
      actionType: "create_paid_content_test",
      target: "virtual-property-b/content-test-001/audience-segment-alpha",
      environment: "staging",
      reversible: true,
      externalFacing: false,
      dataSensitivity: "low",
      requiresApproval: true,
      knownApproval: false
    });
    expect(proposal.metadata).toMatchObject({
      objectiveId: agencyProposal.objectiveId,
      propertyId: "virtual-property-b",
      agentId: "growth-agent-001",
      agentRole: "growth_monetization",
      budgetAmount: 25,
      budgetCurrency: "USD",
      simulationOnly: true
    });
    expect(proposal.executionConstraints?.constraints).toMatchObject({
      budgetAmount: { type: "exact_number", value: 25 },
      budgetCurrency: { type: "exact_string", value: "USD" },
      platform: { type: "exact_string", value: "youtube" },
      propertyId: { type: "identifier", value: "virtual-property-b" },
      campaignId: { type: "identifier", value: "campaign-virtual-property-b-test-001" },
      contentId: { type: "identifier", value: "content-test-001" },
      audience: { type: "exact_string", value: "audience-segment-alpha" }
    });
  });

  it("rejects invalid agency proposals before they enter AGS", () => {
    expect(() =>
      mapAgencyProposalToActionProposal({
        ...createGrowthAgent25DollarSandboxTestProposal(),
        objectiveId: ""
      })
    ).toThrow("objectiveId");
  });

  it("validates Phase 1 draft governance inputs and detects no high or critical alignment gaps", () => {
    expect(validatePolicyProfile(phase1AgencyPolicyProfile).valid).toBe(true);
    expect(validateAuthorityMap(phase1AgencyAuthorityMap).valid).toBe(true);

    const gapReport = detectAlignmentGaps(
      {
        companyAlignmentInput: phase1CompanyAlignmentInput,
        policyProfile: phase1AgencyPolicyProfile,
        authorityMap: phase1AgencyAuthorityMap,
        participationPolicy: phase1HumanParticipationPolicy
      },
      { now: "2026-09-10T10:00:00.000Z" }
    );

    expect(gapReport.humanReviewRequired).toBe(true);
    expect(gapReport.gaps.filter((gap) => gap.severity === "high" || gap.severity === "critical")).toHaveLength(0);
  });

  it("stops a simulated spend proposal when CEO approval is missing", () => {
    const response = createAgencyGovernanceResponse({
      proposal: createGrowthAgent25DollarSandboxTestProposal({ knownApproval: true }),
      policyProfile: phase1AgencyPolicyProfile,
      authorityMap: phase1AgencyAuthorityMap,
      receiptOptions: { id: "agency-missing-approval", createdAt: "2026-09-10T10:01:00.000Z" }
    });
    const execution = createSimulatedAgencyExecutionRecord(response);

    expect(response.allowed).toBe(false);
    expect(response.nextStep).toBe("request_approval");
    expect(response.decision).toBe("approval_required_by_authority");
    expect(response.governance.permit).toBeUndefined();
    expect(response.decisionClosureArtifact).toBeDefined();
    expect(verifyGovernanceReceipt(response.receipt).valid).toBe(true);
    expect(execution.executed).toBe(false);
    expect(execution.networkCallsMade).toBe(0);
  });

  it("allows an exact CEO-approved simulated spend action through AGS and the simulated executor", () => {
    const agencyProposal = createGrowthAgent25DollarSandboxTestProposal({ knownApproval: true });
    const response = createAgencyGovernanceResponse({
      proposal: agencyProposal,
      runtimeProposal: agencyProposal,
      policyProfile: phase1AgencyPolicyProfile,
      authorityMap: phase1AgencyAuthorityMap,
      approvalEvidence: createExactCeoApprovalEvidence(),
      humanParticipation: {
        input: createMeaningfulCeoParticipationInput(),
        policy: phase1HumanParticipationPolicy
      },
      permitOptions,
      validationOptions,
      receiptOptions: { id: "agency-approved-simulated-spend", createdAt: "2026-09-10T10:05:01.000Z" },
      agencyFingerprintOptions: {
        input: {
          subjectHumanId: "ceo-human-principal",
          subjectOrganizationId: "ags-ai-media-agency",
          delegatedBy: "ceo-human-principal",
          agentId: "growth-agent-001",
          agentRole: "growth_monetization",
          workflowId: "workflow-virtual-property-b-paid-test",
          workflowScopeHash: "hash:workflow-virtual-property-b-paid-test",
          authorityMapHash: "hash:ai-media-agency.phase1.authority",
          policyProfileHash: "hash:ai-media-agency.phase1.policy",
          approvalRecordHash: "hash:approval-ceo-virtual-property-b-25-dollar-test",
          timestamp: "2026-09-10T10:05:02.000Z"
        }
      }
    });
    const execution = createSimulatedAgencyExecutionRecord(response);

    expect(response.allowed).toBe(true);
    expect(response.nextStep).toBe("proceed_simulated");
    expect(response.decision).toBe("execution_allowed");
    expect(response.governance.approvalValidation?.decision).toBe("approval_valid");
    expect(response.governance.participationQuality?.decision).toBe("meaningful_participation");
    expect(response.governance.aag?.decision).toBe("allow");
    expect(response.governance.permit?.expiresAt).toBe("2026-09-10T10:30:00.000Z");
    expect(response.governance.permit?.executionConstraintHash).toMatch(/^sha256:/);
    expect(response.governance.permit?.allowedAction.executionConstraints?.constraints.budgetAmount).toMatchObject({
      type: "exact_number",
      value: 25
    });
    expect(response.governance.runtimeBinding?.allowed).toBe(true);
    expect(response.agencyFingerprint).toBeDefined();
    expect(verifyAgencyFingerprint(response.agencyFingerprint!).valid).toBe(true);
    expect(response.decisionClosureArtifact).toBeDefined();
    expect(validateDecisionClosureArtifact(response.decisionClosureArtifact!).valid).toBe(true);
    expect(verifyGovernanceReceipt(response.receipt).valid).toBe(true);
    expect(execution).toMatchObject({
      executed: true,
      mode: "simulation_only",
      networkCallsMade: 0
    });
  });

  it("denies runtime substitution using the canonical fields AGS currently binds", () => {
    const approvedProposal = createGrowthAgent25DollarSandboxTestProposal({ knownApproval: true });
    const runtimeProposal = createGrowthAgent25DollarSandboxTestProposal({
      id: approvedProposal.id,
      knownApproval: true,
      tool: "ads.live.create_campaign",
      target: "virtual-property-b/content-test-001/audience-segment-beta",
      environment: "production",
      budgetAmount: 250
    });
    const response = createAgencyGovernanceResponse({
      proposal: approvedProposal,
      runtimeProposal,
      policyProfile: phase1AgencyPolicyProfile,
      authorityMap: phase1AgencyAuthorityMap,
      approvalEvidence: createExactCeoApprovalEvidence(),
      humanParticipation: {
        input: createMeaningfulCeoParticipationInput(),
        policy: phase1HumanParticipationPolicy
      },
      permitOptions,
      validationOptions,
      receiptOptions: { id: "agency-runtime-substitution-denied", createdAt: "2026-09-10T10:06:00.000Z" }
    });

    expect(response.allowed).toBe(false);
    expect(response.nextStep).toBe("stop");
    expect(response.decision).toBe("execution_denied");
    expect(response.governance.runtimeBinding?.failures.map((failure) => failure.code)).toEqual(
      expect.arrayContaining([
        "action_hash_mismatch",
        "tool_mismatch",
        "target_mismatch",
        "environment_mismatch"
      ])
    );
    expect(createSimulatedAgencyExecutionRecord(response).executed).toBe(false);
    expect(verifyGovernanceReceipt(response.receipt).valid).toBe(true);
  });

  it("denies a budget-only runtime substitution when budget is a bound execution constraint", () => {
    const approvedProposal = createGrowthAgent25DollarSandboxTestProposal({ knownApproval: true });
    const { executionConstraints: _approvedConstraints, ...runtimeOverrides } = approvedProposal;
    const runtimeProposal = createGrowthAgent25DollarSandboxTestProposal({
      ...runtimeOverrides,
      budgetAmount: 250
    });
    const response = createAgencyGovernanceResponse({
      proposal: approvedProposal,
      runtimeProposal,
      policyProfile: phase1AgencyPolicyProfile,
      authorityMap: phase1AgencyAuthorityMap,
      approvalEvidence: createExactCeoApprovalEvidence(),
      humanParticipation: {
        input: createMeaningfulCeoParticipationInput(),
        policy: phase1HumanParticipationPolicy
      },
      permitOptions,
      validationOptions,
      receiptOptions: { id: "agency-bound-budget-substitution-denied", createdAt: "2026-09-10T10:07:00.000Z" }
    });

    expect(response.governance.runtimeBinding?.allowed).toBe(false);
    expect(response.allowed).toBe(false);
    expect(response.decision).toBe("execution_denied");
    expect(response.governance.runtimeBinding?.failures.map((failure) => failure.code)).toEqual(
      expect.arrayContaining(["action_hash_mismatch", "execution_constraint_value_mismatch"])
    );
    expect(response.metadataBindingLimitation.protectedByRuntimeBinding).toBe(false);
    expect(response.metadataBindingLimitation.fields).toContain("metadata.budgetAmount");
    expect(response.runtimeAction?.metadata.budgetAmount).toBe(250);
    expect(response.governance.permit?.allowedAction.metadata.budgetAmount).toBe(25);
    expect(createSimulatedAgencyExecutionRecord(response).networkCallsMade).toBe(0);
  });

  it("stops a rubber-stamped CEO approval before AAG", () => {
    const response = createAgencyGovernanceResponse({
      proposal: createGrowthAgent25DollarSandboxTestProposal({ knownApproval: true }),
      policyProfile: phase1AgencyPolicyProfile,
      authorityMap: phase1AgencyAuthorityMap,
      approvalEvidence: createExactCeoApprovalEvidence(),
      humanParticipation: {
        input: {
          context: { highRisk: true, requiredApproval: true, authorityValid: true },
          humanResponse: {
            decision: "approve",
            responseTimeSeconds: 1
          }
        },
        policy: phase1HumanParticipationPolicy
      },
      validationOptions,
      receiptOptions: { id: "agency-rubber-stamp-denied", createdAt: "2026-09-10T10:08:00.000Z" }
    });

    expect(response.allowed).toBe(false);
    expect(response.nextStep).toBe("escalate");
    expect(response.decision).toBe("insufficient_human_participation");
    expect(response.governance.participationQuality?.decision).toBe("likely_rubber_stamp");
    expect(response.governance.aag).toBeUndefined();
  });

  it("rejects an operational agent attempting to approve its own proposal", () => {
    const response = createAgencyGovernanceResponse({
      proposal: createGrowthAgent25DollarSandboxTestProposal({ knownApproval: true }),
      policyProfile: phase1AgencyPolicyProfile,
      authorityMap: phase1AgencyAuthorityMap,
      approvalEvidence: createExactCeoApprovalEvidence({
        approverId: "growth-agent-001",
        approverRoleId: "growth_agent"
      }),
      humanParticipation: {
        input: createMeaningfulCeoParticipationInput(),
        policy: phase1HumanParticipationPolicy
      },
      receiptOptions: { id: "agency-wrong-approver-denied", createdAt: "2026-09-10T10:09:00.000Z" }
    });

    expect(response.allowed).toBe(false);
    expect(response.nextStep).toBe("request_approval");
    expect(response.governance.approvalValidation?.decision).toBe("approval_role_unknown");
    expect(response.governance.aag).toBeUndefined();
  });

  it("rejects expired CEO approval evidence", () => {
    const response = createAgencyGovernanceResponse({
      proposal: createGrowthAgent25DollarSandboxTestProposal({ knownApproval: true }),
      policyProfile: phase1AgencyPolicyProfile,
      authorityMap: phase1AgencyAuthorityMap,
      approvalEvidence: createExactCeoApprovalEvidence({
        expiresAt: "2000-01-01T00:00:00.000Z"
      }),
      humanParticipation: {
        input: createMeaningfulCeoParticipationInput(),
        policy: phase1HumanParticipationPolicy
      },
      receiptOptions: { id: "agency-expired-approval-denied", createdAt: "2026-09-10T10:10:00.000Z" }
    });

    expect(response.allowed).toBe(false);
    expect(response.nextStep).toBe("request_approval");
    expect(response.governance.approvalValidation?.decision).toBe("approval_expired");
    expect(response.governance.aag).toBeUndefined();
  });
});

