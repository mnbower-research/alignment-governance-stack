import { validateContextAdmissionEvidenceAsync } from "@alignment-governance-stack/context-admission/browser";
import { verifyGovernanceReceiptAsync, canonicalizeForHash, sha256HexAsync } from "@alignment-governance-stack/receipts/browser";
import { assertArtifactShape, assertNestedShapes, record } from "./artifactShape.js";
import { correlateArtifact } from "./correlation.js";
import type { ContinuitySnapshot, NormalizedAgsArtifact } from "./types.js";
const verifiedReceipts = new WeakSet<object>();
export function hasVerifiedReceipt(value: unknown): boolean {
  return value !== null && typeof value === "object" && verifiedReceipts.has(value);
}
async function validateTree(value: unknown): Promise<void> {
  if (!value || typeof value !== "object") return;
  const record = value as Record<string, unknown>;
  if (record.version === "context-admission/v0.1" && !await validateContextAdmissionEvidenceAsync(value))
    throw new Error("Context Admission evidence has invalid content-free shape or digest.");
  if (record.version === "ags.receipt.v0.1" && !await verifyGovernanceReceiptAsync(value))
    throw new Error("Receipt integrity verification failed.");
  if (record.version === "agency-fingerprint/v0.1") {
    assertArtifactShape("agency-fingerprint", value);
    const { fingerprintId, fingerprintHash, ...body } = record;
    const hash = await sha256HexAsync(canonicalizeForHash(body));
    if (fingerprintHash !== hash || fingerprintId !== `agency-fingerprint-${hash.slice(0, 16)}`) throw new Error("Fingerprint integrity verification failed.");
  }
  for (const [key, child] of Object.entries(record)) {
    if (key === "contextAdmission" && child !== undefined && !await validateContextAdmissionEvidenceAsync(child))
      throw new Error("Nested Context Admission evidence has invalid content-free shape or digest.");
    await validateTree(child);
  }
}
function freezeVerified(value: unknown): void {
  if (!value || typeof value !== "object") return;
  for (const child of Object.values(value)) freezeVerified(child);
  Object.freeze(value);
  if ((value as Record<string, unknown>).version === "ags.receipt.v0.1") verifiedReceipts.add(value);
}
/** Revalidate browser uploads and persisted snapshots; serialized trust flags are never trusted. */
export async function validateSnapshotEvidence(input: ContinuitySnapshot): Promise<ContinuitySnapshot> {
  const snapshot = JSON.parse(JSON.stringify(input)) as ContinuitySnapshot;
  if (snapshot.schemaVersion !== "ags.continuity-snapshot.v0.1" || !Array.isArray(snapshot.artifacts) ||
      !Array.isArray(snapshot.diagnostics) || !record(snapshot.deployment) ||
      ![snapshot.deployment.id, snapshot.deployment.name, snapshot.deployment.environment].every(v => typeof v === "string" && v.length > 0) ||
      typeof snapshot.generatedAt !== "string")
    throw new Error("Invalid continuity snapshot.");
  snapshot.diagnostics = snapshot.diagnostics.map(diagnostic => record(diagnostic) &&
    ["info", "warning", "error"].includes(diagnostic.severity) && typeof diagnostic.code === "string" &&
    typeof diagnostic.message === "string" && (diagnostic.sourcePath === undefined || typeof diagnostic.sourcePath === "string")
    ? diagnostic : { severity: "error", code: "artifact.parser-error", message: "Malformed imported diagnostic; its original finding could not be established." });
  if (!Number.isFinite(Date.parse(snapshot.generatedAt))) snapshot.diagnostics.push({ severity: "warning", code: "snapshot.unknown-time", message: "Snapshot generation time is unknown or invalid." });
  const artifacts: NormalizedAgsArtifact[] = [];
  for (const artifact of snapshot.artifacts) {
    try {
      if (!record(artifact) || typeof artifact.id !== "string" || typeof artifact.summary !== "string" || !record(artifact.provenance) ||
          ![artifact.provenance.sourcePath, artifact.provenance.fileName, artifact.provenance.parserId, artifact.provenance.parserVersion].every(v => typeof v === "string" && v.length > 0) ||
          !/^[a-f0-9]{64}$/.test(artifact.provenance.sha256) || !Number.isFinite(Date.parse(artifact.provenance.importedAt)) ||
          !record(artifact.correlation) || !Array.isArray(artifact.warnings) || !artifact.warnings.every(v => typeof v === "string")) throw new Error("Malformed normalized artifact or provenance.");
      assertArtifactShape(artifact.kind, artifact.payload);
      assertNestedShapes(artifact.payload);
      if (artifact.kind === "context-admission" && !await validateContextAdmissionEvidenceAsync(artifact.payload))
        throw new Error("Context Admission evidence has invalid content-free shape or digest.");
      if (artifact.kind === "receipt" && (!artifact.payload || (artifact.payload as Record<string, unknown>).version !== "ags.receipt.v0.1"))
        throw new Error("Receipt is missing its canonical envelope.");
      await validateTree(artifact.payload);
      freezeVerified(artifact.payload);
      const use = (artifact.payload as { requestedUse?: { receiverAgentId: string; action?: { proposalId: string } } }).requestedUse;
      const correlation = artifact.kind === "context-admission" && use
        ? { agentId: use.receiverAgentId, ...(use.action ? { proposalId: use.action.proposalId } : {}) }
        : correlateArtifact(artifact.payload);
      artifacts.push({ ...artifact, correlation });
    } catch (error) {
      snapshot.diagnostics.push({ severity: "error", code: "artifact.parser-error", sourcePath: artifact?.provenance?.sourcePath,
        message: error instanceof Error ? error.message : "Evidence verification failed." });
    }
  }
  return { ...snapshot, artifacts };
}
