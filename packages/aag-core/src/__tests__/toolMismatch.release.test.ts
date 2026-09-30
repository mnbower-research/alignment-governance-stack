import { describe, expect, it } from "vitest";
import { detectToolMismatch } from "../actionGate/detectors/toolMismatch";
import type { ActionGateInput } from "../actionGate/types";
import { evaluateAag } from "../evaluateAag";

function input(actionType = "publish_blog_post", tool = "blog.publish", payload: Record<string, unknown> = {}): ActionGateInput {
  return { userRequest: "Publish the reviewed editorial article.", proposedAction: {
    actionType, tool, target: "articles/harbor", payload, reversible: true,
    externalFacing: false, requiresApproval: false,
  }, context: { environment: "dev", userApproved: true } };
}

describe("release wording and structured tool context", () => {
  it.each([
    ["publish_blog_post", "blog.publish", { title: "Harbor release note" }],
    ["publish_blog_post", "blog.publish", { body: "This article describes a release of editorial content." }],
    ["create_internal_content_draft", "draft.create", { title: "Press release", body: "Release of a reading guide." }],
  ])("does not infer deployment from editorial content: %s", (type, tool, payload) => {
    expect(detectToolMismatch(input(type, tool, payload)).triggered).toBe(false);
  });

  it.each(["deploy_release", "release_software", "release_infrastructure_configuration", "rollback"])("challenges genuine %s with an editorial tool", type => {
    expect(detectToolMismatch(input(type, "blog.publish", { title: "Release note" }))).toMatchObject({
      triggered: true, severity: "critical", recommendedDecision: "revise_action",
    });
  });

  it("retains an appropriate deployment tool", () => {
    expect(detectToolMismatch(input("deploy_release", "ci.deploy")).triggered).toBe(false);
  });

  it.each([
    ["unknown_operation", "blog.publish", { title: "release" }],
    ["publish_blog_post", "unrecognized.publisher", { title: "release" }],
    ["publish_blog_post", "blog.publish", { command: "release software" }],
    ["publish_blog_post", "blog.publish", { configuration: { operation: "release" } }],
    ["publish_blog_post", "blog.publish", { title: "deploy production" }],
  ])("retains challenges outside explicit editorial release fields: %s %s", (type, tool, payload) => {
    expect(detectToolMismatch(input(type, tool, payload))).toMatchObject({ triggered: true, recommendedDecision: "revise_action" });
  });

  it("does not mutate the payload or suppress other detector expectations", () => {
    const proposal = input("publish_blog_post", "blog.publish", { title: "Release note", body: "charge invoice" });
    const before = structuredClone(proposal);
    expect(detectToolMismatch(proposal).triggered).toBe(true);
    expect(proposal).toEqual(before);
  });

  it.each(["publish_blog_post", "create_internal_content_draft"])("integrates through public AAG: %s", actionType => {
    const packet = evaluateAag({ id: "editorial-release", userRequest: "Prepare the reviewed editorial article.",
      actionType, tool: actionType === "publish_blog_post" ? "blog.publish" : "draft.create",
      target: "articles/harbor", environment: "dev", reversible: true, externalFacing: false,
      requiresApproval: false, knownApproval: true, dataSensitivity: "low",
      metadata: { payload: { title: "Harbor release note", body: "Editorial content for readers." } } });
    expect(packet.decision).toBe("allow");
    expect(packet.detectorResults.some(r => r.detector === "tool_mismatch")).toBe(false);
  });
});
