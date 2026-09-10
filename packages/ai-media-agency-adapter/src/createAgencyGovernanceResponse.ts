import { createDecisionClosureArtifact } from "@alignment-governance-stack/decision-closure";
import { evaluateGovernedRuntimeActionWithReceipt } from "@alignment-governance-stack/governance-core";
import { mapAgencyProposalToActionProposal } from "./mapAgencyProposalToActionProposal.js";
import { mapGovernanceResultToAgencyResponse } from "./mapGovernanceResultToAgencyResponse.js";
import type {
  AgencyBusinessProposal,
  AgencyGovernanceInput,
  AgencyGovernanceResponse,
  SimulatedAgencyExecutionRecord
} from "./types.js";

export function createAgencyGovernanceResponse(
  input: AgencyGovernanceInput
): AgencyGovernanceResponse {
  const proposal = mapAgencyProposalToActionProposal(input.proposal);
  const runtimeAction =
    input.runtimeProposal !== undefined
      ? mapAgencyProposalToActionProposal(input.runtimeProposal)
      : undefined;
  const result = evaluateGovernedRuntimeActionWithReceipt({
    proposal,
    ...(input.policyProfile !== undefined ? { policyProfile: input.policyProfile } : {}),
    ...(input.authorityMap !== undefined ? { authorityMap: input.authorityMap } : {}),
    ...(input.approvalEvidence !== undefined ? { approvalEvidence: input.approvalEvidence } : {}),
    ...(input.humanParticipation !== undefined ? { humanParticipation: input.humanParticipation } : {}),
    ...(runtimeAction !== undefined ? { runtimeAction } : {}),
    ...(input.permitOptions !== undefined ? { permitOptions: input.permitOptions } : {}),
    ...(input.validationOptions !== undefined ? { validationOptions: input.validationOptions } : {}),
    ...(input.receiptOptions !== undefined ? { receiptOptions: input.receiptOptions } : {}),
    ...(input.agencyFingerprintOptions !== undefined
      ? { agencyFingerprintOptions: input.agencyFingerprintOptions }
      : {})
  });
  const decisionClosureArtifact = shouldCreateDecisionClosure(input.proposal)
    ? createAgencyDecisionClosureArtifact(input.proposal, result)
    : undefined;

  return mapGovernanceResultToAgencyResponse({
    proposal,
    ...(runtimeAction !== undefined ? { runtimeAction } : {}),
    result,
    ...(decisionClosureArtifact !== undefined ? { decisionClosureArtifact } : {})
  });
}

export function createSimulatedAgencyExecutionRecord(
  response: AgencyGovernanceResponse
): SimulatedAgencyExecutionRecord {
  const executed = response.nextStep === "proceed_simulated" && response.allowed;

  return {
    id: `simulated-execution-${response.proposal.id}`,
    proposalId: response.proposal.id,
    executed,
    mode: "simulation_only",
    networkCallsMade: 0,
    reason: executed
      ? "Simulated executor recorded a no-network execution for an AGS-approved action."
      : "Simulated executor did not run because AGS did not return execution_allowed."
  };
}

function shouldCreateDecisionClosure(proposal: AgencyBusinessProposal): boolean {
  return proposal.businessActionType === "paid_content_test" || proposal.businessActionType === "public_post";
}

function createAgencyDecisionClosureArtifact(
  proposal: AgencyBusinessProposal,
  result: ReturnType<typeof evaluateGovernedRuntimeActionWithReceipt>
) {
  const governance = result.governance;
  const permit = governance.permit;
  const runtimeBinding = governance.runtimeBinding;
  const outcome = mapClosureOutcome(governance.finalDecision);
  const reviewRequired =
    proposal.requiresApproval ||
    governance.resolvedPolicy?.requiresApproval === true ||
    governance.approvalValidation?.requiredAuthority?.required === true;
  const participationQuality = mapParticipationQuality(governance.participationQuality?.decision);
  const authorityRoleId = governance.approvalValidation?.matchedRoleId;
  const context = {
    declaredActionType: proposal.actionType,
    ...(governance.runtimeAction?.actionType !== undefined
      ? { actualActionType: governance.runtimeAction.actionType }
      : {}),
    declaredTarget: proposal.target,
    ...(governance.runtimeAction?.target !== undefined ? { actualTarget: governance.runtimeAction.target } : {}),
    ...(permit?.allowedAction.tool !== undefined ? { approvedTool: permit.allowedAction.tool } : {}),
    ...(permit?.allowedAction.target !== undefined ? { approvedTarget: permit.allowedAction.target } : {}),
    ...(governance.runtimeAction?.tool !== undefined ? { runtimeTool: governance.runtimeAction.tool } : {}),
    ...(governance.runtimeAction?.target !== undefined ? { runtimeTarget: governance.runtimeAction.target } : {}),
    audience: proposal.externalFacing ? ("external" as const) : ("internal" as const),
    receiptReference: result.receipt.id,
    metadata: {
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
      experimentWindow: proposal.experimentWindow,
      metadataBindingLimitation:
        "Only values represented as canonical bound execution constraints are protected as domain-specific execution-authoritative values by Runtime Binding. Ordinary metadata remains non-authoritative."
    }
  };
  const authority = {
    authoritySource: "Phase 1 CEO AuthorityMap",
    ...(authorityRoleId !== undefined
      ? {
          authorityId: authorityRoleId,
          authorityName: authorityRoleId,
          reviewerId: authorityRoleId,
          reviewerRole: authorityRoleId
        }
      : {}),
    authorityValid: governance.approvalValidation?.valid ?? !reviewRequired,
    authorityReason:
      governance.approvalValidation?.reasons.join(" ") ?? "No approval validation evidence was supplied."
  };
  const decision = {
    outcome,
    reason: governance.reasonForDecision,
    ruleIds: governance.resolvedPolicy?.matchedRules ?? [],
    ...(governance.resolvedPolicy !== undefined ? { policyProfileId: "phase1-agency-policy" } : {}),
    ...(governance.resolvedPolicy?.blockingBoundaryIds !== undefined
      ? { hardBoundaryIds: governance.resolvedPolicy.blockingBoundaryIds }
      : {}),
    humanReviewRequired: reviewRequired,
    humanReviewPresent: governance.participationQuality !== undefined,
    ...(participationQuality !== undefined ? { humanParticipationQuality: participationQuality } : {})
  };
  const conditions = {
    scope: proposal.target,
    ...(permit?.expiresAt !== undefined ? { expiresAt: permit.expiresAt } : {}),
    allowedTools: permit !== undefined ? [permit.allowedAction.tool] : [proposal.tool],
    allowedTargets: permit !== undefined ? [permit.allowedAction.target] : [proposal.target],
    ...(permit?.executionConstraintHash !== undefined
      ? {
          executionConstraintSummary: {
            executionConstraintHash: permit.executionConstraintHash,
            constraintKeys: Object.keys(permit.executionConstraints?.constraints ?? {}).sort()
          }
        }
      : {}),
    notes: [
      "Simulation-only Phase 1 action.",
      "No network execution, public posting, external direct messages, payment credentials, or social-platform credentials.",
      "Only canonical bound execution constraints are execution-authoritative; ordinary metadata remains non-authoritative."
    ]
  };
  const proof = {
    receiptHash: result.receipt.receiptHash,
    ...(result.receipt.previousReceiptHash !== undefined
      ? { previousReceiptHash: result.receipt.previousReceiptHash }
      : {}),
    integrityStatus: "unsigned" as const
  };

  return createDecisionClosureArtifact({
    artifactId: `agency-closure-${proposal.id}`,
    createdAt: result.receipt.createdAt,
    context,
    action: {
      actionId: proposal.id,
      actionType: proposal.actionType,
      summary: proposal.expectedOutcome,
      toolName: proposal.tool,
      target: proposal.target,
      proposedByAgentId: proposal.agentId,
      sensitivity: proposal.dataSensitivity,
      reversibility: proposal.reversible ? "reversible" : "irreversible"
    },
    executionBoundary: {
      boundaryId: `agency-simulation-boundary-${proposal.id}`,
      boundaryType: "simulation_only",
      reachedAt: result.receipt.createdAt,
      runtimePermitRequired: true,
      ...(permit?.id !== undefined ? { runtimePermitId: permit.id } : {}),
      ...(runtimeBinding !== undefined ? { runtimeBindingHash: result.receipt.receiptHash } : {}),
      ...(permit?.executionConstraintHash !== undefined
        ? { executionConstraintHash: permit.executionConstraintHash }
        : {})
    },
    authority,
    decision,
    conditions,
    proof,
    auditSummary: {
      readableWithoutSystemAccess: true,
      summary: `Agency simulation decision for ${proposal.businessActionType}: ${governance.finalDecision}.`,
      unresolvedQuestions: [],
      theaterSignals: governance.participationQuality?.decision === "likely_rubber_stamp"
        ? ["Human participation quality indicated likely rubber-stamping."]
        : [],
      remediationHints:
        governance.finalDecision === "execution_allowed"
          ? ["Maintain simulation-only execution unless a later policy explicitly authorizes live platform use."]
          : ["Resolve the governance stop before proposing execution again."]
    }
  });
}

function mapClosureOutcome(finalDecision: string) {
  if (finalDecision === "execution_allowed" || finalDecision === "allowed_by_aag") {
    return "allow" as const;
  }

  if (finalDecision === "approval_required_by_authority" || finalDecision === "approval_required_by_aag") {
    return "require_approval" as const;
  }

  if (finalDecision === "revision_required_by_aag") {
    return "revise_action" as const;
  }

  if (finalDecision === "escalated_before_gate" || finalDecision === "insufficient_human_participation") {
    return "escalate" as const;
  }

  return "block" as const;
}

function mapParticipationQuality(decision: string | undefined) {
  if (decision === "meaningful_participation") {
    return "strong" as const;
  }

  if (decision === "likely_rubber_stamp" || decision === "insufficient_participation") {
    return "weak" as const;
  }

  if (decision === "participation_not_required") {
    return "not_required" as const;
  }

  return undefined;
}



