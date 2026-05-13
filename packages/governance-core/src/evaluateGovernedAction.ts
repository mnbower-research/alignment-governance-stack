import { evaluateAag } from "@alignment-governance-stack/aag-core";
import { validateApproval } from "@alignment-governance-stack/authority-map";
import { evaluateParticipationQuality } from "@alignment-governance-stack/human-participation";
import {
  resolvePolicyForAction,
  validatePolicyProfile
} from "@alignment-governance-stack/policy-profiles";
import { evaluatePgdl } from "@alignment-governance-stack/pgdl-core";
import type { AagPacket, AgentActionProposal } from "@alignment-governance-stack/shared-types";
import type {
  EvaluateGovernedActionInput,
  GovernanceFinalDecision,
  GovernancePacket
} from "./types.js";
import type {
  ApprovalEvidence,
  ApprovalValidationResult
} from "@alignment-governance-stack/authority-map";
import type {
  HumanParticipationInput,
  HumanParticipationResult
} from "@alignment-governance-stack/human-participation";
import type { ResolvedActionPolicy } from "@alignment-governance-stack/policy-profiles";

export function evaluateGovernedAction(
  input: AgentActionProposal | EvaluateGovernedActionInput
): GovernancePacket {
  const normalizedInput = normalizeInput(input);
  const { proposal, policyProfile, authorityMap, approvalEvidence, humanParticipation } = normalizedInput;

  if (policyProfile !== undefined) {
    const policyProfileValidation = validatePolicyProfile(policyProfile);

    if (!policyProfileValidation.valid) {
      return {
        originalProposal: proposal,
        policyProfileValidation,
        finalDecision: "policy_invalid",
        reasonForDecision: `Policy profile is invalid: ${policyProfileValidation.errors.join(" ")}`
      };
    }
  }

  const pgdl = evaluatePgdl(proposal);

  if (pgdl.decision === "reject_before_aag") {
    return {
      originalProposal: proposal,
      pgdl,
      finalDecision: "rejected_before_gate",
      reasonForDecision: "PGDL rejected the proposal before AAG gate evaluation."
    };
  }

  if (pgdl.decision === "escalate_to_human") {
    return {
      originalProposal: proposal,
      pgdl,
      finalDecision: "escalated_before_gate",
      reasonForDecision: "PGDL requires human escalation before AAG gate evaluation."
    };
  }

  if (pgdl.decision === "revise_before_aag" && pgdl.resolvedProposal === undefined) {
    return {
      originalProposal: proposal,
      pgdl,
      finalDecision: "escalated_before_gate",
      reasonForDecision: "PGDL requested revision before AAG, but no resolved proposal was available."
    };
  }

  const proposalSentToAag =
    pgdl.decision === "revise_before_aag" ? pgdl.resolvedProposal : proposal;

  if (proposalSentToAag === undefined) {
    return {
      originalProposal: proposal,
      pgdl,
      finalDecision: "escalated_before_gate",
      reasonForDecision: "No proposal was available for AAG gate evaluation."
    };
  }

  if (policyProfile !== undefined) {
    const resolvedPolicy = resolvePolicyForAction(policyProfile, proposalSentToAag);

    if (resolvedPolicy.suggestedDecision === "block" || !resolvedPolicy.allowed) {
      return {
        originalProposal: proposal,
        pgdl,
        proposalSentToAag,
        resolvedPolicy,
        finalDecision: "blocked_by_policy",
        reasonForDecision:
          "Policy profile blocked the proposal before AAG gate evaluation."
      };
    }

    if (authorityMap !== undefined) {
      const approvalValidation = validateApproval(
        authorityMap,
        proposalSentToAag,
        approvalEvidence,
        {
          policyRequiresApproval: resolvedPolicy.requiresApproval,
          policyReasons: resolvedPolicy.reasons
        }
      );

      if (!approvalValidation.valid) {
        return {
          originalProposal: proposal,
          pgdl,
          proposalSentToAag,
          resolvedPolicy,
          approvalValidation,
          finalDecision: "approval_required_by_authority",
          reasonForDecision:
            `Authority validation stopped the proposal before AAG: ${approvalValidation.decision}. ${approvalValidation.reasons.join(" ")}`
        };
      }

      const participationQuality = evaluateParticipationIfSupplied({
        humanParticipation,
        proposal: proposalSentToAag,
        approvalEvidence,
        approvalValidation,
        resolvedPolicy
      });

      if (participationQuality !== undefined && shouldStopForParticipation(participationQuality)) {
        return {
          originalProposal: proposal,
          pgdl,
          proposalSentToAag,
          resolvedPolicy,
          approvalValidation,
          participationQuality,
          finalDecision: "insufficient_human_participation",
          reasonForDecision:
            `Human participation quality stopped the proposal before AAG: ${participationQuality.decision}. ${participationQuality.reasons.join(" ")}`
        };
      }

      const policyAwareProposal = resolvedPolicy.requiresApproval
        ? addPolicyMetadata(proposalSentToAag, resolvedPolicy)
        : proposalSentToAag;
      const aag = evaluateAag(policyAwareProposal);

      return {
        originalProposal: proposal,
        pgdl,
        proposalSentToAag: policyAwareProposal,
        resolvedPolicy,
        approvalValidation,
        ...(participationQuality !== undefined ? { participationQuality } : {}),
        aag,
        finalDecision: mapAagDecision(aag),
        reasonForDecision: `PGDL allowed a proposal to reach AAG. Policy profile resolved before AAG. Authority validation passed before AAG. ${aag.reasonForDecision}`
      };
    }

    const policyAwareProposal = resolvedPolicy.requiresApproval
      ? addPolicyMetadata(proposalSentToAag, resolvedPolicy)
      : proposalSentToAag;

    const participationQuality = evaluateParticipationIfSupplied({
      humanParticipation,
      proposal: proposalSentToAag,
      approvalEvidence,
      resolvedPolicy
    });

    if (participationQuality !== undefined && shouldStopForParticipation(participationQuality)) {
      return {
        originalProposal: proposal,
        pgdl,
        proposalSentToAag,
        resolvedPolicy,
        participationQuality,
        finalDecision: "insufficient_human_participation",
        reasonForDecision:
          `Human participation quality stopped the proposal before AAG: ${participationQuality.decision}. ${participationQuality.reasons.join(" ")}`
      };
    }

    const aag = evaluateAag(policyAwareProposal);

    return {
      originalProposal: proposal,
      pgdl,
      proposalSentToAag: policyAwareProposal,
      resolvedPolicy,
      ...(participationQuality !== undefined ? { participationQuality } : {}),
      aag,
      finalDecision: mapAagDecision(aag),
      reasonForDecision: `PGDL allowed a proposal to reach AAG. Policy profile resolved before AAG. ${aag.reasonForDecision}`
    };
  }

  if (authorityMap !== undefined) {
    const approvalValidation = validateApproval(
      authorityMap,
      proposalSentToAag,
      approvalEvidence
    );

    if (!approvalValidation.valid) {
      return {
        originalProposal: proposal,
        pgdl,
        proposalSentToAag,
        approvalValidation,
        finalDecision: "approval_required_by_authority",
        reasonForDecision:
          `Authority validation stopped the proposal before AAG: ${approvalValidation.decision}. ${approvalValidation.reasons.join(" ")}`
      };
    }

    const participationQuality = evaluateParticipationIfSupplied({
      humanParticipation,
      proposal: proposalSentToAag,
      approvalEvidence,
      approvalValidation
    });

    if (participationQuality !== undefined && shouldStopForParticipation(participationQuality)) {
      return {
        originalProposal: proposal,
        pgdl,
        proposalSentToAag,
        approvalValidation,
        participationQuality,
        finalDecision: "insufficient_human_participation",
        reasonForDecision:
          `Human participation quality stopped the proposal before AAG: ${participationQuality.decision}. ${participationQuality.reasons.join(" ")}`
      };
    }

    const aag = evaluateAag(proposalSentToAag);

    return {
      originalProposal: proposal,
      pgdl,
      proposalSentToAag,
      approvalValidation,
      ...(participationQuality !== undefined ? { participationQuality } : {}),
      aag,
      finalDecision: mapAagDecision(aag),
      reasonForDecision: `PGDL allowed a proposal to reach AAG. Authority validation passed before AAG. ${aag.reasonForDecision}`
    };
  }

  const participationQuality = evaluateParticipationIfSupplied({
    humanParticipation,
    proposal: proposalSentToAag,
    approvalEvidence
  });

  if (participationQuality !== undefined && shouldStopForParticipation(participationQuality)) {
    return {
      originalProposal: proposal,
      pgdl,
      proposalSentToAag,
      participationQuality,
      finalDecision: "insufficient_human_participation",
      reasonForDecision:
        `Human participation quality stopped the proposal before AAG: ${participationQuality.decision}. ${participationQuality.reasons.join(" ")}`
    };
  }

  const aag = evaluateAag(proposalSentToAag);

  return {
    originalProposal: proposal,
    pgdl,
    proposalSentToAag,
    ...(participationQuality !== undefined ? { participationQuality } : {}),
    aag,
    finalDecision: mapAagDecision(aag),
    reasonForDecision: `PGDL allowed a proposal to reach AAG. ${aag.reasonForDecision}`
  };
}

function normalizeInput(
  input: AgentActionProposal | EvaluateGovernedActionInput
): EvaluateGovernedActionInput {
  if (isEvaluateGovernedActionInput(input)) {
    return input;
  }

  return {
    proposal: input
  };
}

function isEvaluateGovernedActionInput(
  input: AgentActionProposal | EvaluateGovernedActionInput
): input is EvaluateGovernedActionInput {
  return "proposal" in input;
}

function addPolicyMetadata(
  proposal: AgentActionProposal,
  resolvedPolicy: NonNullable<GovernancePacket["resolvedPolicy"]>
): AgentActionProposal {
  return {
    ...proposal,
    metadata: {
      ...proposal.metadata,
      policyRequiresApproval: true,
      policyReasons: [...resolvedPolicy.reasons],
      policyMatchedRules: [...resolvedPolicy.matchedRules]
    }
  };
}

function evaluateParticipationIfSupplied(input: {
  humanParticipation: EvaluateGovernedActionInput["humanParticipation"];
  proposal: AgentActionProposal;
  approvalEvidence: ApprovalEvidence | undefined;
  approvalValidation?: ApprovalValidationResult;
  resolvedPolicy?: ResolvedActionPolicy;
}): HumanParticipationResult | undefined {
  if (input.humanParticipation === undefined) {
    return undefined;
  }

  const suppliedInput = input.humanParticipation.input;
  const suppliedContext = suppliedInput?.context ?? {};
  const requiredApproval =
    suppliedContext.requiredApproval ??
    (input.proposal.requiresApproval || input.resolvedPolicy?.requiresApproval === true);
  const authorityValid =
    suppliedContext.authorityValid ?? input.approvalValidation?.valid;
  const participationInput: HumanParticipationInput = {
    ...(suppliedInput ?? {}),
    action: input.proposal,
    ...(suppliedInput?.approvalEvidence !== undefined
      ? { approvalEvidence: suppliedInput.approvalEvidence }
      : input.approvalEvidence !== undefined
        ? { approvalEvidence: input.approvalEvidence }
        : {}),
    context: {
      ...suppliedContext,
      requiredApproval,
      ...(authorityValid !== undefined ? { authorityValid } : {})
    }
  };

  return evaluateParticipationQuality(participationInput, input.humanParticipation.policy);
}

function shouldStopForParticipation(
  participationQuality: HumanParticipationResult
): boolean {
  return (
    participationQuality.decision === "likely_rubber_stamp" ||
    participationQuality.decision === "insufficient_participation" ||
    participationQuality.decision === "participation_input_invalid"
  );
}

function mapAagDecision(aag: AagPacket): GovernanceFinalDecision {
  if (aag.decision === "allow") {
    return "allowed_by_aag";
  }

  if (aag.decision === "require_approval") {
    return "approval_required_by_aag";
  }

  if (aag.decision === "revise_action") {
    return "revision_required_by_aag";
  }

  return "blocked_by_aag";
}
