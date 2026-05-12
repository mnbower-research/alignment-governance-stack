import type {
  AgentActionProposal,
  PgdlDecision,
  PgdlObjection
} from "@alignment-governance-stack/shared-types";

export function resolveDiscernment(
  _proposal: AgentActionProposal,
  objections: PgdlObjection[]
): PgdlDecision {
  // TODO: Resolve whether the proposal should be forwarded, revised, escalated, or rejected.
  return objections.length > 0 ? "revise_before_aag" : "forward_to_aag";
}
