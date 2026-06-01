import { MiniBarChart } from "../components/Charts";
import { KpiCard } from "../components/KpiCard";
import { PageHeader } from "../components/PageHeader";
import { Panel } from "../components/Panel";
import { StatusBadge } from "../components/StatusBadge";
import type {
  DeploymentManifest,
  GovernanceMemorySignal,
  GovernanceRecommendation,
} from "../types/continuity";

interface GovernanceMemoryPageProps {
  deployment: DeploymentManifest;
  signals: GovernanceMemorySignal[];
  recommendations: GovernanceRecommendation[];
}

export function GovernanceMemoryPage({ deployment, signals, recommendations }: GovernanceMemoryPageProps): JSX.Element {
  return (
    <>
      <PageHeader
        title="Governance Memory"
        description="Receipt-history pattern review that recommends improvements for humans without silently mutating policy."
        deployment={deployment}
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
