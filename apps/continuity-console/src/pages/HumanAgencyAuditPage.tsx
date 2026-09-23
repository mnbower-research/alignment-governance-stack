import { MetricRing, RadarChart } from "../components/Charts";
import { KpiCard } from "../components/KpiCard";
import { PageHeader } from "../components/PageHeader";
import { Panel } from "../components/Panel";
import { StatusBadge } from "../components/StatusBadge";
import type { ConsoleDataMode, EvidenceConfidence } from "../lib/evidenceProjection";
import type { DeploymentManifest, HumanAgencyAuditResult } from "../types/continuity";

interface HumanAgencyAuditPageProps {
  deployment: DeploymentManifest;
  audit: HumanAgencyAuditResult;
  mode?: ConsoleDataMode | undefined;
  confidence?: EvidenceConfidence | undefined;
  evidenceCounts?: {
    authority: number;
    participation: number;
    agencyChain: number;
    fingerprint: number;
  } | undefined;
}

export function HumanAgencyAuditPage({ deployment, audit, mode = "sample", confidence, evidenceCounts }: HumanAgencyAuditPageProps): JSX.Element {
  if (mode === "local-evidence") {
    return (
      <>
        <PageHeader
          title="Human Agency Audit"
          description="Conservative read-only audit posture from imported evidence. Missing evidence is marked insufficient instead of inferred."
          deployment={deployment}
          mode={mode}
          confidence={confidence}
        />
        <section className="kpi-grid">
          <KpiCard label="Agency Preservation Score" value="Not Evaluated" detail="requires explicit audit evidence" tone="amber" icon="AP" />
          <KpiCard label="Meaningful Review" value="Insufficient Evidence" detail={`${evidenceCounts?.participation ?? 0} participation artifacts`} tone="purple" icon="?" />
          <KpiCard label="Rubber-Stamp Risk" value="Not Evaluated" detail="no direct audit packet" tone="red" icon="!" />
          <KpiCard label="Refusal Power" value="Insufficient Evidence" detail={`${evidenceCounts?.authority ?? 0} authority artifacts`} tone="blue" icon="RP" />
          <KpiCard label="Accountability Clarity" value={(evidenceCounts?.agencyChain ?? 0) + (evidenceCounts?.fingerprint ?? 0)} detail="chain and fingerprint artifacts" tone="teal" icon="AC" />
        </section>
        <section className="audit-grid">
          <Panel title="Audit Scorecard" eyebrow="conservative evidence standard">
            <div className="scorecard-grid">
              {["Understanding", "Refusal Power", "Revision Power", "Escalation Ability", "Review Quality", "Accountability Chain", "Dependency Risk", "Theater Risk"].map((dimension) => (
                <article key={dimension}>
                  <MetricRing value={0} tone="amber" label={dimension} />
                  <strong>{dimension}</strong>
                  <StatusBadge label="Insufficient Evidence" />
                </article>
              ))}
            </div>
          </Panel>
          <Panel title="Key Questions" eyebrow="not evaluated from absence">
            <div className="question-cards">
              {[
                "Can a human still understand the consequential action?",
                "Can a human refuse, revise, halt, or escalate before commitment?",
                "Is authority still live at the point of consequence?",
                "Is human review meaningful or merely procedural?",
                "Is the system reducing overload or creating rubber-stamping?",
                "Does the gate preserve judgment or create dependency?",
              ].map((question) => (
                <article key={question}>
                  <StatusBadge label="Insufficient Evidence" />
                  <p>{question}</p>
                </article>
              ))}
            </div>
          </Panel>
          <Panel title="Methodology" eyebrow="read-only imported evidence">
            <ul className="question-list">
              <li>Scores are not computed from absence of evidence.</li>
              <li>Authority, participation, refusal power, and accountability require direct imported artifacts.</li>
              <li>Imported summaries are read-only and do not mutate policies or approvals.</li>
              <li>Unsupported or malformed evidence lowers confidence but does not prove governance failure by itself.</li>
            </ul>
          </Panel>
        </section>
      </>
    );
  }

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
        mode={mode}
        confidence={confidence}
      />
      <section className="kpi-grid">
        <KpiCard label="Agency Preservation Score" value={`${audit.score}%`} detail="sample scorecard" tone="teal" icon="AP" ringValue={audit.score} status="Good" />
        <KpiCard label="Meaningful Review" value={`${audit.meaningfulReview}%`} detail="review quality estimate" tone="green" icon="MR" ringValue={audit.meaningfulReview} status="Good" />
        <KpiCard label="Rubber-Stamp Risk" value={`${audit.rubberStampRisk}%`} detail="lower is better" tone="amber" icon="!" ringValue={audit.rubberStampRisk} status="Elevated" />
        <KpiCard label="Refusal Power" value={`${audit.refusalPower}%`} detail="documented halt ability" tone="purple" icon="RP" ringValue={audit.refusalPower} status="Strong" />
        <KpiCard label="Accountability Clarity" value={`${audit.accountabilityClarity}%`} detail="authority chain visibility" tone="blue" icon="AC" ringValue={audit.accountabilityClarity} status="Good" />
      </section>
      <section className="audit-grid">
        <Panel title="Audit Scorecard" eyebrow="agency controls">
          <div className="scorecard-grid">
            {audit.dimensions.map((dimension) => (
              <article key={dimension.name}>
                <MetricRing value={dimension.score} tone={dimension.score >= 70 ? "green" : dimension.score >= 60 ? "blue" : "amber"} label={dimension.name} />
                <strong>{dimension.name}</strong>
                <span>{dimension.score}</span>
              </article>
            ))}
          </div>
        </Panel>
        <Panel title="Agency Preservation Dimensions" eyebrow="sample visualization">
          <RadarChart data={dimensionData} />
        </Panel>
        <Panel title="Key Questions" eyebrow="human agency">
          <div className="question-cards">
            {([
              ["Can a human still understand the consequential action?", "Evidence-Backed"],
              ["Can a human refuse, revise, halt, or escalate before commitment?", "Evidence-Backed"],
              ["Is authority still live at the point of consequence?", "Partial"],
              ["Is human review meaningful or merely procedural?", "Inferred Signal"],
              ["Is the system reducing overload or creating rubber-stamping?", "Partial"],
              ["Does the gate preserve judgment or create dependency?", "Inferred Signal"],
            ] as Array<[string, string]>).map(([question, status]) => (
              <article key={question}>
                <StatusBadge label={status} />
                <p>{question}</p>
              </article>
            ))}
          </div>
        </Panel>
        <Panel title="Restoration Priorities" eyebrow="requires review">
          <div className="priority-list">
            {audit.restorationPriorities.map((priority, index) => (
              <article key={priority}>
                <span>{index + 1}</span>
                <div>
                  <strong>{priority}</strong>
                  <p>Human review required before policy or authority changes.</p>
                </div>
                <StatusBadge label={index === 0 ? "High" : "Medium"} />
              </article>
            ))}
          </div>
        </Panel>
        <Panel title="Audit Findings" eyebrow="operator table">
          <div className="finding-table compact-table">
            {audit.findings.map((finding, index) => (
              <article key={finding}>
                <span>{index + 1}</span>
                <strong>{finding}</strong>
                <StatusBadge label={index === 0 ? "Medium" : "High"} />
                <StatusBadge label="Open" />
              </article>
            ))}
          </div>
        </Panel>
      </section>
    </>
  );
}
