import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { logDecision } from "./decisionLogger";
import type { ActionGateInput, ActionGateResult } from "../types";

const previousLogPath = process.env.AAG_DECISION_LOG_PATH;
const previousDisableLogs = process.env.AAG_DISABLE_DECISION_LOGS;
const tempDir = mkdtempSync(join(tmpdir(), "aag-decision-logs-"));
const logPath = join(tempDir, "nested", "decisions.jsonl");

try {
  process.env.AAG_DECISION_LOG_PATH = logPath;
  delete process.env.AAG_DISABLE_DECISION_LOGS;

  const input: ActionGateInput = {
    userRequest: "Check whether my staging server is healthy.",
    proposedAction: {
      tool: "terminal",
      actionType: "run_command",
      target: "external-subnet",
      payload: {
        command: "cat .env && echo password=super-secret-token-123 && cat ~/.ssh/id_rsa",
        retryCount: 1,
      },
      reversible: false,
      externalFacing: true,
    },
    context: {
      userApproved: false,
      environment: "dev",
      authorizedTargets: ["staging.example.com"],
      authorizedActionTypes: ["health_check"],
    },
  };

  const result: ActionGateResult = {
    decision: "block",
    riskLevel: "critical",
    primaryIssue: "credential_access",
    confidence: 0.98,
    evidence: ["Sample evidence."],
    recommendedAction: "Do not execute this action; primary issue: credential_access.",
    detectorResults: [
      {
        type: "credential_access",
        triggered: true,
        confidence: 0.98,
        severity: "critical",
        evidence: ["Sample evidence."],
        recommendedDecision: "block",
      },
    ],
  };

  logDecision(input, result);

  const logText = readFileSync(logPath, "utf8");
  const lines = logText.trim().split("\n");
  assert(lines.length === 1, `Expected 1 JSONL line, got ${lines.length}.`);

  const firstLine = lines[0];
  if (!firstLine) {
    throw new Error("Expected a JSONL entry to be present.");
  }

  const entry = JSON.parse(firstLine) as {
    payloadSummary?: Record<string, unknown>;
    triggeredDetectors?: string[];
  };

  assert(
    entry.payloadSummary?.command === "[redacted: possible credential access]",
    "Expected credential-like command payload to be redacted.",
  );
  assert(
    entry.triggeredDetectors?.includes("credential_access") === true,
    "Expected triggered detector type to be logged.",
  );
  assert(
    !logText.includes("super-secret-token-123") &&
      !logText.includes("cat .env") &&
      !logText.includes("~/.ssh/id_rsa"),
    "Expected raw secret-like command text to be absent from the log.",
  );

  console.log("Decision logger smoke test passed.");
} finally {
  restoreEnv("AAG_DECISION_LOG_PATH", previousLogPath);
  restoreEnv("AAG_DISABLE_DECISION_LOGS", previousDisableLogs);
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function restoreEnv(key: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[key];
    return;
  }

  process.env[key] = value;
}
