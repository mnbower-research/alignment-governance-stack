import type { ContinuitySnapshot } from "@alignment-governance-stack/continuity-ingest";
import { KpiCard } from "../components/KpiCard";
import { PageHeader } from "../components/PageHeader";
import { Panel } from "../components/Panel";
import { StatusBadge } from "../components/StatusBadge";
import { OperatorFindings } from "../components/OperatorFindings";
import type { PageId } from "../app/navigation";
import { analyzeContinuity } from "../lib/continuityAnalysis";
import type { ConsoleDataMode, EvidenceConfidence, EvidenceGapFinding } from "../lib/evidenceProjection";
import { affectedLayerLabel, operatorFindingCategory, operatorStatusLabel } from "../lib/operatorLanguage";
import type { ApprovalRequest, DeploymentManifest, GovernedActionTrace } from "../types/continuity";
import type { OperatorSummary } from "../lib/operatorSummary";

interface OverviewPageProps {
  deployment: DeploymentManifest;
  mode?: ConsoleDataMode | undefined;
  confidence?: EvidenceConfidence | undefined;
  artifactCount?: number | undefined;
  diagnosticCount?: number | undefined;
  snapshot?: ContinuitySnapshot | null | undefined;
  gaps: EvidenceGapFinding[];
  trace: GovernedActionTrace;
  approvals: ApprovalRequest[];
  operatorSummary: OperatorSummary;
  showTechnicalDetails: boolean;
  onNavigate: (page: PageId) => void;
}

const layerShortLabels = [
  "Authority",
  "Governance Substrate",
  "Semantic Context",
  "Proposal Formation",
  "PGDL Review",
  "AAG Authorization",
  "Runtime Admissibility",
  "Runtime Binding",
  "Execution",
  "Receipts",
  "Governance Memory",
  "Human Agency Audit",
];

function priorityRank(severity: EvidenceGapFinding["severity"]): number {
  return { Critical: 0, High: 1, Medium: 2, Low: 3 }[severity];
}

function posture(score: number, confidence?: EvidenceConfidence): string {
  if (confidence === "Insufficient") return "Limited evidence";
  if (score >= 70) return "Healthy";
  return "Needs attention";
}

function recentActivity(snapshot: ContinuitySnapshot | null | undefined, trace: GovernedActionTrace, mode: ConsoleDataMode): Array<{ label: string; timestamp: string; status: string; workflow: string }> {
  if (snapshot) {
    return [
      { label: "Snapshot imported", timestamp: snapshot.generatedAt, status: "Evidence available", workflow: snapshot.deployment.name },
      ...snapshot.artifacts.slice(0, 4).map((artifact) => ({
        label: artifact.summary,
        timestamp: artifact.provenance.occurredAt ?? `Occurrence unknown; imported ${artifact.provenance.importedAt}`,
        status: "Evidence available",
        workflow: artifact.correlation.workflowId ?? "Imported evidence",
      })),
    ];
  }

  return trace.events.slice(0, 5).map((event) => ({
    label: event.label,
    timestamp: event.timestamp,
    status: operatorStatusLabel(event.status),
    workflow: mode === "sample" ? "Sample workflow" : "Active workflow",
  }));
}

export function OverviewPage({
  deployment,
  mode = "sample",
  confidence,
  artifactCount,
  diagnosticCount,
  snapshot,
  gaps,
  trace,
  approvals,
  operatorSummary,
  showTechnicalDetails,
  onNavigate,
}: OverviewPageProps): JSX.Element {
  const analysis = analyzeContinuity(deployment);
  const priorityFindings = gaps.filter((gap) => gap.severity === "Critical" || gap.severity === "High");
  const operatorPriorityFindings = priorityFindings.filter((gap) => gap.category !== "Parser Diagnostic" && gap.category !== "Import Diagnostic");
  const topActions = [...operatorPriorityFindings].sort((left, right) => priorityRank(left.severity) - priorityRank(right.severity)).slice(0, 5);
  const flowsNeedingAttention = new Set(priorityFindings.flatMap((gap) => gap.affectedLayerIds)).size || priorityFindings.length;
  const pendingApprovals = mode === "sample" ? approvals.filter((approval) => approval.state === "Pending").length : undefined;
  const activities = recentActivity(snapshot, trace, mode);
  const calmDiagnosticNote =
    mode === "local-evidence" && (diagnosticCount ?? 0) > 0
      ? "Some imported artifacts could not be evaluated. Review diagnostics in Findings or Settings."
      : null;

  return (
    <>
      <PageHeader
        title="Home"
        description="Review the active evidence, see what needs attention, and choose what to inspect."
        deployment={deployment}
        mode={mode}
        confidence={confidence}
      />
      <section className="home-grid" aria-label="Evidence overview">
        <Panel title="Active evidence" eyebrow={mode === "sample" ? "illustrative data" : "read-only import"}>
          <p className="panel-copy">
            {mode === "sample"
              ? "You are exploring sample governance records. They demonstrate the Console and do not establish permission or execution for a real action."
              : (artifactCount ?? 0) === 0
                ? "No imported records are available. Load a snapshot in Settings; any import failures remain visible below."
                : "This snapshot contains historical governance records. Importing them grants no current permission and does not prove external execution."}
          </p>
          <dl className="compact-summary-list">
            <div><dt>Source</dt><dd>{mode === "sample" ? "Built-in sample" : snapshot?.deployment.name ?? "Unknown"}</dd></div>
            <div><dt>Imported records</dt><dd>{mode === "sample" ? "None — Sample Mode" : artifactCount ?? 0}</dd></div>
            <div><dt>Snapshot generated</dt><dd>{mode === "sample" ? "Not applicable — sample data" : snapshot?.generatedAt ?? "Unknown"}</dd></div>
            <div><dt>Evidence confidence</dt><dd>{mode === "sample" ? "Illustrative only" : confidence ?? "Insufficient"}</dd></div>
          </dl>
        </Panel>
        <Panel title="Start a review" eyebrow="operator workspace">
          <p className="panel-copy">Runs explains what was requested, whether it was allowed, and what the evidence proves. Findings lists the issues that need review.</p>
          <dl className="compact-summary-list">
            <div><dt>Findings in this view</dt><dd>{operatorSummary.findings.length}</dd></div>
            <div><dt>Action-required findings</dt><dd>{operatorSummary.findings.filter(finding => finding.tone === "danger").length}</dd></div>
            <div><dt>Import diagnostics</dt><dd>{mode === "sample" ? "Not applicable — sample data" : diagnosticCount ?? 0}</dd></div>
          </dl>
          <div className="inspection-links">
            <button type="button" onClick={() => onNavigate("runs")}>Review runs</button>
            <button type="button" onClick={() => onNavigate("settings")}>Import evidence</button>
          </div>
        </Panel>
      </section>
      <OperatorFindings findings={operatorSummary.findings} onOpenFindings={() => onNavigate("findings")} />
      {showTechnicalDetails ? (
      <div className="technical-detail-region" aria-label="Technical details">
      <section className="kpi-grid operator-kpi-grid" aria-label="Home primary indicators">
        <KpiCard
          label="Governance Health"
          value={`${analysis.continuityPercentage}%`}
          detail="Based on the active snapshot. This is not a safety certification."
          tone={analysis.continuityPercentage >= 70 ? "green" : "amber"}
          icon="GH"
          status={`${posture(analysis.continuityPercentage, confidence)} - ${confidence ?? (mode === "sample" ? "Partial" : "Insufficient")}`}
          ringValue={analysis.continuityPercentage}
        />
        <KpiCard
          label="Flows Needing Attention"
          value={flowsNeedingAttention}
          detail="Approximate count from findings and incomplete continuity"
          tone={flowsNeedingAttention > 0 ? "amber" : "green"}
          icon="FL"
        />
        <KpiCard
          label="Priority Findings"
          value={priorityFindings.length}
          detail="Requires operator attention"
          tone={priorityFindings.length > 0 ? "red" : "green"}
          icon="PF"
        />
        <KpiCard
          label="Human Review Load"
          value={pendingApprovals === undefined ? "Not evaluated" : pendingApprovals}
          detail={pendingApprovals === undefined ? "insufficient imported approval evidence" : "pending sample approvals"}
          tone={pendingApprovals && pendingApprovals > 0 ? "purple" : "blue"}
          icon="HR"
        />
      </section>
      {calmDiagnosticNote ? (
        <div className="quiet-notice" role="status">
          {calmDiagnosticNote}
          <button type="button" onClick={() => onNavigate("settings")}>Review diagnostics</button>
        </div>
      ) : null}
      <section className="home-grid">
        <Panel title="What Needs Attention" eyebrow="top operator actions">
          <div className="operator-action-list">
            {topActions.map((finding) => (
              <article key={finding.id}>
                <StatusBadge label={finding.severity} />
                <div>
                  <h3>{finding.title}</h3>
                  <p>{finding.description}</p>
                  <span>{affectedLayerLabel(finding.affectedLayerIds)} - {operatorFindingCategory(finding)}</span>
                </div>
                <button type="button" className="text-button" onClick={() => onNavigate("findings")}>
                  View finding
                </button>
              </article>
            ))}
            {topActions.length === 0 ? (
              <div className="empty-state">
                <strong>No priority findings detected in the active snapshot.</strong>
                <p>Continue with Flows or Reports for a calmer review path.</p>
              </div>
            ) : null}
          </div>
        </Panel>
        <Panel title="Governance Coverage" eyebrow="compact 12-layer rail">
          <div className="coverage-rail">
            {deployment.layers.map((layer, index) => (
              <div key={layer.id} className={`coverage-row status-row-${layer.status.toLowerCase().replaceAll(" ", "-")}`}>
                <span>{String(layer.order).padStart(2, "0")}</span>
                <strong>{layerShortLabels[index] ?? layer.shortName}</strong>
                <em>{operatorStatusLabel(layer.status)}</em>
                <small>{layer.evidenceSources.length > 0 ? `${layer.evidenceSources.length} evidence` : "No evidence"}</small>
              </div>
            ))}
          </div>
          <button type="button" className="text-button" onClick={() => onNavigate("stack-map")}>
            View advanced architecture
          </button>
        </Panel>
        <Panel title="Recent Activity" eyebrow={mode === "sample" ? "sample events" : `${artifactCount ?? 0} imported artifacts`}>
          <div className="activity-list">
            {activities.map((activity, index) => (
              <article key={`${activity.label}-${index}`}>
                <StatusBadge label={activity.status} />
                <div>
                  <strong>{activity.label}</strong>
                  <span>{activity.workflow}</span>
                </div>
                <time>{activity.timestamp}</time>
              </article>
            ))}
            {activities.length === 0 ? (
              <div className="empty-state">
                <strong>No imported evidence yet.</strong>
                <p>Load a snapshot in Settings to inspect governance continuity.</p>
              </div>
            ) : null}
          </div>
        </Panel>
        <Panel title="Next Inspection" eyebrow="simple paths">
          <div className="inspection-links">
            <button type="button" onClick={() => onNavigate("flows")}>Inspect flows</button>
            <button type="button" onClick={() => onNavigate("runs")}>Open latest run</button>
            <button type="button" onClick={() => onNavigate("approvals")}>Review approvals</button>
            <button type="button" onClick={() => onNavigate("plugins")}>Review compatible components</button>
          </div>
        </Panel>
      </section>
      </div>
      ) : null}
    </>
  );
}
