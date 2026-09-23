import type {
  ConformanceAuthorityClass,
  ConformanceModuleVerdict,
  ConformanceRequirementClass,
} from "./runtimeGovernanceConformanceFixtures";

export type GovernanceModulePlacement =
  | "governance-substrate"
  | "pre-authorization-evaluation"
  | "pgdl-input"
  | "domain-policy-evaluation"
  | "receipt-evidence";

export type GovernanceModuleFailureBehavior = "fail-closed" | "degraded-visible" | "evidence-gap-visible";
export type GovernanceModuleOverrideability = "overrideable" | "non-overridable" | "not-applicable";

export interface GovernanceModuleConfigurationReference {
  referenceId: string;
  description: string;
  static: true;
}

export interface GovernanceModuleManifest {
  moduleId: string;
  moduleName: string;
  version: string;
  provider: string;
  purpose: string;
  governedDomains: string[];
  applicableActionTypes: string[];
  requiredInputs: string[];
  placement: GovernanceModulePlacement;
  supportedVerdicts: ConformanceModuleVerdict[];
  requirementClass: ConformanceRequirementClass;
  authorityClass: ConformanceAuthorityClass;
  failureBehavior: GovernanceModuleFailureBehavior;
  degradedModeAllowed: boolean;
  overrideability: GovernanceModuleOverrideability;
  receiptContributions: string[];
  configurationReference: GovernanceModuleConfigurationReference;
}

export interface FixedInternalGovernanceRole {
  roleId: string;
  roleName: string;
  reasonNotManifested: string;
}

// Static conformance-reference artifacts only. These manifests describe evaluator
// capabilities and boundaries; they do not register plugins dynamically, connect
// external systems, execute actions, load adapters, or issue permits.
export const governanceModuleManifests: GovernanceModuleManifest[] = [
  {
    moduleId: "identity-verification",
    moduleName: "Identity verification",
    version: "0.1.0-static",
    provider: "AGS static conformance reference",
    purpose: "Confirm the actor and delegated authority context before authorization.",
    governedDomains: ["documentation", "finance", "software-deployment", "internal-operations"],
    applicableActionTypes: [
      "create-internal-draft",
      "summarize-sensitive-financial-data",
      "update-internal-metadata",
      "send-email-draft",
      "perform-consequential-action",
    ],
    requiredInputs: ["actor", "delegated authority reference", "action envelope version", "target"],
    placement: "governance-substrate",
    supportedVerdicts: ["pass", "require-human-review", "block", "unavailable", "pending"],
    requirementClass: "mandatory",
    authorityClass: "binding",
    failureBehavior: "fail-closed",
    degradedModeAllowed: false,
    overrideability: "non-overridable",
    receiptContributions: ["actor identity evidence", "delegated authority reference", "module availability state"],
    configurationReference: {
      referenceId: "local-static-config:identity-verification",
      description: "Static conformance reference for identity checks used by minimal fixtures.",
      static: true,
    },
  },
  {
    moduleId: "policy-boundary",
    moduleName: "Policy boundary",
    version: "0.1.0-static",
    provider: "AGS static conformance reference",
    purpose: "Evaluate whether the requested action stays inside the configured policy boundary.",
    governedDomains: ["documentation", "finance", "internal-operations"],
    applicableActionTypes: ["create-internal-draft", "update-internal-metadata"],
    requiredInputs: ["action type", "target", "scope", "sensitivity", "requested tool"],
    placement: "domain-policy-evaluation",
    supportedVerdicts: ["pass", "recommend-revision", "require-human-review", "block", "unavailable", "pending"],
    requirementClass: "mandatory",
    authorityClass: "binding",
    failureBehavior: "fail-closed",
    degradedModeAllowed: false,
    overrideability: "non-overridable",
    receiptContributions: ["policy boundary verdict", "evaluated scope", "policy configuration reference"],
    configurationReference: {
      referenceId: "local-static-config:policy-boundary",
      description: "Static conformance reference for local policy-boundary checks.",
      static: true,
    },
  },
  {
    moduleId: "destination-authority",
    moduleName: "Destination authority",
    version: "0.1.0-static",
    provider: "AGS static conformance reference",
    purpose: "Confirm target-bound authority before sensitive data is written to a destination.",
    governedDomains: ["finance", "internal-operations"],
    applicableActionTypes: ["summarize-sensitive-financial-data"],
    requiredInputs: ["actor", "target", "sensitivity", "approval evidence", "action envelope version"],
    placement: "pre-authorization-evaluation",
    supportedVerdicts: ["pass", "require-human-review", "block", "unavailable", "pending"],
    requirementClass: "mandatory",
    authorityClass: "binding",
    failureBehavior: "fail-closed",
    degradedModeAllowed: false,
    overrideability: "not-applicable",
    receiptContributions: ["destination authority verdict", "approval evidence state", "target-bound review requirement"],
    configurationReference: {
      referenceId: "local-static-config:destination-authority",
      description: "Static conformance reference for target-bound destination authority checks.",
      static: true,
    },
  },
  {
    moduleId: "ci-test-evidence",
    moduleName: "CI test evidence",
    version: "0.1.0-static",
    provider: "AGS static conformance reference",
    purpose: "Contribute build and test evidence for software deployment authorization.",
    governedDomains: ["software-deployment"],
    applicableActionTypes: ["deploy-software"],
    requiredInputs: ["build artifact", "commit reference", "test result reference", "action envelope version"],
    placement: "receipt-evidence",
    supportedVerdicts: ["pass", "block", "unavailable", "pending"],
    requirementClass: "mandatory",
    authorityClass: "binding",
    failureBehavior: "fail-closed",
    degradedModeAllowed: false,
    overrideability: "not-applicable",
    receiptContributions: ["build artifact reference", "CI test result", "test evidence freshness state"],
    configurationReference: {
      referenceId: "local-static-config:ci-test-evidence",
      description: "Static conformance reference for CI test evidence used by deployment fixtures.",
      static: true,
    },
  },
  {
    moduleId: "secret-scanner",
    moduleName: "Secret scanner",
    version: "0.1.0-static",
    provider: "AGS static conformance reference",
    purpose: "Detect credential exposure before software deployment authorization.",
    governedDomains: ["software-deployment"],
    applicableActionTypes: ["deploy-software"],
    requiredInputs: ["build artifact", "commit reference", "scan result reference", "action envelope version"],
    placement: "pre-authorization-evaluation",
    supportedVerdicts: ["pass", "block", "unavailable", "pending"],
    requirementClass: "mandatory",
    authorityClass: "binding",
    failureBehavior: "fail-closed",
    degradedModeAllowed: false,
    overrideability: "non-overridable",
    receiptContributions: ["secret scan verdict", "finding reference", "artifact reference", "remediation requirement"],
    configurationReference: {
      referenceId: "local-static-config:secret-scanner",
      description: "Static conformance reference for mandatory secret scanning.",
      static: true,
    },
  },
  {
    moduleId: "recipient-classification",
    moduleName: "Recipient classification",
    version: "0.1.0-static",
    provider: "AGS static conformance reference",
    purpose: "Classify message recipients so material external-scope changes require fresh evaluation.",
    governedDomains: ["documentation", "communications"],
    applicableActionTypes: ["send-email-draft"],
    requiredInputs: ["recipient list", "target", "scope", "action envelope version", "prior envelope version"],
    placement: "domain-policy-evaluation",
    supportedVerdicts: ["pass", "require-human-review", "block", "unavailable", "pending"],
    requirementClass: "mandatory",
    authorityClass: "binding",
    failureBehavior: "fail-closed",
    degradedModeAllowed: false,
    overrideability: "not-applicable",
    receiptContributions: ["recipient classification verdict", "recipient change evidence", "freshness state"],
    configurationReference: {
      referenceId: "local-static-config:recipient-classification",
      description: "Static conformance reference for recipient-classification checks.",
      static: true,
    },
  },
  {
    moduleId: "domain-wording-review",
    moduleName: "Domain wording review",
    version: "0.1.0-static",
    provider: "AGS static conformance reference",
    purpose: "Contribute advisory review of wording that may create external commitments.",
    governedDomains: ["documentation", "communications"],
    applicableActionTypes: ["create-internal-draft", "send-email-draft"],
    requiredInputs: ["draft text", "intended audience", "publication scope", "action envelope version"],
    placement: "pgdl-input",
    supportedVerdicts: ["pass", "recommend-revision", "require-human-review", "unavailable", "pending"],
    requirementClass: "optional",
    authorityClass: "advisory",
    failureBehavior: "degraded-visible",
    degradedModeAllowed: true,
    overrideability: "not-applicable",
    receiptContributions: ["wording review verdict", "advisory recommendation", "degraded-mode visibility when unavailable"],
    configurationReference: {
      referenceId: "local-static-config:domain-wording-review",
      description: "Static conformance reference for optional advisory wording review represented in sample governed actions.",
      static: true,
    },
  },
];

export const fixedInternalGovernanceRoles: FixedInternalGovernanceRole[] = [
  {
    roleId: "pgdl",
    roleName: "PGDL proposal scrutiny",
    reasonNotManifested: "PGDL is a fixed proposal-maturation stage that may consume evaluator input; it is not registered as a replaceable evaluator module here.",
  },
  {
    roleId: "aag",
    roleName: "AAG authorization gate",
    reasonNotManifested: "AAG is the fixed final authorization stage before permit eligibility; individual module manifests do not replace it.",
  },
  {
    roleId: "runtime-binding",
    roleName: "Runtime Binding",
    reasonNotManifested: "Runtime Binding is the fixed enforcement role that validates an attempted action against a permit; this pass does not model it as an external module.",
  },
  {
    roleId: "receipt-continuity",
    roleName: "Receipt continuity",
    reasonNotManifested: "Receipt continuity is a cross-cutting evidence prerequisite rather than a replaceable evaluator module.",
  },
];
