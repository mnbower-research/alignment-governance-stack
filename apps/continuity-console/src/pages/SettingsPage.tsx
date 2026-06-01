import { useMemo, useState } from "react";
import type { ContinuitySnapshot } from "@alignment-governance-stack/continuity-ingest";
import { DetailList } from "../components/DetailList";
import { PageHeader } from "../components/PageHeader";
import { Panel } from "../components/Panel";
import { StatusBadge } from "../components/StatusBadge";
import type { ConsoleDataMode, EvidenceConfidence } from "../lib/evidenceProjection";
import type { DeploymentManifest } from "../types/continuity";

interface SettingsPageProps {
  deployment: DeploymentManifest;
  snapshot: ContinuitySnapshot | null;
  mode: ConsoleDataMode;
  confidence?: EvidenceConfidence | undefined;
  onSnapshotLoad: (snapshot: ContinuitySnapshot) => void;
  onSnapshotClear: () => void;
}

function countKinds(snapshot: ContinuitySnapshot | null): Array<[string, number]> {
  if (!snapshot) {
    return [];
  }

  return Object.entries(
    snapshot.artifacts.reduce<Record<string, number>>((accumulator, artifact) => {
      accumulator[artifact.kind] = (accumulator[artifact.kind] ?? 0) + 1;
      return accumulator;
    }, {}),
  ).sort(([left], [right]) => left.localeCompare(right));
}

export function SettingsPage({ deployment, snapshot, mode, confidence, onSnapshotLoad, onSnapshotClear }: SettingsPageProps): JSX.Element {
  const [message, setMessage] = useState<string>("No import action this session.");
  const kindCounts = useMemo(() => countKinds(snapshot), [snapshot]);

  async function loadBundledSnapshot(): Promise<void> {
    try {
      const response = await fetch("/data/current-snapshot.json", { cache: "no-store" });
      if (!response.ok) {
        setMessage(`Bundled snapshot load failed with HTTP ${response.status}.`);
        return;
      }

      onSnapshotLoad((await response.json()) as ContinuitySnapshot);
      setMessage("Loaded bundled read-only snapshot.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Bundled snapshot load failed.");
    }
  }

  async function loadUploadedFile(file: File): Promise<void> {
    try {
      const text = await file.text();
      onSnapshotLoad(JSON.parse(text) as ContinuitySnapshot);
      setMessage(`Loaded uploaded snapshot: ${file.name}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Uploaded snapshot import failed.");
    }
  }

  return (
    <>
      <PageHeader
        title="Settings"
        description="Local-only evidence import controls. Snapshots are read by the browser and persisted only in localStorage."
        deployment={deployment}
        mode={mode}
        confidence={confidence}
      />
      <section className="settings-grid">
        <Panel title="Data Mode" eyebrow="local only">
          <DetailList
            items={[
              ["Current mode", mode === "local-evidence" ? "Local Evidence Mode" : "Sample Mode"],
              ["Schema version", snapshot?.schemaVersion ?? "Not loaded"],
              ["Generated", snapshot?.generatedAt ?? "Not loaded"],
              ["Deployment", snapshot ? `${snapshot.deployment.name} (${snapshot.deployment.environment})` : deployment.name],
              ["Artifacts", snapshot?.artifacts.length ?? 0],
              ["Diagnostics", snapshot?.diagnostics.length ?? 0],
              ["Last action", message],
            ]}
          />
          <div className="approval-actions">
            <button type="button" onClick={() => void loadBundledSnapshot()}>
              Load bundled snapshot
            </button>
            <button type="button" onClick={onSnapshotClear}>
              Clear to Sample Mode
            </button>
          </div>
        </Panel>
        <Panel title="Upload Snapshot JSON" eyebrow="browser import">
          <label className="drop-zone">
            <span>Drop or choose a normalized continuity snapshot JSON file</span>
            <input
              type="file"
              accept="application/json,.json"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  void loadUploadedFile(file);
                }
              }}
            />
          </label>
          <p>No filesystem watcher, backend, approval write-back, or live agent connection is used.</p>
        </Panel>
        <Panel title="Artifact Counts" eyebrow="by kind">
          <div className="state-grid">
            {kindCounts.map(([kind, count]) => (
              <div key={kind}>
                <strong>{kind}</strong>
                <StatusBadge label={String(count)} />
              </div>
            ))}
            {kindCounts.length === 0 ? <p>No snapshot loaded.</p> : null}
          </div>
        </Panel>
        <Panel title="Import Diagnostics" eyebrow="warnings and errors">
          <div className="finding-list">
            {snapshot?.diagnostics.map((diagnostic, index) => (
              <article key={`${diagnostic.code}-${index}`}>
                <StatusBadge label={diagnostic.severity} />
                <h3>{diagnostic.code}</h3>
                <p>{diagnostic.message}</p>
                {diagnostic.sourcePath ? <code>{diagnostic.sourcePath}</code> : null}
              </article>
            ))}
            {!snapshot || snapshot.diagnostics.length === 0 ? <p>No diagnostics loaded.</p> : null}
          </div>
        </Panel>
      </section>
    </>
  );
}
