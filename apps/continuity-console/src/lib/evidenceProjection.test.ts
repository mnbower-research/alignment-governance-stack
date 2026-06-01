import { describe, expect, it } from "vitest";
import { projectSnapshot } from "./evidenceProjection";
import type { ContinuitySnapshot } from "@alignment-governance-stack/continuity-ingest";

const snapshot: ContinuitySnapshot = {
  schemaVersion: "ags.continuity-snapshot.v0.1",
  generatedAt: "2026-01-02T00:00:00.000Z",
  deployment: {
    id: "demo",
    name: "Demo Evidence",
    environment: "local",
  },
  artifacts: [
    {
      id: "pgdl-review-packet:proposal-1",
      kind: "pgdl-review-packet",
      provenance: {
        sourcePath: "pgdl.json",
        fileName: "pgdl.json",
        sha256: "a".repeat(64),
        importedAt: "2026-01-02T00:00:00.000Z",
        parserId: "ags.pgdl-packet",
        parserVersion: "0.1.0",
      },
      correlation: {
        proposalId: "proposal-1",
      },
      summary: "PGDL forward_to_aag for proposal proposal-1",
      payload: {},
      warnings: [],
    },
  ],
  diagnostics: [
    {
      severity: "warning",
      code: "continuity-chain.missing-artifact",
      message: "Proposal proposal-1 has no imported aag-decision artifact.",
      sourcePath: "pgdl.json",
    },
  ],
};

describe("projectSnapshot", () => {
  it("creates a conservative evidence-backed deployment and gaps", () => {
    const projection = projectSnapshot(snapshot);

    expect(projection.deployment.name).toBe("Demo Evidence");
    expect(projection.deployment.layers.find((layer) => layer.id === "layer-5")?.status).toBe("Partial");
    expect(projection.deployment.layers.find((layer) => layer.id === "layer-6")?.status).toBe("Missing");
    expect(projection.gaps.some((gap) => gap.title === "Incomplete governed action chain")).toBe(true);
    expect(projection.trace.events.some((event) => event.kind === "aag-decision" && event.missing)).toBe(true);
  });
});

