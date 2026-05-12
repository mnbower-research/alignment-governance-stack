import { strict as assert } from "node:assert";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createEffectiveAagConfig } from "../aagConfig";
import {
  reviewDistributionInput,
  writeDistributionLogs,
} from "../distributionCopilot";
import { evaluateAction } from "../evaluateAction";
import { evaluateMetaGateAction } from "../metaGate";
import {
  attachPolicyProvenance,
  canonicalizePolicySnapshot,
  hashPolicySnapshot,
  verifyPolicyProvenanceCoverage,
} from "../policyProvenance";
import { strictExternalActionsPolicyProfile } from "../policyProfiles";
import {
  hashCanonicalPayload,
  stripHashChainForPayload,
} from "../receiptHashChain";
import type { ActionGateInput } from "../types";
import {
  writeEvaluationReceipt,
  writeMetaGateReceipt,
} from "../writeReceipt";

runTest("stable policy snapshot canonicalization ignores key order", () => {
  const left = {
    policyId: "default",
    nested: {
      b: true,
      a: ["one", "two"],
    },
  };
  const right = {
    nested: {
      a: ["one", "two"],
      b: true,
    },
    policyId: "default",
  };

  assert.equal(canonicalizePolicySnapshot(left), canonicalizePolicySnapshot(right));
  assert.equal(hashPolicySnapshot(left), hashPolicySnapshot(right));
});

runTest("metadata attachment adds expected policyProvenance fields", () => {
  const receipt = attachPolicyProvenance(createReceipt(), {
    sourceType: "profile",
    policyId: "default",
    policyName: "Default Policy",
    policySource: "Default policy",
    policyHash: `sha256:${"b".repeat(64)}`,
    policyAppliedAt: "2026-05-08T00:00:00.000Z",
    matchedRules: ["detector:missing_approval"],
    decisionBasis: ["decision:require_approval"],
  });

  assert.equal(receipt.policyProvenance.policyId, "default");
  assert.equal(receipt.policyProvenance.policySourceType, "profile");
  assert.match(receipt.policyProvenance.policyHash, /^sha256:[a-f0-9]{64}$/);
  assert.match(
    receipt.policyProvenance.policySnapshotHash,
    /^sha256:[a-f0-9]{64}$/,
  );
  assert.equal(receipt.policyProvenance.policyAppliedAt, receipt.createdAt);
});

runTest("policyProvenance is attached before hashChain metadata", () => {
  const receiptsDir = createTempDir();
  const input = createActionInput();
  const result = evaluateAction(input, {
    policyProfile: strictExternalActionsPolicyProfile,
  });
  const receiptPath = writeEvaluationReceipt({
    command: "evaluate",
    input,
    result,
    reason: result.recommendedAction,
    humanDecision: "not_required",
    finalOutcome: "not_executed",
    policyProfile: strictExternalActionsPolicyProfile,
    receiptDirectory: receiptsDir,
  });
  const receipt = JSON.parse(readFileSync(receiptPath, "utf8")) as Record<
    string,
    unknown
  >;
  const hashChain = receipt.hashChain as Record<string, unknown>;

  assert.ok(receipt.policyProvenance);
  assert.equal(
    hashChain.canonicalPayloadHash,
    hashCanonicalPayload(stripHashChainForPayload(receipt)),
  );
});

runTest("policy profile receipts include profile provenance", () => {
  const receiptsDir = createTempDir();
  const input = createActionInput();
  const result = evaluateAction(input, {
    policyProfile: strictExternalActionsPolicyProfile,
  });
  const receiptPath = writeEvaluationReceipt({
    command: "evaluate",
    input,
    result,
    reason: result.recommendedAction,
    humanDecision: "not_required",
    finalOutcome: "not_executed",
    policyProfile: strictExternalActionsPolicyProfile,
    receiptDirectory: receiptsDir,
  });
  const receipt = JSON.parse(readFileSync(receiptPath, "utf8")) as Record<
    string,
    unknown
  >;
  const provenance = receipt.policyProvenance as Record<string, unknown>;

  assert.equal(provenance.policySourceType, "profile");
  assert.equal(provenance.profileName, "Strict External Actions Policy");
});

runTest("MetaGate receipts include MetaGate provenance", () => {
  const receiptsDir = createTempDir();
  const previousConfig = createEffectiveAagConfig({
    config: {
      locked: true,
      defaultDecision: "require_approval",
    },
  });
  const input = {
    actionType: "disable_gate",
    target: "aag.config.json",
    locked: true,
  };
  const decision = evaluateMetaGateAction(input);
  const receiptPath = writeMetaGateReceipt({
    command: "metagate",
    input,
    decision,
    previousConfig,
    receiptDirectory: receiptsDir,
  });
  const receipt = JSON.parse(readFileSync(receiptPath, "utf8")) as Record<
    string,
    unknown
  >;
  const provenance = receipt.policyProvenance as Record<string, unknown>;

  assert.equal(provenance.policySourceType, "metagate");
  assert.equal(provenance.policyName, "MetaGate policy");
});

runTest("Distribution Copilot receipts include distribution provenance", () => {
  const logDir = createTempDir();
  const review = reviewDistributionInput({
    platform: "linkedin",
    goal: "comment",
    sourceText:
      "Agentic AI governance needs runtime controls, audit trails, and human review.",
    draft: "Useful point about governance.",
  });
  const paths = writeDistributionLogs(review, logDir);
  const receipt = JSON.parse(
    readFileSync(paths.receipts, "utf8").trim(),
  ) as Record<string, unknown>;
  const provenance = receipt.policyProvenance as Record<string, unknown>;

  assert.equal(provenance.policySourceType, "distribution");
  assert.equal(provenance.policyName, "Distribution Copilot policy");
});

runTest("legacy receipts without policyProvenance do not fail coverage", () => {
  const receiptsDir = createTempDir();
  writeJsonReceipt(receiptsDir, "legacy.json", createReceipt());

  const result = verifyPolicyProvenanceCoverage({
    receiptsDir,
    source: "receipts",
  });

  assert.equal(result.valid, true);
  assert.equal(result.legacyReceiptsWithoutPolicyProvenance, 1);
  assert.equal(result.receiptsWithPolicyProvenance, 0);
});

runTest("malformed policyProvenance is detected", () => {
  const receiptsDir = createTempDir();
  writeJsonReceipt(receiptsDir, "malformed.json", {
    ...createReceipt(),
    policyProvenance: {
      policyName: "Broken Policy",
      policySourceType: "not-real",
      policyHash: "nope",
    },
  });

  const result = verifyPolicyProvenanceCoverage({
    receiptsDir,
    source: "receipts",
  });

  assert.equal(result.valid, false);
  assert.equal(result.invalidPolicyProvenanceEntries, 1);
  assert.ok(result.issues.some((issue) => /policyId/.test(issue.issue)));
  assert.ok(result.issues.some((issue) => /policyHash/.test(issue.issue)));
  assert.ok(result.issues.some((issue) => /policyAppliedAt/.test(issue.issue)));
  assert.ok(result.issues.some((issue) => /policySourceType/.test(issue.issue)));
});

runTest("JSONL policyProvenance receipts are parsed and counted", () => {
  const root = createTempDir();
  const receiptFile = path.join(root, "receipts.jsonl");
  const receipt = attachPolicyProvenance(createReceipt(), {
    sourceType: "distribution",
    policyId: "distribution-copilot",
    policyName: "Distribution Copilot policy",
    policySource: "Distribution Copilot policy",
    policyHash: `sha256:${"c".repeat(64)}`,
    policyAppliedAt: "2026-05-08T00:00:00.000Z",
  });
  writeFileSync(receiptFile, `${JSON.stringify(receipt)}\n`, "utf8");

  const result = verifyPolicyProvenanceCoverage({
    distributionReceiptsPath: receiptFile,
    source: "distribution",
  });

  assert.equal(result.valid, true);
  assert.equal(result.receiptsWithPolicyProvenance, 1);
  assert.equal(result.policySourcesFound[0], "Distribution Copilot policy");
});

console.log("Policy provenance tests passed.");

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
  return mkdtempSync(path.join(tmpdir(), "aag-policy-provenance-"));
}

function createReceipt(): Record<string, unknown> {
  return {
    receiptVersion: "1.5.0",
    createdAt: "2026-05-08T00:00:00.000Z",
    timestamp: "2026-05-08T00:00:00.000Z",
    configHash: `sha256:${"a".repeat(64)}`,
    policyHash: `sha256:${"b".repeat(64)}`,
    decision: "require_approval",
    command: "evaluate",
    proposedAction: {
      actionType: "send_email",
      target: "teammate@example.test",
    },
  };
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
      userApproved: false,
      environment: "production",
    },
  };
}

function writeJsonReceipt(
  receiptsDir: string,
  filename: string,
  receipt: Record<string, unknown>,
): void {
  mkdirSync(receiptsDir, { recursive: true });
  writeFileSync(
    path.join(receiptsDir, filename),
    `${JSON.stringify(receipt, null, 2)}\n`,
    "utf8",
  );
}
