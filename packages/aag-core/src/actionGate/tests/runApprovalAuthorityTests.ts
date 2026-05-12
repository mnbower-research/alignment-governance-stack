import { strict as assert } from "node:assert";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  attachApprovalAuthority,
  buildDefaultAuthorityMap,
  canonicalizeAuthoritySnapshot,
  evaluateApprovalAuthority,
  hashAuthoritySnapshot,
  scanApprovalAuthorityCoverage,
  type ApprovalAuthorityMap,
} from "../approvalAuthority";
import { createEffectiveAagConfig } from "../aagConfig";
import {
  reviewDistributionInput,
  writeDistributionLogs,
} from "../distributionCopilot";
import { evaluateAction } from "../evaluateAction";
import { evaluateMetaGateAction } from "../metaGate";
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

runTest("stable authority snapshot canonicalization ignores key order", () => {
  const left = {
    authorityId: "local-founder",
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
    authorityId: "local-founder",
  };

  assert.equal(
    canonicalizeAuthoritySnapshot(left),
    canonicalizeAuthoritySnapshot(right),
  );
  assert.equal(hashAuthoritySnapshot(left), hashAuthoritySnapshot(right));
});

runTest("metadata attachment adds expected approvalAuthority fields", () => {
  const receipt = attachApprovalAuthority(createReceipt(), {
    authorityId: "local-founder",
    authorityMap: buildDefaultAuthorityMap(),
    authorityAppliedAt: "2026-05-08T00:00:00.000Z",
    actionType: "comment_on_post",
    target: "linkedin",
    riskLevel: "medium",
    scope: "distribution",
  });

  assert.equal(receipt.approvalAuthority.authorityId, "local-founder");
  assert.equal(receipt.approvalAuthority.authorityMatched, true);
  assert.equal(receipt.approvalAuthority.authorityDecision, "valid");
  assert.match(
    receipt.approvalAuthority.authoritySnapshotHash,
    /^sha256:[a-f0-9]{64}$/,
  );
});

runTest("approvalAuthority is attached before hashChain metadata", () => {
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

  assert.ok(receipt.approvalAuthority);
  assert.equal(
    hashChain.canonicalPayloadHash,
    hashCanonicalPayload(stripHashChainForPayload(receipt)),
  );
});

runTest("known authority can approve allowed action context", () => {
  const result = evaluateApprovalAuthority(
    {
      authorityId: "local-founder",
      actionType: "comment_on_post",
      target: "linkedin",
      riskLevel: "high",
      scope: "distribution",
      authorityAppliedAt: "2026-05-08T00:00:00.000Z",
    },
    buildDefaultAuthorityMap(),
  );

  assert.equal(result.authorityDecision, "valid");
  assert.equal(result.authorityValidAtDecision, true);
});

runTest("missing authority does not silently pass", () => {
  const result = evaluateApprovalAuthority(
    {
      actionType: "comment_on_post",
      target: "linkedin",
      riskLevel: "low",
      scope: "distribution",
    },
    buildDefaultAuthorityMap(),
  );

  assert.equal(result.authorityDecision, "missing_authority");
  assert.equal(result.authorityValidAtDecision, false);
});

runTest("out-of-scope authority is detected", () => {
  const result = evaluateApprovalAuthority(
    {
      authorityId: "local-founder",
      actionType: "delete_database",
      target: "production",
      riskLevel: "critical",
      scope: "production",
    },
    buildDefaultAuthorityMap(),
  );

  assert.equal(result.authorityDecision, "out_of_scope");
  assert.equal(result.authorityValidAtDecision, false);
});

runTest("expired authority is detected", () => {
  const authorityMap: ApprovalAuthorityMap = {
    ...buildDefaultAuthorityMap(),
    authorities: [
      {
        ...buildDefaultAuthorityMap().authorities[0]!,
        expiresAt: "2026-05-07T00:00:00.000Z",
      },
    ],
  };
  const result = evaluateApprovalAuthority(
    {
      authorityId: "local-founder",
      actionType: "comment_on_post",
      target: "linkedin",
      riskLevel: "low",
      scope: "distribution",
      authorityAppliedAt: "2026-05-08T00:00:00.000Z",
    },
    authorityMap,
  );

  assert.equal(result.authorityDecision, "expired");
});

runTest("second approval required is detected", () => {
  const authorityMap: ApprovalAuthorityMap = {
    ...buildDefaultAuthorityMap(),
    authorities: [
      {
        ...buildDefaultAuthorityMap().authorities[0]!,
        allowedRiskLevels: ["low", "medium", "high", "critical"],
        requiresSecondApprovalAboveRisk: "medium",
      },
    ],
  };
  const result = evaluateApprovalAuthority(
    {
      authorityId: "local-founder",
      actionType: "comment_on_post",
      target: "linkedin",
      riskLevel: "high",
      scope: "distribution",
      authorityAppliedAt: "2026-05-08T00:00:00.000Z",
    },
    authorityMap,
  );

  assert.equal(result.authorityDecision, "requires_second_approval");
  assert.equal(result.requiresSecondApproval, true);
});

runTest("Distribution Copilot receipt includes approvalAuthority", () => {
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
  const authority = receipt.approvalAuthority as Record<string, unknown>;

  assert.equal(authority.authorityId, "local-founder");
  assert.equal(authority.authorityDecision, "valid");
});

runTest("MetaGate receipt safely reports missing authority", () => {
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
  const authority = receipt.approvalAuthority as Record<string, unknown>;

  assert.equal(authority.authorityDecision, "missing_authority");
  assert.equal(authority.authorityValidAtDecision, false);
});

runTest("legacy receipts without approvalAuthority do not fail coverage", () => {
  const receiptsDir = createTempDir();
  writeJsonReceipt(receiptsDir, "legacy.json", createReceipt());

  const result = scanApprovalAuthorityCoverage({
    receiptsDir,
    source: "receipts",
  });

  assert.equal(result.valid, true);
  assert.equal(result.legacyReceiptsWithoutApprovalAuthority, 1);
  assert.equal(result.receiptsWithApprovalAuthority, 0);
});

runTest("malformed approvalAuthority is detected", () => {
  const receiptsDir = createTempDir();
  writeJsonReceipt(receiptsDir, "malformed.json", {
    ...createReceipt(),
    approvalAuthority: {
      authorityId: "broken",
      authoritySource: "test",
      authorityValidAtDecision: true,
      authorityMatched: true,
      authorityBasis: [],
      authoritySnapshotHash: "nope",
    },
  });

  const result = scanApprovalAuthorityCoverage({
    receiptsDir,
    source: "receipts",
  });

  assert.equal(result.valid, false);
  assert.equal(result.invalidApprovalAuthorityEntries, 1);
  assert.ok(result.issues.some((issue) => /authorityDecision/.test(issue.issue)));
  assert.ok(result.issues.some((issue) => /authorityAppliedAt/.test(issue.issue)));
  assert.ok(result.issues.some((issue) => /authoritySnapshotHash/.test(issue.issue)));
});

runTest("JSONL approvalAuthority receipts are parsed and counted", () => {
  const root = createTempDir();
  const receiptFile = path.join(root, "receipts.jsonl");
  const receipt = attachApprovalAuthority(createReceipt(), {
    authorityId: "local-founder",
    authorityMap: buildDefaultAuthorityMap(),
    authorityAppliedAt: "2026-05-08T00:00:00.000Z",
    actionType: "comment_on_post",
    target: "linkedin",
    riskLevel: "low",
    scope: "distribution",
  });
  writeFileSync(receiptFile, `${JSON.stringify(receipt)}\n`, "utf8");

  const result = scanApprovalAuthorityCoverage({
    distributionReceiptsPath: receiptFile,
    source: "distribution",
  });

  assert.equal(result.valid, true);
  assert.equal(result.receiptsWithApprovalAuthority, 1);
  assert.equal(result.validAuthorityDecisions, 1);
});

console.log("Approval authority tests passed.");

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
  return mkdtempSync(path.join(tmpdir(), "aag-approval-authority-"));
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
