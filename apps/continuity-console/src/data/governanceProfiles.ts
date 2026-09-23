import type {
  ConformanceAuthorityClass,
  ConformanceRequirementClass,
} from "./runtimeGovernanceConformanceFixtures";
import type {
  GovernanceModuleFailureBehavior,
  GovernanceModuleOverrideability,
} from "./governanceModuleManifests";

export type GovernanceProfileConsequenceClass = "low" | "moderate" | "consequential";
export type GovernanceProfileSensitivity = "low" | "medium" | "high";
export type GovernanceProfileFixedRoleId = "pgdl" | "aag" | "runtime-binding" | "receipt-continuity";

export interface GovernanceProfileApplicability {
  governedDomain: string;
  workflowContext: string;
  applicableActionTypes: string[];
  sensitivityRange: GovernanceProfileSensitivity[];
  consequenceClass: GovernanceProfileConsequenceClass;
}

export interface GovernanceProfileModuleBinding {
  moduleId: string;
  inclusionClass: ConformanceRequirementClass;
  configuredAuthorityClass: ConformanceAuthorityClass;
  configuredFailureBehavior: GovernanceModuleFailureBehavior;
  degradedModeAllowed: boolean;
  configuredOverrideability: GovernanceModuleOverrideability;
  rationale: string;
  operatorFacingExplanation: string;
}

export interface GovernanceProfileFixedRoleExpectation {
  roleId: GovernanceProfileFixedRoleId;
  expected: true;
  explanation: string;
}

export interface GovernanceProfile {
  profileId: string;
  profileName: string;
  version: string;
  purpose: string;
  integrityReference: string;
  applicability: GovernanceProfileApplicability;
  moduleBindings: GovernanceProfileModuleBinding[];
  fixedInternalRoles: GovernanceProfileFixedRoleExpectation[];
  receiptContinuityRequired: boolean;
  staticReferenceOnly: true;
}

export interface FixtureGovernanceProfileAssignment {
  fixtureId: string;
  profileIds: string[];
  rationale: string;
}

const fixedInternalRoleExpectations: GovernanceProfileFixedRoleExpectation[] = [
  {
    roleId: "pgdl",
    expected: true,
    explanation: "PGDL remains the fixed proposal-scrutiny stage and may consume selected evaluator outputs.",
  },
  {
    roleId: "aag",
    expected: true,
    explanation: "AAG remains the fixed final authorization stage before permit eligibility.",
  },
  {
    roleId: "runtime-binding",
    expected: true,
    explanation: "Runtime Binding remains the fixed permit-enforcement role and is not selected as an external module.",
  },
  {
    roleId: "receipt-continuity",
    expected: true,
    explanation: "Receipt continuity remains a cross-cutting evidence prerequisite, not a replaceable evaluator module.",
  },
];

// Static conformance-reference artifacts only. Manifests describe what evaluator
// modules can do; profiles select modules for workflow contexts within manifest
// limits. Fixed AGS roles remain separate. Profiles do not dynamically load
// modules, issue permits, execute actions, or implement runtime selection.
export const governanceProfiles: GovernanceProfile[] = [
  {
    profileId: "internal-documentation-draft",
    profileName: "Internal documentation draft",
    version: "0.1.0-static",
    purpose: "Support approved internal documentation draft writes with minimal required governance.",
    integrityReference: "profile-hash-internal-documentation-draft-v1",
    applicability: {
      governedDomain: "documentation",
      workflowContext: "approved internal draft write",
      applicableActionTypes: ["create-internal-draft", "update-internal-metadata", "write-draft"],
      sensitivityRange: ["low", "medium"],
      consequenceClass: "low",
    },
    moduleBindings: [
      {
        moduleId: "identity-verification",
        inclusionClass: "mandatory",
        configuredAuthorityClass: "binding",
        configuredFailureBehavior: "fail-closed",
        degradedModeAllowed: false,
        configuredOverrideability: "non-overridable",
        rationale: "The actor must be known before even low-risk internal draft work can be permit-eligible.",
        operatorFacingExplanation: "Confirm the internal documentation actor before allowing the draft path to continue.",
      },
      {
        moduleId: "policy-boundary",
        inclusionClass: "mandatory",
        configuredAuthorityClass: "binding",
        configuredFailureBehavior: "fail-closed",
        degradedModeAllowed: false,
        configuredOverrideability: "non-overridable",
        rationale: "The draft must remain inside an approved internal target and scope.",
        operatorFacingExplanation: "Verify that the draft stays in the approved internal workspace.",
      },
    ],
    fixedInternalRoles: fixedInternalRoleExpectations,
    receiptContinuityRequired: true,
    staticReferenceOnly: true,
  },
  {
    profileId: "sensitive-finance-workspace",
    profileName: "Sensitive finance workspace",
    version: "0.1.0-static",
    purpose: "Govern placement of sensitive financial summaries into internal workspaces.",
    integrityReference: "profile-hash-sensitive-finance-workspace-v1",
    applicability: {
      governedDomain: "finance",
      workflowContext: "sensitive internal planning workspace write",
      applicableActionTypes: ["summarize-sensitive-financial-data"],
      sensitivityRange: ["high"],
      consequenceClass: "consequential",
    },
    moduleBindings: [
      {
        moduleId: "identity-verification",
        inclusionClass: "mandatory",
        configuredAuthorityClass: "binding",
        configuredFailureBehavior: "fail-closed",
        degradedModeAllowed: false,
        configuredOverrideability: "non-overridable",
        rationale: "Sensitive finance actions require a known actor and delegated authority context.",
        operatorFacingExplanation: "Confirm the finance actor and accountable authority before evaluation continues.",
      },
      {
        moduleId: "policy-boundary",
        inclusionClass: "mandatory",
        configuredAuthorityClass: "binding",
        configuredFailureBehavior: "fail-closed",
        degradedModeAllowed: false,
        configuredOverrideability: "non-overridable",
        rationale: "Sensitive financial summaries must remain inside the configured internal policy boundary.",
        operatorFacingExplanation: "Verify that the finance summary does not leave the authorized internal workspace.",
      },
      {
        moduleId: "destination-authority",
        inclusionClass: "mandatory",
        configuredAuthorityClass: "binding",
        configuredFailureBehavior: "fail-closed",
        degradedModeAllowed: false,
        configuredOverrideability: "not-applicable",
        rationale: "Target-bound destination approval is required for sensitive financial data.",
        operatorFacingExplanation: "Confirm destination authority before any sensitive finance summary can proceed.",
      },
    ],
    fixedInternalRoles: fixedInternalRoleExpectations,
    receiptContinuityRequired: true,
    staticReferenceOnly: true,
  },
  {
    profileId: "software-deployment",
    profileName: "Software deployment",
    version: "0.1.0-static",
    purpose: "Govern software deployment actions.",
    integrityReference: "profile-hash-software-deployment-v1",
    applicability: {
      governedDomain: "software-deployment",
      workflowContext: "build artifact deployment",
      applicableActionTypes: ["deploy-software"],
      sensitivityRange: ["high"],
      consequenceClass: "consequential",
    },
    moduleBindings: [
      {
        moduleId: "identity-verification",
        inclusionClass: "mandatory",
        configuredAuthorityClass: "binding",
        configuredFailureBehavior: "fail-closed",
        degradedModeAllowed: false,
        configuredOverrideability: "non-overridable",
        rationale: "Deployment actions require a known deployment actor before artifact checks matter.",
        operatorFacingExplanation: "Confirm the deployment actor before evaluating artifact evidence.",
      },
      {
        moduleId: "ci-test-evidence",
        inclusionClass: "mandatory",
        configuredAuthorityClass: "binding",
        configuredFailureBehavior: "fail-closed",
        degradedModeAllowed: false,
        configuredOverrideability: "not-applicable",
        rationale: "Deployment eligibility depends on current test evidence for the referenced artifact.",
        operatorFacingExplanation: "Verify current CI test evidence for the deployment artifact.",
      },
      {
        moduleId: "secret-scanner",
        inclusionClass: "mandatory",
        configuredAuthorityClass: "binding",
        configuredFailureBehavior: "fail-closed",
        degradedModeAllowed: false,
        configuredOverrideability: "non-overridable",
        rationale: "Credential exposure blocks deployment and must not be bypassed by profile configuration.",
        operatorFacingExplanation: "Block deployment when mandatory secret scanning reports exposed credentials.",
      },
    ],
    fixedInternalRoles: fixedInternalRoleExpectations,
    receiptContinuityRequired: true,
    staticReferenceOnly: true,
  },
  {
    profileId: "external-recipient-publishing",
    profileName: "External-recipient publishing",
    version: "0.1.0-static",
    purpose: "Govern external-recipient email or publishing actions.",
    integrityReference: "profile-hash-external-recipient-publishing-v1",
    applicability: {
      governedDomain: "communications",
      workflowContext: "internal-to-external publication boundary",
      applicableActionTypes: ["send-email-draft", "write-draft"],
      sensitivityRange: ["medium", "high"],
      consequenceClass: "moderate",
    },
    moduleBindings: [
      {
        moduleId: "identity-verification",
        inclusionClass: "mandatory",
        configuredAuthorityClass: "binding",
        configuredFailureBehavior: "fail-closed",
        degradedModeAllowed: false,
        configuredOverrideability: "non-overridable",
        rationale: "External publishing requires a known actor and delegated authority context.",
        operatorFacingExplanation: "Confirm who is accountable before crossing the external-recipient boundary.",
      },
      {
        moduleId: "policy-boundary",
        inclusionClass: "mandatory",
        configuredAuthorityClass: "binding",
        configuredFailureBehavior: "fail-closed",
        degradedModeAllowed: false,
        configuredOverrideability: "non-overridable",
        rationale: "External publication must stay inside configured release or communication boundaries.",
        operatorFacingExplanation: "Check whether the proposed publish path crosses an unauthorized public boundary.",
      },
      {
        moduleId: "recipient-classification",
        inclusionClass: "mandatory",
        configuredAuthorityClass: "binding",
        configuredFailureBehavior: "fail-closed",
        degradedModeAllowed: false,
        configuredOverrideability: "not-applicable",
        rationale: "External recipients materially change the action envelope and require fresh classification.",
        operatorFacingExplanation: "Classify recipients before relying on prior internal-email evaluations.",
      },
      {
        moduleId: "domain-wording-review",
        inclusionClass: "optional",
        configuredAuthorityClass: "advisory",
        configuredFailureBehavior: "degraded-visible",
        degradedModeAllowed: true,
        configuredOverrideability: "not-applicable",
        rationale: "Wording review contributes advisory scrutiny for possible external commitments.",
        operatorFacingExplanation: "Surface advisory wording review when public-facing language may create commitments.",
      },
    ],
    fixedInternalRoles: fixedInternalRoleExpectations,
    receiptContinuityRequired: true,
    staticReferenceOnly: true,
  },
  {
    profileId: "consequential-action-baseline",
    profileName: "Consequential action baseline",
    version: "0.1.0-static",
    purpose: "Represent the shared receipt-continuity prerequisite for consequential actions.",
    integrityReference: "profile-hash-consequential-action-baseline-v1",
    applicability: {
      governedDomain: "cross-domain",
      workflowContext: "consequential action permit prerequisite",
      applicableActionTypes: ["perform-consequential-action"],
      sensitivityRange: ["high"],
      consequenceClass: "consequential",
    },
    moduleBindings: [
      {
        moduleId: "identity-verification",
        inclusionClass: "mandatory",
        configuredAuthorityClass: "binding",
        configuredFailureBehavior: "fail-closed",
        degradedModeAllowed: false,
        configuredOverrideability: "non-overridable",
        rationale: "Consequential actions still require a known actor even when the tested failure is receipt reservation.",
        operatorFacingExplanation: "Confirm the accountable actor before evaluating consequential action prerequisites.",
      },
      {
        moduleId: "policy-boundary",
        inclusionClass: "mandatory",
        configuredAuthorityClass: "binding",
        configuredFailureBehavior: "fail-closed",
        degradedModeAllowed: false,
        configuredOverrideability: "non-overridable",
        rationale: "Consequential actions must remain inside a configured policy boundary before receipt readiness is considered.",
        operatorFacingExplanation: "Verify the consequential action is inside the configured policy boundary.",
      },
    ],
    fixedInternalRoles: fixedInternalRoleExpectations,
    receiptContinuityRequired: true,
    staticReferenceOnly: true,
  },
];

export const fixtureGovernanceProfileAssignments: FixtureGovernanceProfileAssignment[] = [
  {
    fixtureId: "rgcf-001-valid-low-risk-internal-draft",
    profileIds: ["internal-documentation-draft"],
    rationale: "The fixture exercises the positive internal documentation draft path.",
  },
  {
    fixtureId: "rgcf-003-binding-human-review-requirement",
    profileIds: ["sensitive-finance-workspace"],
    rationale: "The fixture exercises sensitive finance destination authority review.",
  },
  {
    fixtureId: "rgcf-004-binding-block",
    profileIds: ["software-deployment"],
    rationale: "The fixture exercises deployment artifact evidence and mandatory secret scanning.",
  },
  {
    fixtureId: "rgcf-006-mandatory-module-outage",
    profileIds: ["internal-documentation-draft"],
    rationale: "The fixture uses an internal low-risk action context where mandatory identity remains relevant.",
  },
  {
    fixtureId: "rgcf-008-material-revision-invalidates-evaluations",
    profileIds: ["external-recipient-publishing"],
    rationale: "The fixture exercises an internal-to-external recipient change requiring fresh classification.",
  },
  {
    fixtureId: "rgcf-011-receipt-reservation-failure",
    profileIds: ["consequential-action-baseline"],
    rationale: "The fixture exercises consequential receipt-continuity failure as a permit prerequisite.",
  },
  {
    fixtureId: "rgcf-014-runtime-mismatch",
    profileIds: ["internal-documentation-draft"],
    rationale: "The fixture starts from an internal draft permit path; Runtime Binding remains a fixed internal role.",
  },
];
