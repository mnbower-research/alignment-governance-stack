import type { ContinuitySnapshot } from "@alignment-governance-stack/continuity-ingest";

const SNAPSHOT_STORAGE_KEY = "ags.continuity-console.local-evidence-snapshot";

export function readStoredSnapshot(): ContinuitySnapshot | null {
  try {
    const rawSnapshot = window.localStorage.getItem(SNAPSHOT_STORAGE_KEY);
    if (!rawSnapshot) {
      return null;
    }

    return JSON.parse(rawSnapshot) as ContinuitySnapshot;
  } catch {
    return null;
  }
}

export function writeStoredSnapshot(snapshot: ContinuitySnapshot): void {
  window.localStorage.setItem(SNAPSHOT_STORAGE_KEY, JSON.stringify(snapshot));
}

export function clearStoredSnapshot(): void {
  window.localStorage.removeItem(SNAPSHOT_STORAGE_KEY);
}

