import { evaluateAag } from "@alignment-governance-stack/aag-core";
import { validateApproval } from "@alignment-governance-stack/authority-map";
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

export function evaluateGovernedAction(
  input: AgentActionProposal | EvaluateGovernedActionInput
): GovernancePacket {
  const normalizedInput = normalizeInput(input);
  const { proposal, policyProfile, authorityMap, approvalEvidence } = normalizedInput;

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
        aag,
        finalDecision: mapAagDecision(aag),
        reasonForDecision: `PGDL allowed a proposal to reach AAG. Policy profile resolved before AAG. Authority validation passed before AAG. ${aag.reasonForDecision}`
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

    const aag = evaluateAag(proposalSentToAag);

    return {
      originalProposal: proposal,
      pgdl,
      proposalSentToAag,
      approvalValidation,
      aag,
      finalDecision: mapAagDecision(aag),
      reasonForDecision: `PGDL allowed a proposal to reach AAG. Authority validation passed before AAG. ${aag.reasonForDecision}`
    };
  }

  const aag = evaluateAag(proposalSentToAag);

  return {
    originalProposal: proposal,
    pgdl,
    proposalSentToAag,
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
