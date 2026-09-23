import { Heatmap, MiniBarChart, TrendLineChart } from "../components/Charts";
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
          <KpiCard label="Receipt History" value="Not Evaluated" detail="requires receipt artifacts" tone="blue" icon="RH" />
          <KpiCard label="Pattern Alerts" value={importedMemoryArtifacts.length} detail="imported memory summaries" tone="amber" icon="!" />
          <KpiCard label="Policy Suggestions" value="Review" detail="no silent mutation" tone="purple" icon="PS" />
          <KpiCard label="Repeat Failures" value="Not Evaluated" detail="requires history window" tone="red" icon="RF" />
          <KpiCard label="Memory Integrity" value="Not independently verified" detail="Artifact presence does not establish memory integrity" tone="amber" icon="MI" />
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
          <Panel title="Operator Boundary" eyebrow="read-only memory">
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
        <KpiCard label="Receipt History" value="128" detail="sample local records" tone="blue" icon="RH" sparkline={[80, 91, 103, 112, 119, 128]} />
        <KpiCard label="Pattern Alerts" value={signals.length} detail="reviewable signals" tone="amber" icon="!" />
        <KpiCard label="Policy Suggestions" value={recommendations.length} detail="all require review" tone="purple" icon="PS" />
        <KpiCard label="Repeat Failures" value="14" detail="missing approval and scope drift" tone="red" icon="RF" />
        <KpiCard label="Memory Integrity" value="81%" detail="sample evidence quality" tone="teal" icon="MI" ringValue={81} />
      </section>
      <section className="memory-grid">
        <Panel title="Memory Analytics Over Time" eyebrow="sample receipt history">
          <div className="tab-row" role="tablist" aria-label="Memory time range">
            {["7D", "30D", "90D", "6M"].map((tab) => <button type="button" className={tab === "30D" ? "active" : ""} key={tab}>{tab}</button>)}
          </div>
          <TrendLineChart
            series={[
              { label: "Repeated PGDL revisions", values: [34, 38, 43, 42, 48, 52, 50], tone: "blue" },
              { label: "Repeated missing approvals", values: [22, 29, 31, 28, 35, 39, 34], tone: "red" },
              { label: "Repeated runtime substitutions", values: [28, 25, 22, 19, 18, 16, 13], tone: "amber" },
              { label: "Safe allow trend", values: [61, 66, 68, 72, 77, 81, 84], tone: "green" },
              { label: "Escalation burden", values: [40, 43, 45, 44, 42, 46, 47], tone: "purple" },
              { label: "Policy conflicts", values: [19, 17, 15, 14, 13, 11, 9], tone: "teal" },
            ]}
          />
        </Panel>
        <Panel title="Internalization Signals" eyebrow="patterns">
          <div className="signal-list">
            {signals.map((signal) => (
              <article key={signal.id}>
                <StatusBadge label={signal.trend} />
                <h3>{signal.description}</h3>
                <p>{signal.label} - count {signal.count} - confidence Partial</p>
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
          <Heatmap
            rows={[
              { label: "May 12 - May 18", values: [82, 88, 90, 87, 91, 92, 94] },
              { label: "May 5 - May 11", values: [76, 79, 84, 82, 88, 89, 90] },
              { label: "Apr 28 - May 4", values: [70, 72, 78, 80, 81, 85, 88] },
              { label: "Apr 21 - Apr 27", values: [65, 67, 70, 74, 78, 80, 84] },
              { label: "Apr 14 - Apr 20", values: [58, 61, 66, 70, 73, 78, 82] },
            ]}
          />
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
