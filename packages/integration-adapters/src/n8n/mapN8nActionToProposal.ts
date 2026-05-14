import type { AgentActionProposal, DataSensitivity } from "@alignment-governance-stack/shared-types";
import type { N8nActionInput, N8nMappedGovernanceInput } from "./types.js";

type ProposalSource = Partial<AgentActionProposal>;

const dataSensitivityValues = new Set<DataSensitivity>(["low", "medium", "high"]);

export function mapN8nActionToProposal(input: N8nActionInput): N8nMappedGovernanceInput {
  const source = input.proposal ?? input.action;

  if (source === undefined) {
    throw new Error("n8n action input must include either action or proposal.");
  }

  const proposal = normalizeProposal(source, input.metadata);
  const runtimeAction = input.runtimeAction === undefined
    ? undefined
    : normalizeProposal(input.runtimeAction, input.metadata, proposal);

  return {
    proposal,
    ...(runtimeAction !== undefined ? { runtimeAction } : {}),
    ...(input.policyProfile !== undefined ? { policyProfile: input.policyProfile } : {}),
    ...(input.authorityMap !== undefined ? { authorityMap: input.authorityMap } : {}),
    ...(input.approvalEvidence !== undefined ? { approvalEvidence: input.approvalEvidence } : {}),
    ...(input.humanParticipation !== undefined ? { humanParticipation: input.humanParticipation } : {})
  };
}

function normalizeProposal(
  source: ProposalSource,
  inputMetadata: Record<string, unknown> | undefined,
  fallback?: AgentActionProposal
): AgentActionProposal {
  const userRequest = requireString(source.userRequest ?? fallback?.userRequest, "userRequest");
  const tool = requireString(source.tool ?? fallback?.tool, "tool");
  const actionType = requireString(source.actionType ?? fallback?.actionType, "actionType");
  const target = requireString(source.target ?? fallback?.target, "target");

  return {
    id: normalizeString(source.id ?? fallback?.id) ?? `n8n-action-${Date.now()}`,
    userRequest,
    tool,
    actionType,
    target,
    environment: normalizeString(source.environment ?? fallback?.environment) ?? "staging",
    reversible: source.reversible ?? fallback?.reversible ?? true,
    externalFacing: source.externalFacing ?? fallback?.externalFacing ?? false,
    dataSensitivity: normalizeDataSensitivity(source.dataSensitivity ?? fallback?.dataSensitivity),
    requiresApproval: source.requiresApproval ?? fallback?.requiresApproval ?? false,
    knownApproval: source.knownApproval ?? fallback?.knownApproval ?? false,
    metadata: {
      ...(inputMetadata ?? {}),
      ...(fallback?.metadata ?? {}),
      ...(source.metadata ?? {})
    }
  };
}

function requireString(value: unknown, fieldName: string): string {
  const normalized = normalizeString(value);

  if (normalized === undefined) {
    throw new Error(`n8n action input is missing required field: ${fieldName}.`);
  }

  return normalized;
}

function normalizeString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeDataSensitivity(value: unknown): DataSensitivity {
  return dataSensitivityValues.has(value as DataSensitivity)
    ? (value as DataSensitivity)
    : "low";
}
