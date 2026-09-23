import type {
  AgentActionProposal,
  ContextAdmissionEvidence,
  PgdlDecision,
  PgdlObjection,
  PgdlPacket
} from "@alignment-governance-stack/shared-types";
import { detectComplianceTheater } from "./modules/complianceTheaterDetector.js";
import { resolveDiscernment } from "./modules/discernmentResolver.js";
import { rewriteForInternalization } from "./modules/internalizationRewriter.js";
import { generateObjections } from "./modules/objectionGenerator.js";
import { analyzeProposal } from "./modules/proposalAnalyzer.js";
import { defaultPgdlPolicy } from "./policies/defaultPgdlPolicy.js";

export function evaluatePgdl(proposal: AgentActionProposal, contextAdmission?: ContextAdmissionEvidence): PgdlPacket {
  if (contextAdmission !== undefined && contextAdmission.decision !== "admit" && contextAdmission.decision !== "admit_restricted") {
    return {
      originalProposal: proposal,
      contextAdmission,
      objections: [{
        category: "scope",
        severity: "high",
        message: "Material context is unresolved.",
        question: "Is inherited information admissible for this proposal?",
        reason: contextAdmission.reasonForDecision,
        suggestedRevision: "Resolve context provenance, validity and receiving-use authority before maturing this proposal."
      }],
      decision: contextAdmission.decision === "reject" ? "reject_before_aag" : "escalate_to_human",
      reasonForDecision: contextAdmission.reasonForDecision
    };
  }
  const analysis = analyzeProposal(proposal, defaultPgdlPolicy);
  const objections = generateObjections(proposal, analysis);
  const complianceTheaterObjection = detectComplianceTheater(proposal);

  if (complianceTheaterObjection !== undefined) {
    objections.push(complianceTheaterObjection);
  }

  const resolvedProposal = createResolvedProposal(proposal);
  const internalizedPrinciple = rewriteForInternalization(proposal, objections);
  const decision = resolveDiscernment(proposal, objections, resolvedProposal);

  const packet: PgdlPacket = {
    ...(contextAdmission !== undefined ? { contextAdmission } : {}),
    originalProposal: proposal,
    objections,
    decision,
    reasonForDecision: buildReasonForDecision(decision, objections, resolvedProposal)
  };

  if (internalizedPrinciple !== undefined) {
    packet.internalizedPrinciple = internalizedPrinciple;
  }

  if (resolvedProposal !== undefined && decision !== "forward_to_aag") {
    packet.resolvedProposal = resolvedProposal;
  }

  return packet;
}

function createResolvedProposal(proposal: AgentActionProposal): AgentActionProposal | undefined {
  const tool = proposal.tool.toLowerCase();
  const actionType = proposal.actionType.toLowerCase();

  if (
    tool.includes("delete") ||
    actionType.includes("delete") ||
    isFinancialSourceDataMutation(proposal)
  ) {
    return {
      ...proposal,
      tool: "review.generate",
      actionType: "generate_review_packet",
      reversible: true,
      externalFacing: false,
      requiresApproval: proposal.dataSensitivity === "high",
      knownApproval: false,
      metadata: {
        ...proposal.metadata,
        pgdlRevision: true,
        originalTool: proposal.tool,
        originalActionType: proposal.actionType,
        revisionReason: "Changed destructive action into a non-destructive review packet."
      }
    };
  }

  if (
    proposal.externalFacing &&
    (actionType.includes("send") || actionType.includes("publish")) &&
    !isApprovedReviewedExternalRelease(proposal)
  ) {
    return {
      ...proposal,
      tool: "draft.create",
      actionType: "create_draft_for_review",
      reversible: true,
      externalFacing: false,
      requiresApproval: false,
      knownApproval: false,
      metadata: {
        ...proposal.metadata,
        pgdlRevision: true,
        originalTool: proposal.tool,
        originalActionType: proposal.actionType,
        revisionReason: "Changed external-facing execution into a draft for review."
      }
    };
  }

  return undefined;
}

function isApprovedReviewedExternalRelease(proposal: AgentActionProposal): boolean {
  return (
    proposal.externalFacing === true &&
    proposal.requiresApproval === true &&
    proposal.knownApproval === true &&
    proposal.metadata.reviewedForExternalRelease === true
  );
}

function isFinancialSourceDataMutation(proposal: AgentActionProposal): boolean {
  const actionText = `${proposal.tool} ${proposal.actionType} ${proposal.target}`.toLowerCase();
  const mutation = ["modify", "update", "write", "mutate"].some((term) => actionText.includes(term));
  const financialSourceData = actionText.includes("financial_source_data");

  return mutation && financialSourceData;
}

function buildReasonForDecision(
  decision: PgdlDecision,
  objections: PgdlObjection[],
  resolvedProposal: AgentActionProposal | undefined
): string {
  if (decision === "forward_to_aag") {
    return "The proposal has no PGDL objections and can be forwarded to AAG.";
  }

  const categories = objections.map((objection) => objection.category).join(", ");

  if (decision === "revise_before_aag" && resolvedProposal !== undefined) {
    if (objections.some((objection) => objection.category === "compliance_theater")) {
      return "PGDL detected wording changes without meaningful risk reduction and produced a materially safer revised proposal before AAG.";
    }

    return `PGDL found objections (${categories}) and produced a safer revised proposal before AAG.`;
  }

  if (decision === "reject_before_aag") {
    return "PGDL detected compliance theater: wording changed but risk did not meaningfully change.";
  }

  return `PGDL found objections (${categories}) without a deterministic safe rewrite, so human escalation is required.`;
}
