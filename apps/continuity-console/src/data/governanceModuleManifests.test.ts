import { describe, expect, it } from "vitest";
import { minimalConformanceFixtures } from "./runtimeGovernanceConformanceFixtures";
import {
  fixedInternalGovernanceRoles,
  governanceModuleManifests,
  type GovernanceModuleManifest,
} from "./governanceModuleManifests";

const forbiddenRuntimeKeys = [
  "adapter",
  "adapterId",
  "apiKey",
  "endpoint",
  "execute",
  "loader",
  "register",
  "registry",
  "runtimeRegistry",
  "url",
];

function manifestById(moduleId: string): GovernanceModuleManifest | undefined {
  return governanceModuleManifests.find((manifest) => manifest.moduleId === moduleId);
}

function fixtureModuleIds(): string[] {
  return Array.from(
    new Set(
      minimalConformanceFixtures.flatMap((fixture) =>
        fixture.moduleEvaluations.map((evaluation) => evaluation.moduleId),
      ),
    ),
  );
}

describe("governance module manifests", () => {
  it("defines unique static manifest IDs", () => {
    const manifestIds = governanceModuleManifests.map((manifest) => manifest.moduleId);

    expect(manifestIds.length).toBeGreaterThan(0);
    expect(new Set(manifestIds).size).toBe(manifestIds.length);
  });

  it("includes identity, applicability, placement, authority, failure, and receipt metadata", () => {
    for (const manifest of governanceModuleManifests) {
      expect(manifest.moduleId.trim().length).toBeGreaterThan(0);
      expect(manifest.moduleName.trim().length).toBeGreaterThan(0);
      expect(manifest.version.trim().length).toBeGreaterThan(0);
      expect(manifest.provider.trim().length).toBeGreaterThan(0);
      expect(manifest.purpose.trim().length).toBeGreaterThan(20);
      expect(manifest.governedDomains.length).toBeGreaterThan(0);
      expect(manifest.applicableActionTypes.length).toBeGreaterThan(0);
      expect(manifest.requiredInputs.length).toBeGreaterThan(0);
      expect(manifest.placement).toBeTruthy();
      expect(manifest.supportedVerdicts.length).toBeGreaterThan(0);
      expect(["mandatory", "optional"]).toContain(manifest.requirementClass);
      expect(["advisory", "binding"]).toContain(manifest.authorityClass);
      expect(manifest.failureBehavior).toBeTruthy();
      expect(typeof manifest.degradedModeAllowed).toBe("boolean");
      expect(manifest.overrideability).toBeTruthy();
      expect(manifest.receiptContributions.length).toBeGreaterThan(0);
      expect(manifest.configurationReference.referenceId).toMatch(/^local-static-config:/);
      expect(manifest.configurationReference.static).toBe(true);
    }
  });

  it("resolves external evaluator module IDs referenced by the minimal fixtures", () => {
    const fixedRoleIds = new Set(fixedInternalGovernanceRoles.map((role) => role.roleId));
    const unresolvedExternalIds = fixtureModuleIds().filter(
      (moduleId) => !fixedRoleIds.has(moduleId) && !manifestById(moduleId),
    );

    expect(unresolvedExternalIds).toEqual([]);
  });

  it("keeps fixed internal stages distinguishable from external evaluator manifests", () => {
    const manifestIds = new Set(governanceModuleManifests.map((manifest) => manifest.moduleId));

    expect(fixedInternalGovernanceRoles.map((role) => role.roleId)).toEqual([
      "pgdl",
      "aag",
      "runtime-binding",
      "receipt-continuity",
    ]);

    for (const role of fixedInternalGovernanceRoles) {
      expect(manifestIds.has(role.roleId)).toBe(false);
      expect(role.reasonNotManifested.trim().length).toBeGreaterThan(40);
    }
  });

  it("supports every fixture evaluation verdict for external evaluator modules", () => {
    const fixedRoleIds = new Set(fixedInternalGovernanceRoles.map((role) => role.roleId));

    for (const fixture of minimalConformanceFixtures) {
      for (const evaluation of fixture.moduleEvaluations) {
        if (fixedRoleIds.has(evaluation.moduleId)) {
          continue;
        }

        const manifest = manifestById(evaluation.moduleId);
        expect(manifest, evaluation.moduleId).toBeTruthy();
        expect(manifest?.supportedVerdicts).toContain(evaluation.verdict);
      }
    }
  });

  it("declares fail-closed behavior for mandatory binding module manifests", () => {
    const mandatoryBindingManifests = governanceModuleManifests.filter(
      (manifest) => manifest.requirementClass === "mandatory" && manifest.authorityClass === "binding",
    );

    expect(mandatoryBindingManifests.length).toBeGreaterThan(0);
    for (const manifest of mandatoryBindingManifests) {
      expect(manifest.failureBehavior).toBe("fail-closed");
      expect(manifest.degradedModeAllowed).toBe(false);
    }
  });

  it("allows optional advisory modules to declare visible degraded operation", () => {
    const optionalAdvisoryManifests = governanceModuleManifests.filter(
      (manifest) => manifest.requirementClass === "optional" && manifest.authorityClass === "advisory",
    );

    expect(optionalAdvisoryManifests.length).toBeGreaterThan(0);
    for (const manifest of optionalAdvisoryManifests) {
      expect(manifest.failureBehavior).toBe("degraded-visible");
      expect(manifest.degradedModeAllowed).toBe(true);
    }
  });

  it("does not treat non-overridable modules as overrideable", () => {
    const nonOverridableManifests = governanceModuleManifests.filter(
      (manifest) => manifest.overrideability === "non-overridable",
    );

    expect(nonOverridableManifests.length).toBeGreaterThan(0);
    for (const manifest of nonOverridableManifests) {
      expect(manifest.overrideability).not.toBe("overrideable");
    }
  });

  it("keeps receipt contributions and configuration references explicit and static", () => {
    for (const manifest of governanceModuleManifests) {
      expect(manifest.receiptContributions.every((contribution) => contribution.trim().length > 3)).toBe(true);
      expect(manifest.configurationReference.referenceId).not.toContain("http");
      expect(manifest.configurationReference.description.trim().length).toBeGreaterThan(20);
      expect(manifest.configurationReference.static).toBe(true);
    }
  });

  it("does not introduce runtime registry, dynamic loading, adapters, or external-call metadata", () => {
    for (const manifest of governanceModuleManifests) {
      const keys = Object.keys(manifest);
      for (const forbiddenKey of forbiddenRuntimeKeys) {
        expect(keys).not.toContain(forbiddenKey);
      }
    }
  });
});
