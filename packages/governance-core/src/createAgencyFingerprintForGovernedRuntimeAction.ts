import { createAgencyFingerprint } from "@alignment-governance-stack/agency-fingerprint";
import type { AgencyFingerprint, AgencyFingerprintInput } from "@alignment-governance-stack/agency-fingerprint";
import { canonicalizeForHash, sha256Hex } from "@alignment-governance-stack/receipts";
import { createActionHash } from "@alignment-governance-stack/runtime-binding";
import type { AgentActionProposal } from "@alignment-governance-stack/shared-types";
import type {
  CreateGovernanceAgencyFingerprintInput,
  GovernanceRuntimePacket
} from "./types.js";

export function createAgencyFingerprintForGovernedRuntimeAction(
  input: CreateGovernanceAgencyFingerprintInput
): AgencyFingerprint {
  if (input.governance.contextAdmission !== undefined &&
      input.governance.contextAdmission.requestedUse.receiverAgentId !== input.fingerprintInput.agentId) {
    throw new Error("Agency fingerprint agent must match the admitted context receiver.");
  }
  const action = selectFingerprintedAction(input.governance);
  const packetHashes = derivePacketHashes(input.governance);
  const fingerprintInput = input.fingerprintInput;

  return createAgencyFingerprint({
    ...fingerprintInput,
    ...(input.governance.contextAdmission !== undefined
      ? { contextLineageDigest: input.governance.contextAdmission.contextLineageDigest } : {}),
    actionHash:
      fingerprintInput.actionHash ??
      input.governance.permit?.actionHash ??
      createActionHash(action),
    ...(fingerprintInput.environment !== undefined
      ? { environment: fingerprintInput.environment }
      : { environment: action.environment }),
    timestamp: fingerprintInput.timestamp ?? new Date().toISOString(),
    ...(fingerprintInput.pgdlPacketHash !== undefined
      ? { pgdlPacketHash: fingerprintInput.pgdlPacketHash }
      : packetHashes.pgdlPacketHash !== undefined
        ? { pgdlPacketHash: packetHashes.pgdlPacketHash }
        : {}),
    ...(fingerprintInput.aagDecisionHash !== undefined
      ? { aagDecisionHash: fingerprintInput.aagDecisionHash }
      : packetHashes.aagDecisionHash !== undefined
        ? { aagDecisionHash: packetHashes.aagDecisionHash }
        : {}),
    ...(fingerprintInput.runtimePermitHash !== undefined
      ? { runtimePermitHash: fingerprintInput.runtimePermitHash }
      : packetHashes.runtimePermitHash !== undefined
        ? { runtimePermitHash: packetHashes.runtimePermitHash }
        : {}),
    ...(fingerprintInput.executionConstraintHash !== undefined
      ? { executionConstraintHash: fingerprintInput.executionConstraintHash }
      : packetHashes.executionConstraintHash !== undefined
        ? { executionConstraintHash: packetHashes.executionConstraintHash }
        : {})
  } satisfies AgencyFingerprintInput);
}

function selectFingerprintedAction(governance: GovernanceRuntimePacket): AgentActionProposal {
  return (
    governance.runtimeAction ??
    governance.permit?.allowedAction ??
    governance.proposalSentToAag ??
    governance.originalProposal
  );
}

function derivePacketHashes(governance: GovernanceRuntimePacket): {
  pgdlPacketHash?: string;
  aagDecisionHash?: string;
  runtimePermitHash?: string;
  executionConstraintHash?: string;
} {
  return {
    ...(governance.pgdl !== undefined ? { pgdlPacketHash: hashGovernanceArtifact(governance.pgdl) } : {}),
    ...(governance.aag !== undefined ? { aagDecisionHash: hashGovernanceArtifact(governance.aag) } : {}),
    ...(governance.permit !== undefined
      ? { runtimePermitHash: hashGovernanceArtifact(governance.permit) }
      : {}),
    ...(governance.permit?.executionConstraintHash !== undefined
      ? { executionConstraintHash: governance.permit.executionConstraintHash }
      : {})
  };
}

function hashGovernanceArtifact(value: unknown): string {
  return sha256Hex(canonicalizeForHash(value));
}
