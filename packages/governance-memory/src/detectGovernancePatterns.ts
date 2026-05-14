import type { GovernanceReceipt } from "@alignment-governance-stack/receipts";
import type {
  DetectGovernancePatternsOptions,
  GovernanceMemorySeverity,
  GovernancePattern,
  GovernancePatternType
} from "./types.js";

const runtimeSubstitutionFailureCodes = new Set([
  "tool_mismatch",
  "action_type_mismatch",
  "target_mismatch",
  "action_hash_mismatch"
]);

export function detectGovernancePatterns(
  receipts: GovernanceReceipt[],
  options: DetectGovernancePatternsOptions = {}
): GovernancePattern[] {
  const minOccurrences = options.minOccurrences ?? 2;
  const patterns: GovernancePattern[] = [];

  addGroupedPattern(patterns, {
    receipts,
    minOccurrences,
    type: "repeated_pgdl_revision",
    severity: "medium",
    filter: (receipt) => receipt.pgdl?.decision === "revise_before_aag",
    key: actionKey,
    summary: (count) => `${count} receipts show repeated PGDL revision for a similar action shape.`
  });

  addGroupedPattern(patterns, {
    receipts,
    minOccurrences,
    type: "repeated_policy_block",
    severity: "high",
    filter: (receipt) => receipt.finalDecision === "blocked_by_policy",
    key: actionKey,
    summary: (count) => `${count} receipts show repeated policy blocks for a similar action shape.`
  });

  addGroupedPattern(patterns, {
    receipts,
    minOccurrences,
    type: "repeated_hard_boundary_block",
    severity: "high",
    filter: (receipt) => receipt.resolvedPolicy?.hardBoundaryTriggered === true,
    key: hardBoundaryKey,
    summary: (count) => `${count} receipts triggered the same hard boundary pattern.`
  });

  addGroupedPattern(patterns, approvalPattern(receipts, minOccurrences, "approval_missing", "repeated_missing_authority"));
  addGroupedPattern(
    patterns,
    approvalPattern(receipts, minOccurrences, "approval_out_of_scope", "repeated_out_of_scope_approval")
  );

  addGroupedPattern(patterns, {
    receipts,
    minOccurrences,
    type: "repeated_rubber_stamp",
    severity: "high",
    filter: (receipt) => receipt.participationQuality?.decision === "likely_rubber_stamp",
    key: actionKey,
    summary: (count) => `${count} receipts show likely rubber-stamp approval patterns.`
  });

  addGroupedPattern(patterns, {
    receipts,
    minOccurrences,
    type: "repeated_runtime_substitution",
    severity: "high",
    filter: (receipt) =>
      receipt.runtimeBinding?.failures.some((failure) => runtimeSubstitutionFailureCodes.has(failure.code)) === true,
    key: runtimeFailureKey,
    summary: (count) => `${count} receipts show repeated Runtime Binding substitution failures.`
  });

  addGroupedPattern(patterns, {
    receipts,
    minOccurrences,
    type: "repeated_execution_denial",
    severity: "high",
    filter: (receipt) => receipt.finalDecision === "execution_denied",
    key: actionKey,
    summary: (count) => `${count} receipts ended in execution denial for a similar action shape.`
  });

  addGroupedPattern(patterns, {
    receipts,
    minOccurrences,
    type: "repeated_policy_invalid",
    severity: "high",
    filter: (receipt) => receipt.finalDecision === "policy_invalid",
    key: () => "policy_invalid",
    summary: (count) => `${count} receipts show invalid policy profile inputs.`
  });

  addGroupedPattern(patterns, {
    receipts,
    minOccurrences,
    type: "repeated_safe_allow",
    severity: "low",
    filter: (receipt) => receipt.finalDecision === "execution_allowed" || receipt.finalDecision === "allowed_by_aag",
    key: proposalSentKey,
    summary: (count) => `${count} receipts show repeated safe allows for a similar action shape.`
  });

  addGroupedPattern(patterns, {
    receipts,
    minOccurrences,
    type: "repeated_sensitive_external_attempt",
    severity: "high",
    filter: (receipt) => receipt.originalProposal.externalFacing && receipt.originalProposal.dataSensitivity === "high",
    key: actionKey,
    summary: (count) => `${count} receipts show repeated high-sensitivity external-facing attempts.`
  });

  addGroupedPattern(patterns, {
    receipts,
    minOccurrences,
    type: "repeated_unknown_or_ambiguous_action",
    severity: "medium",
    filter: isAmbiguousOutcome,
    key: actionKey,
    summary: (count) => `${count} receipts show repeated ambiguous outcomes for a similar action shape.`
  });

  return patterns.sort((left, right) => left.id.localeCompare(right.id));
}

interface PatternRule {
  receipts: GovernanceReceipt[];
  minOccurrences: number;
  type: GovernancePatternType;
  severity: GovernanceMemorySeverity;
  filter: (receipt: GovernanceReceipt) => boolean;
  key: (receipt: GovernanceReceipt) => string;
  summary: (count: number, receipts: GovernanceReceipt[]) => string;
}

function addGroupedPattern(patterns: GovernancePattern[], rule: PatternRule): void {
  const groups = new Map<string, GovernanceReceipt[]>();

  for (const receipt of rule.receipts) {
    if (!rule.filter(receipt)) {
      continue;
    }

    const key = rule.key(receipt);
    const entries = groups.get(key) ?? [];
    entries.push(receipt);
    groups.set(key, entries);
  }

  for (const [key, groupedReceipts] of groups) {
    if (groupedReceipts.length < rule.minOccurrences) {
      continue;
    }

    patterns.push(createPattern(rule, key, groupedReceipts));
  }
}

function createPattern(rule: PatternRule, key: string, receipts: GovernanceReceipt[]): GovernancePattern {
  return {
    id: `${rule.type}:${stableIdPart(key)}`,
    type: rule.type,
    count: receipts.length,
    severity: rule.severity,
    summary: rule.summary(receipts.length, receipts),
    evidenceReceiptHashes: uniqueDefined(receipts.map((receipt) => receipt.receiptHash)),
    relatedTools: uniqueDefined(receipts.map((receipt) => receipt.originalProposal.tool)),
    relatedActionTypes: uniqueDefined(receipts.map((receipt) => receipt.originalProposal.actionType)),
    relatedTargets: uniqueDefined(receipts.map((receipt) => receipt.originalProposal.target)),
    relatedFinalDecisions: uniqueDefined(receipts.map((receipt) => receipt.finalDecision)),
    metadata: {
      groupKey: key
    }
  };
}

function approvalPattern(
  receipts: GovernanceReceipt[],
  minOccurrences: number,
  decision: string,
  type: GovernancePatternType
): PatternRule {
  return {
    receipts,
    minOccurrences,
    type,
    severity: "high",
    filter: (receipt) => receipt.approvalValidation?.decision === decision,
    key: actionKey,
    summary: (count) => `${count} receipts show repeated authority validation result: ${decision}.`
  };
}

function actionKey(receipt: GovernanceReceipt): string {
  return [
    receipt.originalProposal.tool,
    receipt.originalProposal.actionType,
    receipt.originalProposal.target
  ].join("|");
}

function proposalSentKey(receipt: GovernanceReceipt): string {
  const proposal = receipt.proposalSentToAag ?? receipt.originalProposal;
  return [proposal.tool, proposal.actionType, proposal.target].join("|");
}

function hardBoundaryKey(receipt: GovernanceReceipt): string {
  const ids = receipt.resolvedPolicy?.blockingBoundaryIds;
  return ids !== undefined && ids.length > 0 ? ids.join(",") : actionKey(receipt);
}

function runtimeFailureKey(receipt: GovernanceReceipt): string {
  const codes = receipt.runtimeBinding?.failures
    .map((failure) => failure.code)
    .filter((code) => runtimeSubstitutionFailureCodes.has(code))
    .sort()
    .join(",");
  return `${actionKey(receipt)}|${codes ?? "runtime_substitution"}`;
}

function isAmbiguousOutcome(receipt: GovernanceReceipt): boolean {
  return (
    receipt.finalDecision === "escalated_before_gate" ||
    receipt.finalDecision === "revision_required_by_aag" ||
    receipt.finalDecision === "approval_required_by_aag" ||
    receipt.finalDecision === "approval_required_by_authority"
  );
}

function uniqueDefined(values: (string | undefined)[]): string[] {
  return [...new Set(values.filter((value): value is string => value !== undefined))].sort();
}

function stableIdPart(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9_.-]+/g, "_").replace(/^_+|_+$/g, "") || "all";
}
