import type { ArtifactCorrelation } from "./types.js";

function asRecord(input: unknown): Record<string, unknown> {
  return input && typeof input === "object" && !Array.isArray(input) ? (input as Record<string, unknown>) : {};
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function correlateArtifact(payload: unknown): ArtifactCorrelation {
  const record = asRecord(payload);
  const originalProposal = asRecord(record["originalProposal"]);
  const proposal = asRecord(record["proposal"]);
  const allowedAction = asRecord(record["allowedAction"]);
  const permit = asRecord(record["permit"]);
  const permitAllowedAction = asRecord(permit["allowedAction"]);
  const allowedActionMetadata = asRecord(allowedAction["metadata"]);
  const permitAllowedActionMetadata = asRecord(permitAllowedAction["metadata"]);
  const action = asRecord(record["action"]);
  const executionBoundary = asRecord(record["executionBoundary"]);
  const metadata = asRecord(record["metadata"]);
  const approvalEvidence = asRecord(record["approvalEvidence"]);

  const correlation: ArtifactCorrelation = {};
  const proposalId =
      stringValue(record["proposalId"]) ??
      stringValue(metadata["proposalId"]) ??
      stringValue(permit["proposalId"]) ??
      stringValue(originalProposal["id"]) ??
      stringValue(proposal["id"]) ??
      stringValue(allowedAction["id"]) ??
      stringValue(permitAllowedAction["id"]) ??
      stringValue(action["actionId"]);
  const workflowId =
    stringValue(record["workflowId"]) ??
    stringValue(metadata["workflowId"]) ??
    stringValue(allowedActionMetadata["workflowId"]) ??
    stringValue(permitAllowedActionMetadata["workflowId"]);
  const decisionId = stringValue(record["decisionId"]) ?? stringValue(record["reportId"]);
  const approvalId = stringValue(record["approvalId"]) ?? stringValue(approvalEvidence["id"]);
  const permitId = stringValue(record["permitId"]) ?? stringValue(record["id"]) ?? stringValue(executionBoundary["runtimePermitId"]) ?? stringValue(permit["id"]);
  const permitHash = stringValue(record["permitHash"]) ?? stringValue(record["runtimePermitHash"]) ?? stringValue(record["actionHash"]) ?? stringValue(permit["actionHash"]);
  const receiptId = stringValue(record["receiptId"]) ?? stringValue(record["id"]);
  const closureId = stringValue(record["artifactId"]);
  const fingerprintId = stringValue(record["fingerprintId"]);
  const agentId = stringValue(record["agentId"]) ?? stringValue(action["proposedByAgentId"]);

  if (proposalId) correlation.proposalId = proposalId;
  if (workflowId) correlation.workflowId = workflowId;
  if (decisionId) correlation.decisionId = decisionId;
  if (approvalId) correlation.approvalId = approvalId;
  if (permitId) correlation.permitId = permitId;
  if (permitHash) correlation.permitHash = permitHash;
  if (receiptId) correlation.receiptId = receiptId;
  if (closureId) correlation.closureId = closureId;
  if (fingerprintId) correlation.fingerprintId = fingerprintId;
  if (agentId) correlation.agentId = agentId;

  return correlation;
}
