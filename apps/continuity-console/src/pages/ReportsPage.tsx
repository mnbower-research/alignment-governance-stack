import type { ContinuitySnapshot } from "@alignment-governance-stack/continuity-ingest";
import { PageHeader } from "../components/PageHeader";
import { Panel } from "../components/Panel";
import type { ConsoleDataMode, EvidenceConfidence, EvidenceGapFinding } from "../lib/evidenceProjection";
import { summarizeSnapshot } from "../lib/evidenceProjection";
import { stableStringify } from "../lib/stableJson";
import type { DeploymentManifest } from "../types/continuity";

interface ReportsPageProps {
  deployment: DeploymentManifest;
  snapshot: ContinuitySnapshot | null;
  gaps: EvidenceGapFinding[];
  mode?: ConsoleDataMode | undefined;
  confidence?: EvidenceConfidence | undefined;
}

function download(name: string, content: string, type: string): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function ReportsPage({ deployment, snapshot, gaps, mode = "sample", confidence }: ReportsPageProps): JSX.Element {
  const diagnostics = snapshot?.diagnostics ?? [];

  return (
    <>
      <PageHeader
        title="Reports"
        description="Local export surface for normalized evidence snapshots, continuity findings, summary Markdown, and import diagnostics."
        deployment={deployment}
        mode={mode}
        confidence={confidence}
      />
      <section className="report-grid">
        <Panel title="Normalized Snapshot JSON" eyebrow="read-only import">
          <button
            type="button"
            onClick={() => download("ags-continuity-snapshot.json", snapshot ? stableStringify(snapshot) : "{}", "application/json")}
          >
            Export snapshot JSON
          </button>
        </Panel>
        <Panel title="Continuity Findings JSON" eyebrow="deterministic gaps">
          <button type="button" onClick={() => download("ags-continuity-findings.json", stableStringify(gaps), "application/json")}>
            Export findings JSON
          </button>
        </Panel>
        <Panel title="Continuity Summary Markdown" eyebrow="operator summary">
          <button
            type="button"
            onClick={() =>
              download(
                "ags-continuity-summary.md",
                snapshot ? summarizeSnapshot(snapshot) : "# AGS Continuity Snapshot Summary\n\nNo local evidence snapshot loaded.\n",
                "text/markdown",
              )
            }
          >
            Export summary Markdown
          </button>
        </Panel>
        <Panel title="Import Diagnostics JSON" eyebrow="warnings and errors">
          <button type="button" onClick={() => download("ags-continuity-diagnostics.json", stableStringify(diagnostics), "application/json")}>
            Export diagnostics JSON
          </button>
        </Panel>
      </section>
    </>
  );
}
