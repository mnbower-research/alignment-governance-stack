import type {
  ActionGateInput,
  ActionGateResult,
  GateDecision,
  PolicyProfile,
  PolicyProfileResultMetadata,
  PolicyRule,
} from "./types";

const decisionRank: Record<GateDecision, number> = {
  allow: 1,
  revise_action: 2,
  require_approval: 3,
  block: 4,
};

type PolicyMatch = {
  decision: GateDecision;
  reason: string;
  matchedRule: string;
  requiresReviewPacket?: boolean;
  saferAlternative?: string;
};

export function applyPolicyProfile(
  input: ActionGateInput,
  currentResult: ActionGateResult,
  profile: PolicyProfile | undefined,
): ActionGateResult {
  if (!profile) {
    return currentResult;
  }

  const match = resolvePolicyDecision(input, currentResult, profile);
  const policyProfile = toPolicyMetadata(profile, match);

  if (!match) {
    return {
      ...currentResult,
      policyProfile,
    };
  }

  // Safety precedence prevents a workflow profile from weakening detector output:
  // block > require_approval > revise_action > allow.
  const decision = strongerDecision(currentResult.decision, match.decision);
  const policyEvidence = `Policy profile ${profile.id} matched ${match.matchedRule}: ${match.reason}`;
  const evidence = currentResult.evidence.includes(policyEvidence)
    ? currentResult.evidence
    : [...currentResult.evidence, policyEvidence];
  const recommendedAction = getPolicyRecommendedAction(
    decision,
    currentResult.decision,
    match,
    currentResult.recommendedAction,
  );

  return {
    ...currentResult,
    decision,
    riskLevel: getPolicyRiskLevel(decision, currentResult.riskLevel),
    evidence,
    recommendedAction,
    policyProfile,
  };
}

export function resolvePolicyDecision(
  input: ActionGateInput,
  currentResult: ActionGateResult,
  profile: PolicyProfile,
): PolicyMatch | undefined {
  const rule = profile.rules.find(
    (candidate) => candidate.actionType === input.proposedAction.actionType,
  );

  if (rule) {
    return toRuleMatch(rule);
  }

  return resolveDefaultDecision(input, currentResult, profile);
}

function toRuleMatch(rule: PolicyRule): PolicyMatch {
  return {
    decision: rule.decision,
    reason: rule.reason,
    matchedRule: rule.actionType,
    requiresReviewPacket: rule.requiresReviewPacket,
    saferAlternative: rule.saferAlternative,
  };
}

function resolveDefaultDecision(
  input: ActionGateInput,
  currentResult: ActionGateResult,
  profile: PolicyProfile,
): PolicyMatch | undefined {
  const defaults = profile.defaults;

  if (!defaults) {
    return undefined;
  }

  const defaultMatches: PolicyMatch[] = [];

  if (defaults.highSensitivityData && hasHighSensitivityData(input, currentResult)) {
    defaultMatches.push({
      decision: defaults.highSensitivityData,
      reason: "Policy default applies to high-sensitivity data.",
      matchedRule: "defaults.highSensitivityData",
      requiresReviewPacket: true,
    });
  }

  if (defaults.destructiveAction && isDestructiveAction(input, currentResult)) {
    defaultMatches.push({
      decision: defaults.destructiveAction,
      reason: "Policy default applies to destructive actions.",
      matchedRule: "defaults.destructiveAction",
      requiresReviewPacket: true,
    });
  }

  if (defaults.irreversibleAction && isIrreversibleAction(input, currentResult)) {
    defaultMatches.push({
      decision: defaults.irreversibleAction,
      reason: "Policy default applies to irreversible actions.",
      matchedRule: "defaults.irreversibleAction",
      requiresReviewPacket: true,
    });
  }

  if (defaults.externalEffect && input.proposedAction.externalFacing) {
    defaultMatches.push({
      decision: defaults.externalEffect,
      reason: "Policy default applies to external-effect actions.",
      matchedRule: "defaults.externalEffect",
      requiresReviewPacket: true,
    });
  }

  return defaultMatches.sort(
    (left, right) => decisionRank[right.decision] - decisionRank[left.decision],
  )[0];
}

function hasHighSensitivityData(
  input: ActionGateInput,
  currentResult: ActionGateResult,
): boolean {
  const payloadSensitivity = input.proposedAction.payload?.dataSensitivity;

  if (payloadSensitivity === "high") {
    return true;
  }

  return currentResult.detectorResults.some(
    (result) =>
      result.triggered &&
      (result.type === "sensitive_data_exposure" ||
        result.type === "data_exfiltration" ||
        result.type === "credential_access") &&
      (result.severity === "high" || result.severity === "critical"),
  );
}

function isDestructiveAction(
  input: ActionGateInput,
  currentResult: ActionGateResult,
): boolean {
  const actionText = [
    input.proposedAction.actionType,
    input.proposedAction.target,
    stringifyPayload(input.proposedAction.payload),
  ]
    .filter(Boolean)
    .join(" ")
    .replace(/[_-]/g, " ");

  return (
    /\b(delete|remove|destroy|drop|purge|wipe|truncate)\b/i.test(actionText) ||
    currentResult.detectorResults.some(
      (result) => result.triggered && result.type === "destructive_cyber_action",
    )
  );
}

function isIrreversibleAction(
  input: ActionGateInput,
  currentResult: ActionGateResult,
): boolean {
  return (
    input.proposedAction.reversible === false ||
    currentResult.detectorResults.some(
      (result) => result.triggered && result.type === "irreversible_action",
    )
  );
}

function strongerDecision(
  detectorDecision: GateDecision,
  policyDecision: GateDecision,
): GateDecision {
  return decisionRank[policyDecision] > decisionRank[detectorDecision]
    ? policyDecision
    : detectorDecision;
}

function getPolicyRiskLevel(
  decision: GateDecision,
  currentRiskLevel: ActionGateResult["riskLevel"],
): ActionGateResult["riskLevel"] {
  if (decision === "block") {
    return "critical";
  }

  if (decision === "require_approval" && currentRiskLevel === "low") {
    return "high";
  }

  if (decision === "revise_action" && currentRiskLevel === "low") {
    return "medium";
  }

  return currentRiskLevel;
}

function getPolicyRecommendedAction(
  finalDecision: GateDecision,
  detectorDecision: GateDecision,
  match: PolicyMatch,
  currentRecommendedAction: string,
): string {
  if (decisionRank[detectorDecision] >= decisionRank[match.decision]) {
    return currentRecommendedAction;
  }

  if (finalDecision === "allow") {
    return "Proceed with the proposed action.";
  }

  if (finalDecision === "require_approval") {
    return `Request explicit approval before execution; policy reason: ${match.reason}`;
  }

  if (finalDecision === "revise_action") {
    return `Revise the proposed action before execution; policy reason: ${match.reason}`;
  }

  return match.saferAlternative
    ? `Do not execute this action. Safer alternative: ${match.saferAlternative}`
    : `Do not execute this action; policy reason: ${match.reason}`;
}

function toPolicyMetadata(
  profile: PolicyProfile,
  match: PolicyMatch | undefined,
): PolicyProfileResultMetadata {
  return {
    id: profile.id,
    name: profile.name,
    ...(match
      ? {
          matchedRule: match.matchedRule,
          decision: match.decision,
          reason: match.reason,
          ...(match.requiresReviewPacket !== undefined
            ? { requiresReviewPacket: match.requiresReviewPacket }
            : {}),
          ...(match.saferAlternative
            ? { saferAlternative: match.saferAlternative }
            : {}),
        }
      : {}),
  };
}

function stringifyPayload(payload: Record<string, unknown> | undefined): string {
  if (!payload) {
    return "";
  }

  try {
    return JSON.stringify(payload);
  } catch {
    return "";
  }
}
