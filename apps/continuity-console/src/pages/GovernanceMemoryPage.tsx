import { MiniBarChart } from "../components/Charts";
import { KpiCard } from "../components/KpiCard";
import { PageHeader } from "../components/PageHeader";
import { Panel } from "../components/Panel";
import { StatusBadge } from "../components/StatusBadge";
import type { NormalizedAgsArtifact } from "@alignment-governance-stack/continuity-ingest";
import type { ConsoleDataMode, EvidenceConfidence } from "../lib/evidenceProjection";
import type {
  DeploymentManifest,
  GovernanceMemorySignal,
  GovernanceRecommendation,
} from "../types/continuity";

interface GovernanceMemoryPageProps {
  deployment: DeploymentManifest;
  signals: GovernanceMemorySignal[];
  recommendations: GovernanceRecommendation[];
  mode?: ConsoleDataMode | undefined;
  confidence?: EvidenceConfidence | undefined;
  importedMemoryArtifacts?: NormalizedAgsArtifact[] | undefined;
}

export function GovernanceMemoryPage({
  deployment,
  signals,
  recommendations,
  mode = "sample",
  confidence,
  importedMemoryArtifacts = [],
}: GovernanceMemoryPageProps): JSX.Element {
  if (mode === "local-evidence") {
    return (
      <>
        <PageHeader
          title="Governance Memory"
          description="Read-only imported memory summaries and deterministic patterns. Recommendations always require human review."
          deployment={deployment}
          mode={mode}
          confidence={confidence}
        />
        <section className="kpi-grid">
          <KpiCard label="Imported Summaries" value={importedMemoryArtifacts.length} detail="governance-memory artifacts" tone="blue" />
          <KpiCard label="Recommendations" value="Requires Review" detail="no silent mutation" tone="purple" />
          <KpiCard label="Policy Mutation" value="Disabled" detail="read-only mode" tone="green" />
          <KpiCard label="Evidence Confidence" value={confidence ?? "Insufficient"} detail="snapshot-derived" tone="amber" />
          <KpiCard label="Receipt Patterns" value={importedMemoryArtifacts.length > 0 ? "Imported" : "Not Evaluated"} detail="requires receipts" tone="teal" />
        </section>
        <section className="memory-grid">
          <Panel title="Imported Memory Summaries" eyebrow="read-only">
            <div className="recommendation-list">
              {importedMemoryArtifacts.map((artifact) => (
                <article key={artifact.id}>
                  <StatusBadge label="Requires Human Review" />
                  <h3>{artifact.summary}</h3>
                  <p>{artifact.provenance.sourcePath}</p>
                  <details>
                    <summary>Raw JSON payload</summary>
                    <pre className="raw-json">{JSON.stringify(artifact.payload, null, 2)}</pre>
                  </details>
                </article>
              ))}
              {importedMemoryArtifacts.length === 0 ? <p>No Governance Memory summary artifact was imported.</p> : null}
            </div>
          </Panel>
          <Panel title="Operator Boundary" eyebrow="no silent mutation">
            <ul className="question-list">
              <li>Imported recommendations are advisory and require human review.</li>
              <li>The console does not update Policy Profiles, Authority Maps, or participation policy.</li>
              <li>Memory patterns are displayed as evidence, not enacted as configuration.</li>
            </ul>
          </Panel>
        </section>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Governance Memory"
        description="Receipt-history pattern review that recommends improvements for humans without silently mutating policy."
        deployment={deployment}
        mode={mode}
        confidence={confidence}
      />
      <section className="kpi-grid">
        <KpiCard label="Receipt History" value="128" detail="sample local records" tone="blue" />
        <KpiCard label="Pattern Alerts" value={signals.length} detail="reviewable signals" tone="amber" />
        <KpiCard label="Policy Suggestions" value={recommendations.length} detail="all require review" tone="purple" />
        <KpiCard label="Repeat Failures" value="14" detail="missing approval and scope drift" tone="red" />
        <KpiCard label="Memory Integrity" value="81%" detail="sample evidence quality" tone="teal" />
      </section>
      <section className="memory-grid">
        <Panel title="Trend Signals" eyebrow="sample receipt history">
          <MiniBarChart data={signals.map((signal) => ({ label: signal.label, value: signal.count }))} />
        </Panel>
        <Panel title="Internalization Signals" eyebrow="patterns">
          <div className="signal-list">
            {signals.map((signal) => (
              <article key={signal.id}>
                <StatusBadge label={signal.trend} />
                <h3>{signal.description}</h3>
              </article>
            ))}
          </div>
        </Panel>
        <Panel title="Governance Recommendations" eyebrow="no silent mutation">
          <div className="recommendation-list">
            {recommendations.map((recommendation) => (
              <article key={recommendation.id}>
                <StatusBadge label={recommendation.reviewStatus} />
                <h3>{recommendation.title}</h3>
                <p>{recommendation.rationale}</p>
              </article>
            ))}
          </div>
        </Panel>
        <Panel title="Continuity Timeline" eyebrow="sample">
          <div className="continuity-timeline">
            {["Proposal friction", "Boundary revision", "Scoped approval", "Permit match", "Receipt gap", "Human review"].map((step, index) => (
              <div key={step}>
                <span>{index + 1}</span>
                <strong>{step}</strong>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Babel Velocity" eyebrow="structural-risk trend">
          <MiniBarChart
            data={[
              { label: "Decision load", value: 82 },
              { label: "Closure capacity", value: 61 },
              { label: "Review lag", value: 44 },
              { label: "Proof completeness", value: 69 },
              { label: "Authority coverage", value: 74 },
            ]}
          />
        </Panel>
      </section>
    </>
  );
}
