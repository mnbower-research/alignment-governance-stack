import { describe, expect, it } from "vitest";
import {
  createAgencyFingerprint,
  linkAgencyFingerprint,
  validateAgencyFingerprintChain,
  verifyAgencyFingerprint
} from "../index.js";
import type { AgencyFingerprintInput } from "../types.js";

describe("agency fingerprints", () => {
  it("creates deterministic fingerprints for the same input", () => {
    const input = createInput();

    const first = createAgencyFingerprint(input);
    const second = createAgencyFingerprint(input);

    expect(first.fingerprintId).toBe(second.fingerprintId);
    expect(first.fingerprintHash).toBe(second.fingerprintHash);
    expect(verifyAgencyFingerprint(first).valid).toBe(true);
  });

  it("keeps metadata key order deterministic when metadata is included", () => {
    const first = createAgencyFingerprint({
      ...createInput(),
      metadata: {
        b: true,
        a: {
          z: "last",
          m: "middle"
        }
      }
    });
    const second = createAgencyFingerprint({
      ...createInput(),
      metadata: {
        a: {
          m: "middle",
          z: "last"
        },
        b: true
      }
    });

    expect(first.fingerprintHash).toBe(second.fingerprintHash);
  });

  it("changes the fingerprint hash when agentId changes", () => {
    const baseline = createAgencyFingerprint(createInput());
    const changed = createAgencyFingerprint({ ...createInput(), agentId: "research-agent-2" });

    expect(changed.fingerprintHash).not.toBe(baseline.fingerprintHash);
  });

  it("changes the fingerprint hash when delegatedBy changes", () => {
    const baseline = createAgencyFingerprint(createInput());
    const changed = createAgencyFingerprint({ ...createInput(), delegatedBy: "org-board" });

    expect(changed.fingerprintHash).not.toBe(baseline.fingerprintHash);
  });

  it("changes the fingerprint hash when actionHash changes", () => {
    const baseline = createAgencyFingerprint(createInput());
    const changed = createAgencyFingerprint({ ...createInput(), actionHash: "hash:action-2" });

    expect(changed.fingerprintHash).not.toBe(baseline.fingerprintHash);
  });

  it("fails validation when delegatedBy is missing", () => {
    const fingerprint = createAgencyFingerprint({
      ...createInput(),
      delegatedBy: undefined
    } as unknown as AgencyFingerprintInput);

    expect(verifyAgencyFingerprint(fingerprint)).toMatchObject({
      valid: false,
      errors: expect.arrayContaining(["delegatedBy is required."])
    });
  });

  it("fails validation when agentId is missing", () => {
    const fingerprint = createAgencyFingerprint({
      ...createInput(),
      agentId: undefined
    } as unknown as AgencyFingerprintInput);

    expect(verifyAgencyFingerprint(fingerprint)).toMatchObject({
      valid: false,
      errors: expect.arrayContaining(["agentId is required."])
    });
  });

  it("fails validation when actionHash is missing", () => {
    const fingerprint = createAgencyFingerprint({
      ...createInput(),
      actionHash: undefined
    } as unknown as AgencyFingerprintInput);

    expect(verifyAgencyFingerprint(fingerprint)).toMatchObject({
      valid: false,
      errors: expect.arrayContaining(["actionHash is required."])
    });
  });

  it("fails validation when subjectHumanId and subjectOrganizationId are missing", () => {
    const fingerprint = createAgencyFingerprint({
      ...createInput(),
      subjectHumanId: undefined,
      subjectOrganizationId: undefined
    } as unknown as AgencyFingerprintInput);

    expect(verifyAgencyFingerprint(fingerprint)).toMatchObject({
      valid: false,
      errors: expect.arrayContaining([
        "At least one of subjectHumanId or subjectOrganizationId is required."
      ])
    });
  });

  it("passes chain validation for linked fingerprints", () => {
    const first = createAgencyFingerprint(createInput());
    const second = linkAgencyFingerprint(first, {
      ...createInput(),
      actionHash: "hash:second-action",
      timestamp: "2026-05-26T12:01:00.000Z"
    });

    expect(validateAgencyFingerprintChain([first, second])).toMatchObject({
      valid: true,
      errors: []
    });
  });

  it("fails chain validation when previousFingerprintHash is tampered", () => {
    const first = createAgencyFingerprint(createInput());
    const second = linkAgencyFingerprint(first, {
      ...createInput(),
      actionHash: "hash:second-action",
      timestamp: "2026-05-26T12:01:00.000Z"
    });
    const tampered = {
      ...second,
      previousFingerprintHash: "hash:tampered"
    };

    expect(validateAgencyFingerprintChain([first, tampered])).toMatchObject({
      valid: false,
      errors: expect.arrayContaining([
        "fingerprint[1]: previousFingerprintHash does not match fingerprint[0].fingerprintHash."
      ])
    });
  });

  it("warns when runtimePermitHash is present without aagDecisionHash", () => {
    const { aagDecisionHash: _aagDecisionHash, ...inputWithoutAagDecision } = createInput();
    const fingerprint = createAgencyFingerprint({
      ...inputWithoutAagDecision,
      runtimePermitHash: "hash:runtime-permit"
    });

    expect(verifyAgencyFingerprint(fingerprint)).toMatchObject({
      valid: true,
      warnings: expect.arrayContaining(["runtimePermitHash is present without aagDecisionHash."])
    });
  });

  it("warns when approvalRecordHash is present without authorityMapHash", () => {
    const { authorityMapHash: _authorityMapHash, ...inputWithoutAuthorityMap } = createInput();
    const fingerprint = createAgencyFingerprint({
      ...inputWithoutAuthorityMap,
      approvalRecordHash: "hash:approval-record"
    });

    expect(verifyAgencyFingerprint(fingerprint)).toMatchObject({
      valid: true,
      warnings: expect.arrayContaining(["approvalRecordHash is present without authorityMapHash."])
    });
  });
});

function createInput(): AgencyFingerprintInput {
  return {
    subjectHumanId: "human-founder-001",
    subjectOrganizationId: "org-ags-labs",
    delegatedBy: "human-founder-001",
    agentId: "research-agent-1",
    agentRole: "research",
    workflowId: "workflow-market-map",
    workflowScopeHash: "hash:workflow-scope",
    authorityMapHash: "hash:authority-map",
    policyProfileHash: "hash:policy-profile",
    pgdlPacketHash: "hash:pgdl-packet",
    aagDecisionHash: "hash:aag-decision",
    approvalRecordHash: "hash:approval-record",
    runtimePermitHash: "hash:runtime-permit",
    actionHash: "hash:action-1",
    targetHash: "hash:target-1",
    environment: "staging",
    timestamp: "2026-05-26T12:00:00.000Z",
    metadata: {
      source: "unit-test"
    }
  };
}
