import type { AgencyFingerprint, AgencyFingerprintInput } from "./types.js";
import { hashAgencyFingerprint } from "./hashAgencyFingerprint.js";

export function createAgencyFingerprint(input: AgencyFingerprintInput): AgencyFingerprint {
  const body = buildFingerprintBody(input);
  const fingerprintHash = hashAgencyFingerprint({
    fingerprintId: "",
    ...body
  });
  const fingerprintId = deriveAgencyFingerprintId(fingerprintHash);

  return {
    ...body,
    fingerprintId,
    fingerprintHash
  };
}

export function linkAgencyFingerprint(
  previous: AgencyFingerprint,
  nextInput: AgencyFingerprintInput
): AgencyFingerprint {
  return createAgencyFingerprint({
    ...nextInput,
    previousFingerprintHash: previous.fingerprintHash
  });
}

export function deriveAgencyFingerprintId(fingerprintHash: string): string {
  return `agency-fingerprint-${fingerprintHash.slice(0, 16)}`;
}

function buildFingerprintBody(input: AgencyFingerprintInput): Omit<
  AgencyFingerprint,
  "fingerprintId" | "fingerprintHash"
> {
  return {
    version: "agency-fingerprint/v0.1",
    ...(input.contextLineageDigest !== undefined ? { contextLineageDigest: input.contextLineageDigest } : {}),
    ...(input.subjectHumanId !== undefined ? { subjectHumanId: input.subjectHumanId } : {}),
    ...(input.subjectOrganizationId !== undefined
      ? { subjectOrganizationId: input.subjectOrganizationId }
      : {}),
    delegatedBy: input.delegatedBy,
    agentId: input.agentId,
    ...(input.agentRole !== undefined ? { agentRole: input.agentRole } : {}),
    ...(input.workflowId !== undefined ? { workflowId: input.workflowId } : {}),
    ...(input.workflowScopeHash !== undefined ? { workflowScopeHash: input.workflowScopeHash } : {}),
    ...(input.authorityMapHash !== undefined ? { authorityMapHash: input.authorityMapHash } : {}),
    ...(input.policyProfileHash !== undefined ? { policyProfileHash: input.policyProfileHash } : {}),
    ...(input.pgdlPacketHash !== undefined ? { pgdlPacketHash: input.pgdlPacketHash } : {}),
    ...(input.aagDecisionHash !== undefined ? { aagDecisionHash: input.aagDecisionHash } : {}),
    ...(input.approvalRecordHash !== undefined ? { approvalRecordHash: input.approvalRecordHash } : {}),
    ...(input.runtimePermitHash !== undefined ? { runtimePermitHash: input.runtimePermitHash } : {}),
    ...(input.executionConstraintHash !== undefined ? { executionConstraintHash: input.executionConstraintHash } : {}),
    actionHash: input.actionHash,
    ...(input.targetHash !== undefined ? { targetHash: input.targetHash } : {}),
    ...(input.environment !== undefined ? { environment: input.environment } : {}),
    timestamp: input.timestamp,
    ...(input.previousFingerprintHash !== undefined
      ? { previousFingerprintHash: input.previousFingerprintHash }
      : {}),
    ...(input.metadata !== undefined ? { metadata: input.metadata } : {})
  };
}
