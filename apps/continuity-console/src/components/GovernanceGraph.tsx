import type { DeploymentManifest, GovernanceEdge, GovernanceLayer } from "../types/continuity";
import { pluralize } from "../lib/format";
import { StatusBadge } from "./StatusBadge";

interface GovernanceGraphProps {
  deployment: DeploymentManifest;
  selectedLayerId?: string | undefined;
  selectedEdgeId?: string | undefined;
  onLayerSelect?: (layer: GovernanceLayer) => void;
  onEdgeSelect?: (edge: GovernanceEdge) => void;
  compact?: boolean;
}

export function GovernanceGraph({
  deployment,
  selectedLayerId,
  selectedEdgeId,
  onLayerSelect,
  onEdgeSelect,
  compact = false,
}: GovernanceGraphProps): JSX.Element {
  const pluginCountByLayer = new Map<string, number>();
  for (const layer of deployment.layers) {
    pluginCountByLayer.set(layer.id, layer.pluginIds.length);
  }

  return (
    <div className={`governance-graph ${compact ? "compact-graph" : ""}`}>
      {deployment.layers.map((layer, index) => {
        const nextEdge = deployment.edges.find((edge) => edge.sourceLayerId === layer.id);
        const isSelected = selectedLayerId === layer.id;

        return (
          <div className="graph-row" key={layer.id}>
            <button
              type="button"
              className={`layer-node ${isSelected ? "selected" : ""}`}
              onClick={() => onLayerSelect?.(layer)}
            >
              <span className="layer-number">{layer.order.toString().padStart(2, "0")}</span>
              <div className="layer-main">
                <div className="layer-title-row">
                  <h3>{layer.name}</h3>
                  <StatusBadge label={layer.status} />
                </div>
                <p>{layer.purpose}</p>
                <div className="layer-meta">
                  <span>{pluralize(pluginCountByLayer.get(layer.id) ?? 0, "plugin")}</span>
                  <span>{pluralize(layer.evidenceSources.length, "evidence source")}</span>
                  <span>{layer.lastVerifiedAt}</span>
                </div>
              </div>
            </button>
            {nextEdge && index < deployment.layers.length - 1 ? (
              <button
                type="button"
                className={`edge-line edge-${nextEdge.status.toLowerCase()} ${selectedEdgeId === nextEdge.id ? "selected" : ""}`}
                onClick={() => onEdgeSelect?.(nextEdge)}
                aria-label={`Inspect edge from ${layer.name}`}
              >
                <span />
                <StatusBadge label={nextEdge.status} />
              </button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
