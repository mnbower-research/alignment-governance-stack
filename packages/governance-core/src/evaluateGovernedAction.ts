import { evaluateAag } from "@alignment-governance-stack/aag-core";
import { evaluatePgdl } from "@alignment-governance-stack/pgdl-core";
import type { AagPacket, AgentActionProposal } from "@alignment-governance-stack/shared-types";
import type { GovernanceFinalDecision, GovernancePacket } from "./types.js";

export function evaluateGovernedAction(input: AgentActionProposal): GovernancePacket {
  const pgdl = evaluatePgdl(input);

  if (pgdl.decision === "reject_before_aag") {
    return {
      originalProposal: input,
      pgdl,
      finalDecision: "rejected_before_gate",
      reasonForDecision: "PGDL rejected the proposal before AAG gate evaluation."
    };
  }

  if (pgdl.decision === "escalate_to_human") {
    return {
      originalProposal: input,
      pgdl,
      finalDecision: "escalated_before_gate",
      reasonForDecision: "PGDL requires human escalation before AAG gate evaluation."
    };
  }

  if (pgdl.decision === "revise_before_aag" && pgdl.resolvedProposal === undefined) {
    return {
      originalProposal: input,
      pgdl,
      finalDecision: "escalated_before_gate",
      reasonForDecision: "PGDL requested revision before AAG, but no resolved proposal was available."
    };
  }

  const proposalSentToAag =
    pgdl.decision === "revise_before_aag" ? pgdl.resolvedProposal : input;

  if (proposalSentToAag === undefined) {
    return {
      originalProposal: input,
      pgdl,
      finalDecision: "escalated_before_gate",
      reasonForDecision: "No proposal was available for AAG gate evaluation."
    };
  }

  const aag = evaluateAag(proposalSentToAag);

  return {
    originalProposal: input,
    pgdl,
    proposalSentToAag,
    aag,
    finalDecision: mapAagDecision(aag),
    reasonForDecision: `PGDL allowed a proposal to reach AAG. ${aag.reasonForDecision}`
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
