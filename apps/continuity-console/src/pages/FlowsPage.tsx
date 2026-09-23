import { useState } from "react";
import type { ArtifactKind, NormalizedAgsArtifact } from "@alignment-governance-stack/continuity-ingest";
import { PageHeader } from "../components/PageHeader";
import { Panel } from "../components/Panel";
import { StatusBadge } from "../components/StatusBadge";
import type { PageId } from "../app/navigation";
import type { ConsoleDataMode, EvidenceConfidence, EvidenceGapFinding, ImportedTrace, ImportedTraceEvent } from "../lib/evidenceProjection";
import { operatorStatusLabel } from "../lib/operatorLanguage";
import type { ContinuityStatus, DeploymentManifest, GovernedActionTrace, GovernanceLayer, TraceEvent } from "../types/continuity";

interface FlowsPageProps {
  deployment: DeploymentManifest;
  mode: ConsoleDataMode;
  confidence?: EvidenceConfidence | undefined;
  trace: GovernedActionTrace;
  importedTrace?: ImportedTrace | undefined;
  gaps: EvidenceGapFinding[];
  onNavigate: (page: PageId) => void;
}

interface SequenceStageDefinition {
  id: string;
  label: string;
  operatorQuestion: string;
  layerIds: string[];
  artifactKinds: ArtifactKind[];
  sampleEventLabels: string[];
}

interface FlowSequenceStage {
  id: string;
  label: string;
  operatorQuestion: string;
  layers: GovernanceLayer[];
  status: ContinuityStatus;
  operatorStatus: string;
  evidenceExists: boolean;
  evidenceCount: number;
  evidenceSummary: string;
  importedEvents: ImportedTraceEvent[];
  sampleEvents: TraceEvent[];
  artifacts: NormalizedAgsArtifact[];
}

const sequenceDefinitions: SequenceStageDefinition[] = [
  {
    id: "human-authority",
    label: "Human authority",
    operatorQuestion: "Who has rightful authority and refusal power?",
    layerIds: ["layer-1"],
    artifactKinds: ["authority-map", "human-participation-quality"],
    sampleEventLabels: ["Approval Validated"],
  },
  {
    id: "policy-boundary",
    label: "Policy boundary",
    operatorQuestion: "What boundary constrains the proposal before action?",
    layerIds: ["layer-2", "layer-3"],
    artifactKinds: ["policy-profile", "hard-boundary-profile"],
    sampleEventLabels: ["Proposal Received"],
  },
  {
    id: "agent-proposal",
    label: "Agent proposal",
    operatorQuestion: "What action is being proposed?",
    layerIds: ["layer-4"],
    artifactKinds: [],
    sampleEventLabels: ["Proposal Received", "Revised Proposal Submitted"],
  },
  {
    id: "pgdl-review",
    label: "PGDL review",
    operatorQuestion: "Was the proposal challenged before the execution gate?",
    layerIds: ["layer-5"],
    artifactKinds: ["pgdl-review-packet"],
    sampleEventLabels: ["PGDL Revision Requested", "Revised Proposal Submitted"],
  },
  {
    id: "aag-decision",
    label: "AAG decision",
    operatorQuestion: "Was the proposed action allowed, revised, escalated, or blocked?",
    layerIds: ["layer-6"],
    artifactKinds: ["aag-decision"],
    sampleEventLabels: ["AAG Escalated for Approval", "Approval Validated"],
  },
  {
    id: "runtime-permit",
    label: "Runtime permit",
    operatorQuestion: "Is there a narrow permit for this exact action?",
    layerIds: ["layer-7", "layer-8"],
    artifactKinds: ["runtime-permit"],
    sampleEventLabels: ["Runtime Permit Issued"],
  },
  {
    id: "execution-evidence",
    label: "Execution evidence",
    operatorQuestion: "Did the runtime action match the permit and consequence record?",
    layerIds: ["layer-8", "layer-9"],
    artifactKinds: ["runtime-binding-result", "decision-closure-artifact"],
    sampleEventLabels: ["Execution Matched Permit"],
  },
  {
    id: "receipt",
    label: "Receipt",
    operatorQuestion: "Is proof preserved after the decision and action?",
    layerIds: ["layer-10"],
    artifactKinds: ["receipt", "agency-fingerprint"],
    sampleEventLabels: ["Receipt Generated", "Agency Fingerprint Recorded"],
  },
  {
    id: "governance-memory",
    label: "Governance Memory",
    operatorQuestion: "Are patterns surfaced without mutating policy automatically?",
    layerIds: ["layer-11"],
    artifactKinds: ["governance-memory-summary"],
    sampleEventLabels: [],
  },
  {
    id: "human-agency-audit",
    label: "Human Agency Audit",
    operatorQuestion: "Is meaningful human agency still connected to consequence?",
    layerIds: ["layer-12"],
    artifactKinds: ["agency-chain-report", "human-participation-quality", "babel-risk-report", "babel-velocity-report"],
    sampleEventLabels: [],
  },
];

function flowHealth(gapCount: number, confidence?: EvidenceConfidence): string {
  if (confidence === "Insufficient") return "Limited evidence";
  if (gapCount > 0) return "Needs attention";
  return "Healthy";
}

function priorityRank(severity: EvidenceGapFinding["severity"]): number {
  return { Critical: 0, High: 1, Medium: 2, Low: 3 }[severity];
}

function strongestGap(gaps: EvidenceGapFinding[]): EvidenceGapFinding | undefined {
  const operatorGaps = gaps.filter((gap) => gap.category !== "Parser Diagnostic" && gap.category !== "Import Diagnostic");
  return [...operatorGaps].sort((left, right) => priorityRank(left.severity) - priorityRank(right.severity))[0];
}

function leastMatureStatus(statuses: ContinuityStatus[]): ContinuityStatus {
  const order: ContinuityStatus[] = [
    "Missing",
    "Not Demonstrated",
    "Declared",
    "Mapped",
    "Observed",
    "Partial",
    "Degraded",
    "Connected",
    "Evidenced",
    "Enforced",
    "Tested",
    "Red-Teamed",
    "Production-Validated",
  ];
  return [...statuses].sort((left, right) => order.indexOf(left) - order.indexOf(right))[0] ?? "Not Demonstrated";
}

function findImportedEvents(importedTrace: ImportedTrace | undefined, artifactKinds: ArtifactKind[]): ImportedTraceEvent[] {
  if (!importedTrace || artifactKinds.length === 0) return [];
  return importedTrace.events.filter((event) => artifactKinds.includes(event.kind) && !event.missing);
}

function findSampleEvents(trace: GovernedActionTrace, labels: string[]): TraceEvent[] {
  if (labels.length === 0) return [];
  return trace.events.filter((event) => labels.includes(event.label));
}

function buildSequenceStages(
  deployment: DeploymentManifest,
  mode: ConsoleDataMode,
  trace: GovernedActionTrace,
  importedTrace: ImportedTrace | undefined,
): FlowSequenceStage[] {
  return sequenceDefinitions.map((definition) => {
    const layers = definition.layerIds
      .map((layerId) => deployment.layers.find((layer) => layer.id === layerId))
      .filter((layer): layer is GovernanceLayer => layer !== undefined);
    const importedEvents = findImportedEvents(importedTrace, definition.artifactKinds);
    const sampleEvents = findSampleEvents(trace, definition.sampleEventLabels);
    const artifacts = importedEvents.flatMap((event) => (event.artifact ? [event.artifact] : []));
    const layerEvidenceCount = layers.reduce((count, layer) => count + layer.evidenceSources.length, 0);
    const eventEvidenceCount = mode === "local-evidence" ? importedEvents.length : sampleEvents.length;
    const evidenceCount = Math.max(layerEvidenceCount, eventEvidenceCount);
    const evidenceExists = evidenceCount > 0;
    const layerStatus = leastMatureStatus(layers.map((layer) => layer.status));
    const eventStatus = mode === "local-evidence"
      ? importedEvents.length > 0 ? "Evidenced" : "Not Demonstrated"
      : sampleEvents.length > 0 ? leastMatureStatus(sampleEvents.map((event) => event.status)) : layerStatus;
    const status = evidenceExists ? leastMatureStatus([layerStatus, eventStatus]) : "Not Demonstrated";

    return {
      id: definition.id,
      label: definition.label,
      operatorQuestion: definition.operatorQuestion,
      layers,
      status,
      operatorStatus: operatorStatusLabel(status),
      evidenceExists,
      evidenceCount,
      evidenceSummary: evidenceExists ? `${evidenceCount} evidence signal${evidenceCount === 1 ? "" : "s"}` : "No evidence attached",
      importedEvents,
      sampleEvents,
      artifacts,
    };
  });
}

function flowVerdict(gaps: EvidenceGapFinding[], confidence?: EvidenceConfidence): string {
  if (confidence === "Insufficient") return "Limited evidence";
  if (gaps.some((gap) => gap.severity === "Critical" || gap.severity === "High")) return "Needs attention";
  if (gaps.length > 0) return "Review recommended";
  return "No priority gap detected";
}

function nextInspectionAction(gap: EvidenceGapFinding | undefined, missingStage: FlowSequenceStage | undefined): string {
  if (gap) {
    return `Inspect "${gap.title}" in Findings before treating this workflow as verified.`;
  }

  if (missingStage) {
    return `Inspect ${missingStage.label} in the Advanced Architecture Map and attach evidence before claiming continuity.`;
  }

  return "Open Runs and compare the trace detail against the receipt evidence.";
}

function workflowNameFromId(workflowId: string): string {
  return workflowId
    .replace(/^wf-/, "")
    .replaceAll("-", " ")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function FlowsPage({ deployment, mode, confidence, trace, importedTrace, gaps, onNavigate }: FlowsPageProps): JSX.Element {
  const [selectedFlowId, setSelectedFlowId] = useState(mode === "local-evidence" ? importedTrace?.workflowId ?? "not-demonstrated" : trace.workflowId);
  const activeWorkflowId = mode === "local-evidence" ? importedTrace?.workflowId ?? "not-demonstrated" : trace.workflowId;
  const activeWorkflowName = workflowNameFromId(activeWorkflowId);
  const requestedAction = mode === "local-evidence" ? importedTrace?.requestedAction ?? "No correlated action summary" : trace.requestedAction;
  const activeTrace = mode === "local-evidence" ? importedTrace : undefined;
  const sequenceStages = buildSequenceStages(deployment, mode, trace, activeTrace);
  const gap = strongestGap(gaps);
  const missingStage = sequenceStages.find((stage) => !stage.evidenceExists || stage.status === "Missing" || stage.status === "Not Demonstrated");
  const priorityFindingCount = gaps.filter((gap) => gap.severity === "Critical" || gap.severity === "High").length;
  const lastActivity = mode === "local-evidence"
    ? importedTrace?.events.filter(event => !event.missing).map(event => event.timestamp).sort().at(-1) ?? "Not imported"
    : trace.events.at(-1)?.timestamp ?? deployment.lastScanAt;
  const verdict = flowVerdict(gaps, confidence);
  const confidenceLabel = confidence ?? (mode === "sample" ? "Partial" : "Insufficient");
  const nextAction = nextInspectionAction(gap, missingStage);

  return (
    <>
      <PageHeader
        title="Flows"
        description="Inspect governed workflows, identify consequential actions, and review where controls are attached."
        deployment={deployment}
        mode={mode}
        confidence={confidence}
      />
      <section className="flows-grid">
        <Panel title="Governed Workflows" eyebrow={mode === "local-evidence" ? "reconstructed action chains" : "sample workflow"}>
          <div className="flow-card-list">
            <article className={selectedFlowId === activeWorkflowId ? "selected" : ""}>
              <div>
                <span>{mode === "local-evidence" ? "Imported chain" : "Sample flow"}</span>
                <h3>{activeWorkflowName}</h3>
                <p>{requestedAction}</p>
              </div>
              <dl>
                <div><dt>Workflow name</dt><dd>{activeWorkflowName}</dd></div>
                <div><dt>Workflow ID</dt><dd>{activeWorkflowId}</dd></div>
                <div><dt>Purpose</dt><dd>{requestedAction}</dd></div>
                <div><dt>Current operator verdict</dt><dd>{verdict}</dd></div>
                <div><dt>Strongest continuity gap</dt><dd>{gap?.title ?? "No priority gap detected"}</dd></div>
                <div><dt>Evidence confidence</dt><dd>{confidenceLabel}</dd></div>
                <div><dt>Deployment</dt><dd>{deployment.name}</dd></div>
                <div><dt>Environment</dt><dd>{deployment.environment}</dd></div>
                <div><dt>Health</dt><dd>{flowHealth(priorityFindingCount, confidence)}</dd></div>
                <div><dt>Consequential actions</dt><dd>{mode === "local-evidence" ? importedTrace?.proposalIds?.length ?? "Unknown" : "1 sample"}</dd></div>
                <div><dt>Priority findings</dt><dd>{priorityFindingCount}</dd></div>
                <div><dt>Last activity</dt><dd>{lastActivity}</dd></div>
              </dl>
              <div className="next-inspection-callout">
                <StatusBadge label="Next inspection" />
                <p>{nextAction}</p>
              </div>
              <div className="approval-actions">
                <button type="button" onClick={() => setSelectedFlowId(activeWorkflowId)}>Open flow summary</button>
                <button type="button" onClick={() => onNavigate("runs")}>View runs</button>
                <button type="button" onClick={() => onNavigate("findings")}>View findings</button>
                <button type="button" onClick={() => onNavigate("stack-map")}>View advanced architecture</button>
              </div>
            </article>
          </div>
        </Panel>
        <Panel title="Flow Summary" eyebrow="first simplification">
          {selectedFlowId ? (
            <div className="flow-summary-panel">
              <div className="flow-verdict-strip">
                <div>
                  <span>Current operator verdict</span>
                  <strong>{verdict}</strong>
                </div>
                <StatusBadge label={confidenceLabel} />
              </div>
              <div className="governed-sequence-list" aria-label="Read-only governed workflow sequence">
                {sequenceStages.map((stage, index) => (
                  <article key={stage.id} className={`governed-sequence-stage stage-${stage.status.toLowerCase().replaceAll(" ", "-")}`}>
                    <div className="stage-index" aria-hidden="true">{index + 1}</div>
                    <div className="stage-main">
                      <div className="stage-title-row">
                        <strong>{stage.label}</strong>
                        <StatusBadge label={stage.operatorStatus} />
                      </div>
                      <p>{stage.operatorQuestion}</p>
                      <div className="stage-evidence-row">
                        <StatusBadge label={stage.evidenceExists ? "Evidence available" : "Not verified"} />
                        <span>{stage.evidenceSummary}</span>
                      </div>
                      <details>
                        <summary>Technical details</summary>
                        <dl className="stage-detail-list">
                          <div><dt>Internal status</dt><dd>{stage.status}</dd></div>
                          <div><dt>Mapped layers</dt><dd>{stage.layers.map((layer) => layer.name).join(", ") || "No mapped layer"}</dd></div>
                          <div><dt>Evidence sources</dt><dd>{stage.layers.flatMap((layer) => layer.evidenceSources).join(", ") || "No evidence source attached"}</dd></div>
                          <div><dt>Trace evidence</dt><dd>{mode === "local-evidence" ? stage.importedEvents.map((event) => event.summary).join(", ") || "No imported trace event" : stage.sampleEvents.map((event) => event.payloadSummary).join(", ") || "No sample trace event"}</dd></div>
                        </dl>
                        {stage.artifacts.length > 0 ? (
                          <div className="artifact-list compact-artifacts">
                            {stage.artifacts.map((artifact) => (
                              <details key={artifact.id}>
                                <summary>{artifact.provenance.fileName}</summary>
                                <dl className="stage-detail-list">
                                  <div><dt>Parser</dt><dd>{artifact.provenance.parserId}@{artifact.provenance.parserVersion}</dd></div>
                                  <div><dt>SHA-256</dt><dd>{artifact.provenance.sha256}</dd></div>
                                  <div><dt>Source path</dt><dd>{artifact.provenance.sourcePath}</dd></div>
                                </dl>
                                <details>
                                  <summary>Raw JSON payload</summary>
                                  <pre className="raw-json">{JSON.stringify(artifact.payload, null, 2)}</pre>
                                </details>
                              </details>
                            ))}
                          </div>
                        ) : null}
                      </details>
                    </div>
                  </article>
                ))}
              </div>
              <p className="panel-copy">This is a read-only flow summary. The full governed-flow canvas is not implemented yet.</p>
            </div>
          ) : (
            <div className="empty-state">
              <strong>No workflow chains were reconstructed from the active snapshot.</strong>
              <p>Load a supported snapshot or inspect the advanced architecture map.</p>
            </div>
          )}
        </Panel>
      </section>
    </>
  );
}
