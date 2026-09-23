import type { ContinuitySnapshot } from "@alignment-governance-stack/continuity-ingest";

const SNAPSHOT_STORAGE_KEY = "ags.continuity-console.local-evidence-snapshot";

export function readStoredSnapshot(): ContinuitySnapshot | null {
  try {
    const rawSnapshot = window.localStorage.getItem(SNAPSHOT_STORAGE_KEY);
    if (rawSnapshot === null) {
      return null;
    }

    const parsed: unknown = JSON.parse(rawSnapshot);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Invalid stored snapshot.");
    return parsed as ContinuitySnapshot;
  } catch {
    return { schemaVersion: "ags.continuity-snapshot.v0.1", generatedAt: "Unknown", deployment: { id: "corrupt-local-evidence", name: "Saved evidence recovery required", environment: "local" }, artifacts: [], diagnostics: [{ severity: "error", code: "artifact.parser-error", message: "Saved local evidence is corrupt or inaccessible. Clear or import a valid snapshot to recover." }] };
  }
}

export function writeStoredSnapshot(snapshot: ContinuitySnapshot): void {
  window.localStorage.setItem(SNAPSHOT_STORAGE_KEY, JSON.stringify(snapshot));
}

export function clearStoredSnapshot(): void {
  window.localStorage.removeItem(SNAPSHOT_STORAGE_KEY);
}
