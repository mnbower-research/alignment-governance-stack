import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { generateContinuitySnapshot } from "../generateSnapshot.js";

const proposal = {
  id: "proposal-test-1",
  userRequest: "Draft an internal report",
  tool: "doc-generator",
  actionType: "create_draft",
  target: "internal-report.md",
  environment: "local",
  reversible: true,
  externalFacing: false,
  dataSensitivity: "low",
  requiresApproval: false,
  knownApproval: false,
  metadata: {},
};

describe("generateContinuitySnapshot", () => {
  it("normalizes supported artifacts with hashes and parser provenance", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ags-continuity-"));
    await writeFile(
      join(dir, "pgdl.json"),
      JSON.stringify({
        originalProposal: proposal,
        objections: [],
        internalizedPrinciple: "Keep internal drafts reversible.",
        resolvedProposal: proposal,
        decision: "forward_to_aag",
        reasonForDecision: "Low-risk reversible draft.",
      }),
      "utf8",
    );

    const result = await generateContinuitySnapshot({
      sourcePaths: [dir],
      generatedAt: "2026-01-01T00:00:00.000Z",
      importedAt: "2026-01-01T00:00:00.000Z",
    });

    expect(result.snapshot.schemaVersion).toBe("ags.continuity-snapshot.v0.1");
    expect(result.snapshot.artifacts).toHaveLength(1);
    expect(result.snapshot.artifacts[0]?.kind).toBe("pgdl-review-packet");
    expect(result.snapshot.artifacts[0]?.provenance.sha256).toMatch(/^[a-f0-9]{64}$/u);
    expect(result.snapshot.artifacts[0]?.provenance.parserId).toBe("ags.pgdl-packet");
    expect(result.snapshot.diagnostics.some((diagnostic) => diagnostic.code === "continuity-chain.missing-artifact")).toBe(true);
  });

  it("emits diagnostics for malformed and unsupported JSON without silent failures", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ags-continuity-"));
    await writeFile(join(dir, "malformed.json"), "{", "utf8");
    await writeFile(join(dir, "unsupported.json"), JSON.stringify({ demo: true }), "utf8");

    const result = await generateContinuitySnapshot({
      sourcePaths: [dir],
      generatedAt: "2026-01-01T00:00:00.000Z",
      importedAt: "2026-01-01T00:00:00.000Z",
    });

    expect(result.snapshot.artifacts).toHaveLength(0);
    expect(result.snapshot.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      "artifact.malformed-json",
      "artifact.unsupported",
    ]);
  });
});

