import type { AgentActionProposal } from "@alignment-governance-stack/shared-types";
import type { AgencyBusinessProposal } from "./types.js";

export function mapAgencyProposalToActionProposal(
  proposal: AgencyBusinessProposal
): AgentActionProposal {
  validateAgencyBusinessProposal(proposal);

  return {
    id: proposal.id,
    userRequest: proposal.expectedOutcome,
    tool: proposal.tool,
    actionType: proposal.actionType,
    target: proposal.target,
    environment: proposal.environment,
    reversible: proposal.reversible,
    externalFacing: proposal.externalFacing,
    dataSensitivity: proposal.dataSensitivity,
    requiresApproval: proposal.requiresApproval,
    knownApproval: proposal.knownApproval,
    ...(proposal.executionConstraints !== undefined ? { executionConstraints: proposal.executionConstraints } : {}),
    metadata: {
      ...(proposal.metadata ?? {}),
      agencyAdapter: "ai-media-agency-adapter/v0.1",
      simulationOnly: true,
      objectiveId: proposal.objectiveId,
      propertyId: proposal.propertyId,
      agentId: proposal.agentId,
      agentRole: proposal.agentRole,
      businessActionType: proposal.businessActionType,
      ...(proposal.campaignId !== undefined ? { campaignId: proposal.campaignId } : {}),
      ...(proposal.contentId !== undefined ? { contentId: proposal.contentId } : {}),
      ...(proposal.platform !== undefined ? { platform: proposal.platform } : {}),
      ...(proposal.budgetAmount !== undefined ? { budgetAmount: proposal.budgetAmount } : {}),
      ...(proposal.budgetCurrency !== undefined ? { budgetCurrency: proposal.budgetCurrency } : {}),
      experimentWindow: { ...proposal.experimentWindow },
      risk: {
        risks: [...proposal.risk.risks],
        objections: [...proposal.risk.objections],
        alternatives: [...proposal.risk.alternatives],
        rollbackPlan: proposal.risk.rollbackPlan,
        ...(proposal.risk.dataSensitivityRationale !== undefined
          ? { dataSensitivityRationale: proposal.risk.dataSensitivityRationale }
          : {})
      },
      metadataRuntimeBindingLimitation:
        "Only values represented as canonical bound execution constraints are protected as domain-specific execution-authoritative values by Runtime Binding. Ordinary metadata remains non-authoritative."
    }
  };
}

function validateAgencyBusinessProposal(proposal: AgencyBusinessProposal): void {
  requireNonEmptyString(proposal.id, "id");
  requireNonEmptyString(proposal.objectiveId, "objectiveId");
  requireNonEmptyString(proposal.propertyId, "propertyId");
  requireNonEmptyString(proposal.agentId, "agentId");
  requireNonEmptyString(proposal.agentRole, "agentRole");
  requireNonEmptyString(proposal.businessActionType, "businessActionType");
  requireNonEmptyString(proposal.tool, "tool");
  requireNonEmptyString(proposal.actionType, "actionType");
  requireNonEmptyString(proposal.target, "target");
  requireNonEmptyString(proposal.environment, "environment");
  requireNonEmptyString(proposal.expectedOutcome, "expectedOutcome");
  requireNonEmptyString(proposal.experimentWindow.startsAt, "experimentWindow.startsAt");
  requireNonEmptyString(proposal.experimentWindow.endsAt, "experimentWindow.endsAt");
  requireNonEmptyArray(proposal.risk.risks, "risk.risks");
  requireNonEmptyArray(proposal.risk.objections, "risk.objections");
  requireNonEmptyArray(proposal.risk.alternatives, "risk.alternatives");
  requireNonEmptyString(proposal.risk.rollbackPlan, "risk.rollbackPlan");

  if (proposal.budgetAmount !== undefined && (!Number.isFinite(proposal.budgetAmount) || proposal.budgetAmount < 0)) {
    throw new Error("Agency business proposal budgetAmount must be a non-negative finite number.");
  }

  if (proposal.budgetAmount !== undefined) {
    requireNonEmptyString(proposal.budgetCurrency, "budgetCurrency");
  }

  if (proposal.budgetCurrency !== undefined && proposal.budgetAmount === undefined) {
    throw new Error("Agency business proposal budgetCurrency requires budgetAmount.");
  }
}

function requireNonEmptyString(value: unknown, fieldName: string): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Agency business proposal is missing required field: ${fieldName}.`);
  }
}

function requireNonEmptyArray(value: unknown, fieldName: string): void {
  if (!Array.isArray(value) || value.length === 0 || !value.every((entry) => typeof entry === "string" && entry.trim().length > 0)) {
    throw new Error(`Agency business proposal is missing required field: ${fieldName}.`);
  }
}
