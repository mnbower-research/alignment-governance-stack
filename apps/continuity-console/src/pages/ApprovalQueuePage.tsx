import { useState } from "react";
import { KpiCard } from "../components/KpiCard";
import { PageHeader } from "../components/PageHeader";
import { Panel } from "../components/Panel";
import { StatusBadge } from "../components/StatusBadge";
import { boolLabel } from "../lib/format";
import type { ApprovalRequest, DeploymentManifest, ReceiptRecord } from "../types/continuity";

interface ApprovalQueuePageProps {
  deployment: DeploymentManifest;
  initialRequests: ApprovalRequest[];
}

type ApprovalAction = ApprovalRequest["state"];

export function ApprovalQueuePage({ deployment, initialRequests }: ApprovalQueuePageProps): JSX.Element {
  const [requests, setRequests] = useState<ApprovalRequest[]>(initialRequests);
  const [receipts, setReceipts] = useState<ReceiptRecord[]>([]);

  function applyAction(requestId: string, state: ApprovalAction): void {
    setRequests((currentRequests) =>
      currentRequests.map((request) => (request.id === requestId ? { ...request, state } : request)),
    );
    const request = requests.find((item) => item.id === requestId);
    if (!request) {
      return;
    }

    setReceipts((currentReceipts) => [
      {
        id: `receipt-${request.id}-${state.toLowerCase().replaceAll(" ", "-")}`,
        proposalId: request.proposalId,
        action: request.action,
        decision: state,
        createdAt: new Date().toLocaleTimeString(),
        summary: `Local UI state changed to ${state}. No external action executed.`,
      },
      ...currentReceipts,
    ]);
  }

  return (
    <>
      <PageHeader
        title="Approval Queue"
        description="Human review queue for sample actions. Phase 1 actions update local UI state and generate sample receipt entries only."
        deployment={deployment}
      />
      <section className="kpi-grid">
        <KpiCard label="Pending" value={requests.filter((request) => request.state === "Pending").length} detail="awaiting review" tone="amber" />
        <KpiCard label="High Risk" value={requests.filter((request) => request.riskLevel === "High").length} detail="needs careful authority review" tone="red" />
        <KpiCard label="Receipts" value={receipts.length} detail="local UI decisions recorded" tone="teal" />
      </section>
      <section className="approval-grid">
        <Panel title="Pending Actions" eyebrow="sample queue">
          <div className="approval-list">
            {requests.map((request) => (
              <article className="approval-item" key={request.id}>
                <div className="approval-heading">
                  <div>
                    <span>{request.proposalId}</span>
                    <h3>{request.action}</h3>
                  </div>
                  <StatusBadge label={request.riskLevel} />
                </div>
                <dl>
                  <div><dt>Agent</dt><dd>{request.requestingAgent}</dd></div>
                  <div><dt>Workflow</dt><dd>{request.workflow}</dd></div>
                  <div><dt>Target</dt><dd>{request.target}</dd></div>
                  <div><dt>Reversible</dt><dd>{boolLabel(request.reversible)}</dd></div>
                  <div><dt>Authority</dt><dd>{request.authoritySource}</dd></div>
                  <div><dt>Time</dt><dd>{request.timestamp}</dd></div>
                </dl>
                <p>{request.pgdlSummary}</p>
                <div className="approval-actions">
                  <StatusBadge label={request.state} />
                  <button type="button" onClick={() => applyAction(request.id, "Allowed")}>Allow</button>
                  <button type="button" onClick={() => applyAction(request.id, "Revision Requested")}>Revise</button>
                  <button type="button" onClick={() => applyAction(request.id, "Escalated")}>Escalate</button>
                  <button type="button" onClick={() => applyAction(request.id, "Blocked")}>Block</button>
                </div>
              </article>
            ))}
          </div>
        </Panel>
        <Panel title="Sample Receipt Entries" eyebrow="local only">
          <div className="receipt-list">
            {receipts.length === 0 ? <p>No local approval actions recorded yet.</p> : null}
            {receipts.map((receipt) => (
              <article key={receipt.id}>
                <strong>{receipt.decision}</strong>
                <span>{receipt.proposalId} at {receipt.createdAt}</span>
                <p>{receipt.summary}</p>
              </article>
            ))}
          </div>
        </Panel>
      </section>
    </>
  );
}
