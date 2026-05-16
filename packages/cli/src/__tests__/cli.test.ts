import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { evaluateGovernedRuntimeActionWithReceipt } from "@alignment-governance-stack/governance-core";
import type { AgentActionProposal } from "@alignment-governance-stack/shared-types";
import { runCli } from "../cli.js";
import { writeJsonFile } from "../io/writeJsonFile.js";

const tempDirs: string[] = [];
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../../../..");

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
    expect(result.stdout).toContain("ags redteam");
    expect(result.stdout).toContain("ags gaps <input.json>");
    expect(result.stdout).toContain("ags govern <input.json>");
    expect(result.stdout).toContain("ags memory <receipts.json>");
    expect(result.stdout).toContain("ags audit-report <input.json>");
    expect(result.stdout).toContain("ags agency-chain <input.json>");
    expect(result.stdout).toContain("ags closure <input.json>");
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
    expect(result.stdout).toContain("Content Publishing Dogfood: 13/13 passed");
    expect(result.stdout).toContain("Content Publishing Hardening: 8/8 passed");
    expect(result.stdout).toContain("Content Publishing Depth Hardening: 30/30 passed");
    expect(result.stdout).toContain("Decision Closure Hardening: 1/1 passed");
    expect(result.stdout).toContain("Total: 68/68 passed");
  });

  it("redteam command runs built-in red-team evals", () => {
    const result = runCli(["redteam"]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("AGS Red-Team Eval Suite");
    expect(result.stdout).toContain("total: 15");
    expect(result.stdout).toContain("passed: 15");
    expect(result.stdout).toContain("failed: 0");
  });

  it("gaps command exits 0 for coherent input", () => {
    const inputPath = writeTempJson("coherent-gaps.json", coherentGapInput());

    const result = runCli(["gaps", inputPath]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("AGS Alignment Gap Report");
    expect(result.stdout).toContain("gap count:");
  });

  it("gaps command exits 2 for high or critical gaps", () => {
    const inputPath = writeTempJson("conflicting-gaps.json", {
      companyAlignmentInput: {
        id: "conflicting-finance",
        name: "Conflicting Finance",
        tools: [
          {
            tool: "email.send",
            allowed: true,
            externalFacing: true,
            maxDataSensitivity: "high"
          }
        ],
        dataClasses: [
          {
            id: "financial_report",
            label: "Financial report",
            sensitivity: "high",
            externalSharingAllowed: false
          }
        ]
      }
    });

    const result = runCli(["gaps", inputPath]);

    expect(result.exitCode).toBe(2);
    expect(result.stdout).toContain("highest severity:");
  });

  it("gaps --json returns parseable gap report", () => {
    const inputPath = writeTempJson("conflicting-gaps-json.json", {
      companyAlignmentInput: {
        id: "hard-boundary-override",
        name: "Hard Boundary Override",
        roles: [
          {
            id: "root_admin",
            label: "Root Admin",
            canApprove: ["override_hard_boundary"]
          }
        ]
      }
    });

    const result = runCli(["gaps", inputPath, "--json"]);
    const parsed = JSON.parse(result.stdout) as { gapCount?: number; gaps?: Array<{ type?: string }> };

    expect(result.exitCode).toBe(2);
    expect(parsed.gapCount).toBeGreaterThan(0);
    expect(parsed.gaps?.some((gap) => gap.type === "hard_boundary_override_claim")).toBe(true);
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

  it("audit-report command exits 0 for report with no high or critical findings", () => {
    const inputPath = writeTempJson("audit-low.json", lowSeverityAuditInput());

    const result = runCli(["audit-report", inputPath]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("# Governance Reality Report");
    expect(result.stdout).toContain("TG-002");
  });

  it("audit-report command exits 1 when high or critical findings exist", () => {
    const inputPath = writeTempJson("audit-high.json", highSeverityAuditInput());

    const result = runCli(["audit-report", inputPath]);

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain("Runtime binding not demonstrated");
  });

  it("audit-report command exits 2 for invalid input", () => {
    const inputPath = writeTempJson("audit-invalid.json", {
      subject: { auditScope: "Invalid report input" },
      findings: [
        {
          id: "F-BAD",
          taxonomyId: "TG-999",
          title: "Invalid finding",
          severity: "high"
        }
      ]
    });

    const result = runCli(["audit-report", inputPath]);

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("Invalid audit report input");
    expect(result.stderr).toContain("$.findings[0].taxonomyId");
  });

  it("audit-report --json returns parseable report JSON", () => {
    const inputPath = writeTempJson("audit-json.json", highSeverityAuditInput());

    const result = runCli(["audit-report", inputPath, "--json"]);
    const parsed = JSON.parse(result.stdout) as { reportId?: string; findings?: Array<{ taxonomyId?: string }> };

    expect(result.exitCode).toBe(1);
    expect(parsed.reportId).toBeDefined();
    expect(parsed.findings?.[0]?.taxonomyId).toBe("TG-003");
  });

  it("audit-report --out writes Markdown file", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "ags-cli-"));
    tempDirs.push(tempDir);
    const inputPath = writeTempJson("audit-out.json", lowSeverityAuditInput());
    const outPath = join(tempDir, "governance-reality-report.md");

    const result = runCli(["audit-report", inputPath, "--out", outPath]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe("");
    expect(existsSync(outPath)).toBe(true);
    expect(readFileSync(outPath, "utf8")).toContain("# Governance Reality Report");
  });

  it("audit-report AGS self-audit example exits 0", () => {
    const inputPath = join(repoRoot, "examples", "audit-report", "ags-self-audit.json");

    const result = runCli(["audit-report", inputPath]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("## Self-Audit Disclosure");
    expect(result.stdout).toContain("Alignment Governance Stack v1.5.0");
  });

  it("audit-report AGS self-audit --out writes report", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "ags-cli-"));
    tempDirs.push(tempDir);
    const inputPath = join(repoRoot, "examples", "audit-report", "ags-self-audit.json");
    const outPath = join(tempDir, "ags-self-audit.md");

    const result = runCli(["audit-report", inputPath, "--out", outPath]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe("");
    expect(readFileSync(outPath, "utf8")).toContain("## Self-Audit Disclosure");
  });

  it("audit-report AGS self-audit --json includes audit mode and limitations", () => {
    const inputPath = join(repoRoot, "examples", "audit-report", "ags-self-audit.json");

    const result = runCli(["audit-report", inputPath, "--json"]);
    const parsed = JSON.parse(result.stdout) as { auditMode?: string; limitations?: string[] };

    expect(result.exitCode).toBe(0);
    expect(parsed.auditMode).toBe("internal_self_audit");
    expect(parsed.limitations?.length).toBeGreaterThan(0);
  });

  it("agency-chain strong example exits 0", () => {
    const inputPath = join(repoRoot, "examples", "agency-chain", "strong-agent-workflow-chain.json");

    const result = runCli(["agency-chain", inputPath]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("AGS Agency Chain Map");
    expect(result.stdout).toContain("overallStatus: preserved");
  });

  it("agency-chain weak example exits 1", () => {
    const inputPath = join(repoRoot, "examples", "agency-chain", "weak-agent-workflow-chain.json");

    const result = runCli(["agency-chain", inputPath]);

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain("AC-001");
    expect(result.stdout).toContain("AC-003");
  });

  it("agency-chain --json emits parseable JSON", () => {
    const inputPath = join(repoRoot, "examples", "agency-chain", "weak-agent-workflow-chain.json");

    const result = runCli(["agency-chain", inputPath, "--json"]);
    const parsed = JSON.parse(result.stdout) as { overallStatus?: string; issues?: Array<{ id?: string }> };

    expect(result.exitCode).toBe(1);
    expect(parsed.overallStatus).toBe("broken");
    expect(parsed.issues?.some((issue) => issue.id === "AC-001")).toBe(true);
  });

  it("agency-chain invalid input exits 2", () => {
    const inputPath = writeTempJson("invalid-agency-chain.json", {
      subject: {},
      links: [{ id: "bad", type: "unknown", label: "", status: "present" }]
    });

    const result = runCli(["agency-chain", inputPath]);

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("Invalid agency chain input");
  });

  it("agency-chain content publishing strong example exits 0", () => {
    const inputPath = join(repoRoot, "examples", "agency-chain", "content-publishing-strong-chain.json");

    const result = runCli(["agency-chain", inputPath]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("overallStatus: preserved");
  });

  it("agency-chain content publishing weak example exits 1", () => {
    const inputPath = join(repoRoot, "examples", "agency-chain", "content-publishing-weak-chain.json");

    const result = runCli(["agency-chain", inputPath]);

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain("AC-001");
    expect(result.stdout).toContain("AC-006");
  });

  it("audit-report content publishing hardening report renders and JSON parses", () => {
    const inputPath = join(repoRoot, "examples", "audit-report", "content-publishing-hardening-report.json");

    const markdownResult = runCli(["audit-report", inputPath]);
    const jsonResult = runCli(["audit-report", inputPath, "--json"]);
    const parsed = JSON.parse(jsonResult.stdout) as { auditMode?: string; findings?: unknown[] };

    expect(markdownResult.exitCode).toBe(1);
    expect(markdownResult.stdout).toContain("AGS Content Publishing Agent Public-Claim Hardening Review");
    expect(markdownResult.stdout).toContain("## Agency Chain Map");
    expect(jsonResult.exitCode).toBe(1);
    expect(parsed.auditMode).toBe("workflow_review");
    expect(parsed.findings?.length).toBe(6);
  });

  it("closure allowed reviewed publish exits 0", () => {
    const inputPath = join(repoRoot, "examples", "decision-closure", "allowed-reviewed-publish.json");

    const result = runCli(["closure", inputPath]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("AGS Decision Closure Artifact");
    expect(result.stdout).toContain("outcome: allow");
  });

  it("closure missing runtime permit exits 1", () => {
    const inputPath = join(repoRoot, "examples", "decision-closure", "missing-runtime-permit.json");

    const result = runCli(["closure", inputPath]);

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain("DCA-003");
  });

  it("closure hard boundary allowed exits 1", () => {
    const inputPath = join(repoRoot, "examples", "decision-closure", "hard-boundary-allowed.json");

    const result = runCli(["closure", inputPath]);

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain("DCA-011");
  });

  it("closure rubber-stamp review exits 1", () => {
    const inputPath = join(repoRoot, "examples", "decision-closure", "rubber-stamp-review.json");

    const result = runCli(["closure", inputPath]);

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain("DCA-015");
  });

  it("closure refused public overclaim exits 0", () => {
    const inputPath = join(repoRoot, "examples", "decision-closure", "refused-public-overclaim.json");

    const result = runCli(["closure", inputPath]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("outcome: refuse");
  });

  it("closure escalated sensitive action exits 1", () => {
    const inputPath = join(repoRoot, "examples", "decision-closure", "escalated-sensitive-action.json");

    const result = runCli(["closure", inputPath]);

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain("DCA-006");
  });

  it("closure ultimate bypass example exits 1 with critical findings", () => {
    const inputPath = join(repoRoot, "examples", "decision-closure", "v170-announcement-ultimate-bypass.json");

    const result = runCli(["closure", inputPath]);

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain("DCA-011");
    expect(result.stdout).toContain("DCA-PUBLIC-OVERCLAIM");
    expect(result.stdout).toContain("DCA-INTERNAL-DRAFT-LAUNDERING");
  });

  it("closure ultimate bypass --json is parseable and critical", () => {
    const inputPath = join(repoRoot, "examples", "decision-closure", "v170-announcement-ultimate-bypass.json");

    const result = runCli(["closure", inputPath, "--json"]);
    const parsed = JSON.parse(result.stdout) as {
      artifact?: { decision?: { outcome?: string }; proof?: { canonicalHash?: string } };
      validation?: { severity?: string; valid?: boolean; findings?: Array<{ id?: string }> };
    };

    expect(result.exitCode).toBe(1);
    expect(parsed.artifact?.decision?.outcome).toBe("allow");
    expect(parsed.artifact?.proof?.canonicalHash).toMatch(/^[a-f0-9]{64}$/);
    expect(parsed.validation?.valid).toBe(false);
    expect(parsed.validation?.severity).toBe("critical");
    expect(parsed.validation?.findings?.some((finding) => finding.id === "DCA-011")).toBe(true);
  });

  it("closure --json emits parseable artifact and validation", () => {
    const inputPath = join(repoRoot, "examples", "decision-closure", "allowed-reviewed-publish.json");

    const result = runCli(["closure", inputPath, "--json"]);
    const parsed = JSON.parse(result.stdout) as {
      artifact?: { artifactType?: string; proof?: { canonicalHash?: string } };
      validation?: { severity?: string };
    };

    expect(result.exitCode).toBe(0);
    expect(parsed.artifact?.artifactType).toBe("decision_closure");
    expect(parsed.artifact?.proof?.canonicalHash).toMatch(/^[a-f0-9]{64}$/);
    expect(parsed.validation?.severity).toBe("low");
  });

  it("closure --out writes Markdown file", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "ags-cli-"));
    tempDirs.push(tempDir);
    const inputPath = join(repoRoot, "examples", "decision-closure", "allowed-reviewed-publish.json");
    const outPath = join(tempDir, "decision-closure.md");

    const result = runCli(["closure", inputPath, "--out", outPath]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe("");
    expect(readFileSync(outPath, "utf8")).toContain("# Decision Closure Artifact");
  });

  it("closure invalid input exits 2", () => {
    const inputPath = writeTempJson("invalid-closure.json", { artifactId: "missing-sections" });

    const result = runCli(["closure", inputPath]);

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("Invalid decision closure input");
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

function coherentGapInput(): unknown {
  return {
    companyAlignmentInput: {
      id: "coherent-cli-company",
      name: "Coherent CLI Company",
      values: [
        {
          id: "proof",
          label: "Proof before trust",
          governanceImplication: "Use audit trails for sensitive production actions."
        }
      ],
      tools: [
        {
          tool: "file.edit",
          allowed: true,
          externalFacing: false,
          maxDataSensitivity: "low"
        }
      ],
      dataClasses: [
        {
          id: "public_docs",
          label: "Public docs",
          sensitivity: "low",
          externalSharingAllowed: true
        }
      ],
      environments: [{ id: "staging", label: "Staging", productionLike: false }]
    },
    authorityMap: {
      id: "coherent-cli-authority",
      name: "Coherent CLI Authority",
      version: "authority.map.test",
      roles: [
        {
          id: "release_admin",
          label: "Release Admin",
          scopes: [{ id: "production", environment: "production" }]
        }
      ]
    },
    participationPolicy: {
      id: "meaningful-review",
      name: "Meaningful Review",
      version: "human.participation.test",
      requireReasonForHighRisk: true,
      requireContextForHighRisk: true
    }
  };
}

function lowSeverityAuditInput(): unknown {
  return {
    subject: {
      organizationName: "Example Corp",
      systemName: "Agent Workflow",
      auditScope: "Low severity local audit fixture"
    },
    findings: [
      {
        id: "F-LOW-001",
        taxonomyId: "TG-002",
        title: "Approval quality requires verification",
        severity: "low",
        confidence: "medium",
        status: "potential_signal",
        summary: "Approval evidence is present but review depth should be verified.",
        observation: "The available approval note does not include detailed reviewer reasoning.",
        whyItMatters: "Reviewer context and reasoning improve evidence quality for sensitive workflows.",
        auditQuestions: ["Did the reviewer receive risk context?"],
        recommendedRemediations: ["Add reviewer context and reason capture."],
        evidenceRefs: []
      }
    ]
  };
}

function highSeverityAuditInput(): unknown {
  return {
    subject: {
      organizationName: "Example Corp",
      systemName: "Agent Workflow",
      auditScope: "High severity local audit fixture"
    },
    findings: [
      {
        id: "F-HIGH-001",
        taxonomyId: "TG-003",
        title: "Runtime binding not demonstrated",
        severity: "high",
        confidence: "medium",
        status: "not_demonstrated",
        summary: "Available evidence does not show runtime permit matching.",
        observation: "The reviewed artifact describes approval but does not include a runtime binding result.",
        whyItMatters: "Execution can differ from an approved proposal unless the exact action is checked at runtime.",
        auditQuestions: ["Is the runtime action bound to a permit?"],
        recommendedRemediations: ["Store runtime binding results with governance receipts."],
        evidenceRefs: []
      }
    ]
  };
}

function writeTempJson(fileName: string, value: unknown): string {
  const tempDir = mkdtempSync(join(tmpdir(), "ags-cli-"));
  tempDirs.push(tempDir);
  const filePath = join(tempDir, fileName);
  writeJsonFile(filePath, value);

  return filePath;
}
