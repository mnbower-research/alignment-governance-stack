import type { AgentActionProposal, PgdlObjection } from "@alignment-governance-stack/shared-types";

export function detectComplianceTheater(proposal: AgentActionProposal): PgdlObjection | undefined {
  const previousActionType = metadataString(proposal.metadata.previousActionType);
  const previousTool = metadataString(proposal.metadata.previousTool);
  const previousTarget = metadataString(proposal.metadata.previousTarget);
  const revisionNote = metadataString(proposal.metadata.revisionNote);

  if (
    previousActionType === undefined ||
    previousTool === undefined ||
    previousTarget === undefined ||
    revisionNote === undefined
  ) {
    return undefined;
  }

  const materiallySimilar =
    similarValue(proposal.actionType, previousActionType) &&
    similarValue(proposal.tool, previousTool) &&
    similarValue(proposal.target, previousTarget);

  const labelOnlyRevision = ["renamed", "reworded", "described differently", "cleanup", "safer wording"].some(
    (term) => revisionNote.toLowerCase().includes(term)
  );

  if (!materiallySimilar || !labelOnlyRevision) {
    return undefined;
  }

  return {
    category: "compliance_theater",
    severity: "high",
    question: "Did the action become safer, or only sound safer?",
    message: "The proposal appears to change wording without reducing operational risk.",
    reason: "The wording changed without meaningful risk reduction in tool, action, or target.",
    suggestedRevision: "Change the actual operation, scope, reversibility, or approval path."
  };
}

function metadataString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function similarValue(current: string, previous: string): boolean {
  const normalizedCurrent = normalize(current);
  const normalizedPrevious = normalize(previous);

  return (
    normalizedCurrent === normalizedPrevious ||
    normalizedCurrent.includes(normalizedPrevious) ||
    normalizedPrevious.includes(normalizedCurrent)
  );
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}
