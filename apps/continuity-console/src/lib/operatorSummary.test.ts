import { describe, expect, it } from "vitest";
import type { NormalizedAgsArtifact } from "@alignment-governance-stack/continuity-ingest";
import type { EvidenceGapFinding, ImportedTrace, ImportedTraceEvent } from "./evidenceProjection";
import { buildImportedOperatorSummary, buildSampleOperatorSummary } from "./operatorSummary";

function artifact(kind: NormalizedAgsArtifact["kind"], payload: unknown): NormalizedAgsArtifact {
  return {
    id: `${kind}:test`, kind, payload, correlation: { proposalId: "proposal-1" }, summary: `${kind} test evidence`, warnings: [],
    provenance: { sourcePath: `${kind}.json`, fileName: `${kind}.json`, sha256: "a".repeat(64), importedAt: "2026-01-02T00:00:00Z", parserId: `ags.${kind}`, parserVersion: "0.1.0" },
  };
}

function event(kind: NormalizedAgsArtifact["kind"], payload: unknown): ImportedTraceEvent {
  const evidence = artifact(kind, payload);
  return { id: evidence.id, label: kind, kind, status: "Evidenced", timestamp: evidence.provenance.importedAt, summary: evidence.summary, artifact: evidence };
}

function trace(events: ImportedTraceEvent[], contexts: NormalizedAgsArtifact[] = []): ImportedTrace {
  return {
    proposalId: "proposal-1", workflowId: "workflow-1", requestedAction: "Fallback action summary", permitHash: "permit-1",
    target: "target-1", scope: "Imported evidence only", reversible: true, approvalSource: "Imported snapshot",
    events, contextAdmissions: contexts,
  };
}

const highGap: EvidenceGapFinding = {
  id: "gap-high", severity: "High", category: "Governed Chain", status: "Missing", confidence: "High",
  sourceMode: "Local Evidence Mode", title: "Receipt chain incomplete", description: "The final proof record is missing.",
  affectedLayerIds: ["layer-10"], evidenceBasis: "Imported diagnostic", missingRequirement: "Receipt", likelyRisk: "Outcome unproven",
  recommendation: "Import the receipt", firstDetectedAt: "Imported snapshot", lastDetectedAt: "Imported snapshot",
};

describe("Simple Operator Mode translations", () => {
  it("does not turn sample runtime matching or stage presence into permission or execution proof", () => {
    const summary = buildSampleOperatorSummary({ proposalId: "sample", workflowId: "sample", requestedAction: "Draft", permitHash: "sample", target: "sample", scope: "sample", reversible: true, approvalSource: "sample", events: [
      { id: "binding", label: "Execution Matched Permit", status: "Enforced", decision: "Runtime match", timestamp: "09:03:14", payloadSummary: "Sample match" },
      { id: "receipt", label: "Receipt Generated", status: "Evidenced", decision: "Recorded", timestamp: "09:03:18", payloadSummary: "Sample receipt" },
    ] }, []);
    expect(summary.answers.slice(1).map(answer => answer.answer)).toEqual(["Not proven", "Not proven", "Not completely"]);
  });
  it("answers all four questions conservatively for a complete allow", () => {
    const summary = buildImportedOperatorSummary(trace([
      event("pgdl-review-packet", { decision: "forward_to_aag", originalProposal: { userRequest: "Draft a report", target: "internal/reports" } }),
      event("aag-decision", { decision: "allow" }),
      event("runtime-permit", { permitId: "permit-1" }),
      event("runtime-binding-result", { allowed: true }),
      event("receipt", { finalDecision: "execution_allowed", receiptHash: "sha256:receipt" }),
    ]), []);
    expect(summary.answers.map((answer) => answer.question)).toEqual([
      "What did the agent want to do?", "Was it allowed?", "Did it do only what was allowed?", "Can we prove what happened?",
    ]);
    expect(summary.answers[1].answer).toBe("Not yet proven");
    expect(summary.answers[2].answer).toBe("Not proven");
    expect(summary.answers[3].answer).toBe("Not completely");
  });

  it.each([
    ["block", "No", "Stopped"],
    ["require_approval", "Not yet proven", "Human review needed"],
    ["escalate_to_human", "Not yet proven", "Human review needed"],
  ])("never hides AAG outcome %s", (decision, expectedAnswer, findingLabel) => {
    const summary = buildImportedOperatorSummary(trace([
      event("aag-decision", { decision }), event("runtime-binding-result", { allowed: true }),
      event("receipt", { finalDecision: "execution_allowed", receiptHash: "sha256:receipt" }),
    ]), []);
    expect(summary.answers[1].answer).toBe(expectedAnswer);
    expect(summary.findings.some((finding) => finding.title === findingLabel)).toBe(true);
    if (decision === "block") {
      expect(summary.answers[2].answer).toBe("Not proven");
      expect(summary.answers[3].answer).toBe("Not completely");
    }
  });

  it("surfaces expired context and unknown provenance in the simple view", () => {
    const context = artifact("context-admission", {
      decision: "reject",
      findings: [
        { code: "context_expired", decision: "reject", reason: "The artifact expired before this receiving use." },
        { code: "provenance_missing", decision: "require_validation", reason: "No provenance envelope was supplied." },
      ],
    });
    const summary = buildImportedOperatorSummary(trace([], [context]), []);
    expect(summary.findings.map((finding) => finding.title)).toEqual(expect.arrayContaining([
      "The inherited information has expired", "The information's origin is unknown",
    ]));
    expect(summary.stages.find((stage) => stage.stage === "Context Admission")?.label).toBe("Stopped");
  });

  it("does not describe unresolved upstream governance as current permission", () => {
    const context = artifact("context-admission", {
      decision: "require_human_review",
      findings: [{ code: "authority_not_demonstrated", decision: "require_human_review", reason: "Current authority was not demonstrated." }],
    });
    const summary = buildImportedOperatorSummary(trace([
      event("pgdl-review-packet", { decision: "forward_to_aag" }),
      event("aag-decision", { decision: "allow" }),
      event("runtime-permit", { permitId: "permit-1" }),
      event("runtime-binding-result", { allowed: true }),
      event("receipt", { finalDecision: "execution_allowed", receiptHash: "sha256:receipt" }),
    ], [context]), []);

    expect(summary.answers[1].answer).toBe("Not yet proven");
    expect(summary.answers[2].answer).toBe("Not proven");
    expect(summary.answers[3].answer).toBe("Not completely");
    expect(summary.findings.some((finding) => finding.title === "Authority to use the information was not demonstrated")).toBe(true);
  });

  it("keeps incomplete receipts and high-severity gaps visible", () => {
    const summary = buildImportedOperatorSummary(trace([
      event("aag-decision", { decision: "allow" }), event("runtime-binding-result", { allowed: true }),
      event("receipt", { finalDecision: "execution_allowed" }),
    ]), [highGap]);
    expect(summary.answers[3].answer).toBe("Not completely");
    expect(summary.findings.map((finding) => finding.title)).toEqual(expect.arrayContaining(["Unverified", "Receipt chain incomplete"]));
  });
});
