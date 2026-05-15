import { describe, expect, it } from "vitest";
import type { AuthorityMap } from "@alignment-governance-stack/authority-map";
import type { HumanParticipationPolicy } from "@alignment-governance-stack/human-participation";
import type { PolicyProfile } from "@alignment-governance-stack/policy-profiles";
import {
  detectAlignmentGaps,
  summarizeAlignmentGapReport,
  type AlignmentGapType,
  type CompanyAlignmentInput
} from "../index.js";

describe("alignment gap detector", () => {
  it("returns zero high or critical gaps for a coherent company profile", () => {
    const report = detectAlignmentGaps(
      {
        companyAlignmentInput: coherentInput(),
        authorityMap: coherentAuthorityMap(),
        participationPolicy: meaningfulParticipationPolicy(),
        policyProfile: coherentPolicyProfile()
      },
      { now: "2026-05-14T12:00:00.000Z" }
    );

    expect(report.gaps.filter((gap) => gap.severity === "high" || gap.severity === "critical")).toHaveLength(0);
  });

  it("detects external sharing conflict for financial data", () => {
    const report = detectAlignmentGaps({
      companyAlignmentInput: {
        ...coherentInput(),
        tools: [
          {
            tool: "email.send",
            allowed: true,
            externalFacing: true,
            maxDataSensitivity: "high"
          }
        ],
        dataClasses: [
          {
            id: "financial_report",
            label: "Financial report",
            sensitivity: "high",
            externalSharingAllowed: false
          }
        ]
      },
      authorityMap: coherentAuthorityMap(),
      participationPolicy: meaningfulParticipationPolicy()
    });

    expect(gapTypes(report)).toContain("external_sharing_conflict");
  });

  it("detects required approval with no matching authority role", () => {
    const report = detectAlignmentGaps({
      companyAlignmentInput: {
        ...coherentInput(),
        roles: [],
        tools: [{ tool: "npm.publish", allowed: true, requiresApproval: true }]
      },
      authorityMap: emptyAuthorityMap(),
      participationPolicy: meaningfulParticipationPolicy()
    });

    expect(gapTypes(report)).toContain("missing_authority_for_required_approval");
  });

  it("detects hard boundary override claims as critical", () => {
    const report = detectAlignmentGaps({
      companyAlignmentInput: coherentInput(),
      authorityMap: {
        ...coherentAuthorityMap(),
        roles: [
          ...coherentAuthorityMap().roles,
          {
            id: "root_admin",
            label: "Root Admin",
            scopes: [{ id: "everything", tool: "file.edit" }],
            canOverrideHardBoundaries: true as false
          }
        ]
      }
    });

    const gap = report.gaps.find((entry) => entry.type === "hard_boundary_override_claim");

    expect(gap?.severity).toBe("critical");
  });

  it("detects high sensitivity data without authority", () => {
    const report = detectAlignmentGaps({
      companyAlignmentInput: {
        ...coherentInput(),
        roles: [],
        dataClasses: [{ id: "financial_report", label: "Financial report", sensitivity: "high" }],
        tools: [{ tool: "report.generate", allowed: true, maxDataSensitivity: "high" }]
      },
      authorityMap: emptyAuthorityMap()
    });

    expect(gapTypes(report)).toContain("high_sensitivity_without_authority");
  });

  it("detects production irreversible tools without authority", () => {
    const report = detectAlignmentGaps({
      companyAlignmentInput: {
        ...coherentInput(),
        roles: [],
        environments: [{ id: "production", label: "Production", productionLike: true }],
        tools: [{ tool: "database.delete", allowed: true, destructive: true }]
      },
      authorityMap: emptyAuthorityMap()
    });

    expect(gapTypes(report)).toContain("production_irreversible_without_authority");
  });

  it("detects review requirements without participation policy", () => {
    const report = detectAlignmentGaps({
      companyAlignmentInput: {
        ...coherentInput(),
        tools: [{ tool: "npm.publish", allowed: true, requiresApproval: true }]
      },
      authorityMap: coherentAuthorityMap()
    });

    expect(gapTypes(report)).toContain("review_required_without_participation_policy");
  });

  it("detects missing stop authority", () => {
    const report = detectAlignmentGaps({
      companyAlignmentInput: {
        ...coherentInput(),
        roles: [{ id: "business_owner", label: "Business Owner" }],
        environments: [{ id: "production", label: "Production", productionLike: true }]
      },
      authorityMap: {
        id: "business-only",
        name: "Business Only",
        version: "authority.map.test",
        roles: [
          {
            id: "business_owner",
            label: "Business Owner",
            scopes: [{ id: "docs", tool: "file.edit" }]
          }
        ]
      }
    });

    expect(gapTypes(report)).toContain("missing_stop_authority");
  });

  it("detects ambiguous never-automate boundaries", () => {
    const report = detectAlignmentGaps({
      companyAlignmentInput: {
        ...coherentInput(),
        decisionBoundaries: [
          {
            id: "never-risky-things",
            label: "Never risky things",
            requiresHumanApproval: true,
            neverAutomate: true
          }
        ]
      }
    });

    expect(gapTypes(report)).toContain("ambiguous_never_automate_boundary");
  });

  it("detects permissive defaults with strict values", () => {
    const report = detectAlignmentGaps({
      companyAlignmentInput: {
        ...coherentInput(),
        defaultMode: "permissive",
        values: [
          {
            id: "audit",
            label: "Auditability before trust",
            governanceImplication: "Require human approval and never automate high sensitivity actions."
          }
        ]
      },
      authorityMap: coherentAuthorityMap(),
      participationPolicy: meaningfulParticipationPolicy()
    });

    expect(gapTypes(report)).toContain("permissive_default_with_strict_values");
  });

  it("detects policy approval rules that reference missing roles", () => {
    const report = detectAlignmentGaps({
      companyAlignmentInput: coherentInput(),
      authorityMap: emptyAuthorityMap(),
      policyProfile: {
        ...coherentPolicyProfile(),
        approvalRules: [
          {
            id: "release-approval",
            when: { tool: "npm.publish" },
            requiresApproval: true,
            approverRole: "release_admin",
            reason: "Release requires approval."
          }
        ]
      }
    });

    expect(gapTypes(report)).toContain("approval_rule_without_role");
  });

  it("detects broad high-authority scopes", () => {
    const report = detectAlignmentGaps({
      companyAlignmentInput: coherentInput(),
      authorityMap: {
        id: "broad",
        name: "Broad",
        version: "authority.map.test",
        roles: [{ id: "security_admin", label: "Security Admin", scopes: [{ id: "all" }] }]
      }
    });

    expect(gapTypes(report)).toContain("role_scope_too_broad");
  });

  it("detects policy that fails to enforce a company boundary", () => {
    const report = detectAlignmentGaps({
      companyAlignmentInput: {
        ...coherentInput(),
        decisionBoundaries: [
          {
            id: "never-delete-receipts",
            label: "Never delete receipts",
            tool: "file.delete",
            targetIncludes: "receipts/history",
            requiresHumanApproval: true,
            neverAutomate: true
          }
        ]
      },
      policyProfile: {
        ...coherentPolicyProfile(),
        tools: [{ tool: "file.delete", allowed: true }]
      },
      authorityMap: coherentAuthorityMap(),
      participationPolicy: meaningfulParticipationPolicy()
    });

    expect(gapTypes(report)).toContain("policy_allows_what_company_boundary_forbids");
  });

  it("summary includes no policy mutation and human review required", () => {
    const report = detectAlignmentGaps({
      companyAlignmentInput: coherentInput(),
      authorityMap: coherentAuthorityMap(),
      participationPolicy: meaningfulParticipationPolicy()
    });
    const summary = summarizeAlignmentGapReport(report);

    expect(summary).toContain("human review required: true");
    expect(summary).toContain("No policy profiles, authority maps, or participation policies were mutated.");
  });

  it("marks every gap as human-review required", () => {
    const report = detectAlignmentGaps({
      companyAlignmentInput: {
        ...coherentInput(),
        defaultMode: "permissive",
        values: [
          {
            id: "authority",
            label: "Authority",
            governanceImplication: "Human approval and hard boundary discipline."
          }
        ]
      },
      authorityMap: emptyAuthorityMap()
    });

    expect(report.gaps.length).toBeGreaterThan(0);
    expect(report.gaps.every((gap) => gap.humanReviewRequired)).toBe(true);
  });
});

function gapTypes(report: { gaps: Array<{ type: AlignmentGapType }> }): AlignmentGapType[] {
  return report.gaps.map((gap) => gap.type);
}

function coherentInput(): CompanyAlignmentInput {
  return {
    id: "coherent-company",
    name: "Coherent Company",
    values: [
      {
        id: "proof",
        label: "Proof before trust",
        governanceImplication: "Use audit trails for sensitive production actions."
      }
    ],
    roles: [
      { id: "release_admin", label: "Release Admin", canApprove: ["production", "irreversible"] },
      { id: "security_admin", label: "Security Admin", canApprove: ["high_sensitivity"] }
    ],
    tools: [
      {
        tool: "file.edit",
        allowed: true,
        requiresApproval: false,
        externalFacing: false,
        maxDataSensitivity: "low"
      }
    ],
    dataClasses: [
      {
        id: "public_docs",
        label: "Public docs",
        sensitivity: "low",
        externalSharingAllowed: true
      }
    ],
    environments: [
      {
        id: "staging",
        label: "Staging",
        productionLike: false
      }
    ],
    decisionBoundaries: [],
    defaultMode: "balanced"
  };
}

function coherentAuthorityMap(): AuthorityMap {
  return {
    id: "coherent-authority",
    name: "Coherent Authority",
    version: "authority.map.test",
    roles: [
      {
        id: "release_admin",
        label: "Release Admin",
        scopes: [
          { id: "production", environment: "production" },
          { id: "irreversible", reversible: false }
        ]
      },
      {
        id: "security_admin",
        label: "Security Admin",
        scopes: [{ id: "high_sensitivity", maxDataSensitivity: "high" }]
      }
    ]
  };
}

function emptyAuthorityMap(): AuthorityMap {
  return {
    id: "empty-authority",
    name: "Empty Authority",
    version: "authority.map.test",
    roles: []
  };
}

function meaningfulParticipationPolicy(): HumanParticipationPolicy {
  return {
    id: "meaningful-review",
    name: "Meaningful Review",
    version: "human.participation.test",
    requireReasonForHighRisk: true,
    requireContextForHighRisk: true,
    requireAlternativesForHighRisk: true,
    requireObjectionsForHighRisk: true
  };
}

function coherentPolicyProfile(): PolicyProfile {
  return {
    id: "coherent-policy",
    name: "Coherent Policy",
    version: "policy.profile.test",
    defaultMode: "balanced",
    tools: [{ tool: "file.edit", allowed: true, maxDataSensitivity: "low" }],
    receiptRequired: true
  };
}
