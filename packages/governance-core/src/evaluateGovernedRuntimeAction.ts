import {
  bindActionToPermit,
  createRuntimePermit
} from "@alignment-governance-stack/runtime-binding";
import { evaluateGovernedAction } from "./evaluateGovernedAction.js";
import type {
  EvaluateGovernedRuntimeActionInput,
  GovernanceRuntimePacket
} from "./types.js";

export function evaluateGovernedRuntimeAction(
  input: EvaluateGovernedRuntimeActionInput
): GovernanceRuntimePacket {
  const governedPacket = evaluateGovernedAction({
    proposal: input.proposal,
    ...(input.policyProfile !== undefined ? { policyProfile: input.policyProfile } : {})
  });

  if (governedPacket.finalDecision !== "allowed_by_aag") {
    return {
      ...governedPacket,
      ...(input.runtimeAction !== undefined ? { runtimeAction: input.runtimeAction } : {}),
      reasonForDecision: `${governedPacket.reasonForDecision} Runtime Binding was not run because the action did not reach an AAG allow decision.`
    };
  }

  if (governedPacket.proposalSentToAag === undefined) {
    return {
      ...governedPacket,
      finalDecision: "execution_denied",
      ...(input.runtimeAction !== undefined ? { runtimeAction: input.runtimeAction } : {}),
      reasonForDecision: "AAG allowed the flow, but no proposal was available for runtime permit creation."
    };
  }

  const permit = createRuntimePermit(governedPacket.proposalSentToAag, input.permitOptions);

  if (input.runtimeAction === undefined) {
    return {
      ...governedPacket,
      permit,
      finalDecision: "allowed_by_aag",
      reasonForDecision:
        "AAG allowed the governed proposal and a runtime permit was issued, but no runtime action was supplied for binding validation."
    };
  }

  const runtimeBinding = bindActionToPermit(input.runtimeAction, permit, input.validationOptions);

  if (runtimeBinding.allowed) {
    return {
      ...governedPacket,
      permit,
      runtimeAction: input.runtimeAction,
      runtimeBinding,
      finalDecision: "execution_allowed",
      reasonForDecision: "Runtime action matched the issued permit. Execution may proceed."
    };
  }

  return {
    ...governedPacket,
    permit,
    runtimeAction: input.runtimeAction,
    runtimeBinding,
    finalDecision: "execution_denied",
    reasonForDecision: `Runtime action did not match the issued permit: ${summarizeFailures(runtimeBinding.failures)}.`
  };
}

function summarizeFailures(failures: { code: string }[]): string {
  return failures.length > 0 ? failures.map((failure) => failure.code).join(", ") : "unknown runtime binding failure";
}
