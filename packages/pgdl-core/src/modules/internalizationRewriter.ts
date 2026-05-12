import type { AgentActionProposal, PgdlObjection } from "@alignment-governance-stack/shared-types";

export function rewriteForInternalization(
  proposal: AgentActionProposal,
  objections: PgdlObjection[]
): string | undefined {
  if (objections.length === 0) {
    return undefined;
  }

  const categories = new Set(objections.map((objection) => objection.category));
  const destructive = !proposal.reversible || proposal.actionType.toLowerCase().includes("delete");
  const production = proposal.environment.toLowerCase() === "production";

  if (destructive && production && proposal.dataSensitivity === "high") {
    return "Preserve data integrity, human authority, and reversibility for high-impact production actions.";
  }

  if (categories.has("external_impact")) {
    return "Preserve human review and accountability before actions affect external parties.";
  }

  if (categories.has("data_sensitivity")) {
    return "Protect sensitive data by narrowing scope, preserving review, and avoiding unnecessary exposure.";
  }

  return "Preserve human agency, reversibility, and appropriate scope before action.";
}
