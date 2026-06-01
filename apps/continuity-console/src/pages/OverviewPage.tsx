import { GovernanceGraph } from "../components/GovernanceGraph";
import { KpiCard } from "../components/KpiCard";
import { PageHeader } from "../components/PageHeader";
import { Panel } from "../components/Panel";
import { StatusBadge } from "../components/StatusBadge";
import { analyzeContinuity } from "../lib/continuityAnalysis";
import type { ConsoleDataMode, EvidenceConfidence } from "../lib/evidenceProjection";
import type { DeploymentManifest } from "../types/continuity";

interface OverviewPageProps {
  deployment: DeploymentManifest;
  mode?: ConsoleDataMode | undefined;
  confidence?: EvidenceConfidence | undefined;
  artifactCount?: number | undefined;
  diagnosticCount?: number | undefined;
}

export function OverviewPage({ deployment, mode = "sample", confidence, artifactCount, diagnosticCount }: OverviewPageProps): JSX.Element {
  const analysis = analyzeContinuity(deployment);
  const sourceDetail =
    mode === "local-evidence"
      ? `${artifactCount ?? 0} artifacts, ${diagnosticCount ?? 0} diagnostics`
      : "typed sample data";

  return (
    <>
      <PageHeader
        title="AGS Continuity Console"
        description="Visual control plane for governed delegation across authority, proposal, runtime, evidence, memory, and agency audit."
        deployment={deployment}
        mode={mode}
        confidence={confidence}
      />
      <section className="kpi-grid">
        <KpiCard label="Overall Continuity" value={`${analysis.continuityPercentage}%`} detail="covered layers and edges" tone="teal" />
        <KpiCard label="Source Mode" value={mode === "local-evidence" ? "Evidence" : "Sample"} detail={sourceDetail} tone="blue" />
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
          <Panel title={mode === "local-evidence" ? "Imported Evidence Counts" : "Plugin Registry"} eyebrow={mode === "local-evidence" ? "read-only snapshot" : "local sample"}>
            <div className="plugin-card-list">
              {deployment.plugins.length === 0 ? (
                <article className="plugin-card">
                  <div>
                    <h3>No live plugins in Local Evidence Mode</h3>
                    <p>Imported artifacts are read-only evidence, not connected adapters.</p>
                  </div>
                  <StatusBadge label="Read Only" />
                </article>
              ) : null}
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
