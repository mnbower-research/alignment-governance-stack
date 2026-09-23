import { Panel } from "./Panel";
import { StatusBadge } from "./StatusBadge";
import { OperatorFindings } from "./OperatorFindings";
import type { OperatorSummary } from "../lib/operatorSummary";

interface SimpleOperatorSummaryProps {
  summary: OperatorSummary;
  onOpenFindings: () => void;
}

const toneLabels = { positive: "Demonstrated", warning: "Needs attention", danger: "Stopped / unsafe", unknown: "Not proven" } as const;

export function SimpleOperatorSummary({ summary, onOpenFindings }: SimpleOperatorSummaryProps): JSX.Element {
  return (
    <div className="simple-operator-view">
      <section className="operator-question-grid" aria-label="Simple operator summary">
        {summary.answers.map((answer, index) => (
          <article className={`operator-question-card operator-tone-${answer.tone}`} key={answer.question}>
            <span className="operator-question-number">{index + 1}</span>
            <div>
              <p>{answer.question}</p>
              <h2>{answer.answer}</h2>
              <span>{answer.explanation}</span>
            </div>
          </article>
        ))}
      </section>
      <Panel title="What the governance checks mean" eyebrow="plain-language decision path" className="operator-stage-panel">
        <div className="operator-stage-list">
          {summary.stages.map((stage) => (
            <article className={`operator-stage operator-tone-${stage.tone}`} key={stage.stage}>
              <div>
                <strong>{stage.stage}</strong>
                <span>{stage.label}</span>
              </div>
              <p>{stage.explanation}</p>
              <StatusBadge label={toneLabels[stage.tone]} />
            </article>
          ))}
        </div>
      </Panel>
      <OperatorFindings findings={summary.findings} onOpenFindings={onOpenFindings} />
    </div>
  );
}
