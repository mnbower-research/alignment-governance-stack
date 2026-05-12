import { createEffectiveAagConfig, type EffectiveAagConfig } from "./aagConfig";
import {
  checkGovernanceChange,
  type GovernanceChangeType,
} from "./governanceWeakening";
import type { GateDecision } from "./types";

export type MetaGateInput = {
  actionType: string;
  target: string;
  beforeConfig?: unknown;
  afterConfig?: unknown;
  locked?: boolean;
  requestedBy?: string;
  reason?: string;
};

export type MetaGateDecision = {
  decision: GateDecision;
  detectorsTriggered: string[];
  reasons: string[];
  metaGate: true;
  locked: boolean;
  governanceChangeType?: GovernanceChangeType;
};

const governanceActionTypes = new Set([
  "modify_policy",
  "modify_config",
  "disable_gate",
  "unlock_policy",
  "change_approval_rule",
  "change_detector_threshold",
  "disable_receipts",
  "disable_audit",
  "delete_receipt",
  "add_allowlist",
  "change_default_decision",
  "remove_detector",
  "weaken_sensitive_action_rule",
]);

export function evaluateMetaGateAction(
  input: MetaGateInput,
): MetaGateDecision {
  const beforeConfig = toEffectiveConfig(input.beforeConfig);
  const afterConfig = toEffectiveConfig(input.afterConfig);
  const locked = input.locked ?? beforeConfig?.locked ?? false;
  const lockedReason = locked ? ["Locked policy mode is active."] : [];

  if (input.actionType === "disable_gate") {
    return locked
      ? decision("block", locked, ["disableGateWhileLocked"], [
          "AAG is locked.",
          "Disabling the gate while locked is blocked.",
        ])
      : decision("require_approval", locked, ["disableGate"], [
          "Disabling the gate changes the oversight boundary.",
        ]);
  }

  if (input.actionType === "delete_receipt") {
    return decision("block", locked, ["deleteReceipt"], [
      "Deleting decision receipts reduces audit visibility.",
      "Receipt deletion is blocked.",
    ]);
  }

  if (input.actionType === "disable_audit") {
    return locked
      ? decision("block", locked, ["disableAuditWhileLocked"], [
          "AAG is locked.",
          "Disabling audit while locked is blocked.",
        ])
      : decision("require_approval", locked, ["disableAudit"], [
          "Disabling audit reduces governance visibility.",
        ]);
  }

  if (input.actionType === "disable_receipts") {
    return locked
      ? decision("require_approval", locked, ["disableReceiptsWhileLocked"], [
          ...lockedReason,
          "Disabling receipts while locked requires approval.",
        ])
      : decision("require_approval", locked, ["disableReceipts"], [
          "Disabling receipts reduces audit evidence.",
        ]);
  }

  if (input.actionType === "unlock_policy") {
    return locked
      ? decision("require_approval", locked, ["unlockPolicyWhileLocked"], [
          ...lockedReason,
          "Unlocking policy governance requires approval.",
        ])
      : decision("allow", locked, [], [
          "Locked policy mode is not active.",
          "No risky MetaGate governance change detected.",
        ]);
  }

  if (
    input.actionType === "modify_policy" ||
    input.actionType === "modify_config"
  ) {
    return evaluateConfigChange(input, beforeConfig, afterConfig, locked);
  }

  if (input.actionType === "change_default_decision") {
    return defaultDecisionChangedToAllow(afterConfig)
      ? decision("require_approval", locked, ["defaultDecisionAllow"], [
          ...lockedReason,
          "defaultDecision changed to allow.",
        ], "change_default_decision")
      : decision("allow", locked, [], [
          "No risky MetaGate governance change detected.",
        ]);
  }

  if (input.actionType === "add_allowlist") {
    return hasBroadAllowlist(input, afterConfig)
      ? decision("require_approval", locked, ["broadAllowlist"], [
          ...lockedReason,
          "A broad or wildcard-like allowlist requires approval.",
        ], "add_broad_allowlist")
      : decision("allow", locked, [], [
          "No risky MetaGate governance change detected.",
        ]);
  }

  if (
    input.actionType === "change_approval_rule" ||
    input.actionType === "change_detector_threshold" ||
    input.actionType === "remove_detector" ||
    input.actionType === "weaken_sensitive_action_rule"
  ) {
    return decision("require_approval", locked, ["governanceSensitiveChange"], [
      ...lockedReason,
      `${input.actionType} changes governance controls and requires approval.`,
    ]);
  }

  if (!governanceActionTypes.has(input.actionType)) {
    return decision("require_approval", locked, ["unknownGovernanceAction"], [
      `Unknown governance action type "${input.actionType}" requires approval.`,
    ]);
  }

  return decision("allow", locked, [], [
    "No risky MetaGate governance change detected.",
  ]);
}

function evaluateConfigChange(
  input: MetaGateInput,
  beforeConfig: EffectiveAagConfig | undefined,
  afterConfig: EffectiveAagConfig | undefined,
  locked: boolean,
): MetaGateDecision {
  if (!beforeConfig || !afterConfig) {
    return decision("require_approval", locked, ["missingConfigDiff"], [
      `${input.actionType} requires before and after config context.`,
    ]);
  }

  const governanceResult = checkGovernanceChange(beforeConfig, afterConfig);

  if (governanceResult.decision === "allow") {
    return decision("allow", locked, [], [
      "No risky MetaGate governance change detected.",
    ]);
  }

  return decision(
    "require_approval",
    locked,
    ["governanceWeakening"],
    [
      ...(locked ? ["Locked policy mode is active."] : []),
      ...governanceResult.changes,
    ],
    governanceResult.governanceChangeType,
  );
}

function decision(
  decisionValue: GateDecision,
  locked: boolean,
  detectors: string[],
  reasons: string[],
  governanceChangeType?: GovernanceChangeType,
): MetaGateDecision {
  return {
    decision: decisionValue,
    detectorsTriggered: ["metaGate", ...detectors],
    reasons,
    metaGate: true,
    locked,
    ...(governanceChangeType ? { governanceChangeType } : {}),
  };
}

function toEffectiveConfig(value: unknown): EffectiveAagConfig | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  return createEffectiveAagConfig({
    config: value,
  });
}

function defaultDecisionChangedToAllow(
  afterConfig: EffectiveAagConfig | undefined,
): boolean {
  return afterConfig?.defaultDecision === "allow";
}

function hasBroadAllowlist(
  input: MetaGateInput,
  afterConfig: EffectiveAagConfig | undefined,
): boolean {
  const serialized = JSON.stringify({
    target: input.target,
    reason: input.reason,
    allowlists: afterConfig?.allowlists,
  });

  return /\*/.test(serialized) || /\ball\b/i.test(serialized);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
