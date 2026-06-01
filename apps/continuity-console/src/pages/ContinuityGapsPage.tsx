import { useMemo, useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { Panel } from "../components/Panel";
import { StatusBadge } from "../components/StatusBadge";
import type { ConsoleDataMode, EvidenceConfidence, EvidenceGapFinding } from "../lib/evidenceProjection";
import type { DeploymentManifest } from "../types/continuity";

interface ContinuityGapsPageProps {
  deployment: DeploymentManifest;
  gaps: EvidenceGapFinding[];
  mode?: ConsoleDataMode | undefined;
  confidence?: EvidenceConfidence | undefined;
}

export function ContinuityGapsPage({ deployment, gaps, mode = "sample", confidence }: ContinuityGapsPageProps): JSX.Element {
  const [severity, setSeverity] = useState("All");
  const [category, setCategory] = useState("All");
  const filteredGaps = useMemo(
    () =>
      gaps.filter(
        (gap) => (severity === "All" || gap.severity === severity) && (category === "All" || gap.category === category),
      ),
    [category, gaps, severity],
  );
  const categories = Array.from(new Set(gaps.map((gap) => gap.category))).sort();

  return (
    <>
      <PageHeader
        title="Continuity Gaps"
        description="Evidence-backed gap review. Local Evidence Mode reports what imported artifacts demonstrate and what remains insufficient."
        deployment={deployment}
        mode={mode}
        confidence={confidence}
      />
      <Panel title="Filters" eyebrow="deterministic findings">
        <div className="filter-row">
          <label>
            Severity
            <select value={severity} onChange={(event) => setSeverity(event.target.value)}>
              {["All", "Critical", "High", "Medium", "Low"].map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label>
            Category
            <select value={category} onChange={(event) => setCategory(event.target.value)}>
              {["All", ...categories].map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
        </div>
      </Panel>
      <section className="gap-list">
        {filteredGaps.map((gap) => (
          <article key={gap.id}>
            <div className="drawer-title-row">
              <div>
                <span>{gap.category}</span>
                <h3>{gap.title}</h3>
              </div>
              <StatusBadge label={gap.severity} />
            </div>
            <p>{gap.description}</p>
            {gap.sourcePath ? <code>{gap.sourcePath}</code> : null}
            <p>{gap.recommendation}</p>
          </article>
        ))}
        {filteredGaps.length === 0 ? <p>No gaps match the current filters.</p> : null}
      </section>
    </>
  );
}
