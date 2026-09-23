import { Panel } from "./Panel";
import { StatusBadge } from "./StatusBadge";
import type { OperatorMaterialFinding } from "../lib/operatorSummary";

interface OperatorFindingsProps {
  findings: OperatorMaterialFinding[];
  onOpenFindings: () => void;
}

export function OperatorFindings({ findings, onOpenFindings }: OperatorFindingsProps): JSX.Element {
  return (
    <Panel title="Material findings" eyebrow="never hidden" className={findings.length > 0 ? "operator-findings-panel has-findings" : "operator-findings-panel"}>
      {findings.length > 0 ? (
        <>
          <div className="operator-finding-list">
            {findings.map((finding) => (
              <article className={`operator-finding operator-tone-${finding.tone}`} key={finding.id}>
                <StatusBadge label={finding.tone === "danger" ? "Action required" : "Needs attention"} />
                <div><strong>{finding.title}</strong><p>{finding.explanation}</p></div>
              </article>
            ))}
          </div>
          <button type="button" className="text-button" onClick={onOpenFindings}>Review all findings</button>
        </>
      ) : (
        <p>No material governance finding is present in the active evidence. This is not a safety certification.</p>
      )}
    </Panel>
  );
}
