import { evaluateAction } from "../evaluateAction";
import {
  defaultPolicyProfile,
} from "../policyProfiles";
import {
  type FinalOutcome,
  type HumanDecision,
  writeEvaluationReceipt,
} from "../writeReceipt";
import { ensureSigningKeypair } from "./signingKeys";
import { verifySignedReceiptsInDirectory } from "./verifySignedReceipt";
import type { ActionGateInput } from "../types";

const keypair = ensureSigningKeypair();
const input: ActionGateInput = {
  userRequest: "Send a signed receipt demo email draft to an external contact.",
  proposedAction: {
    tool: "email",
    actionType: "send_email",
    target: "demo@example.com",
    payload: {
      description: "Signed receipt demo action.",
    },
    reversible: false,
    externalFacing: true,
  },
  context: {
    userApproved: false,
    environment: "production",
  },
};
const result = evaluateAction(input, {
  policyProfile: defaultPolicyProfile,
});
const humanDecision: HumanDecision = "not_requested";
const finalOutcome: FinalOutcome = "not_executed";
const receiptPath = writeEvaluationReceipt({
  command: "evaluate",
  input,
  result,
  reason: result.evidence[0] ?? result.recommendedAction,
  humanDecision,
  finalOutcome,
  policyProfile: defaultPolicyProfile,
});
const verification = verifySignedReceiptsInDirectory();

console.log("AAG Signed Receipts Demo");
console.log("");
console.log(`Key ID: ${keypair.metadata.keyId}`);
console.log(`Public key fingerprint: ${keypair.metadata.publicKeyFingerprint}`);
console.log(`Receipt written: ${receiptPath.replace(/\\/g, "/")}`);
console.log(`Signed receipts: ${verification.signedReceipts}`);
console.log(`Valid signatures: ${verification.validSignatures}`);
console.log(verification.valid ? "PASS" : "FAIL");

if (!verification.valid) {
  process.exitCode = 1;
}
