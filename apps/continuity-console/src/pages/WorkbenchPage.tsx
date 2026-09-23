import { sampleGovernedActions, type SampleAuthorityClass, type SampleGovernanceEvaluationStatus } from "../data/sampleGovernedActions";
import { PageHeader } from "../components/PageHeader";
import { Panel } from "../components/Panel";
import { StatusBadge } from "../components/StatusBadge";
import type { ConsoleDataMode, EvidenceConfidence } from "../lib/evidenceProjection";
import { boolLabel } from "../lib/format";
import type { DeploymentManifest } from "../types/continuity";

interface WorkbenchPageProps {
  deployment: DeploymentManifest;
  mode?: ConsoleDataMode | undefined;
  confidence?: EvidenceConfidence | undefined;
}

interface AgentTeamHealth {
  id: string;
  agentTeam: string;
  operationalStatus: string;
  governanceStatus: string;
  pgdlRevisionFrequency: string;
  aagBlocks: number;
  runtimeMismatches: number;
  receiptCompleteness: string;
  humanReviewRequirements: string;
}

const agentTeamHealth: AgentTeamHealth[] = [
  {
    id: "health-docs",
    agentTeam: "Internal Docs Agent Team",
    operationalStatus: "Available for draft preparation",
    governanceStatus: "Needs release-owner review for public claims",
    pgdlRevisionFrequency: "Moderate",
    aagBlocks: 1,
    runtimeMismatches: 0,
    receiptCompleteness: "Partial",
    humanReviewRequirements: "2 active review packets",
  },
  {
    id: "health-finance",
    agentTeam: "Finance Summary Agent",
    operationalStatus: "Paused at review boundary",
    governanceStatus: "Sensitive-data controls require operator inspection",
    pgdlRevisionFrequency: "High",
    aagBlocks: 2,
    runtimeMismatches: 0,
    receiptCompleteness: "Not verified",
    humanReviewRequirements: "Target-bound approval required",
  },
];

function displayAuthorityClass(authorityClass: SampleAuthorityClass): string {
  return authorityClass === "advisory" ? "Advisory" : "Binding";
}

function displayEvaluationStatus(status: SampleGovernanceEvaluationStatus): string {
  const labels: Record<SampleGovernanceEvaluationStatus, string> = {
    passed: "Passed",
    escalated: "Escalated",
    "recommended-revision": "Recommended revision",
    pending: "Pending",
    blocked: "Blocked",
  };

  return labels[status];
}

function displayRuntimePermitState(state: string): string {
  return state.replaceAll("-", " ");
}

function displayReceiptState(state: string): string {
  return state.replaceAll("-", " ");
}

const reviewActions = sampleGovernedActions.filter((action) => action.humanReview === "Required now");
const activityFeed = sampleGovernedActions
  .flatMap((action) => action.activityEvents.map((event) => ({ ...event, actionId: action.actionId })))
  .sort((left, right) => left.timestamp.localeCompare(right.timestamp));

export function WorkbenchPage({ deployment, mode = "sample", confidence }: WorkbenchPageProps): JSX.Element {
  if (mode === "local-evidence") return <><PageHeader title="Workbench" description="No operator assignments or agent activity were imported." deployment={deployment} mode={mode} confidence={confidence} /><Panel title="Local Evidence" eyebrow="read-only"><p>Inspect imported decisions in Runs. Sample assignments are available only in Sample Mode.</p></Panel></>;
  return (
    <>
      <PageHeader
        title="Workbench"
        description="Preview a future operator workspace for governed assignments, reviews, and sample governance paths."
        deployment={deployment}
        mode={mode}
        confidence={confidence}
      />
      <div className="read-only-banner workbench-boundary" role="status">
        <strong>Sample-data preview only.</strong>
        <span>
          No live agents, external execution, approval write-back, backend service, filesystem watcher, adapter SDK behavior, or implemented interoperability is connected here.
          Local Evidence Mode remains read-only and evidence-backed elsewhere in the Console.
        </span>
      </div>
      <section className="workbench-grid">
        <div className="workbench-main">
          <Panel title="Assignments" eyebrow="sample objectives from governed-action records">
            <div className="assignment-list">
              {sampleGovernedActions.map((action) => (
                <article key={action.objectiveId}>
                  <div className="assignment-heading">
                    <div>
                      <strong>{action.objective}</strong>
                      <span>{action.assignedAgent}</span>
                    </div>
                    <StatusBadge label={action.status} />
                  </div>
                  <dl className="workbench-detail-grid">
                    <div><dt>Scope</dt><dd>{action.scope}</dd></div>
                    <div><dt>Next expected step</dt><dd>{action.nextExpectedStep}</dd></div>
                    <div><dt>Human review</dt><dd>{action.humanReview}</dd></div>
                  </dl>
                </article>
              ))}
            </div>
          </Panel>

          <Panel title="Review Queue" eyebrow="sample packets derived from governed-action records">
            <div className="review-packet-list">
              {reviewActions.map((action) => (
                <article key={action.actionId}>
                  <div className="review-packet-heading">
                    <div>
                      <StatusBadge label="Review packet" />
                      <h3>{action.proposedAction}</h3>
                      <p>{action.reviewReason}</p>
                    </div>
                    <div className="read-only-action-labels" aria-label="Read-only review labels">
                      <span>Inspect evidence</span>
                      <span>Open run</span>
                    </div>
                  </div>
                  <dl className="workbench-detail-grid">
                    <div><dt>Assigned agent</dt><dd>{action.assignedAgent}</dd></div>
                    <div><dt>Strongest PGDL objection or AAG concern</dt><dd>{action.strongestConcern}</dd></div>
                    <div><dt>Target</dt><dd>{action.target}</dd></div>
                    <div><dt>Reversibility</dt><dd>{boolLabel(action.reversibility)}</dd></div>
                    <div><dt>Runtime permit state</dt><dd>{displayRuntimePermitState(action.runtimePermitState)}</dd></div>
                    <div><dt>Receipt state</dt><dd>{displayReceiptState(action.receiptState)}</dd></div>
                    <div><dt>Recommended operator action</dt><dd>{action.recommendedOperatorAction}</dd></div>
                  </dl>
                  <details className="governance-path-details">
                    <summary>Governance Path</summary>
                    <p className="panel-copy">Sample governance-path data shows which checks contributed to the current review state. It does not represent connected external modules.</p>
                    <div className="governance-path-list">
                      {action.governanceEvaluations.map((evaluation) => (
                        <article key={evaluation.evaluationId} className={`path-authority-${evaluation.authorityClass}`}>
                          <div className="path-title-row">
                            <div>
                              <strong>{evaluation.layerName}</strong>
                              <p>{evaluation.plainLanguagePurpose}</p>
                            </div>
                            <div className="path-badges">
                              <StatusBadge label={displayAuthorityClass(evaluation.authorityClass)} />
                              <StatusBadge label={displayEvaluationStatus(evaluation.status)} />
                            </div>
                          </div>
                          <dl className="workbench-detail-grid compact">
                            <div><dt>Current verdict</dt><dd>{evaluation.currentVerdict}</dd></div>
                            <div><dt>Authority class</dt><dd>{displayAuthorityClass(evaluation.authorityClass)}</dd></div>
                          </dl>
                          <details>
                            <summary>Technical module details</summary>
                            <p>{evaluation.technicalDetails}</p>
                          </details>
                        </article>
                      ))}
                    </div>
                  </details>
                </article>
              ))}
            </div>
          </Panel>
        </div>

        <aside className="side-stack">
          <Panel title="Agent Team Health" eyebrow="sample operational and governance indicators">
            <div className="agent-health-list">
              {agentTeamHealth.map((health) => (
                <article key={health.id}>
                  <h3>{health.agentTeam}</h3>
                  <dl className="workbench-detail-grid">
                    <div><dt>Operational status</dt><dd>{health.operationalStatus}</dd></div>
                    <div><dt>Governance status</dt><dd>{health.governanceStatus}</dd></div>
                    <div><dt>PGDL revision frequency</dt><dd>{health.pgdlRevisionFrequency}</dd></div>
                    <div><dt>AAG blocks</dt><dd>{health.aagBlocks}</dd></div>
                    <div><dt>Runtime mismatches</dt><dd>{health.runtimeMismatches}</dd></div>
                    <div><dt>Receipt completeness</dt><dd>{health.receiptCompleteness}</dd></div>
                    <div><dt>Human-review requirements</dt><dd>{health.humanReviewRequirements}</dd></div>
                  </dl>
                </article>
              ))}
            </div>
          </Panel>

          <Panel title="Recent Governed Activity" eyebrow="sample feed from governed-action records">
            <div className="workbench-activity-list">
              {activityFeed.map((activity) => (
                <article key={activity.eventId}>
                  <time>{activity.timestamp}</time>
                  <div>
                    <strong>{activity.label}</strong>
                    <p>{activity.summary}</p>
                    <details>
                      <summary>Technical details</summary>
                      <p>{activity.technicalDetails}</p>
                    </details>
                  </div>
                </article>
              ))}
            </div>
          </Panel>
        </aside>
      </section>
    </>
  );
}
