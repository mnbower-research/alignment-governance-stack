import { GovernanceGraph } from "../components/GovernanceGraph";
import { KpiCard } from "../components/KpiCard";
import { PageHeader } from "../components/PageHeader";
import { Panel } from "../components/Panel";
import { StatusBadge } from "../components/StatusBadge";
import { analyzeContinuity } from "../lib/continuityAnalysis";
import type { DeploymentManifest } from "../types/continuity";

interface OverviewPageProps {
  deployment: DeploymentManifest;
}

export function OverviewPage({ deployment }: OverviewPageProps): JSX.Element {
  const analysis = analyzeContinuity(deployment);

  return (
    <>
      <PageHeader
        title="AGS Continuity Console"
        description="Visual control plane for governed delegation across authority, proposal, runtime, evidence, memory, and agency audit."
        deployment={deployment}
      />
      <section className="kpi-grid">
        <KpiCard label="Overall Continuity" value={`${analysis.continuityPercentage}%`} detail="covered layers and edges" tone="teal" />
        <KpiCard label="Governance Functions" value={deployment.layers.length} detail="required layers modeled" tone="blue" />
        <KpiCard label="Covered" value={`${analysis.layerCoverage}%`} detail={`${analysis.coveredLayerCount} layers connected or stronger`} tone="green" />
        <KpiCard label="Evidenced" value={`${analysis.evidencedPercentage}%`} detail={`${analysis.evidencedLayerCount} layers evidenced or stronger`} tone="purple" />
        <KpiCard label="Critical Gaps" value={analysis.criticalGapCount} detail="requires operator attention" tone="red" />
      </section>
      <section className="overview-grid">
        <Panel title="Governance Continuity Graph" eyebrow="12-layer path">
          <GovernanceGraph deployment={deployment} compact />
          <div className="legend">
            {["Missing", "Mapped", "Connected", "Enforced", "Evidenced", "Tested", "Partial", "Degraded"].map((status) => (
              <StatusBadge label={status} key={status} />
            ))}
          </div>
        </Panel>
        <div className="side-stack">
          <Panel title="Plugin Registry" eyebrow="local sample">
            <div className="plugin-card-list">
              {deployment.plugins.map((plugin) => (
                <article className="plugin-card" key={plugin.id}>
                  <div>
                    <h3>{plugin.name}</h3>
                    <p>{plugin.adapterCategory}</p>
                  </div>
                  <StatusBadge label={plugin.integrationStatus} />
                </article>
              ))}
            </div>
          </Panel>
          <Panel title="Critical Gaps" eyebrow="continuity findings">
            <div className="finding-list">
              {deployment.findings.map((finding) => (
                <article key={finding.id}>
                  <StatusBadge label={finding.severity} />
                  <h3>{finding.title}</h3>
                  <p>{finding.description}</p>
                </article>
              ))}
            </div>
          </Panel>
        </div>
      </section>
    </>
  );
}
