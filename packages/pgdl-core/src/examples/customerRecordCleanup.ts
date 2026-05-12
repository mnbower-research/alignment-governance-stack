import type { AgentActionProposal } from "@agent-action-governance/shared-types";

export const customerRecordCleanupProposal: AgentActionProposal = {
  id: "example-customer-record-cleanup",
  userRequest: "Clean up outdated customer records.",
  tool: "customer-admin",
  actionType: "delete_records",
  target: "stale-customer-records",
  environment: "sandbox",
  reversible: false,
  externalFacing: false,
  dataSensitivity: "confidential",
  requiresApproval: true,
  knownApproval: null,
  metadata: {}
};
