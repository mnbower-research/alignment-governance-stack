import {
  createAgencyFingerprint,
  linkAgencyFingerprint,
  validateAgencyFingerprintChain
} from "@alignment-governance-stack/agency-fingerprint";

const firstFingerprint = createAgencyFingerprint({
  subjectHumanId: "human-founder-001",
  subjectOrganizationId: "org-human-agency-labs",
  delegatedBy: "human-founder-001",
  agentId: "research-agent-001",
  agentRole: "market-research",
  workflowId: "workflow-competitive-brief",
  workflowScopeHash: "sha256:mock-workflow-scope",
  authorityMapHash: "sha256:mock-authority-map",
  policyProfileHash: "sha256:mock-policy-profile",
  pgdlPacketHash: "sha256:mock-pgdl-packet",
  aagDecisionHash: "sha256:mock-aag-decision",
  approvalRecordHash: "sha256:mock-founder-approval",
  runtimePermitHash: "sha256:mock-runtime-permit",
  actionHash: "sha256:mock-research-action",
  targetHash: "sha256:mock-competitor-dataset",
  environment: "staging",
  timestamp: "2026-05-26T12:00:00.000Z",
  metadata: {
    example: "founder delegates competitive research to a research agent"
  }
});

const secondFingerprint = linkAgencyFingerprint(firstFingerprint, {
  subjectHumanId: "human-founder-001",
  subjectOrganizationId: "org-human-agency-labs",
  delegatedBy: "human-founder-001",
  agentId: "research-agent-001",
  agentRole: "market-research",
  workflowId: "workflow-competitive-brief",
  workflowScopeHash: "sha256:mock-workflow-scope",
  authorityMapHash: "sha256:mock-authority-map",
  policyProfileHash: "sha256:mock-policy-profile",
  pgdlPacketHash: "sha256:mock-pgdl-packet-2",
  aagDecisionHash: "sha256:mock-aag-decision-2",
  runtimePermitHash: "sha256:mock-runtime-permit-2",
  actionHash: "sha256:mock-summary-action",
  targetHash: "sha256:mock-internal-brief",
  environment: "staging",
  timestamp: "2026-05-26T12:15:00.000Z"
});

const verification = validateAgencyFingerprintChain([
  firstFingerprint,
  secondFingerprint
]);

console.log({
  firstFingerprintId: firstFingerprint.fingerprintId,
  firstFingerprintHash: firstFingerprint.fingerprintHash,
  secondFingerprintId: secondFingerprint.fingerprintId,
  secondFingerprintHash: secondFingerprint.fingerprintHash,
  chainValid: verification.valid,
  warnings: verification.warnings,
  errors: verification.errors
});
