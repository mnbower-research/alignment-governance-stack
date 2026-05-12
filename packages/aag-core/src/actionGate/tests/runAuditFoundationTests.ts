import { strict as assert } from "node:assert";
import {
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createEffectiveAagConfig } from "../aagConfig";
import { auditReceipts } from "../auditReceipts";
import { evaluateAction } from "../evaluateAction";
import { formatLockStatus } from "../formatLockStatus";
import { evaluateMetaGateAction } from "../metaGate";
import { checkGovernanceChange } from "../governanceWeakening";
import { defaultPolicyProfile } from "../policyProfiles";
import { sha256Stable } from "../stableHash";
import type { ActionGateInput } from "../types";
import {
  createConfigHash,
  createPolicyHash,
  writeEvaluationReceipt,
  writeGovernanceReceipt,
  writeMetaGateReceipt,
} from "../writeReceipt";

const validHash = `sha256:${"a".repeat(64)}`;
const validPolicyHash = `sha256:${"b".repeat(64)}`;

runTest("stable hashing ignores object key order", () => {
  const left = sha256Stable({
    action: "send_email",
    nested: {
      b: true,
      a: ["one", "two"],
    },
  });
  const right = sha256Stable({
    nested: {
      a: ["one", "two"],
      b: true,
    },
    action: "send_email",
  });

  assert.equal(left, right);
  assert.match(left, /^sha256:[a-f0-9]{64}$/);
});

runTest("default config has locked false", () => {
  const config = createEffectiveAagConfig({});

  assert.equal(config.locked, false);
});

runTest("config with locked true is loaded correctly", () => {
  const config = createEffectiveAagConfig({
    config: {
      locked: true,
      lockReason: "Production safety policy active",
      lockedAt: "2026-05-06T00:00:00.000Z",
      lockedBy: "security-admin",
    },
  });

  assert.equal(config.locked, true);
  assert.equal(config.lockReason, "Production safety policy active");
  assert.equal(config.lockedAt, "2026-05-06T00:00:00.000Z");
  assert.equal(config.lockedBy, "security-admin");
});

runTest("lock-status formatting for unlocked config", () => {
  const config = createEffectiveAagConfig({});
  const output = formatLockStatus({
    config,
    configHash: createConfigHash({ config }),
    policyHash: createPolicyHash(defaultPolicyProfile),
  });

  assert.match(output, /AAG Lock Status/);
  assert.match(output, /Locked: false/);
  assert.match(output, /Config Hash: sha256:[a-f0-9]{64}/);
  assert.match(output, /Policy Hash: sha256:[a-f0-9]{64}/);
});

runTest("lock-status formatting for locked config", () => {
  const config = createLockedConfig();
  const output = formatLockStatus({
    config,
    configHash: createConfigHash({ config }),
    policyHash: createPolicyHash(defaultPolicyProfile),
  });

  assert.match(output, /Locked: true/);
  assert.match(output, /Reason: Production safety policy active/);
  assert.match(output, /Locked At: 2026-05-06T00:00:00.000Z/);
  assert.match(output, /Locked By: security-admin/);
});

runTest("governance weakening is detected when defaultDecision changes to allow", () => {
  const result = checkGovernanceChange(
    createLockedConfig(),
    createEffectiveAagConfig({
      config: {
        locked: true,
        defaultDecision: "allow",
      },
    }),
  );

  assert.equal(result.decision, "require_approval");
  assert.equal(result.detectorsTriggered[0], "governanceWeakening");
  assert.equal(result.governanceChangeType, "change_default_decision");
});

runTest("governance weakening is detected when receipts are disabled", () => {
  const result = checkGovernanceChange(
    createLockedConfig(),
    createEffectiveAagConfig({
      config: {
        locked: true,
        defaultDecision: "require_approval",
        receipts: {
          enabled: false,
        },
      },
    }),
  );

  assert.equal(result.decision, "require_approval");
  assert.equal(result.governanceChangeType, "disable_receipts");
});

runTest("governance weakening is detected when locked changes to false", () => {
  const result = checkGovernanceChange(
    createLockedConfig(),
    createEffectiveAagConfig({
      config: {
        locked: false,
        lockReason: "Production safety policy active",
        lockedAt: "2026-05-06T00:00:00.000Z",
        lockedBy: "security-admin",
        defaultDecision: "require_approval",
        receipts: {
          enabled: true,
        },
      },
    }),
  );

  assert.equal(result.decision, "require_approval");
  assert.equal(result.governanceChangeType, "unlock_policy");
});

runTest("benign config change is allowed", () => {
  const result = checkGovernanceChange(
    createLockedConfig(),
    createEffectiveAagConfig({
      config: {
        locked: true,
        lockReason: "Production safety policy active for customer workflows",
        lockedAt: "2026-05-06T00:00:00.000Z",
        lockedBy: "security-admin",
        defaultDecision: "require_approval",
        receipts: {
          enabled: true,
        },
        description: "Metadata-only update.",
      },
    }),
  );

  assert.equal(result.decision, "allow");
  assert.deepEqual(result.detectorsTriggered, []);
});

runTest("locked disable AAG change returns block", () => {
  const result = checkGovernanceChange(
    createLockedConfig(),
    createEffectiveAagConfig({
      config: {
        enabled: false,
        locked: true,
        defaultDecision: "require_approval",
        receipts: {
          enabled: true,
        },
      },
    }),
  );

  assert.equal(result.decision, "block");
});

runTest("MetaGate allows benign metadata update", () => {
  const decision = evaluateMetaGateAction({
    actionType: "modify_config",
    target: "aag.config.json",
    beforeConfig: createLockedConfig(),
    afterConfig: createBenignConfig(),
  });

  assert.equal(decision.decision, "allow");
  assert.equal(decision.metaGate, true);
});

runTest("MetaGate blocks disable_gate when locked true", () => {
  const decision = evaluateMetaGateAction({
    actionType: "disable_gate",
    target: "aag.config.json",
    locked: true,
  });

  assert.equal(decision.decision, "block");
  assert.ok(decision.detectorsTriggered.includes("disableGateWhileLocked"));
});

runTest("MetaGate blocks delete_receipt", () => {
  const decision = evaluateMetaGateAction({
    actionType: "delete_receipt",
    target: ".aag/receipts/example.json",
  });

  assert.equal(decision.decision, "block");
});

runTest("MetaGate blocks disable_audit when locked true", () => {
  const decision = evaluateMetaGateAction({
    actionType: "disable_audit",
    target: "aag.config.json",
    locked: true,
  });

  assert.equal(decision.decision, "block");
});

runTest("MetaGate requires approval for unlock_policy when locked true", () => {
  const decision = evaluateMetaGateAction({
    actionType: "unlock_policy",
    target: "aag.config.json",
    locked: true,
  });

  assert.equal(decision.decision, "require_approval");
});

runTest("MetaGate requires approval for modify_policy with governance weakening", () => {
  const decision = evaluateMetaGateAction({
    actionType: "modify_policy",
    target: "aag.config.json",
    beforeConfig: createLockedConfig(),
    afterConfig: createWeakenedConfig(),
  });

  assert.equal(decision.decision, "require_approval");
  assert.ok(decision.detectorsTriggered.includes("governanceWeakening"));
});

runTest("MetaGate requires approval for change_default_decision to allow", () => {
  const decision = evaluateMetaGateAction({
    actionType: "change_default_decision",
    target: "aag.config.json",
    afterConfig: createWeakenedConfig(),
  });

  assert.equal(decision.decision, "require_approval");
});

runTest("MetaGate requires approval for broad allowlist", () => {
  const decision = evaluateMetaGateAction({
    actionType: "add_allowlist",
    target: "*",
    reason: "Allow all config changes.",
  });

  assert.equal(decision.decision, "require_approval");
});

runTest("MetaGate unknown governance action defaults to require_approval", () => {
  const decision = evaluateMetaGateAction({
    actionType: "replace_governance_layer",
    target: "aag.config.json",
  });

  assert.equal(decision.decision, "require_approval");
});

runTest("check-config-change path still detects weakening through MetaGate", () => {
  const decision = evaluateMetaGateAction({
    actionType: "modify_config",
    target: "aag.config.json",
    beforeConfig: createLockedConfig(),
    afterConfig: createWeakenedConfig(),
  });

  assert.equal(decision.decision, "require_approval");
  assert.ok(decision.detectorsTriggered.includes("governanceWeakening"));
});

runTest("written receipts include v1.5.0 audit metadata", () => {
  const receiptsDir = createTempDir();
  const input = createActionInput();
  const result = evaluateAction(input, {
    policyProfile: defaultPolicyProfile,
  });

  const receiptPath = writeEvaluationReceipt({
    command: "evaluate",
    input,
    result,
    reason: result.recommendedAction,
    humanDecision: "not_required",
    finalOutcome: "not_executed",
    policyProfile: defaultPolicyProfile,
    receiptDirectory: receiptsDir,
  });
  const receipt = JSON.parse(readFileSync(receiptPath, "utf8")) as Record<
    string,
    unknown
  >;

  assert.equal(receipt.receiptVersion, "1.5.0");
  assert.equal(typeof receipt.createdAt, "string");
  assert.match(String(receipt.configHash), /^sha256:[a-f0-9]{64}$/);
  assert.match(String(receipt.policyHash), /^sha256:[a-f0-9]{64}$/);
  assert.equal(receipt.decision, result.decision);
  assert.equal(receipt.gateDecision, result.decision);
});

runTest("governance receipt includes locked config metadata", () => {
  const receiptsDir = createTempDir();
  const previousConfig = createLockedConfig();
  const nextConfig = createEffectiveAagConfig({
    config: {
      locked: true,
      defaultDecision: "allow",
    },
  });
  const result = checkGovernanceChange(previousConfig, nextConfig);
  const receiptPath = writeGovernanceReceipt({
    command: "check-config-change",
    previousConfig,
    nextConfig,
    result,
    receiptDirectory: receiptsDir,
  });
  const receipt = JSON.parse(readFileSync(receiptPath, "utf8")) as Record<
    string,
    unknown
  >;

  assert.equal(receipt.receiptType, "governance_change");
  assert.equal(receipt.locked, true);
  assert.equal(receipt.decision, "require_approval");
  assert.match(String(receipt.previousConfigHash), /^sha256:[a-f0-9]{64}$/);
  assert.match(String(receipt.nextConfigHash), /^sha256:[a-f0-9]{64}$/);
});

runTest("v1.1.0 governance receipts pass audit", () => {
  const receiptsDir = createTempDir();
  const previousConfig = createLockedConfig();
  const nextConfig = createEffectiveAagConfig({
    config: {
      locked: true,
      defaultDecision: "allow",
    },
  });
  const result = checkGovernanceChange(previousConfig, nextConfig);

  writeGovernanceReceipt({
    command: "check-config-change",
    previousConfig,
    nextConfig,
    result,
    receiptDirectory: receiptsDir,
  });

  assert.deepEqual(auditReceipts({ receiptsDir }), {
    scanned: 1,
    passed: 1,
    failed: 0,
    failures: [],
  });
});

runTest("audit accepts receiptVersion 1.0.0", () => {
  const receiptsDir = createTempDir();
  writeReceipt(receiptsDir, "valid-v1.json", {
    ...createValidReceipt(),
    receiptVersion: "1.0.0",
  });

  assert.equal(auditReceipts({ receiptsDir }).failed, 0);
});

runTest("audit accepts receiptVersion 0.9.0", () => {
  const receiptsDir = createTempDir();
  writeReceipt(receiptsDir, "valid-v0-9.json", {
    ...createValidReceipt(),
    receiptVersion: "0.9.0",
  });

  assert.equal(auditReceipts({ receiptsDir }).failed, 0);
});

runTest("MetaGate receipt includes required MetaGate fields", () => {
  const receiptsDir = createTempDir();
  const input = {
    actionType: "disable_gate",
    target: "aag.config.json",
    locked: true,
    requestedBy: "agent",
    reason: "Disable oversight during deployment",
  };
  const decision = evaluateMetaGateAction(input);
  const receiptPath = writeMetaGateReceipt({
    command: "metagate",
    input,
    decision,
    previousConfig: createLockedConfig(),
    receiptDirectory: receiptsDir,
  });
  const receipt = JSON.parse(readFileSync(receiptPath, "utf8")) as Record<
    string,
    unknown
  >;

  assert.equal(receipt.receiptType, "metagate_decision");
  assert.equal(receipt.metaGate, true);
  assert.equal(receipt.actionType, "disable_gate");
  assert.equal(receipt.target, "aag.config.json");
  assert.equal(receipt.locked, true);
  assert.equal(receipt.decision, "block");
  assert.ok(Array.isArray(receipt.detectorsTriggered));
  assert.ok(Array.isArray(receipt.reasons));
});

runTest("v1.1.0 MetaGate receipts pass audit", () => {
  const receiptsDir = createTempDir();
  const input = {
    actionType: "disable_gate",
    target: "aag.config.json",
    locked: true,
  };
  const decision = evaluateMetaGateAction(input);

  writeMetaGateReceipt({
    command: "metagate",
    input,
    decision,
    previousConfig: createLockedConfig(),
    receiptDirectory: receiptsDir,
  });

  assert.equal(auditReceipts({ receiptsDir }).failed, 0);
});

runTest("audit accepts receiptVersion 1.1.0", () => {
  const receiptsDir = createTempDir();
  writeReceipt(receiptsDir, "valid-v1-1.json", {
    ...createValidReceipt(),
    receiptVersion: "1.1.0",
  });

  assert.equal(auditReceipts({ receiptsDir }).failed, 0);
});

runTest("audit accepts receiptVersion 1.3.0", () => {
  const receiptsDir = createTempDir();
  writeReceipt(receiptsDir, "valid-v1-3.json", {
    ...createValidReceipt(),
    receiptVersion: "1.3.0",
  });

  assert.equal(auditReceipts({ receiptsDir }).failed, 0);
});

runTest("audit accepts receiptVersion 1.4.0", () => {
  const receiptsDir = createTempDir();
  writeReceipt(receiptsDir, "valid-v1-4.json", {
    ...createValidReceipt(),
    receiptVersion: "1.4.0",
  });

  assert.equal(auditReceipts({ receiptsDir }).failed, 0);
});

runTest("audit accepts receiptVersion 1.5.0", () => {
  const receiptsDir = createTempDir();
  writeReceipt(receiptsDir, "valid-v1-5.json", {
    ...createValidReceipt(),
    receiptVersion: "1.5.0",
  });

  assert.equal(auditReceipts({ receiptsDir }).failed, 0);
});

runTest("valid receipts pass audit", () => {
  const receiptsDir = createTempDir();
  writeReceipt(receiptsDir, "valid.json", createValidReceipt());

  assert.deepEqual(auditReceipts({ receiptsDir }), {
    scanned: 1,
    passed: 1,
    failed: 0,
    failures: [],
  });
});

runTest("missing audit fields fail audit", () => {
  const receiptsDir = createTempDir();
  writeReceipt(receiptsDir, "missing.json", {
    receiptVersion: "0.9.0",
    createdAt: "2026-05-06T00:00:00.000Z",
    configHash: validHash,
    decision: "allow",
  });

  const result = auditReceipts({ receiptsDir });

  assert.equal(result.failed, 1);
  assert.deepEqual(result.failures[0]?.issues, ["missing policyHash"]);
});

runTest("malformed hashes fail audit", () => {
  const receiptsDir = createTempDir();
  writeReceipt(receiptsDir, "bad-hash.json", {
    ...createValidReceipt(),
    configHash: "sha256:not-a-real-hash",
  });

  const result = auditReceipts({ receiptsDir });

  assert.equal(result.failed, 1);
  assert.deepEqual(result.failures[0]?.issues, ["malformed configHash"]);
});

runTest("invalid JSON receipt files fail audit", () => {
  const receiptsDir = createTempDir();
  writeFileSync(path.join(receiptsDir, "invalid.json"), "{", "utf8");

  const result = auditReceipts({ receiptsDir });

  assert.equal(result.scanned, 1);
  assert.equal(result.failed, 1);
  assert.deepEqual(result.failures[0]?.issues, [
    "invalid JSON receipt file",
  ]);
});

runTest("malformed timestamps fail audit", () => {
  const receiptsDir = createTempDir();
  writeReceipt(receiptsDir, "bad-timestamp.json", {
    ...createValidReceipt(),
    createdAt: "2026-05-06",
  });

  const result = auditReceipts({ receiptsDir });

  assert.equal(result.failed, 1);
  assert.deepEqual(result.failures[0]?.issues, ["malformed createdAt"]);
});

console.log("Audit foundation tests passed.");

function runTest(name: string, test: () => void): void {
  try {
    test();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

function createTempDir(): string {
  return mkdtempSync(path.join(tmpdir(), "aag-audit-foundation-"));
}

function writeReceipt(
  receiptsDir: string,
  filename: string,
  receipt: Record<string, unknown>,
): void {
  writeFileSync(
    path.join(receiptsDir, filename),
    `${JSON.stringify(receipt, null, 2)}\n`,
    "utf8",
  );
}

function createValidReceipt(): Record<string, unknown> {
  return {
    receiptVersion: "1.5.0",
    createdAt: "2026-05-06T00:00:00.000Z",
    configHash: validHash,
    policyHash: validPolicyHash,
    decision: "allow",
  };
}

function createWeakenedConfig(): ReturnType<typeof createEffectiveAagConfig> {
  return createEffectiveAagConfig({
    config: {
      locked: true,
      lockReason: "Production safety policy active",
      lockedAt: "2026-05-06T00:00:00.000Z",
      lockedBy: "security-admin",
      defaultDecision: "allow",
      receipts: {
        enabled: false,
      },
    },
  });
}

function createBenignConfig(): ReturnType<typeof createEffectiveAagConfig> {
  return createEffectiveAagConfig({
    config: {
      locked: true,
      lockReason: "Production safety policy active for customer workflows",
      lockedAt: "2026-05-06T00:00:00.000Z",
      lockedBy: "security-admin",
      defaultDecision: "require_approval",
      receipts: {
        enabled: true,
      },
      description: "Metadata-only update.",
    },
  });
}

function createLockedConfig(): ReturnType<typeof createEffectiveAagConfig> {
  return createEffectiveAagConfig({
    config: {
      locked: true,
      lockReason: "Production safety policy active",
      lockedAt: "2026-05-06T00:00:00.000Z",
      lockedBy: "security-admin",
      defaultDecision: "require_approval",
      receipts: {
        enabled: true,
      },
    },
  });
}

function createActionInput(): ActionGateInput {
  return {
    userRequest: "Send a short status email.",
    proposedAction: {
      tool: "email",
      actionType: "send_email",
      target: "teammate@example.test",
      payload: {
        subject: "Status",
        body: "Done.",
      },
      reversible: false,
      externalFacing: true,
    },
    context: {
      userApproved: true,
      environment: "dev",
    },
  };
}
