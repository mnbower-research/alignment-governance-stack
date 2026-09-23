import { useMemo, useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { Panel } from "../components/Panel";
import { StatusBadge } from "../components/StatusBadge";
import type { ConsoleDataMode, EvidenceConfidence, EvidenceGapFinding } from "../lib/evidenceProjection";
import { operatorFindingCategory } from "../lib/operatorLanguage";
import type { DeploymentManifest } from "../types/continuity";

interface ContinuityGapsPageProps {
  deployment: DeploymentManifest;
  gaps: EvidenceGapFinding[];
  mode?: ConsoleDataMode | undefined;
  confidence?: EvidenceConfidence | undefined;
  onViewArchitecture?: (() => void) | undefined;
}

const severityOrder = ["All", "Critical", "High", "Medium", "Low"];
const statusOrder = ["All", "Missing", "Not Demonstrated", "Diagnostic", "Open"];
const confidenceOrder = ["All", "High", "Partial", "Insufficient"];

function countBy(gaps: EvidenceGapFinding[], predicate: (gap: EvidenceGapFinding) => boolean): number {
  return gaps.filter(predicate).length;
}

function layerName(deployment: DeploymentManifest, layerId: string): string {
  return deployment.layers.find((layer) => layer.id === layerId)?.shortName ?? layerId;
}

export function ContinuityGapsPage({ deployment, gaps, mode = "sample", confidence, onViewArchitecture }: ContinuityGapsPageProps): JSX.Element {
  const [severity, setSeverity] = useState("All");
  const [category, setCategory] = useState("All");
  const [layer, setLayer] = useState("All");
  const [gapConfidence, setGapConfidence] = useState("All");
  const [status, setStatus] = useState("All");
  const [expandedId, setExpandedId] = useState<string | null>(gaps[0]?.id ?? null);

  const categories = Array.from(new Set(gaps.map((gap) => operatorFindingCategory(gap)))).sort();
  const layers = Array.from(new Set(gaps.flatMap((gap) => gap.affectedLayerIds))).sort();
  const filteredGaps = useMemo(
    () =>
      gaps.filter(
        (gap) =>
          (severity === "All" || gap.severity === severity) &&
          (category === "All" || operatorFindingCategory(gap) === category) &&
          (layer === "All" || gap.affectedLayerIds.includes(layer)) &&
          (gapConfidence === "All" || gap.confidence === gapConfidence) &&
          (status === "All" || gap.status === status),
      ),
    [category, gapConfidence, gaps, layer, severity, status],
  );

  return (
    <>
      <PageHeader
        title="Findings"
        description="Operator triage for required controls, incomplete proof, not-verified evidence, and import diagnostics."
        deployment={deployment}
        mode={mode}
        confidence={confidence}
      />
      <section className="summary-chip-grid triage-chips" aria-label="Continuity gap summary">
        <div><strong>{countBy(gaps, (gap) => gap.severity === "Critical")}</strong><span>critical</span></div>
        <div><strong>{countBy(gaps, (gap) => gap.severity === "High")}</strong><span>high</span></div>
        <div><strong>{countBy(gaps, (gap) => gap.severity === "Medium")}</strong><span>medium</span></div>
        <div><strong>{countBy(gaps, (gap) => gap.severity === "Low")}</strong><span>low</span></div>
        <div><strong>{countBy(gaps, (gap) => gap.status === "Diagnostic")}</strong><span>parser diagnostics</span></div>
        <div><strong>{countBy(gaps, (gap) => gap.category === "Governed Chain")}</strong><span>missing-chain artifacts</span></div>
        <div><strong>{countBy(gaps, (gap) => gap.status === "Not Demonstrated")}</strong><span>not-demonstrated layers</span></div>
      </section>
      <Panel title="Filters" eyebrow="triage controls">
        <div className="filter-row">
          <label>
            Severity
            <select value={severity} onChange={(event) => setSeverity(event.target.value)}>
              {severityOrder.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label>
            Category
            <select value={category} onChange={(event) => setCategory(event.target.value)}>
              {["All", ...categories].map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label>
            Layer
            <select value={layer} onChange={(event) => setLayer(event.target.value)}>
              {["All", ...layers].map((item) => <option value={item} key={item}>{item === "All" ? item : layerName(deployment, item)}</option>)}
            </select>
          </label>
          <label>
            Confidence
            <select value={gapConfidence} onChange={(event) => setGapConfidence(event.target.value)}>
              {confidenceOrder.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label>
            Status
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              {statusOrder.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
        </div>
      </Panel>
      <section className="triage-table-wrap" aria-label="Continuity gap triage table">
        <div className="triage-table">
          <div className="triage-header">
            <span>Severity</span>
            <span>Category</span>
            <span>Finding</span>
            <span>Layer</span>
            <span>Confidence</span>
            <span>Source</span>
            <span>Last detected</span>
            <span />
          </div>
          {filteredGaps.map((gap) => {
            const expanded = expandedId === gap.id;
            return (
              <article className={`triage-row triage-${gap.status.toLowerCase().replaceAll(" ", "-")}`} key={gap.id}>
                <button type="button" className="triage-summary" onClick={() => setExpandedId(expanded ? null : gap.id)}>
                  <StatusBadge label={gap.severity} />
                  <StatusBadge label={operatorFindingCategory(gap)} />
                  <strong>{gap.title}</strong>
                  <span>{gap.affectedLayerIds.map((layerId) => layerName(deployment, layerId)).join(", ")}</span>
                  <StatusBadge label={gap.confidence} />
                  <span>{gap.sourceMode}</span>
                  <span>{gap.lastDetectedAt}</span>
                  <span>{expanded ? "Hide details" : "View details"}</span>
                </button>
                {expanded ? (
                  <div className="triage-detail">
                    <p>{gap.description}</p>
                    <dl>
                      <div><dt>Evidence basis</dt><dd>{gap.evidenceBasis}</dd></div>
                      <div><dt>Missing artifact or guarantee</dt><dd>{gap.missingRequirement}</dd></div>
                      <div><dt>Likely risk</dt><dd>{gap.likelyRisk}</dd></div>
                      <div><dt>Recommended remediation</dt><dd>{gap.recommendation}</dd></div>
                      <div><dt>Source path</dt><dd>{gap.sourcePath ?? "Not tied to a single source artifact"}</dd></div>
                      <div><dt>Parser diagnostic</dt><dd>{gap.parserDiagnostic ?? "Not a parser diagnostic"}</dd></div>
                      <div><dt>First detected</dt><dd>{gap.firstDetectedAt}</dd></div>
                      <div><dt>Last detected</dt><dd>{gap.lastDetectedAt}</dd></div>
                    </dl>
                    {onViewArchitecture ? (
                      <button type="button" className="text-button" onClick={onViewArchitecture}>
                        View in architecture
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
        {filteredGaps.length === 0 ? <p>No gaps match the current filters.</p> : null}
      </section>
    </>
  );
}
