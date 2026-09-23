import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { ContextAdmissionRequest } from "@alignment-governance-stack/shared-types";
import { evaluateContextAdmission, hashContextContent, verifyContextAdmissionEvidence } from "../evaluateContextAdmission.js";
import { canonicalizeForHash, sha256Hex } from "@alignment-governance-stack/receipts";
import { validateContextAdmissionEvidence } from "../validateContextAdmissionEvidence.js";
import { validateContextAdmissionRequest } from "../validateContextAdmissionRequest.js";

function request(): ContextAdmissionRequest {
  return JSON.parse(readFileSync(new URL("../../../../examples/context-admission/valid-temporal-relay.json", import.meta.url), "utf8")) as ContextAdmissionRequest;
}

describe("context admission evidence boundaries", () => {
  it("requires operational validation unless the receiving policy explicitly opts out", () => {
    const input = request(); delete input.policy.requireValidation;
    input.validationEvidence = input.validationEvidence!.filter(e => e.kind !== "validation");
    input.artifacts[0]!.validationStatus = "validated";
    expect(evaluateContextAdmission(input).decision).toBe("require_validation");
    input.policy.requireValidation = false;
    expect(evaluateContextAdmission(input).decision).toBe("admit");
  });
  it.each(["revoked", "dataSensitivity"] as const)("does not admit operational context with unknown %s", field => {
    const input = request(); delete input.artifacts[0]![field];
    expect(evaluateContextAdmission(input).decision).toBe("require_validation");
  });
  it("does not let optional or duplicate validation shorten the required authority window", () => {
    const input = request(); input.policy.requireValidation = false;
    input.validationEvidence!.find(e => e.kind === "validation")!.expiresAt = "2026-09-19T12:00:01.000Z";
    input.validationEvidence!.push({ ...input.validationEvidence![0]!, id: "shorter-authority", expiresAt: "2026-09-19T12:00:02.000Z" });
    expect(evaluateContextAdmission(input).validUntil).toBe("2026-09-19T13:00:00.000Z");
    input.policy.requireValidation = true;
    expect(evaluateContextAdmission(input).validUntil).toBe("2026-09-19T12:00:01.000Z");
  });
  it.each(["content", "validationStatus"])("rejects extra reference field %s even with a recomputed digest", field => {
    const result = evaluateContextAdmission(request());
    Object.assign(result.artifacts[0]!, { [field]: field === "content" ? "raw private payload" : "validated" });
    const { admissionId: _id, contextLineageDigest: _digest, ...body } = result;
    result.contextLineageDigest = `sha256:${sha256Hex(canonicalizeForHash(body))}`;
    result.admissionId = `context-${result.contextLineageDigest.slice(7, 23)}`;
    expect(validateContextAdmissionEvidence(result)).toBe(false);
  });
  it("is deterministic, content-free, and does not mutate its input", () => {
    const input = request(); const before = structuredClone(input);
    const result = evaluateContextAdmission(input);
    expect(result).toEqual(evaluateContextAdmission(input));
    expect(result.decision).toBe("admit");
    expect(input).toEqual(before);
    expect(JSON.stringify(result)).not.toContain(input.artifacts[0]!.content);
    expect(verifyContextAdmissionEvidence(result)).toBe(true);
    result.decision = "reject";
    expect(verifyContextAdmissionEvidence(result)).toBe(false);
  });
  it("rejects changed content regardless of an old valid status", () => {
    const input = request(); input.artifacts[0]!.content = "changed"; input.artifacts[0]!.validationStatus = "validated";
    expect(evaluateContextAdmission(input).findings.map(f => f.code)).toContain("integrity_mismatch");
  });
  it("does not treat prior admission or validation labels as present evidence", () => {
    const input = request(); input.validationEvidence = [];
    input.artifacts[0]!.priorAdmissionRefs = ["previous-admit"]; input.artifacts[0]!.validationStatus = "validated";
    const result = evaluateContextAdmission(input);
    expect(result.findings.map(f => f.code)).toEqual(expect.arrayContaining(["validation_missing", "authority_not_demonstrated"]));
  });
  it("reports missing provenance as an evidence gap", () => {
    const input = request(); delete input.artifacts[0]!.provenance;
    const result = evaluateContextAdmission(input);
    expect(result.decision).toBe("require_human_review");
    expect(result.findings.map(f => f.code)).toEqual(expect.arrayContaining(["provenance_missing", "source_unknown", "authority_not_demonstrated"]));
    expect(result.reasonForDecision).toContain("does not establish maliciousness");
  });
  it("preserves unknown revocation state without reporting it as unrevoked", () => {
    const input = request(); delete input.artifacts[0]!.revoked;
    expect(evaluateContextAdmission(input).artifacts[0]).not.toHaveProperty("revoked");
  });
  it.each(["receiver", "purpose", "target", "expired", "revoked", "untrusted", "future", "hash"])("invalidates %s evidence", mutation => {
    const input = request();
    for (const e of input.validationEvidence!) {
      if (mutation === "receiver") e.use.receiverAgentId = "other-agent";
      if (mutation === "purpose") e.use.purpose = "other-purpose";
      if (mutation === "target") e.use.action!.target = "other-target";
      if (mutation === "expired") e.expiresAt = input.evaluatedAt;
      if (mutation === "revoked") e.revoked = true;
      if (mutation === "untrusted") e.validatorId = "unknown-validator";
      if (mutation === "future") e.validatedAt = "2027-01-01T00:00:00Z";
      if (mutation === "hash") e.contentHash = hashContextContent("different");
    }
    expect(evaluateContextAdmission(input).decision).toBe("require_human_review");
  });
  it("supports explicit cross-domain authority evidence", () => {
    const input = request(); input.requestedUse.trustDomain = "organization-b";
    for (const e of input.validationEvidence!) e.use = structuredClone(input.requestedUse);
    input.validationEvidence!.push({ ...structuredClone(input.validationEvidence![0]!), id: "transfer", kind: "domain_transfer" });
    expect(evaluateContextAdmission(input).decision).toBe("admit");
  });
  it("detects stale authority even when source availability and validation remain intact", () => {
    const input = request(); input.artifacts[0]!.provenance!.authorityExpiresAt = input.evaluatedAt;
    expect(evaluateContextAdmission(input).findings.map(f => f.code)).toContain("authority_stale");
  });
  it("reports missing material artifacts and missing parents", () => {
    const input = request(); input.materialArtifactIds.push("missing-root"); input.artifacts[0]!.parentArtifactIds = ["missing-parent"];
    expect(evaluateContextAdmission(input).findings.filter(f => f.code === "lineage_gap")).toHaveLength(2);
  });
  it.each(["revoked", "restricted"])("propagates a %s ancestor through a summary", flag => {
    const input = request(); const parent = structuredClone(input.artifacts[0]!); parent.id = "parent";
    if (flag === "revoked") parent.revoked = true; else parent.permittedUses = ["different-purpose"];
    input.artifacts.push(parent); input.artifacts[0]!.parentArtifactIds = ["parent"];
    expect(evaluateContextAdmission(input).decision).toBe("reject");
  });
  it("supports a diamond lineage without reporting a cycle", () => {
    const input = request(); input.policy.requireAuthority = false; input.policy.requireValidation = false; input.requestedUse.mode = "reference";
    const template = input.artifacts[0]!; template.parentArtifactIds = ["b", "c"];
    for (const id of ["b", "c", "d"]) input.artifacts.push({ ...structuredClone(template), id, parentArtifactIds: id === "d" ? [] : ["d"] });
    expect(evaluateContextAdmission(input).findings.map(f => f.code)).not.toContain("circular_lineage");
  });
  it("requires integrity evidence when content bytes are omitted", () => {
    const input = request(); delete input.artifacts[0]!.content;
    expect(evaluateContextAdmission(input).decision).toBe("require_validation");
    input.validationEvidence!.push({ ...structuredClone(input.validationEvidence![0]!), kind: "integrity", id: "integrity-check" });
    expect(evaluateContextAdmission(input).decision).toBe("admit");
  });
  it.each([null, {}, { artifacts: [] }, { ...request(), evaluatedAt: "bad-date" }, { ...request(), materialArtifactIds: [] }])("rejects malformed requests", input => {
    expect(validateContextAdmissionRequest(input).valid).toBe(false);
    expect(() => evaluateContextAdmission(input as ContextAdmissionRequest)).toThrow();
  });
  it("rejects duplicate artifact identities and malformed nested evidence", () => {
    const input = request(); input.artifacts.push(structuredClone(input.artifacts[0]!));
    expect(validateContextAdmissionRequest(input).valid).toBe(false);
    expect(validateContextAdmissionRequest({ ...request(), validationEvidence: [{ use: null }] }).valid).toBe(false);
  });
  it("rejects impossible calendar dates and undeclared envelope fields", () => {
    const input = request(); input.evaluatedAt = "2026-02-31T12:00:00Z";
    expect(validateContextAdmissionRequest(input).valid).toBe(false);
    const extra = request();
    Object.assign(extra.artifacts[0]!.provenance!, { content: "Do not embed hidden content in evidence." });
    expect(validateContextAdmissionRequest(extra).valid).toBe(false);
  });
});
