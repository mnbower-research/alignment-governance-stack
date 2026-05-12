import { strict as assert } from "node:assert";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  appendWorkflowAction,
  createWorkflowActionId,
  createWorkflowScope,
  loadLatestWorkflowLedger,
  writeWorkflowLedger,
  writeWorkflowLedgerUpdate,
} from "../workflowScopeLedger";
import {
  reviewDistributionInput,
  writeDistributionLogs,
} from "../distributionCopilot";

runTest("creating a workflow ledger starts in scope", () => {
  const ledger = createDistributionWorkflow();

  assert.match(ledger.workflowId, /^wf_[a-f0-9]{12}$/);
  assert.equal(ledger.scopeStatus, "in_scope");
  assert.equal(ledger.cumulativeRisk, "low");
  assert.equal(ledger.actions.length, 0);
});

runTest("appending allowed action keeps in_scope", () => {
  const baseLedger = createDistributionWorkflow();
  const ledger = appendWorkflowAction({
    ledger: baseLedger,
    action: createAction(baseLedger.workflowId, "draft_comment", "allow"),
  });

  assert.equal(ledger.scopeStatus, "in_scope");
  assert.equal(ledger.cumulativeRisk, "low");
});

runTest("require_approval produces scope_warning and medium risk", () => {
  const baseLedger = createDistributionWorkflow();
  const ledger = appendWorkflowAction({
    ledger: baseLedger,
    action: createAction(baseLedger.workflowId, "draft_repost", "require_approval"),
  });

  assert.equal(ledger.scopeStatus, "scope_warning");
  assert.equal(ledger.cumulativeRisk, "medium");
  assert.ok(ledger.scopeWarnings.includes("Action required approval."));
});

runTest("block produces scope_violation and high risk", () => {
  const baseLedger = createDistributionWorkflow();
  const ledger = appendWorkflowAction({
    ledger: baseLedger,
    action: createAction(baseLedger.workflowId, "draft_comment", "block"),
  });

  assert.equal(ledger.scopeStatus, "scope_violation");
  assert.equal(ledger.cumulativeRisk, "high");
});

runTest("prohibited action produces scope_violation", () => {
  const baseLedger = createDistributionWorkflow();
  const ledger = appendWorkflowAction({
    ledger: baseLedger,
    action: createAction(baseLedger.workflowId, "auto_post", "allow"),
  });

  assert.equal(ledger.scopeStatus, "scope_violation");
  assert.equal(ledger.cumulativeRisk, "high");
});

runTest("warning risk flag produces medium cumulative risk", () => {
  const baseLedger = createDistributionWorkflow();
  const ledger = appendWorkflowAction({
    ledger: baseLedger,
    action: createAction(baseLedger.workflowId, "draft_comment", "allow", ["overclaim_risk"]),
  });

  assert.equal(ledger.scopeStatus, "scope_warning");
  assert.equal(ledger.cumulativeRisk, "medium");
  assert.ok(ledger.scopeWarnings.includes("Risk flag detected: overclaim_risk"));
});

runTest("specific company public claim produces violation", () => {
  const baseLedger = createDistributionWorkflow();
  const ledger = appendWorkflowAction({
    ledger: baseLedger,
    action: createAction(baseLedger.workflowId, "draft_repost", "allow", [
      "specific_company_claim_risk",
    ]),
  });

  assert.equal(ledger.scopeStatus, "scope_violation");
  assert.equal(ledger.cumulativeRisk, "high");
});

runTest("workflow ledger writes to local JSONL", () => {
  const workflowDir = mkdtempSync(path.join(tmpdir(), "aag-workflow-ledger-"));
  const baseLedger = createDistributionWorkflow();
  const ledger = appendWorkflowAction({
    ledger: baseLedger,
    action: createAction(baseLedger.workflowId, "draft_comment", "allow"),
  });
  const action = ledger.actions[0];

  assert.ok(action);

  const paths = writeWorkflowLedgerUpdate(ledger, action, workflowDir);
  const ledgers = readFileSync(paths.ledgers, "utf8").trim().split("\n");
  const actions = readFileSync(paths.actions, "utf8").trim().split("\n");
  const loaded = loadLatestWorkflowLedger(ledger.workflowId, workflowDir);

  assert.equal(ledgers.length, 1);
  assert.equal(actions.length, 1);
  assert.equal(loaded.workflowId, ledger.workflowId);
});

runTest("Distribution Copilot can attach to workflowId", () => {
  const workflowDir = mkdtempSync(path.join(tmpdir(), "aag-workflow-attach-"));
  const distributionDir = mkdtempSync(path.join(tmpdir(), "aag-distribution-"));
  const ledger = createDistributionWorkflow();

  writeWorkflowLedger(ledger, workflowDir);

  const review = reviewDistributionInput({
    platform: "linkedin",
    goal: "comment",
    sourceText:
      "AI governance needs runtime controls, auditability, and human approval paths inside agentic workflows.",
    draft:
      "This is why I am building Agent Action Gate. It helps review risky agent actions before execution.",
    includeRepoLink: false,
    workflowId: ledger.workflowId,
  });

  writeDistributionLogs(review, distributionDir, workflowDir);

  const loaded = loadLatestWorkflowLedger(ledger.workflowId, workflowDir);

  assert.equal(loaded.actions.length, 1);
  assert.equal(loaded.actions[0]?.actionType, "draft_comment");
  assert.equal(loaded.actions[0]?.decision, review.decision);
  assert.doesNotMatch(review.safeComment ?? "", /—/);
  assert.doesNotMatch(review.safeRepost ?? "", /—/);
  assert.doesNotMatch(review.suggestedCTA ?? "", /—/);
});

console.log("Workflow Scope Ledger tests passed.");

function runTest(name: string, test: () => void): void {
  try {
    test();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

function createDistributionWorkflow() {
  return createWorkflowScope({
    originalIntent:
      "Distribute Agent Action Gate safely through relevant public conversations.",
    allowedScope: [
      "research public AI governance posts",
      "summarize relevance",
      "draft comments",
      "draft reposts",
      "prepare review packets",
      "log outcomes",
    ],
    prohibitedScope: [
      "auto-post",
      "auto-DM",
      "claim AAG prevented a specific incident",
      "tag people aggressively",
      "disable review",
      "modify AAG policy",
    ],
    createdBy: "test",
  });
}

function createAction(
  workflowId: string,
  actionType: string,
  decision: "allow" | "require_approval" | "revise_action" | "block",
  riskFlags: string[] = [],
) {
  return {
    actionId: createWorkflowActionId({
      workflowId,
      actionType,
    }),
    workflowId,
    actionType,
    decision,
    ...(riskFlags.length > 0 ? { riskFlags } : {}),
  };
}
