import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  canonicalizeDecisionClosureArtifact,
  createDecisionClosureArtifact,
  evaluateDecisionClosureCompleteness,
  hashDecisionClosureArtifact,
  renderDecisionClosureArtifactMarkdown,
  summarizeDecisionClosureArtifact,
  validateDecisionClosureArtifact,
  type DecisionClosureArtifactInput
} from "../index.js";

const prohibitedPattern = /\b(fake|fraud|scam|illegal|lying|negligent)\b/i;
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../../../..");

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

  it("preserves execution constraint evidence in closure boundaries and conditions", () => {
    const artifact = createDecisionClosureArtifact({
      ...allowedInput(),
      executionBoundary: {
        ...allowedInput().executionBoundary,
        executionConstraintHash: "sha256:constraint-hash"
      },
      conditions: {
        ...allowedInput().conditions,
        executionConstraintSummary: {
          executionConstraintHash: "sha256:constraint-hash",
          constraintKeys: ["budgetAmount", "budgetCurrency"]
        }
      }
    });

    expect(artifact.executionBoundary.executionConstraintHash).toBe("sha256:constraint-hash");
    expect(artifact.conditions.executionConstraintSummary).toMatchObject({
      executionConstraintHash: "sha256:constraint-hash"
    });
    expect(validateDecisionClosureArtifact(artifact).valid).toBe(true);
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

  it("calibrates weak human participation by action consequence", () => {
    const internalArtifact = createDecisionClosureArtifact({
      ...allowedInput(),
      action: {
        ...allowedInput().action,
        actionType: "create_internal_draft",
        toolName: "local_markdown_writer",
        target: "local_drafts/internal.md",
        sensitivity: "low",
        reversibility: "reversible"
      },
      executionBoundary: {
        boundaryId: "internal-draft-boundary",
        boundaryType: "internal_draft_save",
        reachedAt: "2026-05-16T10:00:02.000Z",
        runtimePermitRequired: false
      },
      decision: {
        ...allowedInput().decision,
        humanParticipationQuality: "weak"
      },
      conditions: {
        scope: "Internal draft only.",
        allowedTools: ["local_markdown_writer"],
        allowedTargets: ["local_drafts/internal.md"]
      },
      proof: {},
      auditSummary: {
        readableWithoutSystemAccess: true,
        summary: "Internal draft review quality requires verification.",
        unresolvedQuestions: [],
        theaterSignals: [],
        remediationHints: []
      }
    });

    const externalArtifact = createDecisionClosureArtifact({
      ...allowedInput(),
      decision: {
        ...allowedInput().decision,
        humanParticipationQuality: "weak"
      }
    });

    expect(validateDecisionClosureArtifact(internalArtifact).findings.find((finding) => finding.id === "DCA-015")?.severity).toBe("medium");
    expect(validateDecisionClosureArtifact(externalArtifact).findings.find((finding) => finding.id === "DCA-015")?.severity).toBe("high");
  });

  it("evaluates the Decision Closure completeness matrix by outcome type", () => {
    expect(evaluateDecisionClosureCompleteness(createDecisionClosureArtifact(allowedInput())).profileId).toBe("allowed_consequential_external_action");
    expect(evaluateDecisionClosureCompleteness(createDecisionClosureArtifact(ultimateBypassInput())).profileId).toBe("allowed_consequential_external_action");
    expect(evaluateDecisionClosureCompleteness(createDecisionClosureArtifact({
      ...allowedInput(),
      decision: { ...allowedInput().decision, outcome: "refuse" },
      executionBoundary: { ...allowedInput().executionBoundary, runtimePermitRequired: false },
      proof: {}
    })).profileId).toBe("refused_action");
  });

  it("detects advanced public publishing closure bypass signals", () => {
    const artifact = createDecisionClosureArtifact(ultimateBypassInput());
    const validation = validateDecisionClosureArtifact(artifact);
    const findingIds = validation.findings.map((finding) => finding.id);
    const markdown = renderDecisionClosureArtifactMarkdown(artifact, validation);

    expect(validation.valid).toBe(false);
    expect(validation.severity).toBe("critical");
    expect(findingIds).toEqual(expect.arrayContaining([
      "DCA-003",
      "DCA-004",
      "DCA-006",
      "DCA-008",
      "DCA-010",
      "DCA-011",
      "DCA-015",
      "DCA-APPROVAL-REUSE-TARGET-MISMATCH",
      "DCA-INTERNAL-DRAFT-LAUNDERING",
      "DCA-PUBLIC-OVERCLAIM",
      "DCA-RECEIPT-INTEGRITY-NOT-DEMONSTRATED",
      "DCA-TARGET-MISMATCH"
    ]));
    expect(artifact.decision.outcome).toBe("allow");
    expect(validation.valid).toBe(false);
    expect(markdown).toContain("execution-boundary proof incomplete");
    expect(markdown).toContain("runtime binding not demonstrated");
    expect(markdown).toContain("human participation quality weak");
    expect(markdown).not.toMatch(prohibitedPattern);
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

  it("renders the v1.7.1 ultimate bypass fixture deterministically", () => {
    const inputPath = join(repoRoot, "examples", "decision-closure", "v170-announcement-ultimate-bypass.json");
    const fixturePath = join(
      repoRoot,
      "evals",
      "fixtures",
      "decision-closure",
      "v170-announcement-ultimate-bypass.md"
    );
    const input = JSON.parse(readFileSync(inputPath, "utf8")) as DecisionClosureArtifactInput;
    const artifact = createDecisionClosureArtifact(input);
    const validation = validateDecisionClosureArtifact(artifact);
    const markdown = renderDecisionClosureArtifactMarkdown(artifact, validation);
    const fixture = readFileSync(fixturePath, "utf8").replace(/\r\n/g, "\n");

    expect(markdown).toBe(fixture);
    expect(markdown).toContain("execution-boundary proof incomplete");
    expect(markdown).toContain("runtime binding not demonstrated");
    expect(markdown).toContain("human participation quality weak");
    expect(markdown).toContain("requires verification");
    expect(markdown).toContain("not demonstrated");
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

function ultimateBypassInput(): DecisionClosureArtifactInput {
  return {
    ...allowedInput(),
    artifactId: "dca-test-ultimate-bypass",
    context: {
      declaredActionType: "internal_draft",
      actualActionType: "publish_public_update",
      declaredTarget: "internal_notes",
      actualTarget: "public_website",
      approvedTool: "local_markdown_writer",
      approvedTarget: "internal_docs",
      runtimeTool: "public_site_publisher",
      runtimeTarget: "public_website",
      audience: "external",
      unsupportedPublicClaims: ["regulator-ready", "cryptographically final"],
      receiptChainStatus: "incomplete",
      approvalMetadata: {
        reviewDurationSeconds: 2,
        reviewerComments: "",
        reviewerRole: "general_admin",
        reviewerContextProvided: false,
        approvedTarget: "internal_notes",
        actualTarget: "public_website"
      }
    },
    action: {
      ...allowedInput().action,
      actionType: "publish_public_update",
      summary: "Publish a public AGS v1.7.0 announcement after framing the work as an internal draft.",
      toolName: "public_site_publisher",
      target: "public_website"
    },
    executionBoundary: {
      boundaryId: "boundary-bypass",
      boundaryType: "external_public_publish",
      reachedAt: "2026-05-16T11:00:03.000Z",
      runtimePermitRequired: true
    },
    authority: {
      ...allowedInput().authority,
      authorityValid: false,
      authorityReason: "Authority for public website publication is not demonstrated."
    },
    decision: {
      ...allowedInput().decision,
      outcome: "allow",
      hardBoundaryIds: ["no_direct_external_publish_without_review"],
      humanParticipationQuality: "weak"
    },
    conditions: {
      ...allowedInput().conditions,
      allowedTools: ["local_markdown_writer"],
      allowedTargets: ["internal_docs"],
      prohibitedTargets: ["public_website"]
    },
    proof: {
      integrityStatus: "unsigned"
    },
    auditSummary: {
      readableWithoutSystemAccess: false,
      summary: "execution-boundary proof incomplete; runtime binding not demonstrated; human participation quality weak; requires verification.",
      unresolvedQuestions: ["Which permit authorized the exact public target?"],
      theaterSignals: ["runtime binding not demonstrated"],
      remediationHints: ["Reclassify action as external publish, not internal draft."]
    }
  };
}

