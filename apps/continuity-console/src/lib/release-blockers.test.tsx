import { LiveActionTracePage } from "../pages/LiveActionTracePage";
import { beforeAll, afterAll, describe, it, expect, vi } from "vitest";
import { webcrypto } from "node:crypto";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { createGovernanceReceipt } from "@alignment-governance-stack/receipts";
import { evaluateGovernedRuntimeActionWithReceipt } from "@alignment-governance-stack/governance-core";
import { evaluateContextAdmission } from "@alignment-governance-stack/context-admission";
import { findParser, type ContinuitySnapshot, type NormalizedAgsArtifact } from "@alignment-governance-stack/continuity-ingest";
import { validateSnapshotEvidence } from "@alignment-governance-stack/continuity-ingest/browser";
import { projectSnapshot, importedTraceVerdict } from "./evidenceProjection";
import { buildImportedOperatorSummary } from "./operatorSummary";
import { FlowsPage } from "../pages/FlowsPage";
import { sampleTrace } from "../data/sampleDeployment";
const now = "2026-09-20T12:00:00Z";
const p = { id: "context-report", userRequest: "Generate a weekly summary report.", tool: "report.generate", actionType: "generate_report", target: "weekly_summary", environment: "dev", reversible: true, externalFacing: false, dataSensitivity: "low" as const, requiresApproval: false, knownApproval: false, metadata: {} };
const { governance: g, receipt } = evaluateGovernedRuntimeActionWithReceipt({ proposal: p, runtimeAction: p });
const base = [g.pgdl, g.aag, g.permit, g.runtimeBinding, receipt];
function artifact(value: unknown, index: number): NormalizedAgsArtifact[] {
  return findParser(value, "test.json")!.parse(value, { sourcePath: `${index}.json`, fileName: `${index}.json`, sha256: "a".repeat(64), importedAt: now });
}
function snapshot(values: unknown[] = []): ContinuitySnapshot { return { schemaVersion: "ags.continuity-snapshot.v0.1", generatedAt: now, deployment: { id: "local", name: "Local", environment: "local" }, artifacts: values.flatMap(artifact), diagnostics: [] }; }
async function view(input: ContinuitySnapshot) {
  const validated = await validateSnapshotEvidence(input);
  const projection = projectSnapshot(validated);
  return { ...projection, summary: buildImportedOperatorSummary(projection.trace, projection.gaps, now) };
}
beforeAll(() => vi.stubGlobal("crypto", webcrypto));
afterAll(() => vi.unstubAllGlobals());
describe("release evidence semantics", () => {
  it("never equates authorization with execution proof", async () => {
    const result = await view(snapshot(base));
    expect(result.summary.answers[1].answer).toBe("Yes, at the recorded time");
    expect(result.summary.answers[2].answer).toBe("Not proven");
    expect(result.summary.answers[3].answer).toBe("Not completely");
  });
  it("preserves denied receipt authority over earlier passing stages", async () => {
    const denied = createGovernanceReceipt({ governancePacket: { originalProposal: p, finalDecision: "blocked_by_policy", reasonForDecision: "Policy forbids the action" } });
    const result = await view(snapshot([...base.slice(0,4), denied]));
    expect(result.summary.answers[1].answer).toBe("No");
    expect(result.summary.answers[2].tone).not.toBe("positive");
    expect(result.summary.answers[3].tone).not.toBe("positive");
    expect(importedTraceVerdict(result.trace)).toBe("Execution denied");
  });
  it("preserves complete evidence of a denial without inventing missing execution stages", async () => {
    const denied = createGovernanceReceipt({ governancePacket: { originalProposal: p, finalDecision: "blocked_by_policy", reasonForDecision: "Stopped before execution" } });
    const result = await view(snapshot([denied]));
    expect(result.summary.answers[1].answer).toBe("No");
    expect(result.summary.answers[3].answer).toBe("Complete decision evidence");
  });
  it("invalid receipt hashes cannot count as proof in normalized uploads", async () => {
    const input = snapshot(base); const bad = input.artifacts.find(a => a.kind === "receipt")!;
    bad.payload = { ...receipt, receiptHash: "invalid" };
    const result = await view(input);
    expect(result.summary.answers[1].tone).not.toBe("positive");
    expect(result.summary.answers[3].tone).not.toBe("positive");
    expect(result.summary.findings.some(f => f.explanation.includes("integrity"))).toBe(true);
  });
  it.each([false,true])("preserves conflicting AAG blocks regardless of input ordering (%s)", reverse => {
    const records = [g.aag, { ...g.aag, decision: "block", reasonForDecision: "Emergency halt" }];
    const projected = projectSnapshot(snapshot(reverse ? records.reverse() : records));
    expect(buildImportedOperatorSummary(projected.trace, projected.gaps, now).answers[1].answer).toBe("No");
    expect(importedTraceVerdict(projected.trace)).toBe("Execution denied");
    expect(projected.trace.events.filter(e => e.kind === "aag-decision" && !e.missing)).toHaveLength(2);
  });
  it("does not combine allowed stages for materially different actions", async () => {
    const result = await view(snapshot([...base, { ...g.aag, proposal: { ...p, target: "different_target" } }]));
    expect(result.summary.answers[1].tone).not.toBe("positive");
    expect(result.summary.findings.some(f => f.title === "Governance records conflict")).toBe(true);
    expect(importedTraceVerdict(result.trace)).toBe("Governance records conflict");
  });
  it("surfaces parser errors and prevents a positive summary", async () => {
    const input = snapshot(base); input.diagnostics.push({ severity: "error", code: "artifact.parser-error", message: "Context Admission digest invalid" });
    const result = await view(input);
    expect(result.summary.findings.some(f => f.explanation.includes("digest invalid"))).toBe(true);
    expect(result.summary.answers[1].tone).not.toBe("positive");
  });
  it("surfaces valid admission rejection embedded in a standalone PGDL packet", async () => {
    const request = JSON.parse(readFileSync("../../examples/context-admission/valid-temporal-relay.json", "utf8"));
    request.artifacts[0].revoked = true;
    const contextAdmission = evaluateContextAdmission(request);
    const result = await view(snapshot([{ ...g.pgdl, contextAdmission }]));
    expect(result.summary.answers[1].answer).toBe("No");
    expect(result.summary.findings.some(f => f.title.includes("revoked"))).toBe(true);
  });
  it("does not describe expired historical admission as currently usable", async () => {
    const request = JSON.parse(readFileSync("../../examples/context-admission/valid-temporal-relay.json", "utf8"));
    const result = await view(snapshot([evaluateContextAdmission(request)]));
    expect(result.summary.stages[0]!.label).toContain("expired");
    expect(result.summary.stages[0]!.tone).not.toBe("positive");
  });
  it("recognizes a resolved PGDL revision reviewed by AAG", async () => {
    const result = await view(snapshot([{ ...g.pgdl, decision: "revise_before_aag", resolvedProposal: p }, ...base.slice(1)]));
    expect(result.summary.stages[1]!.label).toBe("Revision reviewed");
  });
  it("keeps material denials from another proposal", () => {
    const projected = projectSnapshot(snapshot([...base, { ...g.aag, proposal: { ...p, id: "other" }, decision: "block" }]));
    const summary = buildImportedOperatorSummary(projected.trace, projected.gaps);
    expect(summary.answers[1].answer).toBe("No");
    expect(summary.findings.some(f => f.title === "Multiple proposals imported")).toBe(true);
  });
  it("does not fall back to a sample run when local trace props are absent", () => {
    const projected = projectSnapshot(snapshot());
    const summary = buildImportedOperatorSummary(projected.trace, projected.gaps);
    const html = renderToStaticMarkup(<LiveActionTracePage deployment={projected.deployment} mode="local-evidence" trace={sampleTrace} operatorSummary={summary} showTechnicalDetails={true} onNavigate={() => {}} />);
    expect(html).toContain("No imported trace evidence");
    for (const event of sampleTrace.events) expect(html).not.toContain(event.timestamp);
  });
  it("never renders sample timestamps or workflow provenance for empty local evidence", () => {
    const projected = projectSnapshot(snapshot());
    const html = renderToStaticMarkup(<FlowsPage deployment={projected.deployment} mode="local-evidence" trace={sampleTrace} importedTrace={projected.trace} gaps={projected.gaps} onNavigate={() => {}} />);
    for (const event of sampleTrace.events) expect(html).not.toContain(event.timestamp);
    expect(html).not.toContain(sampleTrace.workflowId);
    expect(html).toContain("Not imported");
  });
});
