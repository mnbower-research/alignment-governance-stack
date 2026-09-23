import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { evaluateContextAdmission } from "@alignment-governance-stack/context-admission";
import { createGovernanceReceipt } from "@alignment-governance-stack/receipts";
import { findParser, generateContinuitySnapshot } from "../index.js";
import { validateSnapshotEvidence } from "../browser.js";
import type { AgentActionProposal } from "@alignment-governance-stack/shared-types";
const request = JSON.parse(readFileSync(new URL("../../../../examples/context-admission/valid-temporal-relay.json", import.meta.url), "utf8"));
const p: AgentActionProposal = { id: "context-report", userRequest: "Generate a weekly summary report.", tool: "report.generate", actionType: "generate_report", target: "weekly_summary", environment: "dev", reversible: true, externalFacing: false, dataSensitivity: "low", requiresApproval: false, knownApproval: false, metadata: {} };
const context = { sourcePath: "probe.json", fileName: "probe.json", sha256: "a".repeat(64), importedAt: request.evaluatedAt };
describe("nested content-free evidence", () => {
  it.each(["pgdl", "aag", "receipt", "metadata"])("rejects raw or tampered nested admission in %s", kind => {
    for (const mutation of ["raw", "digest"]) {
      const evidence = evaluateContextAdmission(request);
      if (mutation === "raw") Object.assign(evidence.artifacts[0]!, { content: "SECRET_RAW_CONTEXT" });
      else evidence.contextLineageDigest = "sha256:" + "0".repeat(64);
      const pgdl = { originalProposal: p, objections: [], decision: "forward_to_aag", reasonForDecision: "Reviewed", contextAdmission: evidence };
      const aag = { proposal: p, detectorResults: [], decision: "allow", reasonForDecision: "Reviewed", contextAdmission: evidence };
      const value = kind === "pgdl" ? pgdl : kind === "aag" ? aag : kind === "metadata" ? { ...pgdl, contextAdmission: undefined, originalProposal: { ...p, metadata: { saved: { contextAdmission: evidence } } } } : createGovernanceReceipt({ governancePacket: { originalProposal: p, finalDecision: "blocked_by_policy", reasonForDecision: "Stopped", contextAdmission: evidence } });
      expect(() => findParser(value, "probe.json")!.parse(value, context)).toThrow(/shape|digest/);
    }
  });
  it("rejects direct receipt parser calls with an incomplete envelope", () => {
    const valid = createGovernanceReceipt({ governancePacket: { originalProposal: p, finalDecision: "blocked_by_policy", reasonForDecision: "Stopped" } });
    expect(() => findParser(valid, "probe.json")!.parse({ finalDecision: "execution_allowed" }, context)).toThrow(/envelope/);
  });
  it("rejects receipt tampering through Node and browser import paths", async () => {
    const receipt = createGovernanceReceipt({ governancePacket: { originalProposal: p, finalDecision: "blocked_by_policy", reasonForDecision: "Stopped" } });
    receipt.finalDecision = "execution_allowed";
    expect(() => findParser(receipt, "probe.json")!.parse(receipt, context)).toThrow(/integrity/);
    const snapshot = await validateSnapshotEvidence({ schemaVersion: "ags.continuity-snapshot.v0.1", generatedAt: request.evaluatedAt, deployment: { id: "test", name: "Test", environment: "local" }, artifacts: [{ id: "receipt", kind: "receipt", payload: receipt, summary: "Untrusted", correlation: {}, provenance: { ...context, parserId: "ags.receipt", parserVersion: "0.1" }, warnings: [] }], diagnostics: [] });
    expect(snapshot.artifacts).toHaveLength(0); expect(snapshot.diagnostics[0]?.code).toBe("artifact.parser-error");
  });
  it("applies the same stage shapes to raw and normalized imports", async () => {
    const pgdl = { originalProposal: p, decision: "forward_to_aag", objections: [], reasonForDecision: "Reviewed" };
    const parser = findParser(pgdl, "probe.json")!;
    const [artifact] = parser.parse(pgdl, context);
    const malformed = { ...pgdl, objections: undefined };
    expect(() => parser.parse(malformed, context)).toThrow(/malformed|Incomplete/);
    const result = await validateSnapshotEvidence({ schemaVersion: "ags.continuity-snapshot.v0.1", generatedAt: request.evaluatedAt, deployment: { id: "test", name: "Test", environment: "local" }, artifacts: [{ ...artifact!, payload: malformed }], diagnostics: [] });
    expect(result.artifacts).toHaveLength(0);
    expect(result.diagnostics[0]?.severity).toBe("error");
  });
  it("derives admission correlation from verified payload and preserves malformed diagnostics as errors", async () => {
    const evidence = evaluateContextAdmission(request);
    const [artifact] = findParser(evidence, "probe.json")!.parse(evidence, context);
    const result = await validateSnapshotEvidence({ schemaVersion: "ags.continuity-snapshot.v0.1", generatedAt: request.evaluatedAt, deployment: { id: "test", name: "Test", environment: "local" }, artifacts: [{ ...artifact!, correlation: { proposalId: "unrelated", agentId: "impostor" } }], diagnostics: [null as never] });
    expect(result.artifacts[0]?.correlation.agentId).toBe(evidence.requestedUse.receiverAgentId);
    expect(result.artifacts[0]?.correlation.proposalId).toBe(evidence.requestedUse.action?.proposalId);
    expect(result.diagnostics[0]?.severity).toBe("error");
  });
  it("imports the coherent fixture with valid receipt and fingerprint digests", async () => {
    const generated = await generateContinuitySnapshot({ sourcePaths: [new URL("../../../../examples/continuity-console-artifacts/coherent-action-chain", import.meta.url).pathname.replace(/^\/(\w:)/, "$1")] });
    const checked = await validateSnapshotEvidence(generated.snapshot);
    expect(checked.artifacts).toHaveLength(8);
    expect(checked.diagnostics).toEqual([]);
  });
});
