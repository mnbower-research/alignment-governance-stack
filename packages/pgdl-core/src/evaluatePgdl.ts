import type { AgentActionProposal, PgdlPacket } from "@agent-action-governance/shared-types";
import { detectComplianceTheater } from "./modules/complianceTheaterDetector.js";
import { resolveDiscernment } from "./modules/discernmentResolver.js";
import { rewriteForInternalization } from "./modules/internalizationRewriter.js";
import { generateObjections } from "./modules/objectionGenerator.js";
import { analyzeProposal } from "./modules/proposalAnalyzer.js";
import { defaultPgdlPolicy } from "./policies/defaultPgdlPolicy.js";

export function evaluatePgdl(proposal: AgentActionProposal): PgdlPacket {
  analyzeProposal(proposal, defaultPgdlPolicy);
  detectComplianceTheater(proposal);

  const objections = generateObjections(proposal);
  const internalizedPrinciple = rewriteForInternalization(proposal, objections);
  const decision = resolveDiscernment(proposal, objections);

  return {
    originalProposal: proposal,
    objections,
    internalizedPrinciple,
    resolvedProposal: decision === "forward_to_aag" ? proposal : null,
    decision,
    reasonForDecision: "Placeholder PGDL decision. TODO: implement proposal maturation logic."
  };
}
