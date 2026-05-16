import { hashDecisionClosureArtifact } from "./hashDecisionClosureArtifact.js";
import type {
  DecisionClosureArtifact,
  DecisionClosureFindingSeverity,
  DecisionClosureValidationFinding,
  DecisionClosureValidationResult
} from "./types.js";

const severityRank: Record<DecisionClosureFindingSeverity, number> = {
  info: 0,
  low: 1,
  medium: 2,
  high: 3,
  critical: 4
};

const outcomes = new Set(["allow", "escalate", "refuse", "revise_action", "require_approval", "block"]);

export function validateDecisionClosureArtifact(artifact: unknown): DecisionClosureValidationResult {
  const findings: DecisionClosureValidationFinding[] = [];

  if (!isRecord(artifact)) {
    findings.push(finding("DCA-SCHEMA-001", "Artifact object missing", "critical", "$", "The decision closure artifact is not an object.", "What artifact was produced at the execution boundary?", "Provide a JSON object with artifact, action, boundary, authority, decision, conditions, proof, and audit summary sections."));
    return result(findings);
  }

  if (artifact.artifactType !== "decision_closure") {
    findings.push(finding("DCA-SCHEMA-002", "Artifact type not demonstrated", "critical", "$.artifactType", "The artifact type is not decision_closure.", "Is this object intended to be a Decision Closure Artifact?", "Set artifactType to decision_closure."));
  }

  if (artifact.artifactVersion !== "1.0") {
    findings.push(finding("DCA-SCHEMA-003", "Artifact version not demonstrated", "medium", "$.artifactVersion", "The artifact version is not 1.0.", "Which Decision Closure Artifact version should a reviewer use?", "Set artifactVersion to 1.0 for this release."));
  }

  const action = getRecord(artifact, "action");
  const boundary = getRecord(artifact, "executionBoundary");
  const authority = getRecord(artifact, "authority");
  const context = getRecord(artifact, "context");
  const decision = getRecord(artifact, "decision");
  const conditions = getRecord(artifact, "conditions");
  const proof = getRecord(artifact, "proof");
  const auditSummary = getRecord(artifact, "auditSummary");
  const allowDecision = decision?.outcome === "allow";
  const externalContext = isExternalContext(action, boundary, context);
  const consequentialContext = isConsequentialContext(action, boundary, context);

  if (action === undefined || typeof action.summary !== "string" || action.summary.trim().length === 0) {
    findings.push(finding("DCA-001", "Action summary not demonstrated", "high", "$.action.summary", "The artifact does not include a readable action summary.", "What action was about to cross the execution boundary?", "Add a concise third-party-readable action summary."));
  }

  if (boundary === undefined) {
    findings.push(finding("DCA-002", "Execution boundary not demonstrated", "critical", "$.executionBoundary", "The artifact does not include execution-boundary proof.", "Where did the action reach a consequential execution boundary?", "Add boundary ID, boundary type, reached-at time, and runtime permit requirement."));
  } else {
    if (boundary.runtimePermitRequired === true && missingString(boundary.runtimePermitId)) {
      findings.push(finding("DCA-003", "Runtime permit required but not demonstrated", "high", "$.executionBoundary.runtimePermitId", "The artifact says a runtime permit is required, but no runtime permit ID is present.", "Which permit authorized this exact action at the execution boundary?", "Attach a scoped runtime permit ID or change the decision to require approval, refuse, block, or escalate."));
    }

    if ((boundary.runtimePermitRequired === true || !missingString(boundary.runtimePermitId)) && missingString(boundary.runtimeBindingHash)) {
      findings.push(finding("DCA-004", "Runtime binding hash not demonstrated", "high", "$.executionBoundary.runtimeBindingHash", "A runtime permit is required or present, but runtime binding hash evidence is not demonstrated.", "What hash binds the runtime action to the permit?", "Attach the runtime binding hash generated for this action and permit."));
    }
  }

  if (decision === undefined || typeof decision.outcome !== "string" || !outcomes.has(decision.outcome)) {
    findings.push(finding("DCA-007", "Decision outcome not demonstrated", "critical", "$.decision.outcome", "The artifact does not include a recognized decision outcome.", "Was the action allowed, escalated, refused, revised, approval-gated, or blocked?", "Set decision.outcome to allow, escalate, refuse, revise_action, require_approval, or block."));
  }

  if (decision?.humanReviewRequired === true && decision.humanReviewPresent !== true) {
    findings.push(finding("DCA-005", "Human review required but not demonstrated", "high", "$.decision.humanReviewPresent", "Human review is required, but the artifact does not demonstrate review was present.", "Who reviewed this action before the execution boundary?", "Attach human review evidence or change the outcome to require approval, escalate, refuse, or block."));
  }

  if (decision?.humanReviewRequired === true && decision.humanReviewPresent === true && decision.humanParticipationQuality === "weak") {
    const severity = consequentialContext ? "high" : "medium";
    findings.push(finding("DCA-015", "Human participation quality weak", severity, "$.decision.humanParticipationQuality", "Human review is present, but participation quality is weak and requires verification.", "Could the reviewer refuse, revise, halt, or escalate after receiving adequate context?", "Require reviewer context, review duration threshold when supported, reviewer comment or explicit rationale, and authority match."));
  }

  if (authority !== undefined && authority.authorityValid !== true) {
    const severity = allowDecision && externalContext ? "critical" : "high";
    findings.push(finding("DCA-006", "Authority validity not demonstrated", severity, "$.authority.authorityValid", "The artifact indicates authority was not valid or not demonstrated.", "Which authority source allowed, refused, escalated, or blocked the action?", "Provide valid authority evidence or keep the decision in review, escalation, refusal, or block state."));
  }

  if (allowDecision && consequentialContext && (proof === undefined || missingString(proof.receiptHash))) {
    findings.push(finding("DCA-008", "Receipt hash missing for allowed action", "high", "$.proof.receiptHash", "The artifact allows execution but does not demonstrate a receipt hash.", "What receipt preserves the decision and execution-boundary evidence?", "Attach the governance receipt hash before treating the allow decision as complete."));
  }

  if (proof === undefined || proof.integrityStatus === "unsigned" || proof.integrityStatus === "unknown" || missingString(proof.signature)) {
    findings.push(finding("DCA-009", "Artifact is unsigned", "low", "$.proof.signature", "The artifact is unsigned; integrity rests on the canonical hash only.", "Is a signature required for this review context?", "Treat unsigned artifacts as hash-bound but not signature-verified, or add signature support when required."));
  }

  if (proof !== undefined && (proof.integrityStatus === "invalid" || proof.integrityStatus === "unknown")) {
    const severity = allowDecision && consequentialContext ? "critical" : "high";
    findings.push(finding("DCA-RECEIPT-INTEGRITY-NOT-DEMONSTRATED", "Receipt integrity not demonstrated", severity, "$.proof.integrityStatus", "Receipt integrity is not demonstrated for this closure artifact.", "Which receipt or proof chain supports this closure?", "Add hash-bound or signed receipt evidence when signing exists, and preserve previous receipt hash if a chain exists."));
  }

  if (auditSummary === undefined || auditSummary.readableWithoutSystemAccess !== true || missingString(auditSummary.summary)) {
    findings.push(finding("DCA-010", "Third-party readability not demonstrated", "high", "$.auditSummary", "The artifact is not readable without reconstructing system logs.", "Can a third-party reviewer understand the closure without internal system access?", "Add a readable audit summary and set readableWithoutSystemAccess to true when supported."));
  }

  if (decision?.outcome === "allow" && Array.isArray(decision.hardBoundaryIds) && decision.hardBoundaryIds.length > 0) {
    findings.push(finding("DCA-011", "Hard boundary present with allow decision", "critical", "$.decision.hardBoundaryIds", "A hard boundary is present, but the decision outcome is allow.", "Why was execution allowed when a hard boundary was recorded?", "Change the outcome to block, refuse, revise_action, require_approval, or remove the hard boundary only if evidence supports removal."));
  }

  if (conditions !== undefined && action !== undefined) {
    if (allowDecision && Array.isArray(conditions.allowedTargets) && typeof action.target === "string" && !conditions.allowedTargets.includes(action.target)) {
      findings.push(finding("DCA-013", "Action target not covered by allowed targets", "high", "$.conditions.allowedTargets", "The action target is not covered by the allowed target list.", "Was approval or permit scope reused for a different target?", "Require fresh governance for this target or update allowedTargets with supporting evidence."));
    }

    if (allowDecision && Array.isArray(conditions.prohibitedTargets) && typeof action.target === "string" && conditions.prohibitedTargets.includes(action.target)) {
      findings.push(finding("DCA-018", "Action target is prohibited by conditions", "critical", "$.conditions.prohibitedTargets", "The action target appears in prohibitedTargets.", "Why is the action targeting a prohibited target?", "Block or refuse the action unless conditions are corrected with review evidence."));
    }

    if (typeof conditions.expiresAt === "string" && typeof artifact.createdAt === "string" && new Date(conditions.expiresAt) < new Date(artifact.createdAt)) {
      findings.push(finding("DCA-014", "Decision conditions expired before artifact creation", "high", "$.conditions.expiresAt", "The decision conditions expired before the artifact was created.", "Was the decision still valid at the execution boundary?", "Issue fresh approval, permit, or closure conditions before execution."));
    }
  }

  if (context !== undefined) {
    const unsupportedClaims = Array.isArray(context.unsupportedPublicClaims)
      ? context.unsupportedPublicClaims.filter((claim) => typeof claim === "string" && claim.trim().length > 0)
      : [];
    if (unsupportedClaims.length > 0) {
      const severity = allowDecision && externalContext ? "high" : "medium";
      findings.push(finding("DCA-PUBLIC-OVERCLAIM", "Public claim support requires verification", severity, "$.context.unsupportedPublicClaims", "The closure context includes public claims that are not supported by the available evidence.", "Which evidence supports each public capability claim?", "Remove unsupported claim or mark it as unverified, link claim to evidence if available, and route external claims through human review."));
    }

    if (isInternalDraftLaundering(context)) {
      const severity = allowDecision && externalContext ? "critical" : "high";
      findings.push(finding("DCA-INTERNAL-DRAFT-LAUNDERING", "Internal draft boundary not demonstrated", severity, "$.context", "The declared draft framing does not match the external publishing context.", "Is this action an internal draft or an external publish attempt?", "Reclassify action as external publish when target or audience is external, and require fresh review for the external action."));
    }

    if (isApprovalReuseMismatch(context)) {
      findings.push(finding("DCA-APPROVAL-REUSE-TARGET-MISMATCH", "Approval reuse target mismatch", "high", "$.context", "Approval evidence appears scoped to a different tool or target than the runtime attempt.", "Was approval reused across a different tool, channel, or target?", "Require target-bound approval for the exact channel and audience, and expire approval after scoped use."));
      findings.push(finding("DCA-TARGET-MISMATCH", "Target-bound approval not demonstrated", "high", "$.context", "The runtime target does not match the approved target in the closure context.", "Which target was approved for execution?", "Require target-bound approval for exact channel and audience, and expire approval after scoped use."));
    }

    if (hasUncoveredSecondaryTarget(context, conditions)) {
      findings.push(finding("DCA-TARGET-MISMATCH", "Target-bound approval not demonstrated", "high", "$.context.secondaryRuntimeTarget", "A secondary runtime target is not covered by the allowed targets.", "Which targets were approved for execution?", "Require target-bound approval for exact channel and audience, and expire approval after scoped use."));
    }

    if (allowDecision && externalContext && (isRuntimeSubstitution(context) || hasUncoveredSecondaryTarget(context, conditions))) {
      findings.push(finding("DCA-RUNTIME-SUBSTITUTION", "Runtime substitution not demonstrated as authorized", "critical", "$.context", "The runtime tool or target differs from the approved tool or target.", "Does the runtime action match the approved permit exactly?", "Bind permit to exact tool, target, action type, content hash, and expiration window."));
    }

    if (hasContentHashMismatch(context)) {
      const severity = allowDecision && externalContext ? "critical" : "high";
      findings.push(finding("DCA-CONTENT-HASH-MISMATCH", "Content hash mismatch", severity, "$.context.metadata", "The runtime content hash differs from the approved content hash.", "Does the published content match the reviewed content?", "Bind approval and permit to the exact content hash and require fresh review when content changes."));
    }

    if (context.receiptChainStatus === "incomplete" || context.receiptChainStatus === "unknown") {
      const severity = allowDecision && consequentialContext ? "critical" : "medium";
      findings.push(finding("DCA-RECEIPT-INTEGRITY-NOT-DEMONSTRATED", "Receipt integrity not demonstrated", severity, "$.context.receiptChainStatus", "The receipt chain is incomplete or requires verification.", "Can a reviewer follow the proof chain without reconstructing internal logs?", "Add hash-bound or signed receipt if signing exists, and preserve previous receipt hash if a chain exists."));
    }
  }

  if (proof !== undefined && typeof proof.canonicalHash === "string" && proof.canonicalHash.trim().length > 0 && isDecisionClosureArtifactShape(artifact)) {
    const expectedHash = hashDecisionClosureArtifact(artifact);
    if (proof.canonicalHash !== expectedHash) {
      findings.push(finding("DCA-017", "Canonical hash mismatch", "critical", "$.proof.canonicalHash", "The canonical hash does not match the artifact contents.", "Has the artifact changed since closure?", "Regenerate the closure artifact or investigate the integrity mismatch."));
    }
  }

  return result(findings);
}

function result(findings: DecisionClosureValidationFinding[]): DecisionClosureValidationResult {
  const severity = findings.reduce<DecisionClosureFindingSeverity>(
    (highest, entry) => severityRank[entry.severity] > severityRank[highest] ? entry.severity : highest,
    "info"
  );
  return {
    valid: severityRank[severity] < severityRank.high,
    severity,
    findings: findings.sort((left, right) => left.id.localeCompare(right.id))
  };
}

function finding(
  id: string,
  title: string,
  severity: DecisionClosureFindingSeverity,
  evidencePath: string,
  explanation: string,
  auditQuestion: string,
  remediation: string
): DecisionClosureValidationFinding {
  return { id, title, severity, evidencePath, explanation, auditQuestion, remediation };
}

function getRecord(value: Record<string, unknown>, key: string): Record<string, unknown> | undefined {
  const nested = value[key];
  return isRecord(nested) ? nested : undefined;
}

function missingString(value: unknown): boolean {
  return typeof value !== "string" || value.trim().length === 0;
}

function isInternalDraftLaundering(context: Record<string, unknown>): boolean {
  const declaredActionType = typeof context.declaredActionType === "string" ? context.declaredActionType : "";
  const actualActionType = typeof context.actualActionType === "string" ? context.actualActionType : "";
  const declaredTarget = typeof context.declaredTarget === "string" ? context.declaredTarget : "";
  const actualTarget = typeof context.actualTarget === "string" ? context.actualTarget : "";
  const audience = typeof context.audience === "string" ? context.audience : "";

  const declaredDraft = declaredActionType.includes("draft") || declaredTarget.includes("internal");
  const actualExternal =
    actualActionType.includes("publish") ||
    actualTarget.includes("public") ||
    audience === "external";

  return declaredDraft && actualExternal;
}

function isApprovalReuseMismatch(context: Record<string, unknown>): boolean {
  const approvedTool = typeof context.approvedTool === "string" ? context.approvedTool : undefined;
  const runtimeTool = typeof context.runtimeTool === "string" ? context.runtimeTool : undefined;
  const approvedTarget = typeof context.approvedTarget === "string" ? context.approvedTarget : undefined;
  const runtimeTarget = typeof context.runtimeTarget === "string" ? context.runtimeTarget : undefined;
  const approvalMetadata = getRecord(context, "approvalMetadata");
  const metadataApprovedTarget = typeof approvalMetadata?.approvedTarget === "string"
    ? approvalMetadata.approvedTarget
    : undefined;
  const metadataActualTarget = typeof approvalMetadata?.actualTarget === "string"
    ? approvalMetadata.actualTarget
    : undefined;

  return (
    (approvedTool !== undefined && runtimeTool !== undefined && approvedTool !== runtimeTool) ||
    (approvedTarget !== undefined && runtimeTarget !== undefined && approvedTarget !== runtimeTarget) ||
    (metadataApprovedTarget !== undefined && metadataActualTarget !== undefined && metadataApprovedTarget !== metadataActualTarget)
  );
}

function isRuntimeSubstitution(context: Record<string, unknown>): boolean {
  const approvedTool = typeof context.approvedTool === "string" ? context.approvedTool : undefined;
  const runtimeTool = typeof context.runtimeTool === "string" ? context.runtimeTool : undefined;
  const approvedTarget = typeof context.approvedTarget === "string" ? context.approvedTarget : undefined;
  const runtimeTarget = typeof context.runtimeTarget === "string" ? context.runtimeTarget : undefined;

  return (
    (approvedTool !== undefined && runtimeTool !== undefined && approvedTool !== runtimeTool) ||
    (approvedTarget !== undefined && runtimeTarget !== undefined && approvedTarget !== runtimeTarget)
  );
}

function hasUncoveredSecondaryTarget(
  context: Record<string, unknown>,
  conditions: Record<string, unknown> | undefined
): boolean {
  const secondaryRuntimeTarget = typeof context.secondaryRuntimeTarget === "string"
    ? context.secondaryRuntimeTarget
    : undefined;
  const allowedTargets = Array.isArray(conditions?.allowedTargets)
    ? conditions.allowedTargets.filter((value): value is string => typeof value === "string")
    : [];

  return secondaryRuntimeTarget !== undefined &&
    allowedTargets.length > 0 &&
    !allowedTargets.includes(secondaryRuntimeTarget);
}

function hasContentHashMismatch(context: Record<string, unknown>): boolean {
  const metadata = getRecord(context, "metadata");
  const approvedContentHash = typeof metadata?.approvedContentHash === "string"
    ? metadata.approvedContentHash
    : undefined;
  const runtimeContentHash = typeof metadata?.runtimeContentHash === "string"
    ? metadata.runtimeContentHash
    : undefined;

  return approvedContentHash !== undefined &&
    runtimeContentHash !== undefined &&
    approvedContentHash !== runtimeContentHash;
}

function isConsequentialContext(
  action: Record<string, unknown> | undefined,
  boundary: Record<string, unknown> | undefined,
  context: Record<string, unknown> | undefined
): boolean {
  return isExternalContext(action, boundary, context) ||
    action?.sensitivity === "high" ||
    action?.sensitivity === "critical" ||
    action?.reversibility === "irreversible";
}

function isExternalContext(
  action: Record<string, unknown> | undefined,
  boundary: Record<string, unknown> | undefined,
  context: Record<string, unknown> | undefined
): boolean {
  const values = [
    action?.actionType,
    action?.toolName,
    action?.target,
    boundary?.boundaryType,
    context?.actualActionType,
    context?.actualTarget,
    context?.runtimeTarget,
    context?.secondaryRuntimeTarget,
    context?.channel,
    context?.audience
  ].filter((value): value is string => typeof value === "string");

  return values.some((value) => /external|public|publish|linkedin|twitter|x\/|website|social|github_pages/i.test(value));
}

function isDecisionClosureArtifactShape(value: unknown): value is DecisionClosureArtifact {
  return isRecord(value) && value.artifactType === "decision_closure" && value.artifactVersion === "1.0";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
