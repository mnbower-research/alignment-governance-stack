import type { AgencyFingerprint, FingerprintVerificationResult } from "./types.js";
import { deriveAgencyFingerprintId } from "./createAgencyFingerprint.js";
import { hashAgencyFingerprint } from "./hashAgencyFingerprint.js";

export function verifyAgencyFingerprint(
  fingerprint: AgencyFingerprint
): FingerprintVerificationResult {
  const expectedHash = hashAgencyFingerprint(fingerprint);
  const actualHash = fingerprint.fingerprintHash;
  const errors = validateRequiredFields(fingerprint);
  const warnings = validateAdvisoryFields(fingerprint);

  if (expectedHash !== actualHash) {
    errors.push("fingerprintHash does not match the canonical fingerprint body.");
  }

  const expectedId = deriveAgencyFingerprintId(actualHash);
  if (fingerprint.fingerprintId !== expectedId) {
    errors.push("fingerprintId does not match the fingerprintHash-derived id.");
  }

  return {
    valid: errors.length === 0,
    expectedHash,
    actualHash,
    errors,
    warnings
  };
}

export function validateAgencyFingerprintChain(
  fingerprints: AgencyFingerprint[]
): FingerprintVerificationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let expectedHash: string | undefined;
  let actualHash: string | undefined;

  fingerprints.forEach((fingerprint, index) => {
    const result = verifyAgencyFingerprint(fingerprint);
    expectedHash = result.expectedHash;
    actualHash = result.actualHash;

    errors.push(...result.errors.map((error) => `fingerprint[${index}]: ${error}`));
    warnings.push(...result.warnings.map((warning) => `fingerprint[${index}]: ${warning}`));

    if (index === 0) {
      return;
    }

    const previous = fingerprints[index - 1];
    if (previous === undefined) {
      return;
    }

    if (fingerprint.previousFingerprintHash !== previous.fingerprintHash) {
      errors.push(
        `fingerprint[${index}]: previousFingerprintHash does not match fingerprint[${index - 1}].fingerprintHash.`
      );
    }
  });

  return {
    valid: errors.length === 0,
    ...(expectedHash !== undefined ? { expectedHash } : {}),
    ...(actualHash !== undefined ? { actualHash } : {}),
    errors,
    warnings
  };
}

function validateRequiredFields(fingerprint: AgencyFingerprint): string[] {
  const errors: string[] = [];

  if (fingerprint.delegatedBy === undefined || fingerprint.delegatedBy.trim() === "") {
    errors.push("delegatedBy is required.");
  }

  if (fingerprint.agentId === undefined || fingerprint.agentId.trim() === "") {
    errors.push("agentId is required.");
  }

  if (fingerprint.actionHash === undefined || fingerprint.actionHash.trim() === "") {
    errors.push("actionHash is required.");
  }

  if (fingerprint.timestamp === undefined || fingerprint.timestamp.trim() === "") {
    errors.push("timestamp is required.");
  }

  const hasSubjectHuman =
    fingerprint.subjectHumanId !== undefined && fingerprint.subjectHumanId.trim() !== "";
  const hasSubjectOrganization =
    fingerprint.subjectOrganizationId !== undefined && fingerprint.subjectOrganizationId.trim() !== "";

  if (!hasSubjectHuman && !hasSubjectOrganization) {
    errors.push("At least one of subjectHumanId or subjectOrganizationId is required.");
  }

  return errors;
}

function validateAdvisoryFields(fingerprint: AgencyFingerprint): string[] {
  const warnings: string[] = [];

  if (fingerprint.runtimePermitHash !== undefined && fingerprint.aagDecisionHash === undefined) {
    warnings.push("runtimePermitHash is present without aagDecisionHash.");
  }

  if (fingerprint.approvalRecordHash !== undefined && fingerprint.authorityMapHash === undefined) {
    warnings.push("approvalRecordHash is present without authorityMapHash.");
  }

  if (fingerprint.workflowId !== undefined && fingerprint.workflowScopeHash === undefined) {
    warnings.push("workflowId is present without workflowScopeHash.");
  }

  return warnings;
}
