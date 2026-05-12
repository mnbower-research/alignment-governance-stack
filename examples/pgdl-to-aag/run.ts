import { evaluateAag } from "@agent-action-governance/aag-core";
import { evaluatePgdl } from "@agent-action-governance/pgdl-core";
import type { AgentActionProposal } from "@agent-action-governance/shared-types";

export function runPgdlToAagExample(proposal: AgentActionProposal): void {
  const pgdlPacket = evaluatePgdl(proposal);

  if (pgdlPacket.decision !== "forward_to_aag" || pgdlPacket.resolvedProposal === null) {
    console.log(pgdlPacket);
    return;
  }

  const aagPacket = evaluateAag(pgdlPacket.resolvedProposal);
  console.log(aagPacket);
}
