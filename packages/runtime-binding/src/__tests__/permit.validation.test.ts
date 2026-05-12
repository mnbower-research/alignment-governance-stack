import { describe, expect, it } from "vitest";
import { bindActionToPermit, createPermit } from "../index.js";

describe("runtime permit validation scaffold", () => {
  it("binds a runtime action to the exact placeholder permit fields", () => {
    const permit = createPermit({
      id: "proposal-1",
      tool: "deploy-tool",
      actionType: "deploy",
      target: "production",
      environment: "production"
    });

    const result = bindActionToPermit(
      {
        proposalId: "proposal-1",
        tool: "deploy-tool",
        actionType: "deploy",
        target: "production",
        environment: "production",
        metadata: {}
      },
      permit
    );

    expect(result.valid).toBe(true);
  });
});
