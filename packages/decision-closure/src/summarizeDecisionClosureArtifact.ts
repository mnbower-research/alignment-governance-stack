import type { DecisionClosureArtifact, DecisionClosureValidationResult } from "./types.js";

export function summarizeDecisionClosureArtifact(
  artifact: DecisionClosureArtifact,
  validation?: DecisionClosureValidationResult
): string {
  const findings = validation?.findings ?? [];
  const lines = [
    "AGS Decision Closure Artifact",
    "",
    `artifactId: ${artifact.artifactId}`,
    `createdAt: ${artifact.createdAt}`,
    `outcome: ${artifact.decision.outcome}`,
    `action: ${artifact.action.summary}`,
    `tool: ${artifact.action.toolName}`,
    `target: ${artifact.action.target}`,
    `boundary: ${artifact.executionBoundary.boundaryType} (${artifact.executionBoundary.boundaryId})`,
    `authorityValid: ${artifact.authority.authorityValid}`,
    `canonicalHash: ${artifact.proof.canonicalHash}`,
    `integrityStatus: ${artifact.proof.integrityStatus}`,
    `thirdPartyReadable: ${artifact.auditSummary.readableWithoutSystemAccess}`,
    "",
    "Findings:"
  ];

  if (findings.length === 0) {
    lines.push("- none");
  } else {
    for (const finding of findings) {
      lines.push(`- ${finding.id}: ${finding.title} [${finding.severity}]`);
      lines.push(`  audit question: ${finding.auditQuestion}`);
      lines.push(`  remediation: ${finding.remediation}`);
    }
  }

  lines.push("");
  lines.push("Note: A Decision Closure Artifact is intended to be readable by a third party without reconstructing internal logs.");

  return `${lines.join("\n")}\n`;
}

