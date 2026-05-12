import { strict as assert } from "node:assert";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  attachHashChainMetadata,
  canonicalizeReceipt,
  hashCanonicalPayload,
  readReceiptChain,
  verifyReceiptHashChain,
} from "../receiptHashChain";

runTest("stable canonicalization ignores object key order", () => {
  const left = {
    decision: "allow",
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
    decision: "allow",
  };

  assert.equal(canonicalizeReceipt(left), canonicalizeReceipt(right));
  assert.equal(hashCanonicalPayload(left), hashCanonicalPayload(right));
});

runTest("metadata attachment adds expected hashChain fields", () => {
  const receiptsDir = createTempDir();
  const receipt = attachHashChainMetadata(createReceipt("one"), {
    receiptsDir,
    source: "receipts",
  });

  assert.equal(receipt.hashChain.chainId, "local_receipts");
  assert.equal(receipt.hashChain.chainIndex, 0);
  assert.equal(receipt.hashChain.previousReceiptHash, null);
  assert.match(receipt.hashChain.canonicalPayloadHash, /^sha256:[a-f0-9]{64}$/);
  assert.match(receipt.hashChain.receiptHash, /^sha256:[a-f0-9]{64}$/);
  assert.equal(receipt.hashChain.hashAlgorithm, "sha256");
  assert.equal(receipt.hashChain.createdAt, receipt.createdAt);
});

runTest("two receipts link through previousReceiptHash", () => {
  const receiptsDir = createTempDir();
  const first = attachHashChainMetadata(createReceipt("one"), {
    receiptsDir,
    source: "receipts",
  });
  writeJsonReceipt(receiptsDir, "001.json", first);

  const second = attachHashChainMetadata(createReceipt("two"), {
    receiptsDir,
    source: "receipts",
  });
  writeJsonReceipt(receiptsDir, "002.json", second);

  assert.equal(second.hashChain.chainIndex, 1);
  assert.equal(
    second.hashChain.previousReceiptHash,
    first.hashChain.receiptHash,
  );
  assert.equal(verifyReceiptHashChain({ receiptsDir, source: "receipts" }).valid, true);
});

runTest("tampering with a chained receipt is detected", () => {
  const receiptsDir = createTempDir();
  const receipt = attachHashChainMetadata(createReceipt("one"), {
    receiptsDir,
    source: "receipts",
  });
  writeJsonReceipt(receiptsDir, "001.json", {
    ...receipt,
    decision: "block",
  });

  const result = verifyReceiptHashChain({ receiptsDir, source: "receipts" });

  assert.equal(result.valid, false);
  assert.equal(result.hashMismatches, 1);
});

runTest("broken previousReceiptHash links are detected", () => {
  const receiptsDir = createTempDir();
  const first = attachHashChainMetadata(createReceipt("one"), {
    receiptsDir,
    source: "receipts",
  });
  writeJsonReceipt(receiptsDir, "001.json", first);

  const second = attachHashChainMetadata(createReceipt("two"), {
    receiptsDir,
    source: "receipts",
  });
  writeJsonReceipt(receiptsDir, "002.json", {
    ...second,
    hashChain: {
      ...second.hashChain,
      previousReceiptHash: `sha256:${"f".repeat(64)}`,
    },
  });

  const result = verifyReceiptHashChain({ receiptsDir, source: "receipts" });

  assert.equal(result.valid, false);
  assert.equal(result.brokenPreviousHashLinks > 0, true);
});

runTest("legacy receipts are counted without failing verification", () => {
  const receiptsDir = createTempDir();
  writeJsonReceipt(receiptsDir, "legacy.json", createReceipt("legacy"));

  const result = verifyReceiptHashChain({ receiptsDir, source: "receipts" });

  assert.equal(result.valid, true);
  assert.equal(result.legacyUnchainedReceipts, 1);
  assert.equal(result.chainedReceipts, 0);
});

runTest("empty source verifies cleanly", () => {
  const receiptsDir = createTempDir();
  const result = verifyReceiptHashChain({ receiptsDir, source: "receipts" });

  assert.equal(result.valid, true);
  assert.equal(result.totalReceiptsScanned, 0);
});

runTest("invalid JSON receipt is reported", () => {
  const receiptsDir = createTempDir();
  writeFileSync(path.join(receiptsDir, "invalid.json"), "{", "utf8");

  const result = verifyReceiptHashChain({ receiptsDir, source: "receipts" });

  assert.equal(result.valid, false);
  assert.equal(result.invalidJsonEntries, 1);
});

runTest("JSONL receipts verify in line order", () => {
  const root = createTempDir();
  const receiptFile = path.join(root, "receipts.jsonl");
  const first = attachHashChainMetadata(createReceipt("one"), {
    distributionReceiptsPath: receiptFile,
    source: "distribution",
  });
  appendJsonl(receiptFile, first);

  const second = attachHashChainMetadata(createReceipt("two"), {
    distributionReceiptsPath: receiptFile,
    source: "distribution",
  });
  appendJsonl(receiptFile, second);

  const entries = readReceiptChain({
    distributionReceiptsPath: receiptFile,
    source: "distribution",
  });
  const result = verifyReceiptHashChain({
    distributionReceiptsPath: receiptFile,
    source: "distribution",
  });

  assert.equal(entries.length, 2);
  assert.equal(entries[0]?.line, 1);
  assert.equal(entries[1]?.line, 2);
  assert.equal(result.valid, true);
  assert.equal(result.chainedReceipts, 2);
});

runTest("malformed JSONL lines are reported clearly", () => {
  const root = createTempDir();
  const receiptFile = path.join(root, "receipts.jsonl");
  writeFileSync(receiptFile, "{}\n{\n", "utf8");

  const result = verifyReceiptHashChain({
    distributionReceiptsPath: receiptFile,
    source: "distribution",
  });

  assert.equal(result.valid, false);
  assert.equal(result.invalidJsonEntries, 1);
  assert.match(result.issues[0]?.issue ?? "", /invalid JSON/);
});

console.log("Receipt hash chain tests passed.");

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
  return mkdtempSync(path.join(tmpdir(), "aag-receipt-chain-"));
}

function createReceipt(id: string): Record<string, unknown> {
  return {
    receiptVersion: "1.5.0",
    createdAt: `2026-05-07T00:00:0${id === "two" ? "2" : "1"}.000Z`,
    timestamp: `2026-05-07T00:00:0${id === "two" ? "2" : "1"}.000Z`,
    configHash: `sha256:${"a".repeat(64)}`,
    policyHash: `sha256:${"b".repeat(64)}`,
    decision: "allow",
    command: "evaluate",
    proposedAction: {
      actionType: id,
      target: "example",
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

function appendJsonl(filePath: string, value: Record<string, unknown>): void {
  writeFileSync(
    filePath,
    `${existsText(filePath)}${JSON.stringify(value)}\n`,
    "utf8",
  );
}

function existsText(filePath: string): string {
  try {
    return readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}
