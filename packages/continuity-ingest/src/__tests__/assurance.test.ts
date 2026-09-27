import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { evaluateAssurance } from "@alignment-governance-stack/assurance";
import { defaultParsers } from "../index.js";
import { validateSnapshotEvidence } from "../browser.js";
import type { AssuranceEvaluationRequest } from "@alignment-governance-stack/shared-types";
const request = JSON.parse(readFileSync(new URL("../../../../examples/assurance/denial-history.json", import.meta.url), "utf8")) as AssuranceEvaluationRequest;
it("validates refusal history through both raw and browser import paths", async () => {
  const evidence = evaluateAssurance(request.action, request.assurance);
  const parser = defaultParsers.find(p => p.id === "ags.assurance")!;
  const artifacts = parser.parse(evidence, { sourcePath: "denied.json", fileName: "evidence.json", sha256: "a".repeat(64), importedAt: request.assurance.evaluatedAt });
  const snapshot = { schemaVersion: "ags.continuity-snapshot.v0.1" as const, generatedAt: request.assurance.evaluatedAt, deployment: { id: "test", name: "Imported test", environment: "local" }, artifacts, diagnostics: [] };
  const validated = await validateSnapshotEvidence(snapshot);
  expect(validated.artifacts, JSON.stringify(validated.diagnostics)).toHaveLength(1);
  expect(validated.artifacts[0]!.correlation.proposalId).toBe(request.action.id);
  const altered = structuredClone(snapshot); (altered.artifacts[0]!.payload as typeof evidence).decision = "satisfied";
  expect((await validateSnapshotEvidence(altered)).artifacts).toHaveLength(0);
  expect(() => parser.parse({ ...evidence, decision: "satisfied" }, { sourcePath: "tampered.json", fileName: "tampered.json", sha256: "a".repeat(64), importedAt: request.assurance.evaluatedAt })).toThrow();
});
