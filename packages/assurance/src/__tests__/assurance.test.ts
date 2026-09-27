import { describe, expect, it } from "vitest";
import { evaluateAssurance, createAssuranceBinding, createValidatorAttestation, verifyAssuranceEvidence, verifyValidatorAttestation } from "../index.js";
import { fixture, attest, now } from "./fixtures.js";

describe("risk-scaled assurance", () => {
  it("permits minimal low-risk assurance without granting execution authority", () => {
    const { action, input } = fixture(); input.attestations = [attest(action, input)];
    const result = evaluateAssurance(action, input); expect(result.decision).toBe("satisfied"); expect(verifyAssuranceEvidence(result)).toBe(true);
    expect(result).not.toHaveProperty("execution_allowed");
  });
  it("requires multiple independent validators and a human for high risk", () => {
    const { action, input } = fixture("high"); input.attestations = [attest(action, input)];
    expect(evaluateAssurance(action, input).decision).toBe("request_validation");
    input.attestations.push(attest(action, input, "v1"), attest(action, input, "v2"));
    expect(evaluateAssurance(action, input).decision).toBe("satisfied");
  });
  it("rejects duplicate validator and detectable aliases", () => {
    const { action, input } = fixture("high"); input.validators.push({ ...input.validators[0]!, id: "renamed" });
    input.attestations = [attest(action, input), attest(action, input, "renamed"), attest(action, input, "v1")];
    const result = evaluateAssurance(action, input); expect(result.decision).not.toBe("satisfied"); expect(result.findings.some(f => f.code === "duplicate_validator")).toBe(true);
  });
  it("does not count a repeated identity or independence group twice", () => {
    const { action, input } = fixture("high"); input.validators[1]!.independenceGroup = "group-0";
    input.attestations = input.validators.slice(0, 3).map(v => attest(action, input, v.id));
    expect(evaluateAssurance(action, input).decision).not.toBe("satisfied");
  });
  it.each(["stale", "expired", "revoked", "future", "wrong-target", "wrong-policy", "missing-evidence", "wrong-group", "unrecognized"])("rejects %s attestation", kind => {
    const { action, input } = fixture();
    const a = attest(action, input); const { digest: _digest, version: _version, ...body } = a;
    if (kind === "stale") body.createdAt = "2026-09-23T10:00:00.000Z";
    if (kind === "expired") body.expiresAt = now;
    if (kind === "revoked") body.revoked = true;
    if (kind === "future") body.createdAt = "2026-09-23T12:01:00.000Z";
    if (kind === "wrong-target") body.binding.target = "elsewhere";
    if (kind === "wrong-policy") body.policyVersion = "old";
    if (kind === "missing-evidence") body.evidenceRefs = [];
    if (kind === "wrong-group") body.independenceGroup = "invented";
    if (kind === "unrecognized") body.validatorId = "unrecognized";
    input.attestations = [createValidatorAttestation(body)];
    expect(evaluateAssurance(action, input).decision).not.toBe("satisfied");
  });
  it("rejects malformed expiry and clock", () => {
    const { action, input } = fixture(); input.attestations = [attest(action, input)]; input.attestations[0]!.expiresAt = "bad";
    expect(() => evaluateAssurance(action, input)).toThrow(); input.attestations = []; input.evaluatedAt = "bad";
    expect(() => evaluateAssurance(action, input)).toThrow();
  });
  it.each(["target", "environment", "amount", "scope", "resource", "risk", "purpose", "policy", "requirements", "action"])("invalidates assurance on material %s change", field => {
    const { action, input } = fixture(); input.attestations = [attest(action, input)];
    if (field === "target") action.target = "account-b";
    if (field === "environment") action.environment = "production";
    if (field === "amount") action.executionConstraints!.constraints.amount = { type: "exact_number", value: 5000 };
    if (field === "scope" || field === "resource") action.executionConstraints!.constraints[field] = { type: "exact_string", value: "expanded" };
    if (field === "risk") input.risk.financialExposure!.value = "high";
    if (field === "purpose") action.userRequest = "Different purpose";
    if (field === "policy") input.policy.version = "2";
    if (field === "requirements") input.policy.requirements.low.ttlMs -= 1;
    if (field === "action") action.actionType = "transfer";
    expect(evaluateAssurance(action, input).decision).not.toBe("satisfied");
  });
  it("preserves denial after approval shopping, expiry and revocation", () => {
    const { action, input } = fixture(); input.attestations = [attest(action, input, "v0", { verdict: "deny", revoked: true, expiresAt: now }), attest(action, input, "v1")];
    const r = evaluateAssurance(action, input); expect(r.decision).toBe("blocked"); expect(r.unresolvedDenialIds).toEqual(["attestation-v0"]); expect(r.attestations).toHaveLength(2);
  });
  it.each(["escalation", "material_revision", "override"] as const)("permits an explicit authorized %s resolution", kind => {
    const { action, input } = fixture(); input.policy.resolutionRoles[kind] = ["supervisor"];
    input.attestations = [attest(action, input, "v1", { verdict: "deny" })];
    if (kind === "material_revision") action.target = "revised-target";
    input.attestations.push(attest(action, input));
    input.resolutions = [{ id: "resolution-1", kind, attestationIds: ["attestation-v1"], binding: createAssuranceBinding(action, input), resolverId: "v0", createdAt: now, expiresAt: "2026-09-23T12:10:00.000Z", rationale: "Explicit receiving authority review.", evidenceRefs: ["resolution-review"] }];
    const r = evaluateAssurance(action, input); expect(r.decision).toBe("satisfied"); expect(r.resolvedDenials).toHaveLength(1);
    input.resolutions[0]!.resolverId = "v2"; expect(evaluateAssurance(action, input).decision).toBe("blocked");
  });
  it("does not let a new target silently erase old denials", () => {
    const { action, input } = fixture(); input.attestations = [attest(action, input, "v1", { verdict: "deny" })]; action.target = "revised"; input.attestations.push(attest(action, input));
    expect(evaluateAssurance(action, input).decision).toBe("blocked");
  });
  it("requires a human despite unanimous agents", () => {
    const { action, input } = fixture("high"); input.attestations = input.validators.slice(1).map(v => attest(action, input, v.id));
    expect(evaluateAssurance(action, input).findings.some(f => f.code === "mandatory_human_missing")).toBe(true);
  });
  it("escalates unknown material risk but permits policy-excluded unknown novelty", () => {
    const { action, input } = fixture(); delete input.risk.novelty; input.attestations = [attest(action, input)]; expect(evaluateAssurance(action, input).decision).toBe("escalate");
    input.policy.materialDimensions = input.policy.materialDimensions.filter(d => d !== "novelty"); input.attestations = [attest(action, input)]; expect(evaluateAssurance(action, input).decision).toBe("satisfied");
  });
  it("does not erase explicitly unknown risk with a low core-field floor", () => {
    const { action, input } = fixture(); input.risk.irreversibility = { value: "unknown", source: "unknown", evidenceRefs: [] };
    input.attestations = input.validators.map(v => attest(action, input, v.id));
    expect(evaluateAssurance(action, input).decision).toBe("escalate");
  });
  it("does not shorten validity for an unused optional attestation", () => {
    const { action, input } = fixture(); input.attestations = [attest(action, input), attest(action, input, "v1", { expiresAt: "2026-09-23T12:00:01.000Z" })];
    expect(evaluateAssurance(action, input).validUntil).toBe("2026-09-23T12:30:00.000Z");
  });
  it("requires complete host history and rejects digest tampering", () => {
    const { action, input } = fixture(); input.attestations = [attest(action, input)]; input.historyComplete = false;
    expect(evaluateAssurance(action, input).decision).toBe("blocked"); input.historyComplete = true; input.attestations[0]!.rationale = "tampered";
    expect(verifyValidatorAttestation(input.attestations[0])).toBe(false); expect(evaluateAssurance(action, input).decision).toBe("blocked");
  });
  it("preserves revision and abstention", () => {
    const { action, input } = fixture(); input.attestations = [attest(action, input, "v1", { verdict: "request_revision" }), attest(action, input)];
    expect(evaluateAssurance(action, input).decision).toBe("request_revision"); input.attestations = [attest(action, input, "v1", { verdict: "abstain" }), attest(action, input)];
    expect(evaluateAssurance(action, input).decision).not.toBe("satisfied");
  });
  it("is deterministic and enforces exact expiry", () => {
    const { action, input } = fixture(); input.attestations = [attest(action, input, "v0", { expiresAt: now })];
    expect(evaluateAssurance(action, input)).toEqual(evaluateAssurance(action, structuredClone(input)));
    expect(evaluateAssurance(action, input).decision).not.toBe("satisfied");
  });
});
