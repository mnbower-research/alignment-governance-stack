import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { evaluateGovernedRuntimeActionWithReceipt } from "@alignment-governance-stack/governance-core";
import type { AgentActionProposal } from "@alignment-governance-stack/shared-types";
import { runCli } from "../cli.js";
import { writeJsonFile } from "../io/writeJsonFile.js";

const tempDirs: string[] = [];

afterEach(() => {
  for (const tempDir of tempDirs.splice(0)) {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

describe("ags cli", () => {
  it("help command returns available commands", () => {
    const result = runCli(["help"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("ags eval");
    expect(result.stdout).toContain("ags dogfood");
    expect(result.stdout).toContain("ags govern <input.json>");
    expect(result.stdout).toContain("ags memory <receipts.json>");
    expect(result.stdout).toContain("ags receipt verify <receipt.json>");
  });

  it("eval command runs built-in evals", () => {
    const result = runCli(["eval"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("total:");
    expect(result.stdout).toContain("passed:");
    expect(result.stdout).toContain("failed: 0");
  });

  it("dogfood command runs built-in dogfood evals", () => {
    const result = runCli(["dogfood"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Internal Dogfood: 10/10 passed");
    expect(result.stdout).toContain("Enterprise Golden Path: 6/6 passed");
    expect(result.stdout).toContain("Total: 16/16 passed");
  });

  it("govern command with safe input returns receipt hash", () => {
    const inputPath = writeTempJson("safe-input.json", {
      proposal: safeInternalReport(),
      runtimeAction: safeInternalReport(),
      permitOptions: { issuedAt: "2026-05-12T10:00:00.000Z" },
      receiptOptions: { id: "cli-test-safe", createdAt: "2026-05-12T10:00:01.000Z" }
    });

    const result = runCli(["govern", inputPath]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("execution_allowed");
    expect(result.stdout).toContain("receiptHash:");
  });

  it("govern command with runtime substitution returns governed denial", () => {
    const inputPath = writeTempJson("runtime-substitution.json", {
      proposal: safeInternalReport(),
      runtimeAction: {
        ...safeInternalReport(),
        id: "runtime-substitution-action",
        tool: "database.delete"
      },
      permitOptions: { issuedAt: "2026-05-12T10:06:00.000Z" },
      receiptOptions: { id: "cli-test-runtime-substitution", createdAt: "2026-05-12T10:06:01.000Z" }
    });

    const result = runCli(["govern", inputPath]);

    expect(result.exitCode).toBe(2);
    expect(result.stdout).toContain("execution_denied");
  });

  it("govern --json returns parseable JSON", () => {
    const inputPath = writeTempJson("safe-json-input.json", {
      proposal: safeInternalReport(),
      runtimeAction: safeInternalReport(),
      permitOptions: { issuedAt: "2026-05-12T10:00:00.000Z" },
      receiptOptions: { id: "cli-test-safe-json", createdAt: "2026-05-12T10:00:01.000Z" }
    });

    const result = runCli(["govern", inputPath, "--json"]);
    const parsed = JSON.parse(result.stdout) as {
      governance?: { finalDecision?: unknown };
      receipt?: { receiptHash?: unknown };
    };

    expect(result.exitCode).toBe(0);
    expect(parsed.governance?.finalDecision).toBe("execution_allowed");
    expect(parsed.receipt?.receiptHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("receipt verify valid receipt succeeds", () => {
    const { receipt } = evaluateGovernedRuntimeActionWithReceipt({
      proposal: safeInternalReport(),
      runtimeAction: safeInternalReport(),
      permitOptions: { issuedAt: "2026-05-12T10:00:00.000Z" },
      receiptOptions: { id: "cli-test-valid-receipt", createdAt: "2026-05-12T10:00:01.000Z" }
    });
    const receiptPath = writeTempJson("valid-receipt.json", receipt);

    const result = runCli(["receipt", "verify", receiptPath]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("valid: true");
  });

  it("receipt verify tampered receipt exits invalid", () => {
    const { receipt } = evaluateGovernedRuntimeActionWithReceipt({
      proposal: safeInternalReport(),
      runtimeAction: safeInternalReport(),
      permitOptions: { issuedAt: "2026-05-12T10:00:00.000Z" },
      receiptOptions: { id: "cli-test-tampered-receipt", createdAt: "2026-05-12T10:00:01.000Z" }
    });
    const receiptPath = writeTempJson("tampered-receipt.json", {
      ...receipt,
      finalDecision: "execution_denied"
    });

    const result = runCli(["receipt", "verify", receiptPath]);

    expect(result.exitCode).toBe(2);
    expect(result.stdout).toContain("valid: false");
  });

  it("memory command summarizes receipt history", () => {
    const first = evaluateGovernedRuntimeActionWithReceipt({
      proposal: safeInternalReport(),
      runtimeAction: safeInternalReport(),
      permitOptions: { issuedAt: "2026-05-12T10:00:00.000Z" },
      receiptOptions: { id: "cli-test-memory-1", createdAt: "2026-05-12T10:00:01.000Z" }
    });
    const second = evaluateGovernedRuntimeActionWithReceipt({
      proposal: safeInternalReport(),
      runtimeAction: safeInternalReport(),
      permitOptions: { issuedAt: "2026-05-12T10:01:00.000Z" },
      receiptOptions: { id: "cli-test-memory-2", createdAt: "2026-05-12T10:01:01.000Z" }
    });
    const receiptPath = writeTempJson("receipt-history.json", [first.receipt, second.receipt]);

    const result = runCli(["memory", receiptPath]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("AGS Governance Memory");
    expect(result.stdout).toContain("receipt count: 2");
    expect(result.stdout).toContain("human review");
  });

  it("missing file exits 1", () => {
    const result = runCli(["govern", join(tmpdir(), "ags-missing-input.json")]);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Could not read JSON file");
  });
});

function safeInternalReport(): AgentActionProposal {
  return {
    id: "safe-internal-report",
    userRequest: "Generate a weekly internal usage report.",
    tool: "report.generate",
    actionType: "generate_internal_report",
    target: "weekly_usage_summary",
    environment: "staging",
    reversible: true,
    externalFacing: false,
    dataSensitivity: "low",
    requiresApproval: false,
    knownApproval: false,
    metadata: {}
  };
}

function writeTempJson(fileName: string, value: unknown): string {
  const tempDir = mkdtempSync(join(tmpdir(), "ags-cli-"));
  tempDirs.push(tempDir);
  const filePath = join(tempDir, fileName);
  writeJsonFile(filePath, value);

  return filePath;
}
