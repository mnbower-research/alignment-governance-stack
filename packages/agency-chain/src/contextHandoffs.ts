import type { ContextAdmissionEvidence } from "@alignment-governance-stack/shared-types";
import type { AgencyChainIssue, AgencyChainLink } from "./types.js";

/** Read-only mapping of recorded decisions, not a new admission or authority grant. */
export function mapContextAdmissionToAgencyLinks(evidence: ContextAdmissionEvidence): AgencyChainLink[] {
  return evidence.artifacts.map(artifact => {
    const findings = evidence.findings.filter(f => f.artifactId === artifact.artifactId);
    const producer = artifact.provenance?.producerAgentId ?? "producer not demonstrated";
    const temporal = artifact.createdAt !== undefined && Date.parse(artifact.createdAt) < Date.parse(evidence.evaluatedAt);
    return {
      id: `${evidence.admissionId}:${artifact.artifactId}`, type: "information_handoff",
      label: `${producer} -> ${artifact.artifactId} -> ${evidence.requestedUse.receiverAgentId}`,
      status: findings.length === 0 && evidence.decision === "admit" ? "present" : "requires_verification",
      description: `${temporal ? "Temporal handoff" : "Information handoff"}: recorded ${evidence.decision} for ${evidence.requestedUse.purpose}. Authority does not transfer with information.`,
      evidenceRefs: [{ id: evidence.admissionId, type: "document", title: "Context Admission evidence", excerpt: evidence.contextLineageDigest }],
      notes: findings.length > 0 ? findings.map(f => `${f.code}: ${f.reason}`)
        : [evidence.decision === "admit"
          ? "Context lineage intact within supplied evidence; no execution authority granted."
          : "No direct finding for this artifact; the aggregate admission still has unresolved or restricted context."],
      metadata: { artifactId: artifact.artifactId, producerAgentId: producer, receiverAgentId: evidence.requestedUse.receiverAgentId,
        createdAt: artifact.createdAt, receivedAt: evidence.evaluatedAt, temporalHandoff: temporal,
        crossAgentHandoff: artifact.provenance?.producerAgentId !== undefined && producer !== evidence.requestedUse.receiverAgentId,
        contextLineageDigest: evidence.contextLineageDigest,
        parentArtifactIds: artifact.parentArtifactIds, transformations: artifact.transformations }
    };
  });
}

export function contextAdmissionToAgencyIssues(evidence: ContextAdmissionEvidence): AgencyChainIssue[] {
  return evidence.findings.map(f => ({
    id: `AC-CONTEXT-${evidence.admissionId}-${f.artifactId}-${f.code}`, title: `Inherited context: ${f.code.replaceAll("_", " ")}`,
    severity: f.decision === "reject" ? "high" : f.decision === "admit_restricted" ? "low" : "medium", confidence: "medium",
    linkType: "information_handoff", linkId: `${evidence.admissionId}:${f.artifactId}`, observation: f.reason,
    whyItMatters: "Persistent information is a handoff across time; availability does not preserve authority or admissibility.",
    auditQuestion: "What evidence supports this receiver's use, provenance, transformations and current authority?",
    recommendedRemediation: "Resolve the recorded evidence gap and evaluate admission for the receiving use; do not reuse historical approval as current authority.",
    taxonomyId: "TG-012", evidenceRefs: [{ id: evidence.admissionId, type: "document", title: "Recorded Context Admission findings", excerpt: evidence.contextLineageDigest }]
  }));
}
