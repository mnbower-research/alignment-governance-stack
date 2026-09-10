import type { AgentActionProposal } from "@alignment-governance-stack/shared-types";
import type {
  AgencyGovernanceResponse,
  AgencyMetadataBindingLimitation
} from "./types.js";
import type { GovernanceRuntimePacketWithReceipt } from "@alignment-governance-stack/governance-core";
import type { DecisionClosureArtifact } from "@alignment-governance-stack/decision-closure";

const approvalDecisions = new Set(["approval_required_by_authority", "approval_required_by_aag"]);
const revisionDecisions = new Set(["revision_required_by_aag"]);
const escalationDecisions = new Set([
  "escalated_before_gate",
  "insufficient_human_participation",
  "policy_invalid"
]);

export function mapGovernanceResultToAgencyResponse(input: {
  proposal: AgentActionProposal;
  runtimeAction?: AgentActionProposal;
  result: GovernanceRuntimePacketWithReceipt;
  decisionClosureArtifact?: DecisionClosureArtifact;
}): AgencyGovernanceResponse {
  const decision = input.result.governance.finalDecision;
  const allowed = decision === "execution_allowed";

  return {
    allowed,
    nextStep: mapNextStep(decision),
    decision,
    reason: input.result.governance.reasonForDecision,
    proposal: input.proposal,
    ...(input.runtimeAction !== undefined ? { runtimeAction: input.runtimeAction } : {}),
    governance: input.result.governance,
    receipt: input.result.receipt,
    ...(input.result.agencyFingerprint !== undefined ? { agencyFingerprint: input.result.agencyFingerprint } : {}),
    ...(input.decisionClosureArtifact !== undefined
      ? { decisionClosureArtifact: input.decisionClosureArtifact }
      : {}),
    metadataBindingLimitation: createMetadataBindingLimitation()
  };
}

function mapNextStep(decision: string): AgencyGovernanceResponse["nextStep"] {
  if (decision === "execution_allowed") {
    return "proceed_simulated";
  }

  if (approvalDecisions.has(decision)) {
    return "request_approval";
  }

  if (revisionDecisions.has(decision)) {
    return "request_revision";
  }

  if (escalationDecisions.has(decision)) {
    return "escalate";
  }

  return "stop";
}

export function createMetadataBindingLimitation(): AgencyMetadataBindingLimitation {
  return {
    protectedByRuntimeBinding: false,
    fields: [
      "metadata.budgetAmount",
      "metadata.budgetCurrency",
      "metadata.platform",
      "metadata.propertyId",
      "metadata.campaignId",
      "metadata.contentId",
      "metadata.audience",
      "metadata.experimentWindow"
    ],
    reason:
      "Only values represented as canonical bound execution constraints are protected as domain-specific execution-authoritative values by Runtime Binding. Ordinary metadata remains non-authoritative."
  };
}
