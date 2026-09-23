import { createGovernanceReceipt } from "@alignment-governance-stack/receipts";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { generateContinuitySnapshot } from "../generateSnapshot.js";
import { contextAdmissionParser } from "../parsers/contextAdmissionParser.js";
import { receiptParser } from "../parsers/coreParsers.js";

const fixture = fileURLToPath(new URL("../../../../examples/continuity-console-artifacts/context-inheritance/valid-temporal-relay.json", import.meta.url));
const parserContext = { sourcePath: fixture, fileName: "valid-temporal-relay.json", sha256: "a".repeat(64), importedAt: "2026-09-19T12:00:00Z" };
describe("read-only context evidence ingestion", () => {
  it("imports lineage with proposal correlation and leaves source bytes unchanged", async () => {
    const before = await readFile(fixture, "utf8");
    const result = await generateContinuitySnapshot({ sourcePaths: [fixture], generatedAt: parserContext.importedAt });
    expect(result.snapshot.artifacts[0]?.kind).toBe("context-admission");
    expect(result.snapshot.artifacts[0]?.correlation.proposalId).toBe("context-report");
    expect(result.snapshot.artifacts[0]?.warnings.join(" ")).toContain("not authenticate");
    expect(await readFile(fixture, "utf8")).toBe(before);
  });
  it("extracts context references from receipts without granting admission", async () => {
    const contextAdmission = JSON.parse(await readFile(fixture, "utf8"));
    const receipt = createGovernanceReceipt({ createdAt: parserContext.importedAt, governancePacket: {
      contextAdmission, finalDecision: "execution_allowed", reasonForDecision: "Historical permission",
      originalProposal: { id: "context-report", userRequest: "Generate report", tool: "report.generate", actionType: "generate_report", target: "weekly_summary", environment: "dev", reversible: true, externalFacing: false, dataSensitivity: "low", requiresApproval: false, knownApproval: false, metadata: {} }
    } });
    const artifacts = receiptParser.parse(receipt, parserContext);
    expect(artifacts.map(a => a.kind)).toEqual(["receipt", "context-admission"]);
  });
  it("does not normalize malformed or tampered admission evidence", async () => {
    const evidence = JSON.parse(await readFile(fixture, "utf8"));
    evidence.decision = "reject";
    expect(() => contextAdmissionParser.parse(evidence, parserContext)).toThrow("invalid shape or digest");
    expect(() => contextAdmissionParser.parse({ version: "context-admission/v0.1", artifacts: [{}] }, parserContext)).toThrow();
  });
});
