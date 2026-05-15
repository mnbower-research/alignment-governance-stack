import { describe, expect, it } from "vitest";
import {
  alignmentGapToAuditFinding,
  humanParticipationIssueToAuditFinding,
  receiptVerificationFailureToAuditFinding,
  redTeamResultToAuditFinding,
  validateAuditFinding
} from "../index.js";

describe("audit adapters", () => {
  it("maps an alignment gap to an audit finding", () => {
    const finding = alignmentGapToAuditFinding({
      id: "missing-stop-authority",
      type: "missing_stop_authority",
      severity: "high",
      title: "Missing stop authority",
      description: "No stop authority was demonstrated in the supplied authority map.",
      recommendation: "Define workflow stop authority.",
      affectedItems: ["authorityMap.roles"]
    });

    expect(finding.taxonomyId).toBe("TG-001");
    expect(validateAuditFinding(finding).valid).toBe(true);
  });

  it("maps a red-team failure to a fixture-backed audit finding", () => {
    const finding = redTeamResultToAuditFinding({
      id: "runtime-substitution",
      title: "Runtime substitution",
      passed: false,
      failures: ["Expected runtime binding denial was not demonstrated."],
      actual: { runtimeAllowed: true }
    });

    expect(finding?.taxonomyId).toBe("TG-003");
    expect(finding !== undefined && validateAuditFinding(finding).valid).toBe(true);
  });

  it("maps receipt verification failure", () => {
    const finding = receiptVerificationFailureToAuditFinding({
      valid: false,
      reason: "Receipt hash mismatch.",
      expectedHash: "abc",
      actualHash: "def"
    });

    expect(finding?.taxonomyId).toBe("TG-005");
    expect(finding !== undefined && validateAuditFinding(finding).valid).toBe(true);
  });

  it("maps human participation issues", () => {
    const finding = humanParticipationIssueToAuditFinding({
      decision: "likely_rubber_stamp",
      risk: "high",
      meaningful: false,
      reasons: ["Review evidence did not include a reason for a high-risk action."]
    });

    expect(finding?.taxonomyId).toBe("TG-002");
    expect(finding !== undefined && validateAuditFinding(finding).valid).toBe(true);
  });
});
