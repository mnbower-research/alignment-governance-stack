import { validateContextAdmissionEvidence } from "@alignment-governance-stack/context-admission";
import { createArtifact, isRecord } from "../parserHelpers.js";
import type { ArtifactParser } from "../types.js";

export const contextAdmissionParser: ArtifactParser = {
  id: "ags.context-admission", version: "0.1.0",
  canParse: input => isRecord(input) && input.version === "context-admission/v0.1",
  parse(input, context) {
    if (!validateContextAdmissionEvidence(input)) throw new Error("Context Admission evidence has invalid shape or digest.");
    const artifact = createArtifact(contextAdmissionParser, context, "context-admission", input.admissionId, input,
      `Recorded Context Admission ${input.decision} for ${input.requestedUse.receiverAgentId}: ${input.requestedUse.purpose}. A persistent artifact is a handoff across time.`, input.evaluatedAt,
      ["Imported historical evidence only. Digest verification does not authenticate the issuer, revalidate authority, or approve execution."]);
    artifact.correlation = {
      ...(input.requestedUse.action !== undefined ? { proposalId: input.requestedUse.action.proposalId } : {}),
      agentId: input.requestedUse.receiverAgentId
    };
    return [artifact];
  }
};
