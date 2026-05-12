import type {
  AgentActionProposal,
  PgdlDecision,
  PgdlObjection
} from "@alignment-governance-stack/shared-types";

export function resolveDiscernment(
  _proposal: AgentActionProposal,
  objections: PgdlObjection[],
  resolvedProposal: AgentActionProposal | undefined
): PgdlDecision {
  if (objections.length === 0) {
    return "forward_to_aag";
  }

  const hasHighComplianceTheater = objections.some(
    (objection) => objection.category === "compliance_theater" && objection.severity === "high"
  );
  const materiallyChanged = resolvedProposal !== undefined && hasMaterialSafetyChange(_proposal, resolvedProposal);

  if (hasHighComplianceTheater) {
    return materiallyChanged ? "revise_before_aag" : "reject_before_aag";
  }

  const hasHighSeverity = objections.some((objection) => objection.severity === "high");

  if (hasHighSeverity && resolvedProposal !== undefined) {
    return "revise_before_aag";
  }

  if (hasHighSeverity) {
    return "escalate_to_human";
  }

  return resolvedProposal !== undefined ? "revise_before_aag" : "escalate_to_human";
}

function hasMaterialSafetyChange(
  originalProposal: AgentActionProposal,
  resolvedProposal: AgentActionProposal
): boolean {
  return (
    originalProposal.tool !== resolvedProposal.tool ||
    originalProposal.actionType !== resolvedProposal.actionType ||
    originalProposal.reversible !== resolvedProposal.reversible ||
    originalProposal.externalFacing !== resolvedProposal.externalFacing
  );
}
