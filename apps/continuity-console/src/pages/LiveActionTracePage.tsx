import { useState } from "react";
import { DetailList } from "../components/DetailList";
import { KpiCard } from "../components/KpiCard";
import { PageHeader } from "../components/PageHeader";
import { Panel } from "../components/Panel";
import { StatusBadge } from "../components/StatusBadge";
import { boolLabel } from "../lib/format";
import type { DeploymentManifest, GovernedActionTrace, TraceEvent } from "../types/continuity";

interface LiveActionTracePageProps {
  deployment: DeploymentManifest;
  trace: GovernedActionTrace;
}

export function LiveActionTracePage({ deployment, trace }: LiveActionTracePageProps): JSX.Element {
  const [selectedEvent, setSelectedEvent] = useState<TraceEvent>(trace.events[0]!);

  return (
    <>
      <PageHeader
        title="Live Action Trace"
        description="Sample chronological view of one governed action from proposal through receipt and agency fingerprint."
        deployment={deployment}
      />
      <section className="kpi-grid">
        <KpiCard label="Actions Today" value="37" detail="sample local activity" tone="blue" />
        <KpiCard label="Auto-Allowed" value="19" detail="low-risk reversible drafts" tone="green" />
        <KpiCard label="Escalated" value="9" detail="human review requested" tone="amber" />
        <KpiCard label="Blocked" value="4" detail="hard boundary or mismatch" tone="red" />
        <KpiCard label="Average Decision Time" value="42s" detail="sample trace window" tone="purple" />
      </section>
      <section className="trace-grid">
        <Panel title="Trace Timeline" eyebrow={trace.proposalId}>
          <div className="timeline">
            {trace.events.map((event) => (
              <button type="button" key={event.id} className={selectedEvent.id === event.id ? "selected" : ""} onClick={() => setSelectedEvent(event)}>
                <span>{event.timestamp}</span>
                <div>
                  <h3>{event.label}</h3>
                  <p>{event.decision}</p>
                </div>
                <StatusBadge label={event.status} />
              </button>
            ))}
          </div>
        </Panel>
        <div className="side-stack">
          <Panel title="Trace Detail" eyebrow={selectedEvent.label}>
            <DetailList
              items={[
                ["Proposal ID", trace.proposalId],
                ["Workflow ID", trace.workflowId],
                ["Requested action", trace.requestedAction],
                ["Decision", selectedEvent.decision],
                ["Permit hash", trace.permitHash],
                ["Target", trace.target],
                ["Scope", trace.scope],
                ["Reversibility", boolLabel(trace.reversible)],
                ["Approval source", trace.approvalSource],
                ["Timestamp", selectedEvent.timestamp],
                ["Payload summary", selectedEvent.payloadSummary],
              ]}
            />
          </Panel>
          <Panel title="Current Governance State" eyebrow="live sample">
            <div className="state-grid">
              {["PGDL", "AAG", "Runtime Binding", "Receipts", "Human Authority"].map((item, index) => (
                <div key={item}>
                  <strong>{item}</strong>
                  <StatusBadge label={index === 3 ? "Partial" : "Evidenced"} />
                </div>
              ))}
            </div>
          </Panel>
          <Panel title="Trace Risks" eyebrow="sample flags">
            <ul className="risk-list">
              <li>stale authority record</li>
              <li>missing target binding</li>
              <li>scope drift watch</li>
              <li>receipt pending</li>
            </ul>
          </Panel>
        </div>
      </section>
    </>
  );
}
