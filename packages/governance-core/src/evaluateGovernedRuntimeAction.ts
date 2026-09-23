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
  const runtimeNow = input.validationOptions?.now ?? new Date().toISOString();
  if (!Number.isFinite(Date.parse(runtimeNow))) {
    return { originalProposal: input.proposal, finalDecision: "execution_denied", reasonForDecision: "Invalid host evaluation clock; no permit issued." };
  }
  if (input.permitOptions?.expiresAt !== undefined && !Number.isFinite(Date.parse(input.permitOptions.expiresAt))) {
    return { originalProposal: input.proposal, finalDecision: "execution_denied", reasonForDecision: "Invalid requested permit expiration; no permit issued." };
  }
  const governedPacket = evaluateGovernedAction({
    now: runtimeNow,
    ...(input.contextAdmission !== undefined ? { contextAdmission: {
      ...input.contextAdmission,
      evaluatedAt: runtimeNow
    } } : {}),
    proposal: input.proposal,
    ...(input.policyProfile !== undefined ? { policyProfile: input.policyProfile } : {}),
    ...(input.authorityMap !== undefined ? { authorityMap: input.authorityMap } : {}),
    ...(input.approvalEvidence !== undefined ? { approvalEvidence: input.approvalEvidence } : {}),
    ...(input.humanParticipation !== undefined ? { humanParticipation: input.humanParticipation } : {})
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

  const context = governedPacket.contextAdmission;
  const expiries = [context?.validUntil, governedPacket.approvalValidation?.validUntil].filter((value): value is string => value !== undefined);
  const contextExpiry = expiries.sort((a, b) => Date.parse(a) - Date.parse(b))[0];
  const requestedExpiry = input.permitOptions?.expiresAt;
  const expiresAt = contextExpiry === undefined ? requestedExpiry
    : requestedExpiry !== undefined && Date.parse(requestedExpiry) < Date.parse(contextExpiry) ? requestedExpiry : contextExpiry;
  const permit = createRuntimePermit(governedPacket.proposalSentToAag, {
    ...input.permitOptions,
    issuedAt: runtimeNow,
    ...(expiresAt !== undefined ? { expiresAt } : {})
  });

  if (input.runtimeAction === undefined) {
    return {
      ...governedPacket,
      permit,
      finalDecision: "allowed_by_aag",
      reasonForDecision:
        "AAG allowed the governed proposal and a runtime permit was issued, but no runtime action was supplied for binding validation."
    };
  }

  const runtimeBinding = bindActionToPermit(input.runtimeAction, permit,
    { ...input.validationOptions, now: runtimeNow });

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
