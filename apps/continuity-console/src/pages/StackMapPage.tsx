import { useMemo, useState } from "react";
import { DetailList } from "../components/DetailList";
import { GovernanceGraph } from "../components/GovernanceGraph";
import { PageHeader } from "../components/PageHeader";
import { Panel } from "../components/Panel";
import { StatusBadge } from "../components/StatusBadge";
import type { ConsoleDataMode, EvidenceConfidence } from "../lib/evidenceProjection";
import type { NormalizedAgsArtifact } from "@alignment-governance-stack/continuity-ingest";
import type { DeploymentManifest, GovernanceEdge, GovernanceLayer } from "../types/continuity";

interface StackMapPageProps {
  deployment: DeploymentManifest;
  mode?: ConsoleDataMode | undefined;
  confidence?: EvidenceConfidence | undefined;
  artifactsByLayer?: Map<string, NormalizedAgsArtifact[]> | undefined;
}

export function StackMapPage({ deployment, mode = "sample", confidence, artifactsByLayer }: StackMapPageProps): JSX.Element {
  const [selectedLayer, setSelectedLayer] = useState<GovernanceLayer>(deployment.layers[0]!);
  const [selectedEdge, setSelectedEdge] = useState<GovernanceEdge | null>(deployment.edges[0] ?? null);
  const selectedArtifacts = artifactsByLayer?.get(selectedLayer.id) ?? [];

  const selectedPlugins = useMemo(
    () => deployment.plugins.filter((plugin) => selectedLayer.pluginIds.includes(plugin.id)),
    [deployment.plugins, selectedLayer],
  );

  return (
    <>
      <PageHeader
        title="Advanced Architecture Map"
        description="Inspect governance layers, plugin attachments, and boundary edges without implying live integration where evidence is missing."
        deployment={deployment}
        mode={mode}
        confidence={confidence}
      />
      <section className="stack-map-grid">
        <Panel title="Expanded Continuity Graph" eyebrow="advanced drill-down">
          <GovernanceGraph
            deployment={deployment}
            selectedLayerId={selectedLayer.id}
            selectedEdgeId={selectedEdge?.id}
            onLayerSelect={setSelectedLayer}
            onEdgeSelect={setSelectedEdge}
          />
        </Panel>
        <aside className="drawer-panel stack-inspector">
          <Panel title="Summary" eyebrow={`Layer ${selectedLayer.order}`}>
            <div className="drawer-title-row">
              <h3>{selectedLayer.name}</h3>
              <StatusBadge label={selectedLayer.status} />
            </div>
            <DetailList
              items={[
                ["Purpose", selectedLayer.purpose],
                ["Current status", selectedLayer.status],
                ["Imported artifact count", mode === "local-evidence" ? String(selectedArtifacts.length) : "Sample Mode"],
                ["Confidence", confidence ?? (mode === "sample" ? "Partial" : "Insufficient")],
              ]}
            />
          </Panel>
          <Panel title="Why it matters" eyebrow="operator context">
            <p>{selectedLayer.purpose}</p>
          </Panel>
          <Panel title="Evidence" eyebrow="visible proof">
            <DetailList items={[["Evidence sources", selectedLayer.evidenceSources.length > 0 ? selectedLayer.evidenceSources : ["No evidence source attached"]]]} />
          </Panel>
          <Panel title="Known gaps" eyebrow="operator review">
            <DetailList items={[["Known gaps", selectedLayer.knownGaps.length > 0 ? selectedLayer.knownGaps : ["No known gap listed"]]]} />
          </Panel>
          <Panel title="Recommended next step" eyebrow="human review">
            <p>{selectedLayer.knownGaps.length > 0 ? "Review the listed gaps and attach supporting evidence before claiming the layer is verified." : "Keep this layer under ordinary review and inspect related evidence when the deployment changes."}</p>
          </Panel>
          <Panel title="Technical details" eyebrow="source, parser, hashes">
            {mode === "local-evidence" ? (
              <div className="artifact-list">
                <h4>Related Artifacts</h4>
                {selectedArtifacts.length === 0 ? <p>Not Demonstrated: no supported artifact is mapped to this layer.</p> : null}
                {selectedArtifacts.map((artifact) => (
                  <details key={artifact.id}>
                    <summary>{artifact.provenance.fileName}</summary>
                    <DetailList
                      items={[
                        ["Summary", artifact.summary],
                        ["Artifact kind", artifact.kind],
                        ["Artifact ID", artifact.id],
                        ["Source path", artifact.provenance.sourcePath],
                        ["SHA-256", artifact.provenance.sha256],
                        ["Parser", `${artifact.provenance.parserId}@${artifact.provenance.parserVersion}`],
                        ["Warnings", artifact.warnings.length > 0 ? artifact.warnings : ["None"]],
                      ]}
                    />
                    <details>
                      <summary>Raw JSON payload</summary>
                      <pre className="raw-json">{JSON.stringify(artifact.payload, null, 2)}</pre>
                    </details>
                  </details>
                ))}
              </div>
            ) : <p>Sample Mode has no imported hashes, parser IDs, or source paths.</p>}
          </Panel>
          <Panel title="Assumptions and Guarantees" eyebrow="architecture claim hygiene">
            <DetailList
              items={[
                ["Connected plugins", selectedPlugins.map((plugin) => plugin.name)],
                ["Upstream dependencies", selectedLayer.upstreamDependencies],
                ["Downstream guarantees", selectedLayer.downstreamGuarantees],
              ]}
            />
          </Panel>
          {selectedEdge ? (
            <Panel title="Edge Evidence" eyebrow="boundary inspection">
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
          <Panel title="Parser Diagnostics" eyebrow="layer scope">
            <div className="state-grid">
              <div>
                <strong>Artifact warnings</strong>
                <StatusBadge label={selectedArtifacts.some((artifact) => artifact.warnings.length > 0) ? "Partial" : "Not Demonstrated"} />
              </div>
            </div>
            <p>{selectedArtifacts.some((artifact) => artifact.warnings.length > 0) ? "One or more related artifacts includes parser warnings." : "No parser warnings are attached to the selected layer artifacts."}</p>
          </Panel>
        </aside>
      </section>
    </>
  );
}
