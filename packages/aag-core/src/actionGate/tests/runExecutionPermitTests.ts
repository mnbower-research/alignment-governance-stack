import { strict as assert } from "node:assert";
import {
  executeProtectedAction,
  runtimeBindingDemoAction,
} from "../runtimeBindingDemo";
import {
  issueExecutionPermit,
  verifyExecutionPermit,
} from "../executionPermit";
import type { ActionGateInput, GateDecision } from "../types";

const allowedResult = { decision: "allow" as const };
const policyHash = `sha256:${"a".repeat(64)}`;
const configHash = `sha256:${"b".repeat(64)}`;

runTest("no permit denies execution", () => {
  const result = executeProtectedAction({
    input: runtimeBindingDemoAction,
  });

  assert.equal(result.allowed, false);
  assert.equal(result.message, "EXECUTION DENIED: missing valid AAG permit");
});

runTest("expired permit denies execution", () => {
  const permit = issueExecutionPermit({
    input: runtimeBindingDemoAction,
    result: allowedResult,
    receiptId: "receipt.json",
    policyHash,
    configHash,
    issuedAt: "2026-05-11T00:00:00.000Z",
    ttlMs: 1000,
  });
  const result = verifyExecutionPermit(
    permit,
    runtimeBindingDemoAction.proposedAction,
    { now: "2026-05-11T00:00:02.000Z" },
  );

  assert.equal(result.valid, false);
  assert.equal(result.reason, "permit expired");
});

runTest("wrong action hash denies execution", () => {
  const permit = issueExecutionPermit({
    input: runtimeBindingDemoAction,
    result: allowedResult,
    receiptId: "receipt.json",
    policyHash,
    configHash,
  });
  const otherAction: ActionGateInput["proposedAction"] = {
    ...runtimeBindingDemoAction.proposedAction,
    target: "package.json",
  };
  const result = verifyExecutionPermit(permit, otherAction);

  assert.equal(result.valid, false);
  assert.equal(result.reason, "actionHash mismatch");
});

runTest("valid permit allows simulated execution", () => {
  const permit = issueExecutionPermit({
    input: runtimeBindingDemoAction,
    result: allowedResult,
    receiptId: "receipt.json",
    policyHash,
    configHash,
  });
  const result = executeProtectedAction({
    input: runtimeBindingDemoAction,
    permit,
  });

  assert.equal(result.allowed, true);
  assert.equal(result.message, "EXECUTION ALLOWED: valid AAG permit");
});

runTest("non-allow decisions do not issue permits", () => {
  (["require_approval", "revise_action", "block"] as GateDecision[]).forEach(
    (decision) => {
      assert.throws(
        () =>
          issueExecutionPermit({
            input: runtimeBindingDemoAction,
            result: { decision },
            receiptId: "receipt.json",
            policyHash,
            configHash,
          }),
        /only be issued for allow decisions/,
      );
    },
  );
});

console.log("Execution permit tests passed.");

function runTest(name: string, test: () => void): void {
  try {
    test();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}
