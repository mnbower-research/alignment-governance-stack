import type { EffectiveAagConfig } from "./aagConfig";
import type { GateDecision } from "./types";

export type GovernanceChangeType =
  | "disable_aag"
  | "disable_receipts"
  | "unlock_policy"
  | "remove_lock_metadata"
  | "change_default_decision"
  | "weaken_approval_requirements"
  | "weaken_sensitive_action_rules"
  | "remove_detectors"
  | "add_broad_allowlist"
  | "reduce_audit_visibility"
  | "delete_receipt_directory"
  | "metadata_update";

export type GovernanceWeakening = {
  detector: "governanceWeakening";
  changeType: GovernanceChangeType;
  decision: GateDecision;
  message: string;
};

export type GovernanceCheckResult = {
  locked: boolean;
  decision: GateDecision;
  governanceChangeType: GovernanceChangeType;
  detectorsTriggered: string[];
  changes: string[];
  findings: GovernanceWeakening[];
};

export function checkGovernanceChange(
  previousConfig: EffectiveAagConfig,
  nextConfig: EffectiveAagConfig,
): GovernanceCheckResult {
  const locked = previousConfig.locked;
  const findings = locked
    ? detectLockedGovernanceWeakening(previousConfig, nextConfig)
    : [];
  const decision = getGovernanceDecision(findings);

  return {
    locked,
    decision,
    governanceChangeType: findings[0]?.changeType ?? "metadata_update",
    detectorsTriggered: findings.length > 0 ? ["governanceWeakening"] : [],
    changes:
      findings.length > 0
        ? findings.map((finding) => finding.message)
        : ["No risky governance weakening detected."],
    findings,
  };
}

function detectLockedGovernanceWeakening(
  previousConfig: EffectiveAagConfig,
  nextConfig: EffectiveAagConfig,
): GovernanceWeakening[] {
  const findings: GovernanceWeakening[] = [];

  if (previousConfig.enabled !== false && nextConfig.enabled === false) {
    findings.push({
      detector: "governanceWeakening",
      changeType: "disable_aag",
      decision: "block",
      message: "AAG enabled changed to false while locked.",
    });
  }

  if (
    nextConfig.defaultDecision === "allow" &&
    previousConfig.defaultDecision !== "allow"
  ) {
    findings.push({
      detector: "governanceWeakening",
      changeType: "change_default_decision",
      decision: "require_approval",
      message: "defaultDecision changed to allow.",
    });
  }

  if (
    previousConfig.receipts?.enabled !== false &&
    nextConfig.receipts?.enabled === false
  ) {
    findings.push({
      detector: "governanceWeakening",
      changeType: "disable_receipts",
      decision: "require_approval",
      message: "Receipts were disabled while locked.",
    });
  }

  if (previousConfig.locked && !nextConfig.locked) {
    findings.push({
      detector: "governanceWeakening",
      changeType: "unlock_policy",
      decision: "require_approval",
      message: "Locked mode changed from true to false.",
    });
  }

  if (removedLockMetadata(previousConfig, nextConfig)) {
    findings.push({
      detector: "governanceWeakening",
      changeType: "remove_lock_metadata",
      decision: "require_approval",
      message: "Locked mode metadata was removed.",
    });
  }

  if (approvalRequirementsWereWeakened(previousConfig, nextConfig)) {
    findings.push({
      detector: "governanceWeakening",
      changeType: "weaken_approval_requirements",
      decision: "require_approval",
      message: "Approval requirements were weakened.",
    });
  }

  if (sensitiveRulesWereWeakened(previousConfig, nextConfig)) {
    findings.push({
      detector: "governanceWeakening",
      changeType: "weaken_sensitive_action_rules",
      decision: "require_approval",
      message: "Sensitive action rules were weakened.",
    });
  }

  if (detectorsWereRemoved(previousConfig, nextConfig)) {
    findings.push({
      detector: "governanceWeakening",
      changeType: "remove_detectors",
      decision: "require_approval",
      message: "One or more detectors were removed.",
    });
  }

  if (broadAllowlistsWereAdded(previousConfig, nextConfig)) {
    findings.push({
      detector: "governanceWeakening",
      changeType: "add_broad_allowlist",
      decision: "require_approval",
      message: "A broad allowlist was added while locked.",
    });
  }

  if (auditVisibilityWasReduced(previousConfig, nextConfig)) {
    findings.push({
      detector: "governanceWeakening",
      changeType: "reduce_audit_visibility",
      decision: "require_approval",
      message: "Audit visibility was reduced while locked.",
    });
  }

  if (receiptDirectoryWasRemoved(previousConfig, nextConfig)) {
    findings.push({
      detector: "governanceWeakening",
      changeType: "delete_receipt_directory",
      decision: "require_approval",
      message: "Receipt directory was removed while locked.",
    });
  }

  return findings;
}

function getGovernanceDecision(findings: GovernanceWeakening[]): GateDecision {
  if (findings.some((finding) => finding.decision === "block")) {
    return "block";
  }

  if (findings.length > 0) {
    return "require_approval";
  }

  return "allow";
}

function removedLockMetadata(
  previousConfig: EffectiveAagConfig,
  nextConfig: EffectiveAagConfig,
): boolean {
  return (
    metadataWasRemoved(previousConfig.lockReason, nextConfig.lockReason) ||
    metadataWasRemoved(previousConfig.lockedAt, nextConfig.lockedAt) ||
    metadataWasRemoved(previousConfig.lockedBy, nextConfig.lockedBy)
  );
}

function metadataWasRemoved(
  previousValue: string | undefined,
  nextValue: string | undefined,
): boolean {
  return previousValue !== undefined && nextValue === undefined;
}

function approvalRequirementsWereWeakened(
  previousConfig: EffectiveAagConfig,
  nextConfig: EffectiveAagConfig,
): boolean {
  return (
    stringListWasShortened(previousConfig.audit?.approvalRequiredFor, nextConfig.audit?.approvalRequiredFor) ||
    stringListWasShortened(
      previousConfig.audit?.requireApprovalFor,
      nextConfig.audit?.requireApprovalFor,
    )
  );
}

function sensitiveRulesWereWeakened(
  previousConfig: EffectiveAagConfig,
  nextConfig: EffectiveAagConfig,
): boolean {
  return stringListWasShortened(
    previousConfig.audit?.sensitiveActionRules,
    nextConfig.audit?.sensitiveActionRules,
  );
}

function detectorsWereRemoved(
  previousConfig: EffectiveAagConfig,
  nextConfig: EffectiveAagConfig,
): boolean {
  return nextConfig.detectors.length < previousConfig.detectors.length;
}

function broadAllowlistsWereAdded(
  previousConfig: EffectiveAagConfig,
  nextConfig: EffectiveAagConfig,
): boolean {
  if (previousConfig.allowlists !== undefined || nextConfig.allowlists === undefined) {
    return false;
  }

  return JSON.stringify(nextConfig.allowlists).includes("*");
}

function auditVisibilityWasReduced(
  previousConfig: EffectiveAagConfig,
  nextConfig: EffectiveAagConfig,
): boolean {
  return (
    previousConfig.audit?.enabled !== false &&
    nextConfig.audit?.enabled === false
  );
}

function receiptDirectoryWasRemoved(
  previousConfig: EffectiveAagConfig,
  nextConfig: EffectiveAagConfig,
): boolean {
  return (
    previousConfig.receiptDirectory.length > 0 &&
    nextConfig.receiptDirectory.length === 0
  );
}

function stringListWasShortened(
  previousValue: unknown,
  nextValue: unknown,
): boolean {
  if (!Array.isArray(previousValue) || !Array.isArray(nextValue)) {
    return false;
  }

  return nextValue.length < previousValue.length;
}
