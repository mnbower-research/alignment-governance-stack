import { canonicalizeForHash, sha256Hex } from "@alignment-governance-stack/receipts";
import type { DecisionClosureArtifact } from "./types.js";

export function canonicalizeDecisionClosureArtifact(artifact: DecisionClosureArtifact): string {
  return canonicalizeForHash(hashableArtifact(artifact));
}

export function hashDecisionClosureArtifact(artifact: DecisionClosureArtifact): string {
  return sha256Hex(canonicalizeDecisionClosureArtifact(artifact));
}

function hashableArtifact(artifact: DecisionClosureArtifact): DecisionClosureArtifact {
  const {
    canonicalHash: _canonicalHash,
    signature: _signature,
    integrityStatus: _integrityStatus,
    ...stableProof
  } = artifact.proof;

  return {
    ...artifact,
    proof: {
      ...stableProof,
      canonicalHash: "",
      integrityStatus: "unknown"
    }
  };
}

