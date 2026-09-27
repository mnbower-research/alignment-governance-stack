import { verifyAssuranceEvidence } from "@alignment-governance-stack/assurance";
import { createArtifact, isRecord } from "../parserHelpers.js";
import type { ArtifactParser } from "../types.js";
export const assuranceParser: ArtifactParser = {
  id: "ags.assurance", version: "0.1.0",
  canParse: input => isRecord(input) && input.version === "assurance-evidence/v0.1",
  parse(input, context) {
    if (!verifyAssuranceEvidence(input)) throw new Error("Invalid assurance evidence.");
    const artifact = createArtifact(assuranceParser, context, "assurance-evidence", input.digest, input,
      `Recorded assurance ${input.decision}; declared risk ${input.binding.riskLevel}. This does not grant authority.`, input.evaluatedAt,
      ["Historical assurance only; identity and independence are host declarations, not independently authenticated facts."]);
    artifact.correlation = { proposalId: input.binding.proposalId };
    return [artifact];
  }
};
