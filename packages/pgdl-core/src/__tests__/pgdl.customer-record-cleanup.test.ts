import { describe, expect, it } from "vitest";
import { evaluatePgdl } from "../evaluatePgdl.js";
import { customerRecordCleanupProposal } from "../examples/customerRecordCleanup.js";

describe("PGDL customer record cleanup scaffold", () => {
  it("returns a typed PGDL packet without executing or approving the action", () => {
    const packet = evaluatePgdl(customerRecordCleanupProposal);

    expect(packet.originalProposal.id).toBe("example-customer-record-cleanup");
    expect(packet.decision).toBe("forward_to_aag");
    expect(packet.reasonForDecision).toContain("Placeholder PGDL decision");
  });
});
