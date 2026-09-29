import { describe, expect, it } from "vitest";
import { createActionHash, createRuntimePermit, validateRuntimePermit } from "../index.js";
import type { AgentActionProposal } from "@alignment-governance-stack/shared-types";

const action: AgentActionProposal = {
  id: "report", userRequest: "Summarize a local report", tool: "report.generate",
  actionType: "generate_report", target: "local-report", environment: "dev",
  reversible: true, externalFacing: false, dataSensitivity: "low",
  requiresApproval: false, knownApproval: false, metadata: {}
};

describe("permit correctness", () => {
  it("rejects a future-issued permit even without expiry", () => {
    const permit = createRuntimePermit(action, { issuedAt: "2099-01-01T00:00:00Z" });
    expect(validateRuntimePermit(action, permit, { now: "2026-09-29T00:00:00Z" }).allowed).toBe(false);
  });

  it("rejects consequential metadata substitution", () => {
    const approved = { ...action, metadata: { payload: { recipient: "reviewer", amount: 25 } } };
    const permit = createRuntimePermit(approved);
    const changed = { ...approved, metadata: { payload: { recipient: "outsider", amount: 250 } } };
    expect(validateRuntimePermit(changed, permit).allowed).toBe(false);
  });

  it.each(["invalid", "", undefined])("rejects malformed issuance %s", issuedAt => {
    const permit = { ...createRuntimePermit(action), issuedAt };
    expect(validateRuntimePermit(action, permit as ReturnType<typeof createRuntimePermit>).failures.map(f => f.code)).toContain("invalid_permit_window");
  });

  it("uses an inclusive issuance and exclusive expiry with one host clock", () => {
    const issuedAt = "2026-01-01T00:00:00Z", expiresAt = "2026-01-01T00:01:00Z";
    const permit = createRuntimePermit(action, { issuedAt, expiresAt });
    expect(validateRuntimePermit(action, permit, { now: issuedAt }).allowed).toBe(true);
    expect(validateRuntimePermit(action, permit, { now: "2026-01-01T00:00:59Z" }).allowed).toBe(true);
    expect(validateRuntimePermit(action, permit, { now: expiresAt }).allowed).toBe(false);
    expect(validateRuntimePermit(action, permit, { now: "invalid" }).failures.map(f => f.code)).toContain("invalid_clock");
    for (const end of ["invalid", issuedAt, "2025-01-01T00:00:00Z"]) {
      expect(validateRuntimePermit(action, { ...permit, expiresAt: end }, { now: issuedAt }).failures.map(f => f.code)).toContain("invalid_permit_window");
    }
  });

  it("preserves non-expiring permits after issuance", () => {
    const permit = createRuntimePermit(action, { issuedAt: "2026-01-01T00:00:00Z" });
    expect(validateRuntimePermit(action, permit, { now: "2026-01-02T00:00:00Z" }).allowed).toBe(true);
  });

  it("binds metadata insertion, removal and nested changes independently of key ordering", () => {
    const approved = { ...action, metadata: { amount: 25, payload: { recipient: "reviewer" } } };
    const permit = createRuntimePermit(approved);
    expect(createActionHash({ ...approved, metadata: { payload: { recipient: "reviewer" }, amount: 25 } })).toBe(permit.actionHash);
    for (const metadata of [{}, { amount: 25 }, { ...approved.metadata, extraRecipient: "outsider" }]) {
      expect(validateRuntimePermit({ ...approved, metadata }, permit).allowed).toBe(false);
    }
    approved.metadata.payload.recipient = "outsider";
    expect(permit.allowedAction.metadata.payload).toEqual({ recipient: "reviewer" });
    expect(validateRuntimePermit(approved, permit).allowed).toBe(false);
  });

  it.each([undefined, NaN, Infinity, () => 1, new Date(), new Map(), [, 1]])("rejects ambiguous metadata values %#", value => {
    const changed = { ...action, metadata: { value } };
    expect(() => createRuntimePermit(changed)).toThrow(/metadata/);
    expect(validateRuntimePermit(changed, createRuntimePermit(action)).allowed).toBe(false);
  });
});
