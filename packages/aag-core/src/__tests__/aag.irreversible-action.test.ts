import { describe, expect, it } from "vitest";
import type { AgentActionProposal } from "@agent-action-governance/shared-types";
import { evaluateAag } from "../evaluateAag.js";

const irreversibleProposal: AgentActionProposal = {
  id: "irreversible-delete",
  userRequest: "Delete old customer records.",
  tool: "customer-admin",
  actionType: "delete_records",
  target: "customer-records",
  environment: "production",
  reversible: false,
  externalFacing: false,
  dataSensitivity: "confidential",
  requiresApproval: true,
  knownApproval: null,
  metadata: {}
};

describe("AAG irreversible action scaffold", () => {
  it("surfaces placeholder detector results for irreversible actions", () => {
    const packet = evaluateAag(irreversibleProposal);

    expect(packet.detectorResults.some((result) => result.detector === "irreversibleAction")).toBe(true);
    expect(packet.decision).toBe("require_approval");
    expect(packet.receiptRequired).toBe(true);
  });
});
