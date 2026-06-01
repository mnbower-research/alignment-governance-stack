import { useMemo, useState } from "react";
import { DetailList } from "../components/DetailList";
import { GovernanceGraph } from "../components/GovernanceGraph";
import { PageHeader } from "../components/PageHeader";
import { Panel } from "../components/Panel";
import { StatusBadge } from "../components/StatusBadge";
import type { DeploymentManifest, GovernanceEdge, GovernanceLayer } from "../types/continuity";

interface StackMapPageProps {
  deployment: DeploymentManifest;
}

export function StackMapPage({ deployment }: StackMapPageProps): JSX.Element {
  const [selectedLayer, setSelectedLayer] = useState<GovernanceLayer>(deployment.layers[0]!);
  const [selectedEdge, setSelectedEdge] = useState<GovernanceEdge | null>(deployment.edges[0] ?? null);

  const selectedPlugins = useMemo(
    () => deployment.plugins.filter((plugin) => selectedLayer.pluginIds.includes(plugin.id)),
    [deployment.plugins, selectedLayer],
  );

  return (
    <>
      <PageHeader
        title="Stack Map"
        description="Inspect governance layers, plugin attachments, and boundary edges without implying live integration where evidence is missing."
        deployment={deployment}
      />
      <section className="stack-map-grid">
        <Panel title="Expanded Continuity Graph" eyebrow="click a layer or edge">
          <GovernanceGraph
            deployment={deployment}
            selectedLayerId={selectedLayer.id}
            selectedEdgeId={selectedEdge?.id}
            onLayerSelect={setSelectedLayer}
            onEdgeSelect={setSelectedEdge}
          />
        </Panel>
        <aside className="drawer-panel">
          <Panel title="Layer Detail" eyebrow={`Layer ${selectedLayer.order}`}>
            <div className="drawer-title-row">
              <h3>{selectedLayer.name}</h3>
              <StatusBadge label={selectedLayer.status} />
            </div>
            <DetailList
              items={[
                ["Purpose", selectedLayer.purpose],
                ["Connected plugins", selectedPlugins.map((plugin) => plugin.name)],
                ["Upstream dependencies", selectedLayer.upstreamDependencies],
                ["Downstream guarantees", selectedLayer.downstreamGuarantees],
                ["Evidence sources", selectedLayer.evidenceSources],
                ["Known gaps", selectedLayer.knownGaps],
                ["Current status", selectedLayer.status],
              ]}
            />
          </Panel>
          {selectedEdge ? (
            <Panel title="Edge Detail" eyebrow="boundary inspection">
              <div className="drawer-title-row">
                <h3>
                  {deployment.layers.find((layer) => layer.id === selectedEdge.sourceLayerId)?.shortName} to{" "}
                  {deployment.layers.find((layer) => layer.id === selectedEdge.destinationLayerId)?.shortName}
                </h3>
                <StatusBadge label={selectedEdge.status} />
              </div>
              <DetailList
                items={[
                  ["Source layer", deployment.layers.find((layer) => layer.id === selectedEdge.sourceLayerId)?.name ?? ""],
                  ["Destination layer", deployment.layers.find((layer) => layer.id === selectedEdge.destinationLayerId)?.name ?? ""],
                  ["Data crossing", selectedEdge.dataCrossing],
                  ["Authority crossing", selectedEdge.authorityCrossing],
                  ["Proof crossing", selectedEdge.proofCrossing],
                  ["Enforcement status", selectedEdge.enforcementStatus],
                  ["Evidence status", selectedEdge.evidenceStatus],
                  ["Known risks", selectedEdge.knownRisks],
                  ["Recommended remediation", selectedEdge.recommendedRemediation],
                ]}
              />
            </Panel>
          ) : null}
        </aside>
      </section>
    </>
  );
}
