import type { NormalizedAgsArtifact } from "@alignment-governance-stack/continuity-ingest";
import { Panel } from "./Panel";

const record = (value: unknown): Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const label = (value: unknown): string => typeof value === "string" ? value : "Not demonstrated";

export function ContextInheritancePanel({ artifacts }: { artifacts: NormalizedAgsArtifact[] }): JSX.Element {
  return <Panel title="Semantic continuity" eyebrow="read-only information inheritance">
    <p>A persistent artifact is a handoff across time. Semantic continuity asks whether provenance and permitted meaning survived the handoff. Runtime continuity asks whether the authorized action remained the executed action.</p>
    {artifacts.length === 0 ? <p>No Context Admission evidence was imported for this proposal.</p> : artifacts.map(artifact => {
      const evidence = record(artifact.payload);
      const use = record(evidence.requestedUse);
      const references = Array.isArray(evidence.artifacts) ? evidence.artifacts.map(record) : [];
      const findings = Array.isArray(evidence.findings) ? evidence.findings.map(record) : [];
      return <article key={artifact.id}>
        <h3>Recorded decision: {label(evidence.decision)}</h3>
        <p>Receiver: {label(use.receiverAgentId)}. Purpose: {label(use.purpose)}. Evaluated: {label(evidence.evaluatedAt)}.</p>
        <p>Context-dependent action: {label(record(use.action).proposalId)}. Source: {artifact.provenance.sourcePath}.</p>
        {references.map(reference => {
          const provenance = record(reference.provenance);
          return <div key={label(reference.artifactId)}>
            <strong>{label(provenance.producerAgentId)} → {label(reference.artifactId)} → {label(use.receiverAgentId)}</strong>
            <p>Created: {label(reference.createdAt)}. Received for review: {label(evidence.evaluatedAt)}. Source identity: {label(provenance.sourceId)}.</p>
            <p>Authority source: {label(provenance.authorityId)}. Authority does not transfer automatically. Revoked at review: {reference.revoked === true ? "Yes" : reference.revoked === false ? "No" : "Not demonstrated"}.</p>
            <p>Parents: {Array.isArray(reference.parentArtifactIds) ? reference.parentArtifactIds.map(label).join(", ") || "None declared" : "Not demonstrated"}. Transformations: {Array.isArray(reference.transformations) ? reference.transformations.map(t => label(record(t).type)).join(", ") || "None declared" : "Not demonstrated"}.</p>
          </div>;
        })}
        {findings.length ? <ul>{findings.map((finding, index) => <li key={index}>{label(finding.code)}: {label(finding.reason)}</li>)}</ul> : <p>No lineage gaps were recorded in this supplied evidence.</p>}
        <p>Historical evidence only; this view does not grant admission, approval, or live enforcement.</p>
      </article>;
    })}
  </Panel>;
}
