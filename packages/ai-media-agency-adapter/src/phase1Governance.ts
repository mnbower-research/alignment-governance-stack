import type { AuthorityMap } from "@alignment-governance-stack/authority-map";
import type { CompanyAlignmentInput } from "@alignment-governance-stack/company-profile-generator";
import type { HumanParticipationPolicy } from "@alignment-governance-stack/human-participation";
import type { PolicyProfile } from "@alignment-governance-stack/policy-profiles";

export const phase1CompanyAlignmentInput: CompanyAlignmentInput = {
  id: "ai-media-agency-phase-1",
  name: "AGS-Governed AI Media Agency Phase 1",
  organization: "AGS AI Media Agency",
  description: "Simulation-only agency governance profile for discovering, launching, testing, and scaling AI-influencer properties under CEO authority.",
  values: [
    {
      id: "ceo-authority",
      label: "CEO authority remains final",
      governanceImplication: "Every spend-like action requires CEO approval and emergency-stop authority."
    },
    {
      id: "simulation-before-live",
      label: "Simulation before live execution",
      governanceImplication: "No network execution, public posting, external direct messages, or credentials in Phase 1."
    },
    {
      id: "synthetic-identity-honesty",
      label: "Synthetic identity honesty",
      governanceImplication: "AI personas must not impersonate real people or fabricate human credentials, purchases, testimonials, personal results, or real-world experiences."
    }
  ],
  roles: [
    {
      id: "ceo",
      label: "CEO / Human Principal",
      canApprove: ["external_facing", "production", "high_sensitivity"],
      notes: "Ultimate authority with stop, refuse, revise, halt, and escalation authority over all agency operations."
    },
    {
      id: "chief_of_staff",
      label: "Chief of Staff Orchestrator",
      notes: "May request approval and coordinate work, but may not grant approval."
    },
    {
      id: "growth_agent",
      label: "Growth & Monetization Agent",
      notes: "May propose spend-like tests, but may not grant approval or execute live spend."
    }
  ],
  tools: [
    {
      tool: "ads.sandbox.create_campaign",
      label: "Sandbox ad campaign simulator",
      allowed: true,
      requiresApproval: true,
      externalFacing: false,
      environments: ["staging"],
      maxDataSensitivity: "low",
      notes: "Simulation-only paid content test proposal surface."
    },
    {
      tool: "ads.live.create_campaign",
      label: "Live ad campaign creation",
      allowed: false,
      requiresApproval: true,
      externalFacing: true,
      blockedEnvironments: ["production"],
      notes: "Live spend is out of scope for Phase 1."
    },
    {
      tool: "social.publish",
      label: "Public social publishing",
      allowed: false,
      requiresApproval: true,
      externalFacing: true,
      notes: "Public posting is out of scope for Phase 1."
    },
    {
      tool: "social.dm.send",
      label: "External direct messaging",
      allowed: false,
      requiresApproval: true,
      externalFacing: true,
      notes: "External direct messages are out of scope for Phase 1."
    },
    {
      tool: "credentials.access",
      label: "Credential access",
      allowed: false,
      destructive: true,
      notes: "Payment and social-platform credentials are out of scope for Phase 1."
    },
    {
      tool: "policy.modify",
      label: "Governance policy mutation",
      allowed: false,
      destructive: true,
      notes: "Operational agents and LLMs may not mutate governance policy at runtime."
    }
  ],
  dataClasses: [
    {
      id: "public_market_research",
      label: "Public market research",
      sensitivity: "low",
      externalSharingAllowed: true
    },
    {
      id: "synthetic_persona_profile",
      label: "Synthetic persona profile",
      sensitivity: "medium",
      externalSharingAllowed: false,
      requiresApproval: true,
      notes: "Synthetic personas must be represented as synthetic/AI identities."
    },
    {
      id: "sensitive_personal_data",
      label: "Sensitive personal data",
      sensitivity: "high",
      externalSharingAllowed: false,
      requiresApproval: true,
      notes: "Sensitive-personal-data workflows are out of scope for Phase 1."
    }
  ],
  environments: [
    {
      id: "staging",
      label: "Staging / Simulation",
      productionLike: false,
      requiresApprovalForExternalFacing: true,
      requiresApprovalForHighSensitivity: true
    },
    {
      id: "production",
      label: "Production / Live Platforms",
      productionLike: true,
      requiresApprovalForIrreversible: true,
      requiresApprovalForExternalFacing: true,
      requiresApprovalForHighSensitivity: true,
      notes: "Production and live platform execution are out of scope for Phase 1."
    }
  ],
  decisionBoundaries: [
    {
      id: "all_spend_requires_ceo_approval",
      label: "Every spend-like action requires CEO approval",
      tool: "ads.sandbox.create_campaign",
      actionType: "create_paid_content_test",
      environment: "staging",
      externalFacing: false,
      reversible: true,
      dataSensitivity: "low",
      requiresHumanApproval: true,
      approverRole: "ceo"
    },
    {
      id: "never_live_spend_phase_1",
      label: "No live spend in Phase 1",
      tool: "ads.live.create_campaign",
      requiresHumanApproval: true,
      neverAutomate: true
    },
    {
      id: "never_public_post_phase_1",
      label: "No public posting in Phase 1",
      tool: "social.publish",
      externalFacing: true,
      requiresHumanApproval: true,
      neverAutomate: true
    },
    {
      id: "never_external_dm_phase_1",
      label: "No external direct messages in Phase 1",
      tool: "social.dm.send",
      externalFacing: true,
      requiresHumanApproval: true,
      neverAutomate: true
    },
    {
      id: "never_credential_access_phase_1",
      label: "No payment or social-platform credential access",
      tool: "credentials.access",
      requiresHumanApproval: true,
      neverAutomate: true
    },
    {
      id: "never_policy_mutation_by_agents",
      label: "Operational agents and LLMs may not mutate governance policy",
      tool: "policy.modify",
      requiresHumanApproval: true,
      neverAutomate: true
    },
    {
      id: "never_agent_self_approval",
      label: "Agents may not approve their own proposals",
      tool: "approval.self",
      actionType: "approve_own_action",
      requiresHumanApproval: true,
      neverAutomate: true
    },
    {
      id: "never_real_person_impersonation",
      label: "No unconsented real-person likeness or impersonation",
      actionType: "impersonate_real_person",
      requiresHumanApproval: true,
      neverAutomate: true
    },
    {
      id: "never_fabricated_human_claims",
      label: "No fabricated human credentials or experiences",
      actionType: "fabricate_human_experience_claim",
      requiresHumanApproval: true,
      neverAutomate: true
    },
    {
      id: "never_out_of_scope_sensitive_domains",
      label: "No Phase 1 political, medical, financial, adult, or sensitive personal workflows",
      dataSensitivity: "high",
      targetIncludes: "sensitive_personal_data",
      requiresHumanApproval: true,
      neverAutomate: true
    }
  ],
  defaultMode: "strict",
  metadata: {
    status: "draft_for_ceo_review",
    phase: "1",
    simulationOnly: true,
    maxSimulatedSpendPerAction: 25,
    maxSimulatedSpendCurrency: "USD",
    initialExperimentBudgetContext: 200,
    liveActionBlocker:
      "Budget and related business fields are execution-authoritative only when represented in canonical bound execution constraints."
  }
};

export const phase1AgencyPolicyProfile: PolicyProfile = {
  id: "ai-media-agency.phase1.policy",
  name: "AI Media Agency Phase 1 Policy Profile",
  version: "policy.profile.ai-media-agency.phase1-draft",
  description: "DRAFT simulation-only policy profile for AGS-governed AI media agency Phase 1.",
  organization: "AGS AI Media Agency",
  defaultMode: "strict",
  receiptRequired: true,
  tools: [
    {
      tool: "ads.sandbox.create_campaign",
      allowed: true,
      requiresApproval: true,
      allowedEnvironments: ["staging"],
      maxDataSensitivity: "low",
      externalFacingAllowed: false,
      notes: "Simulation-only paid content tests require CEO approval."
    },
    {
      tool: "ads.live.create_campaign",
      allowed: false,
      requiresApproval: true,
      blockedInEnvironments: ["production"],
      notes: "No live spend in Phase 1."
    },
    { tool: "social.publish", allowed: false, requiresApproval: true, externalFacingAllowed: false },
    { tool: "social.dm.send", allowed: false, requiresApproval: true, externalFacingAllowed: false },
    { tool: "credentials.access", allowed: false, requiresApproval: true },
    { tool: "policy.modify", allowed: false, requiresApproval: true },
    { tool: "approval.self", allowed: false, requiresApproval: true }
  ],
  environments: [
    {
      environment: "staging",
      requiresApprovalForExternalFacing: true,
      requiresApprovalForHighSensitivity: true
    },
    {
      environment: "production",
      requiresApprovalForIrreversible: true,
      requiresApprovalForExternalFacing: true,
      requiresApprovalForHighSensitivity: true,
      blockedTools: [
        "ads.live.create_campaign",
        "social.publish",
        "social.dm.send",
        "credentials.access",
        "policy.modify"
      ],
      notes: "Production live agency actions are out of scope for Phase 1."
    }
  ],
  approvalRules: [
    {
      id: "phase1_spend_requires_ceo",
      when: {
        tool: "ads.sandbox.create_campaign",
        actionType: "create_paid_content_test",
        environment: "staging"
      },
      requiresApproval: true,
      approverRole: "ceo",
      reason: "Every spend-like action requires exact CEO approval in Phase 1."
    }
  ],
  dataSensitivity: [
    {
      sensitivity: "low",
      receiptRequired: true
    },
    {
      sensitivity: "medium",
      requiresApproval: true,
      externalFacingAllowed: false,
      receiptRequired: true
    },
    {
      sensitivity: "high",
      requiresApproval: true,
      externalFacingAllowed: false,
      receiptRequired: true,
      notes: "High sensitivity workflows are out of scope for Phase 1 unless separately reviewed."
    }
  ],
  hardBoundaries: [
    {
      id: "never_live_spend_phase_1",
      label: "No live spend in Phase 1",
      when: { tool: "ads.live.create_campaign" },
      effect: "block",
      reason: "Live spend is not allowed in Phase 1.",
      source: "manual_policy"
    },
    {
      id: "never_public_post_phase_1",
      label: "No public posting in Phase 1",
      when: { tool: "social.publish", externalFacing: true },
      effect: "block",
      reason: "Public posting is not allowed in Phase 1.",
      source: "manual_policy"
    },
    {
      id: "never_external_dm_phase_1",
      label: "No external direct messages in Phase 1",
      when: { tool: "social.dm.send", externalFacing: true },
      effect: "block",
      reason: "External direct messages are not allowed in Phase 1.",
      source: "manual_policy"
    },
    {
      id: "never_credential_access_phase_1",
      label: "No credential access in Phase 1",
      when: { tool: "credentials.access" },
      effect: "block",
      reason: "Payment and social-platform credentials are not available in Phase 1.",
      source: "manual_policy"
    },
    {
      id: "never_policy_mutation_by_agents",
      label: "No operational-agent policy mutation",
      when: { tool: "policy.modify" },
      effect: "block",
      reason: "Operational agents and LLMs may not mutate governance policy.",
      source: "manual_policy"
    },
    {
      id: "never_agent_self_approval",
      label: "No agent self-approval",
      when: { tool: "approval.self", actionType: "approve_own_action" },
      effect: "block",
      reason: "Operational agents may request approval but may not approve their own proposals.",
      source: "manual_policy"
    },
    {
      id: "never_real_person_impersonation",
      label: "No unconsented real-person likeness or impersonation",
      when: { actionType: "impersonate_real_person" },
      effect: "block",
      reason: "Synthetic personas must be represented as synthetic/AI identities.",
      source: "manual_policy"
    },
    {
      id: "never_fabricated_human_claims",
      label: "No fabricated human credentials or experiences",
      when: { actionType: "fabricate_human_experience_claim" },
      effect: "block",
      reason: "AI personas may not claim fabricated human credentials, purchases, testimonials, personal results, or real-world experiences.",
      source: "manual_policy"
    },
    {
      id: "never_out_of_scope_sensitive_domains",
      label: "No Phase 1 sensitive-domain workflows",
      when: { dataSensitivity: "high", targetIncludes: "sensitive_personal_data" },
      effect: "block",
      reason: "Political persuasion, medical claims, personalized financial claims, adult/sensitive-content monetization, and sensitive-personal-data workflows are out of scope for Phase 1.",
      source: "manual_policy"
    }
  ],
  metadata: {
    status: "draft_for_ceo_review",
    humanReviewed: false,
    phase: "1",
    simulationOnly: true,
    maxSimulatedSpendPerAction: 25,
    maxSimulatedSpendCurrency: "USD",
    initialExperimentBudgetContext: 200,
    metadataBindingLimitation:
      "Only values represented as canonical bound execution constraints are protected as domain-specific execution-authoritative values by Runtime Binding. Ordinary metadata remains non-authoritative."
  }
};

export const phase1AgencyAuthorityMap: AuthorityMap = {
  id: "ai-media-agency.phase1.authority",
  name: "AI Media Agency Phase 1 Authority Map",
  version: "authority.map.ai-media-agency.phase1-draft",
  description: "DRAFT authority map. CEO is the only Phase 1 approval authority; operational agents may request approval but may not approve.",
  defaultApprovalTtlMinutes: 60,
  roles: [
    {
      id: "ceo",
      label: "CEO / Human Principal",
      description: "Only Phase 1 approval authority with emergency stop, refuse, revise, halt, and escalation authority over all agency operations.",
      scopes: [
        {
          id: "ceo_phase1_sandbox_spend",
          tool: "ads.sandbox.create_campaign",
          actionType: "create_paid_content_test",
          environment: "staging",
          externalFacing: false,
          reversible: true,
          maxDataSensitivity: "low",
          approvalKinds: ["simulated_spend_test"],
          notes: "Can approve exact single-use simulation-only spend tests up to USD 25."
        },
        {
          id: "ceo_phase1_emergency_stop",
          actionType: "emergency_stop",
          notes: "Can stop, refuse, revise, halt, or escalate any agency operation."
        },
        {
          id: "ceo_phase1_live_spend_review_owner",
          tool: "ads.live.create_campaign",
          environment: "production",
          externalFacing: true,
          approvalKinds: ["blocked_surface_review"],
          notes: "Review/refuse/escalate owner only; Phase 1 hard boundaries still block live spend."
        },
        {
          id: "ceo_phase1_public_post_review_owner",
          tool: "social.publish",
          externalFacing: true,
          approvalKinds: ["blocked_surface_review"],
          notes: "Review/refuse/escalate owner only; Phase 1 hard boundaries still block public posting."
        },
        {
          id: "ceo_phase1_external_dm_review_owner",
          tool: "social.dm.send",
          externalFacing: true,
          approvalKinds: ["blocked_surface_review"],
          notes: "Review/refuse/escalate owner only; Phase 1 hard boundaries still block external direct messages."
        },
        {
          id: "ceo_phase1_credential_access_review_owner",
          tool: "credentials.access",
          approvalKinds: ["blocked_surface_review"],
          notes: "Review/refuse/escalate owner only; Phase 1 hard boundaries still block payment and social-platform credential access."
        },
        {
          id: "ceo_phase1_policy_mutation_review_owner",
          tool: "policy.modify",
          approvalKinds: ["blocked_surface_review"],
          notes: "Review/refuse/escalate owner only; Phase 1 hard boundaries still block operational-agent policy mutation."
        },
        {
          id: "ceo_phase1_agent_self_approval_review_owner",
          tool: "approval.self",
          actionType: "approve_own_action",
          approvalKinds: ["blocked_surface_review"],
          notes: "Review/refuse/escalate owner only; operational agents may not approve their own proposals."
        },
        {
          id: "ceo_phase1_synthetic_identity_review_owner",
          actionType: "impersonate_real_person",
          approvalKinds: ["blocked_surface_review"],
          notes: "Review/refuse/escalate owner only; Phase 1 hard boundaries block unconsented real-person impersonation."
        },
        {
          id: "ceo_phase1_fabricated_claims_review_owner",
          actionType: "fabricate_human_experience_claim",
          approvalKinds: ["blocked_surface_review"],
          notes: "Review/refuse/escalate owner only; Phase 1 hard boundaries block fabricated human credentials and experience claims."
        },
        {
          id: "ceo_phase1_sensitive_data_review_owner",
          dataSensitivity: "high",
          targetIncludes: "sensitive_personal_data",
          approvalKinds: ["blocked_surface_review"],
          notes: "Review/refuse/escalate owner only; Phase 1 hard boundaries block sensitive personal data workflows."
        }
      ],
      canOverrideHardBoundaries: false,
      metadata: {
        phase: "1",
        onlyApprovalAuthority: true
      }
    }
  ],
  metadata: {
    status: "draft_for_ceo_review",
    humanReviewed: false,
    phase: "1",
    operationalAgentsMayApprove: false
  }
};

export const phase1HumanParticipationPolicy: HumanParticipationPolicy = {
  id: "ai-media-agency.phase1.human-participation",
  name: "AI Media Agency Phase 1 Human Participation Policy",
  version: "human.participation.ai-media-agency.phase1-draft",
  minReasonLengthForHighRisk: 40,
  minReviewSecondsForHighRisk: 30,
  minReviewSecondsDefault: 5,
  requireReasonForHighRisk: true,
  requireContextForHighRisk: true,
  requireAlternativesForHighRisk: true,
  requireObjectionsForHighRisk: true,
  metadata: {
    status: "draft_for_ceo_review",
    humanReviewed: false,
    phase: "1",
    requiredContext:
      "objective, agent, property, campaign, content, platform, audience/target, exact budget, experiment window, expected outcome, risks, objections, alternatives, rollback, and data sensitivity"
  }
};
