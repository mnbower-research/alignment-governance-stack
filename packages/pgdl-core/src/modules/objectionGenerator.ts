import type { AgentActionProposal, PgdlObjection } from "@alignment-governance-stack/shared-types";
import type { PgdlProposalAnalysis } from "../types.js";

export function generateObjections(
  proposal: AgentActionProposal,
  analysis: PgdlProposalAnalysis
): PgdlObjection[] {
  const objections: PgdlObjection[] = [];

  if (!proposal.reversible) {
    objections.push({
      category: "reversibility",
      severity: "high",
      question: "Can this action be undone?",
      message: "The proposed action is irreversible or difficult to reverse.",
      reason: "The proposal is marked as an irreversible or difficult-to-reverse action.",
      suggestedRevision: "Prefer a reversible review, report, or draft action before execution."
    });
  }

  if (proposal.requiresApproval && proposal.knownApproval !== true) {
    objections.push({
      category: "human_judgment",
      severity: "high",
      question: "Should a human approve this before execution?",
      message: "The proposal requires approval, but approval is not known.",
      reason: "Approval is required but not known for this proposal.",
      suggestedRevision: "Escalate for human approval before any executing action."
    });
  }

  if (proposal.dataSensitivity === "high" && !isApprovedInternalReversibleAction(proposal, analysis)) {
    objections.push({
      category: "data_sensitivity",
      severity: analysis.destructive || analysis.production ? "high" : "medium",
      question: "Does this action expose or modify sensitive data?",
      message: "The proposal involves high-sensitivity data.",
      reason: "The action touches high-sensitivity data and may expose or modify it.",
      suggestedRevision: "Prefer review, redaction, narrowed scope, or approval before execution."
    });
  }

  if (proposal.externalFacing) {
    objections.push({
      category: "external_impact",
      severity: "medium",
      question: "Will this affect people or systems outside the local agent context?",
      message: "The proposal has external-facing impact.",
      reason: "The action can affect people or systems outside the local agent context.",
      suggestedRevision: "Prefer a draft or review step before external send or publish."
    });
  }

  if (
    analysis.production &&
    proposal.knownApproval !== true &&
    (analysis.destructive || proposal.externalFacing)
  ) {
    objections.push({
      category: "authority",
      severity: "high",
      question: "Is this action within current authority?",
      message: "Production authority is unclear without known approval.",
      reason: "The proposal targets production and lacks known approval for a destructive or external-facing action.",
      suggestedRevision: "Require approval or choose a safer non-executing alternative."
    });
  }

  if (analysis.broadScope) {
    objections.push({
      category: "scope",
      severity: analysis.production || !proposal.reversible ? "high" : "medium",
      question: "Is the scope narrower than the user's actual intent?",
      message: "The proposal appears to have broad scope.",
      reason: "The target or action type suggests broad scope that may exceed the user's actual intent.",
      suggestedRevision: "Narrow the target or generate a review packet before execution."
    });
  }

  return objections;
}

function isApprovedInternalReversibleAction(
  proposal: AgentActionProposal,
  analysis: PgdlProposalAnalysis
): boolean {
  return (
    proposal.knownApproval === true &&
    proposal.requiresApproval === true &&
    proposal.reversible === true &&
    proposal.externalFacing === false &&
    !analysis.destructive
  );
}
