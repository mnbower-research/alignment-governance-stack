import { describe, expect, it } from "vitest";
import {
  minimalConformanceFixtures,
  type RuntimeGovernanceConformanceFixture,
} from "./runtimeGovernanceConformanceFixtures";
import {
  fixedInternalGovernanceRoles,
  governanceModuleManifests,
  type GovernanceModuleManifest,
} from "./governanceModuleManifests";
import {
  fixtureGovernanceProfileAssignments,
  governanceProfiles,
  type GovernanceProfile,
} from "./governanceProfiles";
import {
  resolvePermitEligibility,
  type PermitEligibilityInput,
} from "./runtimeGovernanceResolution";

const expectedFixedRoleIds = ["pgdl", "aag", "runtime-binding", "receipt-continuity"];
const forbiddenProfileRuntimeKeys = [
  "adapter",
  "adapterId",
  "apiKey",
  "baseProfileIds",
  "composedFrom",
  "composition",
  "endpoint",
  "execute",
  "extendsProfileIds",
  "loader",
  "register",
  "registry",
  "runtimeRegistry",
  "url",
];

function manifestById(moduleId: string): GovernanceModuleManifest | undefined {
  return governanceModuleManifests.find((manifest) => manifest.moduleId === moduleId);
}

function profileById(profileId: string): GovernanceProfile | undefined {
  return governanceProfiles.find((profile) => profile.profileId === profileId);
}

function fixture(id: string): RuntimeGovernanceConformanceFixture {
  const found = minimalConformanceFixtures.find((candidate) => candidate.fixtureId === id);
  expect(found).toBeTruthy();
  return found as RuntimeGovernanceConformanceFixture;
}

function permitInputFromFixture(fixtureRecord: RuntimeGovernanceConformanceFixture): PermitEligibilityInput {
  return {
    consequence: fixtureRecord.consequence,
    envelopeFreshnessState: fixtureRecord.freshnessState,
    receiptPrerequisite: fixtureRecord.receiptPrerequisite,
    moduleEvaluations: fixtureRecord.moduleEvaluations,
    humanReview: fixtureRecord.humanReview,
  };
}

describe("governance profiles", () => {
  it("defines unique static governance-profile IDs", () => {
    const profileIds = governanceProfiles.map((profile) => profile.profileId);

    expect(profileIds).toEqual([
      "internal-documentation-draft",
      "sensitive-finance-workspace",
      "software-deployment",
      "external-recipient-publishing",
      "consequential-action-baseline",
    ]);
    expect(new Set(profileIds).size).toBe(profileIds.length);
  });

  it("includes identity, applicability, integrity, and receipt-continuity metadata", () => {
    for (const profile of governanceProfiles) {
      expect(profile.profileId.trim().length).toBeGreaterThan(0);
      expect(profile.profileName.trim().length).toBeGreaterThan(0);
      expect(profile.version.trim().length).toBeGreaterThan(0);
      expect(profile.purpose.trim().length).toBeGreaterThan(20);
      expect(profile.integrityReference).toMatch(/^profile-hash-/);
      expect(profile.applicability.governedDomain.trim().length).toBeGreaterThan(0);
      expect(profile.applicability.workflowContext.trim().length).toBeGreaterThan(0);
      expect(profile.applicability.applicableActionTypes.length).toBeGreaterThan(0);
      expect(profile.applicability.sensitivityRange.length).toBeGreaterThan(0);
      expect(["low", "moderate", "consequential"]).toContain(profile.applicability.consequenceClass);
      expect(typeof profile.receiptContinuityRequired).toBe("boolean");
      expect(profile.staticReferenceOnly).toBe(true);
    }
  });

  it("resolves every profile module binding to an existing static module manifest", () => {
    for (const profile of governanceProfiles) {
      expect(profile.moduleBindings.length).toBeGreaterThan(0);

      for (const binding of profile.moduleBindings) {
        expect(manifestById(binding.moduleId), binding.moduleId).toBeTruthy();
      }
    }
  });

  it("keeps profile bindings within manifest authority and requirement boundaries", () => {
    for (const profile of governanceProfiles) {
      for (const binding of profile.moduleBindings) {
        const manifest = manifestById(binding.moduleId);
        expect(manifest).toBeTruthy();

        expect(binding.configuredAuthorityClass).toBe(manifest?.authorityClass);
        if (manifest?.requirementClass === "mandatory") {
          expect(binding.inclusionClass).toBe("mandatory");
        }
        if (manifest?.requirementClass === "optional") {
          expect(["mandatory", "optional"]).toContain(binding.inclusionClass);
        }
      }
    }
  });

  it("does not weaken binding manifests to advisory behavior", () => {
    for (const profile of governanceProfiles) {
      for (const binding of profile.moduleBindings) {
        const manifest = manifestById(binding.moduleId);

        if (manifest?.authorityClass === "binding") {
          expect(binding.configuredAuthorityClass).toBe("binding");
        }
      }
    }
  });

  it("keeps non-overridable manifests non-overridable", () => {
    for (const profile of governanceProfiles) {
      for (const binding of profile.moduleBindings) {
        const manifest = manifestById(binding.moduleId);

        if (manifest?.overrideability === "non-overridable") {
          expect(binding.configuredOverrideability).toBe("non-overridable");
        }
      }
    }
  });

  it("does not enable degraded mode beyond manifest capability", () => {
    for (const profile of governanceProfiles) {
      for (const binding of profile.moduleBindings) {
        const manifest = manifestById(binding.moduleId);

        if (binding.degradedModeAllowed) {
          expect(manifest?.degradedModeAllowed).toBe(true);
        }
        if (manifest?.degradedModeAllowed === false) {
          expect(binding.degradedModeAllowed).toBe(false);
        }
      }
    }
  });

  it("keeps module-binding rationales and operator-facing explanations explicit", () => {
    for (const profile of governanceProfiles) {
      for (const binding of profile.moduleBindings) {
        expect(binding.rationale.trim().length).toBeGreaterThan(30);
        expect(binding.operatorFacingExplanation.trim().length).toBeGreaterThan(30);
      }
    }
  });

  it("keeps fixed AGS roles distinct from profile module bindings and manifests", () => {
    const fixedRoleIds = new Set(fixedInternalGovernanceRoles.map((role) => role.roleId));
    const manifestIds = new Set(governanceModuleManifests.map((manifest) => manifest.moduleId));

    expect(Array.from(fixedRoleIds)).toEqual(expectedFixedRoleIds);
    for (const roleId of fixedRoleIds) {
      expect(manifestIds.has(roleId)).toBe(false);
    }

    for (const profile of governanceProfiles) {
      for (const binding of profile.moduleBindings) {
        expect(fixedRoleIds.has(binding.moduleId)).toBe(false);
      }
    }
  });

  it("represents the fixed AGS roles consistently across profiles", () => {
    for (const profile of governanceProfiles) {
      expect(profile.fixedInternalRoles.map((role) => role.roleId)).toEqual(expectedFixedRoleIds);
      for (const role of profile.fixedInternalRoles) {
        expect(role.expected).toBe(true);
        expect(role.explanation.trim().length).toBeGreaterThan(40);
      }
    }
  });

  it("keeps the consequential-action baseline as a static reference profile", () => {
    const baseline = profileById("consequential-action-baseline");

    expect(baseline).toBeTruthy();
    expect(baseline?.applicability.consequenceClass).toBe("consequential");
    expect(baseline?.receiptContinuityRequired).toBe(true);
    expect(baseline?.staticReferenceOnly).toBe(true);
  });

  it("does not introduce a profile-composition engine or runtime metadata", () => {
    for (const profile of governanceProfiles) {
      const keys = Object.keys(profile);
      for (const forbiddenKey of forbiddenProfileRuntimeKeys) {
        expect(keys).not.toContain(forbiddenKey);
      }
    }
  });

  it("assigns every minimal conformance fixture to at least one static profile", () => {
    const assignedFixtureIds = fixtureGovernanceProfileAssignments.map((assignment) => assignment.fixtureId);
    const minimalFixtureIds = minimalConformanceFixtures.map((fixtureRecord) => fixtureRecord.fixtureId);

    expect(assignedFixtureIds).toEqual(minimalFixtureIds);
    expect(new Set(assignedFixtureIds).size).toBe(assignedFixtureIds.length);
  });

  it("resolves every fixture assignment to existing profiles", () => {
    for (const assignment of fixtureGovernanceProfileAssignments) {
      expect(assignment.rationale.trim().length).toBeGreaterThan(30);
      expect(assignment.profileIds.length).toBeGreaterThan(0);

      for (const profileId of assignment.profileIds) {
        expect(profileById(profileId), profileId).toBeTruthy();
      }
    }
  });

  it("maps Fixture 11 to the consequential-action baseline", () => {
    const assignment = fixtureGovernanceProfileAssignments.find(
      (candidate) => candidate.fixtureId === "rgcf-011-receipt-reservation-failure",
    );

    expect(assignment?.profileIds).toEqual(["consequential-action-baseline"]);
  });

  it("keeps Fixture 14 Runtime Binding as a fixed internal role rather than an external manifest", () => {
    const assignment = fixtureGovernanceProfileAssignments.find(
      (candidate) => candidate.fixtureId === "rgcf-014-runtime-mismatch",
    );
    const profile = profileById(assignment?.profileIds[0] ?? "");

    expect(assignment?.profileIds).toEqual(["internal-documentation-draft"]);
    expect(profile?.fixedInternalRoles.map((role) => role.roleId)).toContain("runtime-binding");
    expect(profile?.moduleBindings.some((binding) => binding.moduleId === "runtime-binding")).toBe(false);
    expect(manifestById("runtime-binding")).toBeUndefined();
  });

  it("keeps resolver behavior independent from governance profiles", () => {
    const input = permitInputFromFixture(fixture("rgcf-001-valid-low-risk-internal-draft"));
    const resolution = resolvePermitEligibility(input);
    const inputKeys = Object.keys(input);

    expect(inputKeys).not.toContain("profileId");
    expect(inputKeys).not.toContain("profileIds");
    expect(inputKeys).not.toContain("governanceProfile");
    expect(resolvePermitEligibility.length).toBe(1);
    expect(resolution.permitEligible).toBe(true);
  });
});
