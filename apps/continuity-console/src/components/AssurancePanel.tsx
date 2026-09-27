import type { NormalizedAgsArtifact } from "@alignment-governance-stack/continuity-ingest";
import type { AssuranceEvidence } from "@alignment-governance-stack/shared-types";
import { Panel } from "./Panel";
export function AssurancePanel({ artifacts, technical }: { artifacts: NormalizedAgsArtifact[]; technical: boolean }): JSX.Element | null {
  const reports = artifacts.filter(a => a.kind === "assurance-evidence");
  if (!reports.length) return null;
  return <Panel title="Risk and required assurance" eyebrow="historical, read-only evidence">
    {reports.map((artifact, index) => {
      const evidence = artifact.payload as AssuranceEvidence;
      return <article key={`${artifact.id}:${index}`}>
        <h3>Recorded assurance: {evidence.decision}</h3>
        <dl className="compact-summary-list">
          <div><dt>Declared risk</dt><dd>{evidence.binding.riskLevel}</dd></div>
          <div><dt>Required review</dt><dd>{evidence.requirement.minimumAttestations} validators; {evidence.requirement.slots.length} specified slots</dd></div>
          <div><dt>Accepted validators</dt><dd>{evidence.acceptedAttestationIds.length}; declared groups: {evidence.independenceGroups.join(", ") || "None demonstrated"}</dd></div>
          <div><dt>Human required</dt><dd>{evidence.requirement.mandatoryHuman ? "Yes" : "No, under this policy"}</dd></div>
          <div><dt>Unresolved refusals</dt><dd>{evidence.unresolvedDenialIds.join(", ") || "None recorded"}</dd></div>
          <div><dt>Resolved refusals</dt><dd>{evidence.resolvedDenials.map(r => `${r.attestationId} via ${r.resolutionId}`).join("; ") || "None recorded"}</dd></div>
          <div><dt>Recorded validity ends</dt><dd>{evidence.validUntil ?? "No satisfied assurance window"}</dd></div>
          <div><dt>Action still matches</dt><dd>Inspect Runtime Binding. This report alone does not establish a current match or execution.</dd></div>
        </dl>
        <p>Identity and independence are host declarations. Agreement establishes neither truth nor authority.</p>
        {evidence.findings.map((f, n) => <p key={n}>{f.code}: {f.reason}</p>)}
        {technical ? <details><summary>Assurance technical details</summary><pre className="raw-json">{JSON.stringify(evidence, null, 2)}</pre></details> : null}
      </article>;
    })}
  </Panel>;
}
