import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { webcrypto } from "node:crypto";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { createGovernanceReceipt } from "@alignment-governance-stack/receipts";
import { evaluateGovernedRuntimeActionWithReceipt, type GovernanceRuntimePacket } from "@alignment-governance-stack/governance-core";
import { findParser, type ContinuitySnapshot, type NormalizedAgsArtifact } from "@alignment-governance-stack/continuity-ingest";
import { validateSnapshotEvidence } from "@alignment-governance-stack/continuity-ingest/browser";
import { buildImportedOperatorSummary } from "./operatorSummary";
import { projectSnapshot, summarizeSnapshot, importedTraceVerdict } from "./evidenceProjection";
import { GovernanceMemoryPage } from "../pages/GovernanceMemoryPage";
import { WorkbenchPage } from "../pages/WorkbenchPage";
import { ContinuityGapsPage } from "../pages/ContinuityGapsPage";

const p = { id: "audit", userRequest: "Generate an internal report", tool: "report.generate", actionType: "generate_report", target: "weekly_summary", environment: "dev", reversible: true, externalFacing: false, dataSensitivity: "low" as const, requiresApproval: false, knownApproval: false, metadata: {} };
const { governance: g, receipt } = evaluateGovernedRuntimeActionWithReceipt({ proposal: p, runtimeAction: p });
const time = "2026-09-22T12:00:00Z";
const provenance = { sourcePath: "audit.json", fileName: "audit.json", sha256: "a".repeat(64), importedAt: time, parserId: "audit", parserVersion: "1" };
function snap(values: unknown[] = []): ContinuitySnapshot {
  return { schemaVersion: "ags.continuity-snapshot.v0.1", generatedAt: time, deployment: { id: "audit", name: "Audit", environment: "local" }, artifacts: values.flatMap(v => findParser(v,"audit.json")!.parse(v,provenance)), diagnostics: [] };
}
async function view(snapshot: ContinuitySnapshot) {
  const checked = await validateSnapshotEvidence(snapshot); const projection = projectSnapshot(checked);
  return { checked, ...projection, summary: buildImportedOperatorSummary(projection.trace, projection.gaps, time) };
}
function altered(change: Record<string, unknown>) { return createGovernanceReceipt({ governancePacket: { ...g, ...change } as GovernanceRuntimePacket }); }
beforeAll(() => vi.stubGlobal("crypto", webcrypto));
afterAll(() => vi.unstubAllGlobals());
describe("Console audit regressions", () => {
  it.each([
    ["expired approval", { approvalValidation: { valid: false, decision: "approval_expired", reasons: ["Approval expired"] } }],
    ["runtime decision vs boolean", { runtimeBinding: { ...g.runtimeBinding, decision: "execution_denied", allowed: true } }],
    ["runtime target substitution", { runtimeAction: { ...p, target: "other" } }],
    ["permit chronology", { permit: { ...g.permit, issuedAt: time, expiresAt: "2000-01-01T00:00:00Z" } }],
    ["blocking detector", { aag: { ...g.aag, detectorResults: [{ detector: "wrongTarget", triggered: true, severity: "high", recommendedDecision: "block", reason: "Wrong target" }] } }],
    ["human participation", { participationQuality: { decision: "insufficient_human_participation", meaningful: false, reasons: ["Human veto"] } }],
    ["runtime failures", { runtimeBinding: { ...g.runtimeBinding, failures: [{ code: "expired_permit", reason: "Expired" }] } }],
  ] as const)("never presents positive permission for %s", async (_name, change) => {
    const result = await view(snap([altered(change)]));
    expect(result.summary.answers[1].tone).not.toBe("positive");
    expect(importedTraceVerdict(result.trace)).not.toBe("Execution allowed (historical)");
    expect(result.summary.findings.every(f => result.gaps.some(gap => gap.id === f.id))).toBe(true);
    const markdown = summarizeSnapshot(result.checked);
    for (const finding of result.summary.findings) expect(markdown).toContain(finding.title);
  });
  it("keeps closure denial and nested history denial material", async () => {
    const closure = JSON.parse(readFileSync("../../examples/decision-closure/allowed-reviewed-publish.json", "utf8"));
    closure.action.actionId = p.id; closure.decision.outcome = "block";
    const nested = createGovernanceReceipt({ governancePacket:g, metadata:{ history:{ aag:{...g.aag,decision:"block"} } } });
    for (const values of [[receipt,closure],[nested]]) {
      const result = await view(snap(values)); expect(result.summary.answers[1].answer).toBe("No");
      expect(result.gaps.some(gap => gap.title === "Denial recorded")).toBe(true);
    }
  });
  it.each(["pgdl-review-packet", "aag-decision", "agency-fingerprint", "runtime-permit"] as const)("rejects malformed normalized %s", async kind => {
    const input = snap([receipt]);
    input.artifacts.push({ id:"bad",kind,payload:{decision:"allow"},summary:"Approved",correlation:{},warnings:[],provenance });
    const result = await view(input);
    expect(result.checked.diagnostics.some(d=>d.code === "artifact.parser-error")).toBe(true);
    expect(result.summary.answers[1].tone).not.toBe("positive");
  });
  it("rejects malformed normalized provenance and does not trust supplied summaries", async () => {
    const input = snap([receipt]); input.artifacts[0]!.provenance.sha256 = "not-a-hash";
    const result = await view(input); expect(result.checked.artifacts).toHaveLength(0);
    expect(result.summary.answers[1].tone).not.toBe("positive");
  });
  it("surfaces unknown warning diagnostics and artifact warnings everywhere", async () => {
    const input = snap([receipt]); input.diagnostics.push({severity:"warning",code:"unknown.review",message:"Approval expired"});
    input.artifacts[0]!.warnings.push("Authority revoked"); const result = await view(input);
    for (const text of ["Approval expired","Authority revoked"]) {
      expect(result.summary.findings.some(f=>f.explanation.includes(text))).toBe(true);
      expect(JSON.stringify(result.gaps)).toContain(text); expect(summarizeSnapshot(result.checked)).toContain(text);
    }
    expect(result.summary.answers[1].tone).not.toBe("positive");
    expect(importedTraceVerdict(result.trace)).not.toBe("Execution allowed (historical)");
  });
  it("preserves complete sequential runtime denial", async () => {
    const run=evaluateGovernedRuntimeActionWithReceipt({proposal:p,runtimeAction:{...p,target:"different"}});
    const result=await view(snap([run.receipt]));
    expect(result.summary.answers[1].answer).toBe("No");
    expect(result.summary.answers[3].answer).toBe("Complete decision evidence");
    expect(result.gaps.some(gap=>gap.title==="Governance records conflict")).toBe(false);
  });
  it("does not inflate confidence, verification time, or memory integrity", async () => {
    const result=await view(snap([receipt,receipt])); expect(result.confidence).not.toBe("High");
    expect(result.deployment.layers.every(l=>l.lastVerifiedAt==="Not independently verified")).toBe(true);
    const html=renderToStaticMarkup(<GovernanceMemoryPage deployment={result.deployment} mode="local-evidence" confidence="High" signals={[]} recommendations={[]} />);
    expect(html.slice(html.indexOf("Memory Integrity"), html.indexOf("Artifact presence"))).toContain("Not independently verified");
  });
  it("isolates Workbench samples and leaves empty trace attributes unknown", async () => {
    const result=await view(snap()); expect(result.trace.reversible).toBeUndefined(); expect(result.trace.workflowId).toBe("not-demonstrated");
    const html=renderToStaticMarkup(<WorkbenchPage deployment={result.deployment} mode="local-evidence" />);
    expect(html).toContain("No operator assignments"); expect(html).not.toContain("Internal Docs Agent Team");
  });
  it("does not turn supplied execution claims into proof", async () => {
    const result=await view(snap([createGovernanceReceipt({governancePacket:g,metadata:{externalExecution:{executed:true,success:true}}})]));
    expect(result.summary.answers[2].answer).toBe("Not proven"); expect(result.gaps.some(gap=>gap.title.includes("Execution claim"))).toBe(true);
  });
  it("does not infer runtime permission from an incomplete receipt", async () => {
    const result = await view(snap([altered({ runtimeBinding: undefined, permit: undefined })]));
    expect(result.summary.answers[1].tone).not.toBe("positive");
    expect(importedTraceVerdict(result.trace)).toBe("Incomplete evidence");
    expect(result.gaps.some(gap => gap.id === "missing-runtime-authorization")).toBe(true);
  });
  it("preserves competing requests and targets in both simple and technical summaries", async () => {
    const result = await view(snap([receipt, { ...g.aag, proposal: { ...p, userRequest: "Different request", target: "other-target" } }]));
    expect(result.summary.answers[0].answer).toContain("Different request");
    expect(result.summary.answers[0].answer).toContain(p.target);
    expect(result.trace.target).toContain("other-target");
    expect(result.trace.requestedAction).toContain("Different request");
    expect(result.summary.answers[1].tone).not.toBe("positive");
  });
  it.each(["approval_required_by_authority", "escalated_before_gate", "revision_required_by_aag"] as const)("exports unresolved final decision %s", async finalDecision => {
    const result = await view(snap([altered({ finalDecision })]));
    expect(result.summary.answers[1].tone).not.toBe("positive");
    expect(result.summary.findings.some(f => f.title === "Human review or validation unresolved")).toBe(true);
    expect(JSON.stringify(result.gaps)).toContain(finalDecision);
    expect(summarizeSnapshot(result.checked)).toContain(finalDecision);
  });
  it("renders the material reason in Findings details", async () => {
    const result = await view(snap([altered({ approvalValidation: { valid: false, decision: "approval_expired", reasons: ["Review expired for this exact target"] } })]));
    const finding = result.gaps.find(gap => gap.title === "Authority or review not established")!;
    const html = renderToStaticMarkup(<ContinuityGapsPage deployment={result.deployment} mode="local-evidence" gaps={[finding]} />);
    expect(html).toContain("Review expired for this exact target");
  });
});
