import {
  verifyGovernanceReceipt,
  type GovernanceReceipt
} from "@alignment-governance-stack/receipts";
import {
  verifyAgencyFingerprint,
  type AgencyFingerprint
} from "@alignment-governance-stack/agency-fingerprint";
import {
  canonicalSerialize,
  hashRecordOmitting,
  validateF7DiagnosticRecord
} from "./schemas.js";
import {
  AGS_BASE_COMMIT,
  APPARATUS_VERSION,
  BENCHMARK_VERSION,
  MASTER_SEED,
  type F7DiagnosticManifestRecord,
  type F7DiagnosticRecord,
  type FullAgsArtifacts,
  type JsonObject
} from "./types.js";

export interface F7DiagnosticInput {
  plan: F7DiagnosticManifestRecord;
  benchmark_commit: string;
  originating_artifacts: FullAgsArtifacts;
  substituted_artifacts: FullAgsArtifacts;
}

function requireReceipt(
  value: JsonObject | null,
  label: string
): GovernanceReceipt {
  if (value === null) {
    throw new Error(`F7 diagnostic missing ${label}.`);
  }

  return value as unknown as GovernanceReceipt;
}

function requireFingerprint(
  value: JsonObject | null,
  label: string
): AgencyFingerprint {
  if (value === null) {
    throw new Error(`F7 diagnostic missing ${label}.`);
  }

  return value as unknown as AgencyFingerprint;
}

function receiptReferencesFingerprint(
  receipt: GovernanceReceipt,
  fingerprint: AgencyFingerprint
): boolean {
  const metadata = receipt.metadata;

  if (
    metadata === undefined ||
    metadata === null ||
    typeof metadata !== "object" ||
    Array.isArray(metadata)
  ) {
    return false;
  }

  return (
    metadata.agencyFingerprintId === fingerprint.fingerprintId &&
    metadata.agencyFingerprintHash === fingerprint.fingerprintHash
  );
}

function governanceBindingProjection(
  fingerprint: AgencyFingerprint
): Record<string, unknown> {
  return {
    contextLineageDigest: fingerprint.contextLineageDigest,
    subjectHumanId: fingerprint.subjectHumanId,
    subjectOrganizationId: fingerprint.subjectOrganizationId,
    delegatedBy: fingerprint.delegatedBy,
    agentId: fingerprint.agentId,
    agentRole: fingerprint.agentRole,
    workflowId: fingerprint.workflowId,
    workflowScopeHash: fingerprint.workflowScopeHash,
    authorityMapHash: fingerprint.authorityMapHash,
    policyProfileHash: fingerprint.policyProfileHash,
    pgdlPacketHash: fingerprint.pgdlPacketHash,
    aagDecisionHash: fingerprint.aagDecisionHash,
    approvalRecordHash: fingerprint.approvalRecordHash,
    runtimePermitHash: fingerprint.runtimePermitHash,
    executionConstraintHash: fingerprint.executionConstraintHash,
    actionHash: fingerprint.actionHash,
    targetHash: fingerprint.targetHash,
    environment: fingerprint.environment
  };
}

function governanceBindingsMatch(
  suppliedFingerprint: AgencyFingerprint,
  originatingFingerprint: AgencyFingerprint
): boolean {
  return (
    canonicalSerialize(
      governanceBindingProjection(suppliedFingerprint)
    ) ===
    canonicalSerialize(
      governanceBindingProjection(originatingFingerprint)
    )
  );
}

function nativeMismatchDetection(): {
  detected: boolean;
  mechanism: string | null;
} {
  /*
   * At the frozen AGS base commit, the public production APIs provide
   * individual receipt and fingerprint integrity verification but no
   * pre-benchmark receipt<->fingerprint pair-verification function.
   *
   * Benchmark-local correspondence comparisons therefore remain
   * descriptive only and must not be counted as native AGS detection.
   */
  return {
    detected: false,
    mechanism: null
  };
}

export function runF7Diagnostic(
  input: F7DiagnosticInput
): F7DiagnosticRecord {
  const originatingReceipt =
    requireReceipt(
      input.originating_artifacts.receipt,
      "originating governance receipt"
    );

  const originatingFingerprint =
    requireFingerprint(
      input.originating_artifacts.agency_fingerprint,
      "originating agency fingerprint"
    );

  const suppliedPartnerFingerprint =
    requireFingerprint(
      input.substituted_artifacts.agency_fingerprint,
      "partner agency fingerprint"
    );

  const receiptIndividuallyValid =
    verifyGovernanceReceipt(originatingReceipt).valid;

  const fingerprintIndividuallyValid =
    verifyAgencyFingerprint(
      suppliedPartnerFingerprint
    ).valid;

  const receiptReferencesSuppliedFingerprint =
    receiptReferencesFingerprint(
      originatingReceipt,
      suppliedPartnerFingerprint
    );

  const fingerprintGovernanceBindingsMatchOriginatingRun =
    governanceBindingsMatch(
      suppliedPartnerFingerprint,
      originatingFingerprint
    );

  const nativeDetection =
    nativeMismatchDetection();

  const recordWithoutHash = {
    benchmark_version: BENCHMARK_VERSION,
    apparatus_version: APPARATUS_VERSION,
    ags_base_commit: AGS_BASE_COMMIT,
    benchmark_commit: input.benchmark_commit,
    master_seed: MASTER_SEED,
    diagnostic_id: input.plan.diagnostic_id,
    diagnostic_plan_hash:
      input.plan.diagnostic_plan_hash,
    originating_scenario_id:
      input.plan.originating_scenario_id,
    substituted_artifact_scenario_id:
      input.plan.substituted_artifact_scenario_id,
    receipt_individually_valid:
      receiptIndividuallyValid,
    fingerprint_individually_valid:
      fingerprintIndividuallyValid,
    receipt_references_supplied_fingerprint:
      receiptReferencesSuppliedFingerprint,
    fingerprint_governance_bindings_match_originating_run:
      fingerprintGovernanceBindingsMatchOriginatingRun,
    native_ags_mismatch_detected:
      nativeDetection.detected,
    detection_mechanism:
      nativeDetection.mechanism
  };

  const record: F7DiagnosticRecord = {
    ...recordWithoutHash,
    diagnostic_record_hash:
      hashRecordOmitting(
        {
          ...recordWithoutHash,
          diagnostic_record_hash: ""
        },
        "diagnostic_record_hash"
      )
  };

  validateF7DiagnosticRecord(record);

  return record;
}
