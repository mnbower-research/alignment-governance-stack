import type { ContinuitySnapshot } from "@alignment-governance-stack/continuity-ingest";
import { PageHeader } from "../components/PageHeader";
import { Panel } from "../components/Panel";
import { StatusBadge } from "../components/StatusBadge";
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
  const generatedAt = snapshot?.generatedAt ?? deployment.lastScanAt;
  const reportCards = [
    {
      title: "Export Continuity Snapshot JSON",
      description: "Download the active normalized continuity snapshot for local review.",
      type: "application/json",
      button: "Export snapshot JSON",
      file: "ags-continuity-snapshot.json",
      content: snapshot ? stableStringify(snapshot) : "{}",
    },
    {
      title: "Export Continuity Findings JSON",
      description: "Download deterministic continuity findings generated from the active view.",
      type: "application/json",
      button: "Export findings JSON",
      file: "ags-continuity-findings.json",
      content: stableStringify(gaps),
    },
    {
      title: "Export Diagnostics JSON",
      description: "Download parser and import diagnostics without changing source evidence.",
      type: "application/json",
      button: "Export diagnostics JSON",
      file: "ags-continuity-diagnostics.json",
      content: stableStringify(diagnostics),
    },
    {
      title: "Export Continuity Summary Markdown",
      description: "Download a local Markdown summary suitable for human review.",
      type: "text/markdown",
      button: "Export summary Markdown",
      file: "ags-continuity-summary.md",
      content: snapshot ? summarizeSnapshot(snapshot) : "# AGS Continuity Snapshot Summary\n\nNo local evidence snapshot loaded.\n",
    },
  ];

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
        {reportCards.map((card) => (
          <Panel title={card.title} eyebrow="local export" key={card.title}>
            <p className="panel-copy">{card.description}</p>
            <dl className="compact-summary-list">
              <div><dt>File type</dt><dd>{card.type}</dd></div>
              <div><dt>Source mode</dt><dd>{mode === "local-evidence" ? "Local Evidence Mode" : "Sample Mode"}</dd></div>
              <div><dt>Generated</dt><dd>{generatedAt}</dd></div>
              <div><dt>Evidence confidence</dt><dd><StatusBadge label={confidence ?? (mode === "sample" ? "Partial" : "Insufficient")} /></dd></div>
            </dl>
            <button type="button" className="primary-button" onClick={() => download(card.file, card.content, card.type)}>
              {card.button}
            </button>
          </Panel>
        ))}
      </section>
    </>
  );
}
