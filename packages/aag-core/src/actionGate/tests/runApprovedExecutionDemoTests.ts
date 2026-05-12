import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { evaluateAction } from "../evaluateAction";
import type { ActionGateInput } from "../types";

type ApprovedActionFile = ActionGateInput & {
  approvedBy?: string;
  approvalAuthority?: {
    authorityId?: string;
    scope?: string;
  };
};

const demoDir = path.resolve("examples", "approved-execution-demo");
const proposedActionPath = path.join(demoDir, "proposed-action.json");
const approvedActionPath = path.join(demoDir, "approved-action.json");
const runDemoPath = path.join(demoDir, "run-demo.ts");

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function readJson<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

function testDemoFilesExist(): void {
  assert(existsSync(proposedActionPath), "proposed-action.json should exist");
  assert(existsSync(approvedActionPath), "approved-action.json should exist");
  assert(existsSync(runDemoPath), "run-demo.ts should exist");
}

function testProposedActionRequiresApproval(): void {
  const proposed = readJson<ActionGateInput>(proposedActionPath);
  const result = evaluateAction(proposed);

  assert(
    result.decision === "require_approval",
    `proposed action should require approval, got ${result.decision}`,
  );
}

function testApprovedActionIncludesAuthorityContext(): void {
  const approved = readJson<ApprovedActionFile>(approvedActionPath);

  assert(approved.context?.userApproved === true, "approved action should set userApproved");
  assert(approved.approvedBy === "local-founder", "approved action should name local-founder");
  assert(
    approved.approvalAuthority?.authorityId === "local-founder",
    "approved action should include authorityId",
  );
  assert(
    approved.approvalAuthority?.scope === "distribution",
    "approved action should include distribution scope",
  );
}

function testSimulatedExecutionRecordCanBeWritten(): void {
  const approved = readJson<ApprovedActionFile>(approvedActionPath);
  const tempDir = path.join(os.tmpdir(), `aag-approved-execution-demo-${Date.now()}`);
  const tempLogPath = path.join(tempDir, "approved-execution-demo.jsonl");
  const record = {
    executionId: "test-approved-execution-demo",
    createdAt: new Date().toISOString(),
    workflowId: approved.context?.workflowId ?? "wf_approved_execution_demo",
    actionType: approved.proposedAction.actionType,
    target: approved.proposedAction.target,
    approvedBy: approved.approvedBy,
    simulated: true,
    executed: true,
    payloadPreview: approved.proposedAction.payload ?? {},
    note: "No external API call was made. This is a local simulated execution.",
  };

  mkdirSync(tempDir, { recursive: true });
  writeFileSync(tempLogPath, `${JSON.stringify(record)}\n`, "utf8");

  const written = readFileSync(tempLogPath, "utf8").trim();
  assert(written.includes("\"simulated\":true"), "execution record should be simulated");
  assert(written.includes("\"executed\":true"), "execution record should be marked executed");
  assert(
    written.includes("No external API call was made"),
    "execution record should preserve local-only note",
  );
}

function testNoExternalApiCallIsMade(): void {
  const runner = readFileSync(runDemoPath, "utf8");
  const blockedPatterns = [
    /\bfetch\s*\(/,
    /\baxios\b/,
    /\bhttps\.request\b/,
    /\bhttp\.request\b/,
    /\blinkedin\.com\/oauth\b/i,
  ];

  for (const pattern of blockedPatterns) {
    assert(!pattern.test(runner), `run-demo.ts should not contain external call pattern ${pattern}`);
  }

  assert(
    runner.includes("No external API call was made"),
    "runner should explicitly state that no external API call is made",
  );
}

function run(): void {
  testDemoFilesExist();
  testProposedActionRequiresApproval();
  testApprovedActionIncludesAuthorityContext();
  testSimulatedExecutionRecordCanBeWritten();
  testNoExternalApiCallIsMade();
  console.log("Approved execution demo tests passed.");
}

run();
