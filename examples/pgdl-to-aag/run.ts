import { evaluateAag } from "@alignment-governance-stack/aag-core";
import { evaluatePgdl } from "@alignment-governance-stack/pgdl-core";
import type { AgentActionProposal } from "@alignment-governance-stack/shared-types";

export function runPgdlToAagExample(proposal: AgentActionProposal): void {
  const pgdlPacket = evaluatePgdl(proposal);

  if (pgdlPacket.decision !== "forward_to_aag" || pgdlPacket.resolvedProposal === null) {
    console.log(pgdlPacket);
    return;
  }

  const aagPacket = evaluateAag(pgdlPacket.resolvedProposal);
  console.log(aagPacket);
}
