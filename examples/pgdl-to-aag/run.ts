import { evaluateGovernedAction } from "@alignment-governance-stack/governance-core";
import type { AgentActionProposal } from "@alignment-governance-stack/shared-types";

export function runPgdlToAagExample(proposal: AgentActionProposal): void {
  const governancePacket = evaluateGovernedAction(proposal);
  console.log(governancePacket);
}
