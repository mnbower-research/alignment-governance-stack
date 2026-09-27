import { expect, it } from "vitest";
import { attest, fixture, now } from "./fixtures.js";
import { evaluateAssurance, createValidatorAttestation, verifyAssuranceEvidence, assuranceDigest } from "../index.js";
it("matches independent roles/domains/sequence without using the same subject twice", () => {
  const { action, input } = fixture();
  for (const r of Object.values(input.policy.requirements)) {
    r.slots = [{ id: "first", role: "analyst", authorityDomain: "operations" }, { id: "second", role: "reviewer", validatorType: "human" }]; r.sequence = ["first", "second"];
  }
  input.validators[1]!.roles.push("analyst");
  input.attestations = [attest(action, input, "v1", { role: "analyst", createdAt: "2026-09-23T11:58:00.000Z" }), attest(action, input)];
  const result = evaluateAssurance(action, input); expect(result.decision).toBe("satisfied"); expect(Object.values(result.slotAssignments)).toHaveLength(2);
  const a = input.attestations[0]!; const { digest: _d, version: _v, ...body } = a;
  input.attestations[0] = createValidatorAttestation({ ...body, createdAt: now });
  expect(evaluateAssurance(action, input).decision).not.toBe("satisfied");
});
it("does not collide named slots with generated quorum slots", () => {
  const { action, input } = fixture("high");
  input.policy.requirements.high.slots = [{ id: "$quorum-1" }]; input.policy.requirements.critical.slots = [{ id: "$quorum-1" }];
  input.attestations = [attest(action, input), attest(action, input, "v1")];
  expect(evaluateAssurance(action, input).decision).not.toBe("satisfied");
  input.attestations.push(attest(action, input, "v2")); expect(evaluateAssurance(action, input).acceptedAttestationIds).toHaveLength(3);
});
it("fails closed for malformed registry metadata and weakened high-risk policies", () => {
  const { action, input } = fixture(); input.validators[0]!.independenceGroup = "";
  expect(() => evaluateAssurance(action, input)).toThrow(); input.validators[0]!.independenceGroup = "g";
  input.policy.requirements.high.mandatoryHuman = false; expect(() => evaluateAssurance(action, input)).toThrow();
});
it("does not let conflicting identity aliases satisfy independent slots", () => {
  const { action, input } = fixture(); input.validators.push({ ...input.validators[0]!, id: "alias", independenceGroup: "fabricated" }); input.attestations = [attest(action, input)];
  expect(evaluateAssurance(action, input).decision).toBe("blocked");
});
it("permits an additional mandatory human after all named agent slots are filled", () => {
  const { action, input } = fixture();
  for (const r of Object.values(input.policy.requirements)) { r.mandatoryHuman = true; r.slots = [{ id: "agent", validatorType: "agent" }]; }
  input.attestations = [attest(action, input), attest(action, input, "v1")];
  const result = evaluateAssurance(action, input);
  expect(result.decision).toBe("satisfied"); expect(result.acceptedAttestationIds).toHaveLength(2); expect(verifyAssuranceEvidence(result)).toBe(true);
});
it("rejects rehashed reports with fabricated satisfaction or slot claims", () => {
  const { action, input } = fixture("high"); input.attestations = [attest(action, input)];
  const { digest: _digest, ...body } = evaluateAssurance(action, input);
  const fake = { ...body, decision: "satisfied" as const, validUntil: "2026-09-23T12:01:00.000Z" };
  expect(verifyAssuranceEvidence({ ...fake, digest: assuranceDigest(fake) })).toBe(false);
});
it.each(["deny", "abstain"] as const)("rejects a rehashed satisfaction claim concealing %s", verdict => {
  const { action, input } = fixture(); input.attestations = [attest(action, input), attest(action, input, "v1", { verdict })];
  const { digest: _digest, ...body } = evaluateAssurance(action, input);
  const fake = { ...body, decision: "satisfied" as const, validUntil: "2026-09-23T12:01:00.000Z", unresolvedDenialIds: [], findings: [] };
  expect(verifyAssuranceEvidence({ ...fake, digest: assuranceDigest(fake) })).toBe(false);
});
