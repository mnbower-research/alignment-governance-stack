import {
  evaluateGovernedRuntimeActionWithReceipt,
  type EvaluateGovernedRuntimeActionWithReceiptInput
} from "@alignment-governance-stack/governance-core";
import { mapGovernanceResultToN8nResponse } from "./mapGovernanceResultToN8nResponse.js";
import { mapN8nActionToProposal } from "./mapN8nActionToProposal.js";
import type { N8nActionInput, N8nGovernanceResponse } from "./types.js";

export function createN8nWebhookResponse(input: N8nActionInput): N8nGovernanceResponse {
  const mappedInput = mapN8nActionToProposal(input);
  const result = evaluateGovernedRuntimeActionWithReceipt(
    mappedInput as EvaluateGovernedRuntimeActionWithReceiptInput
  );

  return mapGovernanceResultToN8nResponse(result);
}
