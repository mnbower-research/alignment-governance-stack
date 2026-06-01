import { MiniBarChart, RadarChart } from "../components/Charts";
import { KpiCard } from "../components/KpiCard";
import { PageHeader } from "../components/PageHeader";
import { Panel } from "../components/Panel";
import { StatusBadge } from "../components/StatusBadge";
import type { DeploymentManifest, HumanAgencyAuditResult } from "../types/continuity";

interface HumanAgencyAuditPageProps {
  deployment: DeploymentManifest;
  audit: HumanAgencyAuditResult;
}

export function HumanAgencyAuditPage({ deployment, audit }: HumanAgencyAuditPageProps): JSX.Element {
  const dimensionData = audit.dimensions.map((dimension) => ({
    label: dimension.name,
    value: dimension.score,
  }));

  return (
    <>
      <PageHeader
        title="Human Agency Audit"
        description="Capstone evaluation of whether meaningful human judgment, refusal power, participation, and accountability remain connected to consequence."
        deployment={deployment}
      />
      <section className="kpi-grid">
        <KpiCard label="Agency Preservation Score" value={`${audit.score}%`} detail="sample scorecard" tone="teal" />
        <KpiCard label="Meaningful Review" value={`${audit.meaningfulReview}%`} detail="review quality estimate" tone="green" />
        <KpiCard label="Rubber-Stamp Risk" value={`${audit.rubberStampRisk}%`} detail="lower is better" tone="amber" />
        <KpiCard label="Refusal Power" value={`${audit.refusalPower}%`} detail="documented halt ability" tone="purple" />
        <KpiCard label="Accountability Clarity" value={`${audit.accountabilityClarity}%`} detail="authority chain visibility" tone="blue" />
      </section>
      <section className="audit-grid">
        <Panel title="Audit Scorecard" eyebrow="agency controls">
          <MiniBarChart data={dimensionData} />
        </Panel>
        <Panel title="Agency Preservation Dimensions" eyebrow="sample visualization">
          <RadarChart data={dimensionData} />
        </Panel>
        <Panel title="Key Questions" eyebrow="human agency">
          <ul className="question-list">
            <li>Can a human still understand the consequential action?</li>
            <li>Can a human refuse, revise, halt, or escalate before commitment?</li>
            <li>Is authority still live at the point of consequence?</li>
            <li>Is human review meaningful or merely procedural?</li>
            <li>Is the system reducing overload or creating rubber-stamping?</li>
            <li>Does the gate preserve judgment or create dependency?</li>
          </ul>
        </Panel>
        <Panel title="Findings and Restoration Priorities" eyebrow="requires review">
          <div className="finding-list">
            {audit.findings.map((finding) => (
              <article key={finding}>
                <StatusBadge label="Partial" />
                <h3>{finding}</h3>
              </article>
            ))}
          </div>
          <div className="recommendation-list">
            {audit.restorationPriorities.map((priority) => (
              <article key={priority}>
                <StatusBadge label="Requires Human Review" />
                <p>{priority}</p>
              </article>
            ))}
          </div>
        </Panel>
      </section>
    </>
  );
}
