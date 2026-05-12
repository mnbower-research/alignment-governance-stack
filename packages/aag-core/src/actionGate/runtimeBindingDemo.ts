import { basename } from "node:path";
import { readFileSync } from "node:fs";
import { evaluateAction } from "./evaluateAction";
import {
  issueExecutionPermit,
  verifyExecutionPermit,
  type ExecutionPermit,
  type VerifyExecutionPermitResult,
} from "./executionPermit";
import type { ActionGateInput } from "./types";
import {
  createConfigHash,
  createPolicyHash,
  writeEvaluationReceipt,
} from "./writeReceipt";
import { defaultPolicyProfile } from "./policyProfiles";

export type ProtectedExecutionResult = {
  allowed: boolean;
  message: string;
  verification?: VerifyExecutionPermitResult;
};

export const runtimeBindingDemoAction: ActionGateInput = {
  userRequest: "Read the local README and summarize the setup steps.",
  proposedAction: {
    tool: "filesystem.readFile",
    actionType: "read_file",
    target: "README.md",
    reversible: true,
    externalFacing: false,
  },
  context: {
    environment: "dev",
  },
};

export function executeProtectedAction(args: {
  input: ActionGateInput;
  permit?: ExecutionPermit;
  now?: Date | string;
}): ProtectedExecutionResult {
  if (!args.permit) {
    return {
      allowed: false,
      message: "EXECUTION DENIED: missing valid AAG permit",
    };
  }

  const verification = verifyExecutionPermit(
    args.permit,
    args.input.proposedAction,
    { now: args.now },
  );

  if (!verification.valid) {
    return {
      allowed: false,
      message: "EXECUTION DENIED: missing valid AAG permit",
      verification,
    };
  }

  return {
    allowed: true,
    message: "EXECUTION ALLOWED: valid AAG permit",
    verification,
  };
}

export function runRuntimeBindingDemo(): string {
  const lines: string[] = [
    "AAG Runtime Binding Demo",
    "",
    "Path A: attempted execution without a permit",
  ];
  const denied = executeProtectedAction({
    input: runtimeBindingDemoAction,
  });

  lines.push(denied.message, "", "Path B: execution with valid permit");

  const result = evaluateAction(runtimeBindingDemoAction);

  if (result.decision !== "allow") {
    lines.push(`Gate decision: ${result.decision}`, "No permit issued.");

    return lines.join("\n");
  }

  // This receipt records the pre-execution gate decision; the later protected
  // executor step is simulated and does not touch real tools or systems.
  const receiptPath = writeEvaluationReceipt({
    command: "evaluate",
    input: runtimeBindingDemoAction,
    result,
    reason: result.evidence[0] ?? result.recommendedAction,
    humanDecision: "not_required",
    finalOutcome: "not_executed",
    policyProfile: defaultPolicyProfile,
  });
  const receipt = readReceiptMetadata(receiptPath);
  const permit = issueExecutionPermit({
    input: runtimeBindingDemoAction,
    result,
    receiptId: basename(receiptPath),
    policyHash: receipt.policyHash ?? createPolicyHash(defaultPolicyProfile),
    configHash: receipt.configHash ?? createConfigHash(),
  });
  const allowed = executeProtectedAction({
    input: runtimeBindingDemoAction,
    permit,
  });

  lines.push(`Gate decision: ${result.decision}`);
  lines.push(`Receipt: ${receiptPath.replace(/\\/g, "/")}`);
  lines.push(`Permit: ${permit.permitId}`);
  lines.push(allowed.message);

  return lines.join("\n");
}

function readReceiptMetadata(receiptPath: string): {
  policyHash?: string;
  configHash?: string;
} {
  const parsed: unknown = JSON.parse(readFileSync(receiptPath, "utf8"));

  if (!isRecord(parsed)) {
    return {};
  }

  return {
    ...(typeof parsed.policyHash === "string" ? { policyHash: parsed.policyHash } : {}),
    ...(typeof parsed.configHash === "string" ? { configHash: parsed.configHash } : {}),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
