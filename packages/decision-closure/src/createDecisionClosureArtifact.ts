import { hashDecisionClosureArtifact } from "./hashDecisionClosureArtifact.js";
import type {
  DecisionClosureArtifact,
  DecisionClosureArtifactInput,
  DecisionClosureProof
} from "./types.js";

export function createDecisionClosureArtifact(input: DecisionClosureArtifactInput): DecisionClosureArtifact {
  const proofInput = input.proof ?? {};
  const proof: DecisionClosureProof = {
    ...(proofInput.receiptHash !== undefined ? { receiptHash: proofInput.receiptHash } : {}),
    ...(proofInput.previousReceiptHash !== undefined ? { previousReceiptHash: proofInput.previousReceiptHash } : {}),
    ...(proofInput.signature !== undefined ? { signature: proofInput.signature } : {}),
    ...(proofInput.signatureAlgorithm !== undefined ? { signatureAlgorithm: proofInput.signatureAlgorithm } : {}),
    canonicalHash: "",
    integrityStatus: proofInput.integrityStatus ?? inferIntegrityStatus(proofInput)
  };

  const artifact: DecisionClosureArtifact = {
    artifactType: "decision_closure",
    artifactVersion: "1.0",
    artifactId: input.artifactId,
    createdAt: input.createdAt,
    ...(input.context !== undefined ? { context: input.context } : {}),
    action: input.action,
    executionBoundary: input.executionBoundary,
    authority: input.authority,
    decision: input.decision,
    conditions: input.conditions,
    proof,
    auditSummary: input.auditSummary
  };

  artifact.proof.canonicalHash = hashDecisionClosureArtifact(artifact);
  return artifact;
}

function inferIntegrityStatus(proof: Partial<DecisionClosureProof>): DecisionClosureProof["integrityStatus"] {
  if (proof.signature !== undefined && proof.signature.length > 0) {
    return "signed";
  }

  return "unsigned";
}
