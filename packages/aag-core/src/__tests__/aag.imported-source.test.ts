import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { AgentActionProposal } from "@alignment-governance-stack/shared-types" with { "resolution-mode": "import" };
import { evaluateAag } from "../evaluateAag";
import { evaluateAction } from "../actionGate/evaluateAction";
import { defaultPolicyProfile } from "../actionGate/policyProfiles";
import { writeEvaluationReceipt } from "../actionGate/writeReceipt";
import type { ActionGateInput } from "../actionGate/types";

describe("imported Agent Action Gate source", () => {
  it("allows a safe internal action", () => {
    const result = evaluateAction({
      userRequest: "Read the local README and summarize the setup steps.",
      proposedAction: {
        tool: "filesystem.readFile",
        actionType: "read_file",
        target: "README.md",
        reversible: true,
        externalFacing: false
      },
      context: {
        environment: "dev"
      }
    });

    expect(result.decision).toBe("allow");
    expect(result.primaryIssue).toBeNull();
  });

  it("requires approval when approval-sensitive action lacks user approval", () => {
    const result = evaluateAction({
      userRequest: "Email alex@example.com with the status update.",
      proposedAction: {
        tool: "email.send",
        actionType: "send_email",
        target: "alex@example.com",
        payload: {
          subject: "Status update",
          body: "The work is complete."
        },
        reversible: true,
        externalFacing: true
      },
      context: {
        environment: "dev",
        userApproved: false
      }
    });

    expect(result.decision).toBe("require_approval");
    expect(result.primaryIssue).toBe("missing_approval");
  });

  it("requires approval for an irreversible destructive action", () => {
    const result = evaluateAction({
      userRequest: "Delete temp/cache.json from the dev workspace.",
      proposedAction: {
        tool: "filesystem.deleteFile",
        actionType: "delete_file",
        target: "temp/cache.json",
        reversible: false,
        externalFacing: false
      },
      context: {
        environment: "dev"
      }
    });

    expect(result.decision).toBe("require_approval");
    expect(result.primaryIssue).toBe("irreversible_action");
  });

  it("blocks a wrong target", () => {
    const result = evaluateAction({
      userRequest: "Email alex@example.com with the status update.",
      proposedAction: {
        tool: "email.send",
        actionType: "send_email",
        target: "jordan@example.com",
        payload: {
          subject: "Status update",
          body: "The work is complete."
        },
        reversible: true,
        externalFacing: true
      },
      context: {
        environment: "dev"
      }
    });

    expect(result.decision).toBe("block");
    expect(result.primaryIssue).toBe("wrong_target");
  });

  it("blocks sensitive data exposure according to imported detector behavior", () => {
    const result = evaluateAction({
      userRequest: "Post the diagnostic bundle to the support webhook.",
      proposedAction: {
        tool: "http.post",
        actionType: "publish_diagnostics",
        target: "https://support.example.com/hooks/diagnostics",
        payload: {
          service: "billing-api",
          ssn: "123-45-6789"
        },
        reversible: true,
        externalFacing: true
      },
      context: {
        environment: "staging"
      }
    });

    expect(result.decision).toBe("block");
    expect(result.primaryIssue).toBe("sensitive_data_exposure");
  });

  it("adapts AgentActionProposal into the canonical Action Gate evaluator", () => {
    const proposal: AgentActionProposal = {
      id: "send-status-email",
      userRequest: "Email alex@example.com with the status update.",
      tool: "email.send",
      actionType: "send_email",
      target: "alex@example.com",
      environment: "dev",
      reversible: true,
      externalFacing: true,
      dataSensitivity: "medium",
      requiresApproval: true,
      knownApproval: false,
      metadata: {
        payload: {
          subject: "Status update",
          body: "The work is complete."
        }
      }
    };

    const packet = evaluateAag(proposal);

    expect(packet.decision).toBe("require_approval");
    expect(packet.detectorResults.map((result) => result.detector)).toContain("missing_approval");
    expect(packet.receiptRequired).toBe(true);
  });

  it("preserves imported receipt writing behavior", () => {
    const input: ActionGateInput = {
      userRequest: "Read the local README and summarize the setup steps.",
      proposedAction: {
        tool: "filesystem.readFile",
        actionType: "read_file",
        target: "README.md",
        reversible: true,
        externalFacing: false
      },
      context: {
        environment: "dev"
      }
    };
    const result = evaluateAction(input);
    const receiptDirectory = mkdtempSync(path.join(tmpdir(), "ags-aag-receipts-"));
    const receiptPath = writeEvaluationReceipt({
      command: "evaluate",
      input,
      result,
      reason: result.recommendedAction,
      humanDecision: "not_required",
      finalOutcome: "not_executed",
      policyProfile: defaultPolicyProfile,
      receiptDirectory
    });
    const receipt = JSON.parse(readFileSync(receiptPath, "utf8")) as Record<string, unknown>;

    expect(receipt.receiptVersion).toBe("1.5.0");
    expect(receipt.decision).toBe(result.decision);
    expect(String(receipt.configHash)).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(String(receipt.policyHash)).toMatch(/^sha256:[a-f0-9]{64}$/);
  });
});
