import { useState } from "react";
import { ContextInheritancePanel } from "../components/ContextInheritancePanel";
import { DetailList } from "../components/DetailList";
import { KpiCard } from "../components/KpiCard";
import { PageHeader } from "../components/PageHeader";
import { Panel } from "../components/Panel";
import { StatusBadge } from "../components/StatusBadge";
import { SimpleOperatorSummary } from "../components/SimpleOperatorSummary";
import type { PageId } from "../app/navigation";
import type { ConsoleDataMode, EvidenceConfidence, ImportedTrace, ImportedTraceEvent } from "../lib/evidenceProjection";
import { importedTraceVerdict } from "../lib/evidenceProjection";
import { boolLabel } from "../lib/format";
import type { DeploymentManifest, GovernedActionTrace, TraceEvent } from "../types/continuity";
import type { OperatorSummary } from "../lib/operatorSummary";

interface LiveActionTracePageProps {
  deployment: DeploymentManifest;
  trace: GovernedActionTrace;
  importedTrace?: ImportedTrace | undefined;
  mode?: ConsoleDataMode | undefined;
  confidence?: EvidenceConfidence | undefined;
  operatorSummary: OperatorSummary;
  showTechnicalDetails: boolean;
  onNavigate: (page: PageId) => void;
}

export function LiveActionTracePage({ deployment, trace, importedTrace, mode = "sample", confidence, operatorSummary, showTechnicalDetails, onNavigate }: LiveActionTracePageProps): JSX.Element {
  if (mode === "local-evidence" && !importedTrace) {
    return <><PageHeader title="Runs" description="No local trace was imported." deployment={deployment} mode="local-evidence" confidence={confidence} /><SimpleOperatorSummary summary={operatorSummary} onOpenFindings={() => onNavigate("findings")} /><p>No imported trace evidence.</p></>;
  }
  if (mode === "local-evidence" && importedTrace) {
    return <ImportedTraceView deployment={deployment} trace={importedTrace} confidence={confidence} operatorSummary={operatorSummary} showTechnicalDetails={showTechnicalDetails} onNavigate={onNavigate} />;
  }

  return <SampleTraceView deployment={deployment} trace={trace} mode={mode} confidence={confidence} operatorSummary={operatorSummary} showTechnicalDetails={showTechnicalDetails} onNavigate={onNavigate} />;
}

interface SampleTraceViewProps {
  deployment: DeploymentManifest;
  trace: GovernedActionTrace;
  mode: ConsoleDataMode;
  confidence?: EvidenceConfidence | undefined;
  operatorSummary: OperatorSummary;
  showTechnicalDetails: boolean;
  onNavigate: (page: PageId) => void;
}

function SampleTraceView({ deployment, trace, mode, confidence, operatorSummary, showTechnicalDetails, onNavigate }: SampleTraceViewProps): JSX.Element {
  const [selectedEvent, setSelectedEvent] = useState<TraceEvent>(trace.events[0]!);

  return (
    <>
      <PageHeader
        title="Runs"
        description="Review a governed action run, its decision path, and whether the evidence chain is complete."
        deployment={deployment}
        mode={mode}
        confidence={confidence}
      />
      <SimpleOperatorSummary summary={operatorSummary} onOpenFindings={() => onNavigate("findings")} />
      {showTechnicalDetails ? (
      <div className="technical-detail-region" aria-label="Technical details">
      <section className="kpi-grid">
        <KpiCard label="Actions Today" value="37" detail="sample local activity" tone="purple" icon="AT" sparkline={[9, 12, 18, 14, 22, 37]} trend="+18% vs prior sample" />
        <KpiCard label="Auto-Allowed" value="19" detail="low-risk reversible drafts" tone="green" icon="AA" ringValue={51} />
        <KpiCard label="Escalated" value="9" detail="human review requested" tone="amber" icon="ES" ringValue={24} />
        <KpiCard label="Blocked" value="4" detail="hard boundary or mismatch" tone="red" icon="BL" ringValue={11} />
        <KpiCard label="Average Decision Time" value="42s" detail="sample trace window" tone="blue" icon="T" sparkline={[63, 55, 50, 47, 43, 42]} />
      </section>
      <section className="trace-grid">
        <Panel title="Agent Workflow Trace" eyebrow={`Trace ID: ${trace.proposalId}`}>
          <div className="timeline">
            {trace.events.map((event, index) => (
              <button type="button" key={event.id} className={selectedEvent.id === event.id ? "selected" : ""} onClick={() => setSelectedEvent(event)}>
                <span>{event.timestamp}</span>
                <i className={`timeline-icon event-${event.status.toLowerCase().replaceAll(" ", "-")}`} aria-hidden="true">{index + 1}</i>
                <div>
                  <h3>{event.label}</h3>
                  <p>{event.decision} - {event.payloadSummary}</p>
                </div>
                <StatusBadge label={event.status} />
              </button>
            ))}
          </div>
        </Panel>
        <div className="side-stack">
          <Panel title="Run Verdict" eyebrow="operator summary">
            <div className="verdict-card">
              <StatusBadge label="Needs review" />
              <strong>Receipt chain needs review</strong>
              <p>Sample decisions illustrate authorization checks. They establish neither real permission nor completed execution; the sample receipt is partial.</p>
            </div>
          </Panel>
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
                ["Reversibility", trace.reversible === undefined ? "Unknown" : boolLabel(trace.reversible)],
                ["Approval source", trace.approvalSource],
                ["Source artifact", "Sample typed trace"],
                ["Parser", "Sample Mode"],
                ["SHA-256", "Not applicable in Sample Mode"],
                ["Timestamp", selectedEvent.timestamp],
                ["Payload summary", selectedEvent.payloadSummary],
              ]}
            />
            <details>
              <summary>Payload summary JSON</summary>
              <pre className="raw-json">{JSON.stringify({ event: selectedEvent.label, decision: selectedEvent.decision, summary: selectedEvent.payloadSummary }, null, 2)}</pre>
            </details>
          </Panel>
          <Panel title="Illustrative Governance State" eyebrow="sample records">
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
            <div className="risk-row-list">
              {(trace.risks ?? []).map((risk) => (
                <article key={risk.title}>
                  <StatusBadge label={risk.severity} />
                  <div><strong>{risk.title}</strong><p>{risk.explanation}</p></div>
                  <span>Impact {risk.severity}</span>
                </article>
              ))}
            </div>
          </Panel>
        </div>
      </section>
      </div>
      ) : null}
    </>
  );
}

interface ImportedTraceViewProps {
  deployment: DeploymentManifest;
  trace: ImportedTrace;
  confidence?: EvidenceConfidence | undefined;
  operatorSummary: OperatorSummary;
  showTechnicalDetails: boolean;
  onNavigate: (page: PageId) => void;
}

function ImportedTraceView({ deployment, trace, confidence, operatorSummary, showTechnicalDetails, onNavigate }: ImportedTraceViewProps): JSX.Element {
  const [selectedEventId, setSelectedEventId] = useState(trace.events[0]?.id);
  const selectedEvent = trace.events.find(event => event.id === selectedEventId) ?? trace.events[0];
  if (!selectedEvent) return <p>No imported trace evidence.</p>;

  return (
    <>
      <PageHeader
        title="Runs"
        description="Read-only trace reconstructed from imported local artifacts. Missing events remain visible instead of being inferred."
        deployment={deployment}
        mode="local-evidence"
        confidence={confidence}
      />
      <SimpleOperatorSummary summary={operatorSummary} onOpenFindings={() => onNavigate("findings")} />
      {showTechnicalDetails ? (
      <div className="technical-detail-region" aria-label="Technical details">
      <ContextInheritancePanel artifacts={trace.contextAdmissions ?? []} />
      <section className="kpi-grid">
        <KpiCard label="Imported Events" value={trace.events.filter((event) => !event.missing).length} detail="recognized artifacts" tone="blue" icon="IE" />
        <KpiCard label="Missing Events" value={trace.events.filter((event) => event.missing).length} detail="not imported" tone="amber" icon="!" />
        <KpiCard label="Proposal" value={trace.proposalId === "no-correlated-proposal" ? "None" : "Found"} detail={trace.proposalId} tone="teal" icon="PR" />
        <KpiCard label="Permit Hash" value={trace.permitHash === "not-demonstrated" ? "Missing" : "Found"} detail="from imported evidence" tone="purple" icon="#" />
        <KpiCard label="Mode" value="Read Only" detail="no execution controls" tone="green" icon="RO" />
      </section>
      <section className="trace-grid">
        <Panel title="Imported Trace Timeline" eyebrow={`Trace ID: ${trace.proposalId}`}>
          <div className="timeline">
            {trace.events.map((event, index) => (
              <button type="button" key={event.id} className={`${selectedEvent.id === event.id ? "selected" : ""} ${event.missing ? "missing-step" : ""}`} onClick={() => setSelectedEventId(event.id)}>
                <span>{event.timestamp}</span>
                <i className={`timeline-icon event-${event.status.toLowerCase().replaceAll(" ", "-")}`} aria-hidden="true">{index + 1}</i>
                <div>
                  <h3>{event.label}</h3>
                  <p>{event.summary}</p>
                </div>
                <StatusBadge label={event.status} />
              </button>
            ))}
          </div>
        </Panel>
        <div className="side-stack">
          <Panel title="Run Verdict" eyebrow="operator summary">
            <div className="verdict-card">
              <StatusBadge label={importedTraceVerdict(trace)} />
              <strong>{operatorSummary.answers[3].answer}</strong>
              <p>
                {operatorSummary.answers[3].explanation}
              </p>
            </div>
          </Panel>
          <Panel title="Artifact Detail" eyebrow={selectedEvent.kind}>
            <DetailList
              items={[
                ["Proposal ID", trace.proposalId],
                ["Workflow ID", trace.workflowId],
                ["Requested action", trace.requestedAction],
                ["Target", trace.target],
                ["Scope", trace.scope],
                ["Reversibility", trace.reversible === undefined ? "Unknown" : boolLabel(trace.reversible)],
                ["Approval source", trace.approvalSource],
                ["Timestamp", selectedEvent.timestamp],
                ["Summary", selectedEvent.summary],
                ["Source path", selectedEvent.artifact?.provenance.sourcePath ?? "Not imported"],
                ["SHA-256", selectedEvent.artifact?.provenance.sha256 ?? "Not imported"],
                [
                  "Parser",
                  selectedEvent.artifact
                    ? `${selectedEvent.artifact.provenance.parserId}@${selectedEvent.artifact.provenance.parserVersion}`
                    : "Not imported",
                ],
              ]}
            />
            {selectedEvent.artifact ? (
              <details>
                <summary>Raw JSON payload</summary>
                <pre className="raw-json">{JSON.stringify(selectedEvent.artifact.payload, null, 2)}</pre>
              </details>
            ) : null}
          </Panel>
          <Panel title="Recorded Governance State" eyebrow="imported evidence">
            <div className="state-grid">
              {([
                ["PGDL", trace.events.some((event) => event.kind === "pgdl-review-packet" && !event.missing) ? "Evidenced" : "Not Demonstrated"],
                ["AAG", trace.events.some((event) => event.kind === "aag-decision" && !event.missing) ? "Evidenced" : "Not Demonstrated"],
                ["Runtime Binding", trace.events.some((event) => event.kind === "runtime-binding-result" && !event.missing) ? "Evidenced" : "Not Demonstrated"],
                ["Receipts", trace.events.some((event) => event.kind === "receipt" && !event.missing) ? "Evidenced" : "Not Demonstrated"],
                ["Human Authority", trace.approvalSource],
              ] as Array<[string, string]>).map(([item, status]) => (
                <div key={item}>
                  <strong>{item}</strong>
                  <StatusBadge label={status} />
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </section>
      </div>
      ) : null}
    </>
  );
}
