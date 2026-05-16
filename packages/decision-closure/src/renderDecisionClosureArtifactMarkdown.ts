import type { DecisionClosureArtifact, DecisionClosureValidationResult } from "./types.js";

export function renderDecisionClosureArtifactMarkdown(
  artifact: DecisionClosureArtifact,
  validation: DecisionClosureValidationResult
): string {
  const lines: string[] = [
    "# Decision Closure Artifact",
    "",
    "## Executive Summary",
    "",
    artifact.auditSummary.summary,
    "",
    "This artifact is intended to be readable by a third party without reconstructing internal logs. It binds the action, authority, decision, conditions, and integrity evidence available at the execution boundary.",
    "",
    "## Action",
    "",
    `- Action ID: ${artifact.action.actionId}`,
    `- Action type: ${artifact.action.actionType}`,
    `- Summary: ${artifact.action.summary}`,
    `- Tool: ${artifact.action.toolName}`,
    `- Target: ${artifact.action.target}`,
    `- Proposed by agent: ${artifact.action.proposedByAgentId ?? "not supplied"}`,
    `- Sensitivity: ${artifact.action.sensitivity}`,
    `- Reversibility: ${artifact.action.reversibility}`,
    "",
    "## Execution Boundary",
    "",
    `- Boundary ID: ${artifact.executionBoundary.boundaryId}`,
    `- Boundary type: ${artifact.executionBoundary.boundaryType}`,
    `- Reached at: ${artifact.executionBoundary.reachedAt}`,
    `- Runtime permit required: ${artifact.executionBoundary.runtimePermitRequired}`,
    `- Runtime permit ID: ${artifact.executionBoundary.runtimePermitId ?? "not supplied"}`,
    `- Runtime binding hash: ${artifact.executionBoundary.runtimeBindingHash ?? "not supplied"}`,
    "",
    "## Authority",
    "",
    `- Authority source: ${artifact.authority.authoritySource}`,
    `- Authority ID: ${artifact.authority.authorityId ?? "not supplied"}`,
    `- Authority name: ${artifact.authority.authorityName ?? "not supplied"}`,
    `- Reviewer ID: ${artifact.authority.reviewerId ?? "not supplied"}`,
    `- Reviewer role: ${artifact.authority.reviewerRole ?? "not supplied"}`,
    `- Authority valid: ${artifact.authority.authorityValid}`,
    `- Authority reason: ${artifact.authority.authorityReason}`,
    "",
    "## Decision",
    "",
    `- Outcome: ${artifact.decision.outcome}`,
    `- Reason: ${artifact.decision.reason}`,
    `- Rule IDs: ${formatList(artifact.decision.ruleIds)}`,
    `- Policy profile ID: ${artifact.decision.policyProfileId ?? "not supplied"}`,
    `- Hard boundary IDs: ${formatList(artifact.decision.hardBoundaryIds ?? [])}`,
    `- Human review required: ${artifact.decision.humanReviewRequired}`,
    `- Human review present: ${artifact.decision.humanReviewPresent}`,
    `- Human participation quality: ${artifact.decision.humanParticipationQuality ?? "unknown"}`,
    "",
    "## Conditions",
    "",
    `- Scope: ${artifact.conditions.scope}`,
    `- Expires at: ${artifact.conditions.expiresAt ?? "not supplied"}`,
    `- Allowed tools: ${formatList(artifact.conditions.allowedTools ?? [])}`,
    `- Allowed targets: ${formatList(artifact.conditions.allowedTargets ?? [])}`,
    `- Prohibited targets: ${formatList(artifact.conditions.prohibitedTargets ?? [])}`,
    `- Notes: ${formatList(artifact.conditions.notes ?? [])}`,
    "",
    "## Proof",
    "",
    `- Receipt hash: ${artifact.proof.receiptHash ?? "not supplied"}`,
    `- Previous receipt hash: ${artifact.proof.previousReceiptHash ?? "not supplied"}`,
    `- Signature: ${artifact.proof.signature ?? "not supplied"}`,
    `- Signature algorithm: ${artifact.proof.signatureAlgorithm ?? "not supplied"}`,
    `- Canonical hash: ${artifact.proof.canonicalHash}`,
    `- Integrity status: ${artifact.proof.integrityStatus}`,
    "",
    "The canonical hash excludes mutable proof fields `proof.canonicalHash`, `proof.signature`, and `proof.integrityStatus`; it includes the remaining artifact contents using stable key ordering.",
    "",
    "## Findings",
    ""
  ];

  if (validation.findings.length === 0) {
    lines.push("No validation findings were produced.");
  } else {
    for (const finding of validation.findings) {
      lines.push(`### ${finding.id} - ${finding.title}`);
      lines.push("");
      lines.push(`- Severity: ${finding.severity}`);
      lines.push(`- Evidence path: ${finding.evidencePath}`);
      lines.push(`- Explanation: ${finding.explanation}`);
      lines.push(`- Audit question: ${finding.auditQuestion}`);
      lines.push(`- Remediation: ${finding.remediation}`);
      lines.push("");
    }
  }

  lines.push("## Audit Questions");
  lines.push("");
  const auditQuestions = validation.findings.map((finding) => finding.auditQuestion);
  for (const question of [...artifact.auditSummary.unresolvedQuestions, ...auditQuestions]) {
    lines.push(`- ${question}`);
  }
  if (artifact.auditSummary.unresolvedQuestions.length === 0 && auditQuestions.length === 0) {
    lines.push("- No unresolved audit questions supplied.");
  }

  lines.push("");
  lines.push("## Remediation Hints");
  lines.push("");
  const remediationHints = validation.findings.map((finding) => finding.remediation);
  for (const hint of [...artifact.auditSummary.remediationHints, ...remediationHints]) {
    lines.push(`- ${hint}`);
  }
  if (artifact.auditSummary.remediationHints.length === 0 && remediationHints.length === 0) {
    lines.push("- No remediation hints supplied.");
  }

  lines.push("");
  lines.push("## Machine-Readable Artifact");
  lines.push("");
  lines.push("```json");
  lines.push(JSON.stringify(artifact, null, 2));
  lines.push("```");

  return `${lines.join("\n")}\n`;
}

function formatList(values: string[]): string {
  return values.length > 0 ? values.join(", ") : "none";
}

