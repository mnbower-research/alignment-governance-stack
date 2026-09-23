import { describe, expect, it } from "vitest";
import { evaluateContextAdmission, hashContextContent } from "@alignment-governance-stack/context-admission";
import { mapContextAdmissionToAgencyLinks } from "../contextHandoffs.js";
import { createAgencyChainMap } from "../evaluateAgencyChain.js";
import { adaptAgencyChainIssuesToAuditFindings } from "../adaptAgencyChainIssuesToAuditFindings.js";

const evidence = () => evaluateContextAdmission({
  artifacts: [{ id: "artifact-x", artifactType: "summary", content: "local observations", contentHash: hashContextContent("local observations"), createdAt: "2026-09-18T12:00:00Z", dataSensitivity: "low", permittedUses: ["reference"],
    provenance: { sourceId: "store", producerAgentId: "agent-a", trustDomain: "local" },
    transformations: [{ id: "summary", type: "summary", parentArtifactIds: [] }] }],
  materialArtifactIds: ["artifact-x"], evaluatedAt: "2026-09-19T12:00:00Z",
  requestedUse: { mode: "reference", purpose: "reference", receiverAgentId: "agent-b", trustDomain: "local" },
  policy: { id: "reference-policy", trustedSourceIds: ["store"], trustedValidatorIds: [], trustedAuthorityIds: [] }
});

describe("information inheritance chain mapping", () => {
  it("records cross-agent temporal handoffs without transferring authority", () => {
    const links = mapContextAdmissionToAgencyLinks(evidence());
    expect(links[0]?.type).toBe("information_handoff");
    expect(links[0]?.label).toBe("agent-a -> artifact-x -> agent-b");
    expect(links[0]?.metadata).toMatchObject({ temporalHandoff: true, crossAgentHandoff: true });
    expect(links[0]?.description).toContain("Authority does not transfer");
  });
  it("surfaces transformation/authority gaps through existing Human Agency Audit findings", () => {
    const result = createAgencyChainMap({ subject: { auditScope: "inherited context" }, links: [], contextAdmissions: [evidence()] });
    expect(result.issues.some(issue => issue.title.includes("transformation parent missing"))).toBe(true);
    const findings = adaptAgencyChainIssuesToAuditFindings(result.issues);
    expect(findings.some(f => f.observation.includes("parent lineage"))).toBe(true);
  });
  it("rejects tampered historical evidence instead of silently mapping it", () => {
    const changed = evidence(); changed.decision = "admit";
    expect(() => createAgencyChainMap({ subject: { auditScope: "inherited context" }, links: [], contextAdmissions: [changed] })).toThrow("valid shape and digest");
  });
  it("does not infer a cross-agent handoff when the producer is unknown", () => {
    const recorded = evidence(); delete recorded.artifacts[0]!.provenance!.producerAgentId;
    expect(mapContextAdmissionToAgencyLinks(recorded)[0]?.metadata?.crossAgentHandoff).toBe(false);
  });
});
