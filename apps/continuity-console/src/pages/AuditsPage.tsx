import { PageHeader } from "../components/PageHeader";
import { Panel } from "../components/Panel";
import type { PageId } from "../app/navigation";
import type { ConsoleDataMode, EvidenceConfidence } from "../lib/evidenceProjection";
import type { DeploymentManifest } from "../types/continuity";

interface AuditsPageProps {
  deployment: DeploymentManifest;
  mode: ConsoleDataMode;
  confidence?: EvidenceConfidence | undefined;
  onNavigate: (page: PageId) => void;
}

export function AuditsPage({ deployment, mode, confidence, onNavigate }: AuditsPageProps): JSX.Element {
  const auditCards: Array<{ title: string; question: string; target: PageId }> = [
    {
      title: "Human Agency Audit",
      question: "Are human authority, refusal, and meaningful participation still intact?",
      target: "human-agency-audit",
    },
    {
      title: "Governance Memory",
      question: "Are repeated patterns showing improvement, drift, or recurring weakness?",
      target: "governance-memory",
    },
    {
      title: "Advanced Architecture Map",
      question: "Where does evidence exist across the complete 12-layer governance path?",
      target: "stack-map",
    },
  ];

  return (
    <>
      <PageHeader
        title="Audits"
        description="Choose the deeper review surface after the operator Home page has shown what needs attention."
        deployment={deployment}
        mode={mode}
        confidence={confidence}
      />
      <section className="audit-hub-grid">
        {auditCards.map((card) => (
          <Panel title={card.title} eyebrow="audit drill-down" key={card.title}>
            <p className="panel-copy">{card.question}</p>
            <button type="button" className="primary-button" onClick={() => onNavigate(card.target)}>
              Open {card.title}
            </button>
          </Panel>
        ))}
      </section>
    </>
  );
}
