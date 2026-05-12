import { strict as assert } from "node:assert";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  canonicalizeForSigning,
  signReceipt,
} from "./signReceipt";
import { ensureSigningKeypair } from "./signingKeys";
import {
  verifySignedReceipt,
  verifySignedReceiptsInDirectory,
} from "./verifySignedReceipt";

const tests: Array<{ name: string; run: () => void }> = [
  {
    name: "creates Ed25519 keypair",
    run: () => {
      const keypair = ensureSigningKeypair(createTempDir("keys"));

      assert.equal(keypair.metadata.algorithm, "ed25519");
      assert.match(keypair.metadata.keyId, /^aag-ed25519-[a-f0-9]{12}$/);
      assert.match(keypair.publicKeyPem, /BEGIN PUBLIC KEY/);
      assert.match(keypair.privateKeyPem, /BEGIN PRIVATE KEY/);
    },
  },
  {
    name: "signs a receipt",
    run: () => {
      const keypair = ensureSigningKeypair(createTempDir("keys"));
      const signedReceipt = signReceipt(createReceipt("one"), keypair);

      assert.equal(signedReceipt.signatureMetadata.signatureAlgorithm, "ed25519");
      assert.equal(signedReceipt.signatureMetadata.keyId, keypair.metadata.keyId);
      assert.match(signedReceipt.signatureMetadata.signature, /^[A-Za-z0-9+/=]+$/);
    },
  },
  {
    name: "verifies a valid signed receipt",
    run: () => {
      const keypair = ensureSigningKeypair(createTempDir("keys"));
      const signedReceipt = signReceipt(createReceipt("one"), keypair);
      const result = verifySignedReceipt(
        signedReceipt,
        keypair.publicKeyPem,
        "signed.json",
      );

      assert.equal(result.valid, true);
      assert.equal(result.signatureValid, true);
      assert.equal(result.canonicalReceiptHashMatches, true);
    },
  },
  {
    name: "fails verification if signed receipt content is modified",
    run: () => {
      const keypair = ensureSigningKeypair(createTempDir("keys"));
      const signedReceipt = signReceipt(createReceipt("one"), keypair);
      const modifiedReceipt = {
        ...signedReceipt,
        decision: "block",
      };
      const result = verifySignedReceipt(
        modifiedReceipt,
        keypair.publicKeyPem,
        "modified.json",
      );

      assert.equal(result.valid, false);
      assert.equal(result.canonicalReceiptHashMatches, false);
    },
  },
  {
    name: "reports unsigned legacy receipt without failing default verification",
    run: () => {
      const receiptsDir = createTempDir("receipts");
      writeJson(path.join(receiptsDir, "legacy.json"), createReceipt("legacy"));

      const result = verifySignedReceiptsInDirectory(receiptsDir);

      assert.equal(result.valid, true);
      assert.equal(result.unsignedLegacyReceipts, 1);
      assert.equal(result.signedReceipts, 0);
    },
  },
  {
    name: "fails verification with wrong public key",
    run: () => {
      const keypair = ensureSigningKeypair(createTempDir("keys"));
      const wrongKeypair = ensureSigningKeypair(createTempDir("wrong-keys"));
      const signedReceipt = signReceipt(createReceipt("one"), keypair);
      const result = verifySignedReceipt(
        signedReceipt,
        wrongKeypair.publicKeyPem,
        "wrong-key.json",
      );

      assert.equal(result.valid, false);
      assert.equal(result.signatureValid, false);
      assert.ok(result.issues.includes("public key fingerprint mismatch"));
    },
  },
  {
    name: "canonicalization is stable for object key order",
    run: () => {
      const left = {
        receiptVersion: "1.5.0",
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
        receiptVersion: "1.5.0",
      };

      assert.equal(canonicalizeForSigning(left), canonicalizeForSigning(right));
    },
  },
];

let passed = 0;

for (const test of tests) {
  try {
    test.run();
    passed += 1;
    console.log(`PASS | ${test.name}`);
  } catch (error) {
    console.log(`FAIL | ${test.name}`);
    console.error(error);
  }
}

const failed = tests.length - passed;
console.log(`Totals: passed=${passed} failed=${failed} total=${tests.length}`);

if (failed > 0) {
  process.exitCode = 1;
}

function createTempDir(label: string): string {
  return mkdtempSync(path.join(tmpdir(), `aag-signed-receipts-${label}-`));
}

function createReceipt(id: string): Record<string, unknown> {
  return {
    receiptVersion: "1.5.0",
    createdAt: "2026-05-10T00:00:00.000Z",
    timestamp: "2026-05-10T00:00:00.000Z",
    configHash: `sha256:${"a".repeat(64)}`,
    policyHash: `sha256:${"b".repeat(64)}`,
    command: "evaluate",
    decision: "allow",
    proposedAction: {
      actionType: id,
      target: "example",
    },
  };
}

function writeJson(filePath: string, value: Record<string, unknown>): void {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  assert.ok(readFileSync(filePath, "utf8").length > 0);
}
