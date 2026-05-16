import { describe, expect, it } from "vitest";
import {
  canonicalizeDecisionClosureArtifact,
  createDecisionClosureArtifact,
  hashDecisionClosureArtifact,
  renderDecisionClosureArtifactMarkdown,
  summarizeDecisionClosureArtifact,
  validateDecisionClosureArtifact,
  type DecisionClosureArtifactInput
} from "../index.js";

const prohibitedPattern = /\b(fake|fraud|scam|illegal|lying|negligent)\b/i;

describe("Decision Closure Artifact", () => {
  it("creates an allowed closure artifact with a deterministic canonical hash", () => {
    const first = createDecisionClosureArtifact(allowedInput());
    const second = createDecisionClosureArtifact({
      ...allowedInput(),
      proof: { previousReceiptHash: "prev", receiptHash: "receipt" }
    });

    expect(first.artifactType).toBe("decision_closure");
    expect(first.artifactVersion).toBe("1.0");
    expect(first.proof.canonicalHash).toMatch(/^[a-f0-9]{64}$/);
    expect(second.proof.canonicalHash).toBe(first.proof.canonicalHash);
    expect(hashDecisionClosureArtifact(first)).toBe(first.proof.canonicalHash);
  });

  it("canonicalizes equivalent artifacts consistently", () => {
    const artifact = createDecisionClosureArtifact(allowedInput());

    expect(canonicalizeDecisionClosureArtifact(artifact)).toBe(canonicalizeDecisionClosureArtifact(artifact));
  });

  it("validates a low-risk unsigned allowed artifact as valid", () => {
    const artifact = createDecisionClosureArtifact(allowedInput());
    const validation = validateDecisionClosureArtifact(artifact);

    expect(validation.valid).toBe(true);
    expect(validation.severity).toBe("low");
    expect(validation.findings.some((finding) => finding.id === "DCA-009")).toBe(true);
  });

  it("detects missing runtime permit evidence", () => {
    const {
      runtimePermitId: _runtimePermitId,
      runtimeBindingHash: _runtimeBindingHash,
      ...boundaryWithoutPermit
    } = allowedInput().executionBoundary;
    const artifact = createDecisionClosureArtifact({
      ...allowedInput(),
      executionBoundary: {
        ...boundaryWithoutPermit,
        runtimePermitRequired: true
      },
      decision: {
        ...allowedInput().decision,
        outcome: "require_approval"
      },
      proof: {}
    });
    const validation = validateDecisionClosureArtifact(artifact);

    expect(validation.valid).toBe(false);
    expect(validation.findings.some((finding) => finding.id === "DCA-003" && finding.severity === "high")).toBe(true);
  });

  it("detects hard boundary present with allow decision", () => {
    const artifact = createDecisionClosureArtifact({
      ...allowedInput(),
      decision: {
        ...allowedInput().decision,
        hardBoundaryIds: ["never_claim_regulator_ready"]
      }
    });
    const validation = validateDecisionClosureArtifact(artifact);

    expect(validation.severity).toBe("critical");
    expect(validation.findings.some((finding) => finding.id === "DCA-011")).toBe(true);
  });

  it("detects weak human participation", () => {
    const artifact = createDecisionClosureArtifact({
      ...allowedInput(),
      decision: {
        ...allowedInput().decision,
        humanParticipationQuality: "weak"
      }
    });
    const validation = validateDecisionClosureArtifact(artifact);

    expect(validation.findings.some((finding) => finding.id === "DCA-015")).toBe(true);
  });

  it("renders Markdown with required sections", () => {
    const artifact = createDecisionClosureArtifact(allowedInput());
    const validation = validateDecisionClosureArtifact(artifact);
    const markdown = renderDecisionClosureArtifactMarkdown(artifact, validation);

    expect(markdown).toContain("# Decision Closure Artifact");
    expect(markdown).toContain("## Executive Summary");
    expect(markdown).toContain("## Execution Boundary");
    expect(markdown).toContain("## Machine-Readable Artifact");
    expect(markdown).not.toMatch(prohibitedPattern);
  });

  it("summarizes without prohibited language", () => {
    const artifact = createDecisionClosureArtifact(allowedInput());
    const summary = summarizeDecisionClosureArtifact(artifact, validateDecisionClosureArtifact(artifact));

    expect(summary).toContain("AGS Decision Closure Artifact");
    expect(summary).not.toMatch(prohibitedPattern);
  });
});

function allowedInput(): DecisionClosureArtifactInput {
  return {
    artifactId: "dca-test-allowed",
    createdAt: "2026-05-16T10:00:00.000Z",
    action: {
      actionId: "action-1",
      actionType: "publish_blog_post",
      summary: "Publish the reviewed AGS release note to the approved public blog target.",
      toolName: "blog.publish",
      target: "public_blog/ags_release_note",
      proposedByAgentId: "content-agent",
      sensitivity: "medium",
      reversibility: "partially_reversible"
    },
    executionBoundary: {
      boundaryId: "boundary-1",
      boundaryType: "external_public_publish",
      reachedAt: "2026-05-16T10:00:02.000Z",
      runtimePermitRequired: true,
      runtimePermitId: "permit-1",
      runtimeBindingHash: "runtime-binding-hash"
    },
    authority: {
      authoritySource: "authority_map",
      authorityId: "public-claim-reviewer",
      authorityName: "Public Claim Reviewer",
      reviewerId: "reviewer-1",
      reviewerRole: "public_claim_reviewer",
      authorityValid: true,
      authorityReason: "Reviewer approved this exact target and scope."
    },
    decision: {
      outcome: "allow",
      reason: "Action is reviewed, target-bound, permit-bound, and receipt-backed.",
      ruleIds: ["public_claim_review_required"],
      policyProfileId: "policy-1",
      hardBoundaryIds: [],
      humanReviewRequired: true,
      humanReviewPresent: true,
      humanParticipationQuality: "strong"
    },
    conditions: {
      scope: "Only the approved public blog target is allowed.",
      expiresAt: "2026-05-17T10:00:00.000Z",
      allowedTools: ["blog.publish"],
      allowedTargets: ["public_blog/ags_release_note"],
      prohibitedTargets: ["linkedin/ags_release_note"],
      notes: ["Target-specific approval."]
    },
    proof: {
      receiptHash: "receipt",
      previousReceiptHash: "prev"
    },
    auditSummary: {
      readableWithoutSystemAccess: true,
      summary: "The reviewed action is allowed for one target with authority and proof evidence.",
      unresolvedQuestions: [],
      theaterSignals: [],
      remediationHints: []
    }
  };
}
