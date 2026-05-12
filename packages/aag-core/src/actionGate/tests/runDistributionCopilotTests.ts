import { strict as assert } from "node:assert";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  normalizeDistributionInput,
  reviewDistributionInput,
  writeDistributionLogs,
} from "../distributionCopilot";

runTest("relevant AI governance post scores high", () => {
  const review = reviewDistributionInput(
    loadFixture("ai-governance-post.json"),
    { createdAt: "2026-05-06T00:00:00.000Z" },
  );

  assert.ok(review.relevanceScore >= 8);
  assert.ok(["allow", "revise_action"].includes(review.decision));
});

runTest("irrelevant post blocks", () => {
  const review = reviewDistributionInput(loadFixture("irrelevant-post.json"));

  assert.equal(review.decision, "block");
  assert.ok(review.riskFlags.includes("irrelevant_to_aag"));
});

runTest("incident-risk post requires approval", () => {
  const review = reviewDistributionInput(loadFixture("incident-risk-post.json"));

  assert.equal(review.decision, "require_approval");
  assert.ok(review.riskFlags.includes("incident_claim_risk"));
  assert.ok(review.riskFlags.includes("specific_company_claim_risk"));
});

runTest("generated copy contains no em dash", () => {
  const review = reviewDistributionInput(loadFixture("ai-governance-post.json"));

  assert.ok(review.riskFlags.includes("em_dash_detected"));
  assert.doesNotMatch(review.safeComment ?? "", /—/);
  assert.doesNotMatch(review.safeRepost ?? "", /—/);
  assert.doesNotMatch(review.suggestedCTA ?? "", /—/);
});

runTest("receipt JSONL is written with sourceTextHash", () => {
  const review = reviewDistributionInput(loadFixture("ai-governance-post.json"));
  const logDir = mkdtempSync(path.join(tmpdir(), "aag-distribution-copilot-"));
  const logPaths = writeDistributionLogs(review, logDir);
  const receiptLines = readFileSync(logPaths.receipts, "utf8")
    .trim()
    .split("\n");
  const receipt = JSON.parse(receiptLines[0] ?? "{}") as Record<string, unknown>;

  assert.equal(receipt.decision, review.decision);
  assert.match(String(receipt.sourceTextHash), /^sha256:[a-f0-9]{64}$/);
  assert.match(String(receipt.draftHash), /^sha256:[a-f0-9]{64}$/);
});

console.log("Distribution Copilot tests passed.");

function runTest(name: string, test: () => void): void {
  try {
    test();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

function loadFixture(filename: string) {
  const fixturePath = path.join(
    process.cwd(),
    "examples",
    "distribution-copilot",
    "inputs",
    filename,
  );

  return normalizeDistributionInput(
    JSON.parse(readFileSync(fixturePath, "utf8")) as unknown,
  );
}
