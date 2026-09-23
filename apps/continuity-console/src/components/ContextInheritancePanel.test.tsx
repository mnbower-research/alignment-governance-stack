import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { ContinuitySnapshot, NormalizedAgsArtifact } from "@alignment-governance-stack/continuity-ingest";
import { ContextInheritancePanel } from "./ContextInheritancePanel";
import { projectSnapshot } from "../lib/evidenceProjection";

const artifact: NormalizedAgsArtifact = {
  id: "context:test", kind: "context-admission", summary: "Recorded require_validation",
  provenance: { sourcePath: "local/context.json", fileName: "context.json", sha256: "abc", importedAt: "2026-09-19T12:00:00Z", parserId: "ags.context-admission", parserVersion: "0.1.0" },
  correlation: { proposalId: "context-report" }, warnings: [], payload: {
    decision: "require_validation", evaluatedAt: "2026-09-19T12:00:00Z",
    requestedUse: { receiverAgentId: "agent-b", purpose: "report", action: { proposalId: "context-report" } },
    artifacts: [{ artifactId: "artifact-x", provenance: { producerAgentId: "agent-a", sourceId: "store", authorityId: "owner" }, createdAt: "2026-09-18T12:00:00Z", parentArtifactIds: ["parent"], transformations: [{ type: "summary" }], revoked: false }],
    findings: [{ code: "lineage_gap", reason: "Parent was not supplied." }]
  }
};
afterEach(cleanup);
describe("context inheritance evidence display", () => {
  it("shows temporal and cross-agent provenance, gaps and the read-only boundary", () => {
    render(<ContextInheritancePanel artifacts={[artifact]} />);
    expect(screen.getByText(/agent-a → artifact-x → agent-b/)).toBeTruthy();
    expect(screen.getByText(/lineage_gap/)).toBeTruthy();
    expect(screen.getByText(/Runtime continuity asks/)).toBeTruthy();
    expect(screen.getByText(/does not grant admission/)).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });
  it("does not infer context admission from absent evidence", () => {
    render(<ContextInheritancePanel artifacts={[]} />);
    expect(screen.getByText(/No Context Admission evidence/)).toBeTruthy();
  });
  it("maps to the existing semantic layer and prepends recorded context to the trace", () => {
    const snapshot: ContinuitySnapshot = { schemaVersion: "ags.continuity-snapshot.v0.1", generatedAt: "2026-09-19T12:00:00Z", deployment: { id: "local", name: "Local", environment: "local" }, artifacts: [artifact], diagnostics: [] };
    const projection = projectSnapshot(snapshot);
    expect(projection.artifactsByLayer.get("layer-3")).toEqual([artifact]);
    expect(projection.trace.events[0]?.kind).toBe("context-admission");
    expect(projection.trace.events[0]?.status).toBe("Observed");
    expect(projection.deployment.plugins).toEqual([]);
  });
});
