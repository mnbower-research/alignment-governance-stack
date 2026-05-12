import type { AgentActionProposal, DataSensitivity } from "@alignment-governance-stack/shared-types";
import type {
  ApprovalRule,
  ApprovalRuleWhen,
  DataSensitivityPolicy,
  EnvironmentPolicy,
  HardBoundaryRule,
  HardBoundaryRuleWhen,
  PolicyProfile,
  ResolvedActionPolicy,
  SuggestedPolicyDecision,
  ToolPolicy
} from "./types.js";

const sensitivityRank: Record<DataSensitivity, number> = {
  low: 1,
  medium: 2,
  high: 3
};

export function resolvePolicyForAction(
  profile: PolicyProfile,
  action: AgentActionProposal
): ResolvedActionPolicy {
  const context: ResolutionContext = {
    allowed: true,
    requiresApproval: false,
    receiptRequired: profile.receiptRequired === true,
    reasons: [],
    matchedRules: [],
    blockingBoundaryIds: []
  };

  applyHardBoundaries(profile.hardBoundaries ?? [], action, context);
  applyDefaultMode(profile, action, context);
  applyToolPolicies(profile.tools ?? [], action, context);
  applyEnvironmentPolicies(profile.environments ?? [], action, context);
  applyApprovalRules(profile.approvalRules ?? [], action, context);
  applyDataSensitivityPolicies(profile.dataSensitivity ?? [], action, context);

  return {
    allowed: context.allowed,
    requiresApproval: context.requiresApproval,
    receiptRequired: context.receiptRequired,
    reasons: context.reasons,
    matchedRules: context.matchedRules,
    suggestedDecision: context.suggestedDecision ?? suggestDecision(context),
    ...(context.hardBoundaryTriggered === true ? { hardBoundaryTriggered: true } : {}),
    ...(context.blockingBoundaryIds.length > 0 ? { blockingBoundaryIds: context.blockingBoundaryIds } : {})
  };
}

interface ResolutionContext {
  allowed: boolean;
  requiresApproval: boolean;
  receiptRequired: boolean;
  reasons: string[];
  matchedRules: string[];
  suggestedDecision?: SuggestedPolicyDecision;
  hardBoundaryTriggered?: boolean;
  blockingBoundaryIds: string[];
}

function applyHardBoundaries(
  rules: HardBoundaryRule[],
  action: AgentActionProposal,
  context: ResolutionContext
): void {
  for (const rule of rules) {
    if (!matchesHardBoundaryWhen(rule.when, action)) {
      continue;
    }

    context.hardBoundaryTriggered = true;
    context.blockingBoundaryIds.push(rule.id);
    context.matchedRules.push(rule.id);
    block(context, rule.reason);
  }
}

function applyDefaultMode(
  profile: PolicyProfile,
  action: AgentActionProposal,
  context: ResolutionContext
): void {
  if (profile.defaultMode === "permissive") {
    context.reasons.push("Permissive mode allows actions unless a policy explicitly blocks them.");
    return;
  }

  if (profile.defaultMode === "strict") {
    if (isClearlyLowRisk(action)) {
      context.reasons.push("Strict mode allows clearly low-risk internal reversible actions without extra approval.");
      return;
    }

    requireApproval(context, "Strict mode requires approval unless the action is clearly low-risk, internal, and reversible.");
  }

  if (profile.defaultMode === "balanced" || profile.defaultMode === "strict") {
    if (action.environment === "production" && !action.reversible) {
      requireApproval(context, "Production irreversible actions require approval.");
    }

    if (action.environment === "production" && action.externalFacing) {
      requireApproval(context, "Production external-facing actions require approval.");
    }

    if (action.dataSensitivity === "high") {
      requireApproval(context, "High sensitivity actions require approval.");
    }

    if (action.dataSensitivity === "high" && action.externalFacing) {
      block(context, "High sensitivity external-facing actions should be blocked before execution.");
    }
  }
}

function applyToolPolicies(
  policies: ToolPolicy[],
  action: AgentActionProposal,
  context: ResolutionContext
): void {
  for (const policy of policies.filter((entry) => entry.tool === action.tool)) {
    context.matchedRules.push(`tool:${policy.tool}`);

    if (!policy.allowed) {
      block(context, `Tool is explicitly blocked by policy: ${policy.tool}.`);
    }

    if (policy.blockedInEnvironments?.includes(action.environment)) {
      block(context, `Tool ${policy.tool} is blocked in environment ${action.environment}.`);
    }

    if (
      policy.allowedEnvironments !== undefined &&
      !policy.allowedEnvironments.includes(action.environment)
    ) {
      block(context, `Tool ${policy.tool} is not allowed in environment ${action.environment}.`);
    }

    if (policy.requiresApproval === true) {
      requireApproval(context, `Tool ${policy.tool} requires approval.`);
    }

    if (
      policy.maxDataSensitivity !== undefined &&
      sensitivityRank[action.dataSensitivity] > sensitivityRank[policy.maxDataSensitivity]
    ) {
      if (action.dataSensitivity === "high" || action.externalFacing) {
        block(context, `Tool ${policy.tool} exceeds its maximum data sensitivity policy.`);
      } else {
        requireApproval(context, `Tool ${policy.tool} exceeds its maximum data sensitivity policy.`);
      }
    }

    if (policy.externalFacingAllowed === false && action.externalFacing) {
      if (action.dataSensitivity === "high") {
        block(context, `Tool ${policy.tool} is not allowed for high sensitivity external-facing actions.`);
      } else {
        requireApproval(context, `Tool ${policy.tool} requires approval for external-facing actions.`);
      }
    }
  }
}

function applyEnvironmentPolicies(
  policies: EnvironmentPolicy[],
  action: AgentActionProposal,
  context: ResolutionContext
): void {
  for (const policy of policies.filter((entry) => entry.environment === action.environment)) {
    context.matchedRules.push(`environment:${policy.environment}`);

    if (policy.blockedTools?.includes(action.tool)) {
      block(context, `Tool ${action.tool} is blocked in environment ${policy.environment}.`);
    }

    if (policy.requiresApprovalForIrreversible === true && !action.reversible) {
      requireApproval(context, `${policy.environment} irreversible actions require approval.`);
    }

    if (policy.requiresApprovalForExternalFacing === true && action.externalFacing) {
      requireApproval(context, `${policy.environment} external-facing actions require approval.`);
    }

    if (policy.requiresApprovalForHighSensitivity === true && action.dataSensitivity === "high") {
      requireApproval(context, `${policy.environment} high sensitivity actions require approval.`);
    }
  }
}

function applyApprovalRules(
  rules: ApprovalRule[],
  action: AgentActionProposal,
  context: ResolutionContext
): void {
  for (const rule of rules) {
    if (!matchesWhen(rule.when, action)) {
      continue;
    }

    context.matchedRules.push(rule.id);

    if (rule.requiresApproval) {
      requireApproval(context, rule.reason);
    } else {
      context.reasons.push(rule.reason);
    }
  }
}

function applyDataSensitivityPolicies(
  policies: DataSensitivityPolicy[],
  action: AgentActionProposal,
  context: ResolutionContext
): void {
  for (const policy of policies.filter((entry) => entry.sensitivity === action.dataSensitivity)) {
    context.matchedRules.push(`dataSensitivity:${policy.sensitivity}`);

    if (policy.receiptRequired === true) {
      context.receiptRequired = true;
    }

    if (policy.requiresApproval === true) {
      requireApproval(context, `${policy.sensitivity} sensitivity actions require approval.`);
    }

    if (policy.externalFacingAllowed === false && action.externalFacing) {
      if (policy.sensitivity === "high") {
        block(context, "High sensitivity external-facing actions are not allowed by data sensitivity policy.");
      } else {
        requireApproval(context, `${policy.sensitivity} sensitivity external-facing actions require approval.`);
      }
    }
  }
}

function matchesWhen(when: ApprovalRuleWhen, action: AgentActionProposal): boolean {
  return (
    matchesString(when.tool, action.tool) &&
    matchesString(when.actionType, action.actionType) &&
    matchesString(when.environment, action.environment) &&
    matchesBoolean(when.reversible, action.reversible) &&
    matchesBoolean(when.externalFacing, action.externalFacing) &&
    matchesString(when.dataSensitivity, action.dataSensitivity)
  );
}

function matchesHardBoundaryWhen(
  when: HardBoundaryRuleWhen,
  action: AgentActionProposal
): boolean {
  return matchesWhen(when, action) && matchesTargetIncludes(when.targetIncludes, action.target);
}

function matchesString(expected: string | undefined, actual: string): boolean {
  return expected === undefined || expected === actual;
}

function matchesTargetIncludes(expected: string | undefined, actual: string): boolean {
  return expected === undefined || actual.toLowerCase().includes(expected.toLowerCase());
}

function matchesBoolean(expected: boolean | undefined, actual: boolean): boolean {
  return expected === undefined || expected === actual;
}

function isClearlyLowRisk(action: AgentActionProposal): boolean {
  return action.reversible && !action.externalFacing && action.dataSensitivity === "low";
}

function requireApproval(context: ResolutionContext, reason: string): void {
  context.requiresApproval = true;
  context.reasons.push(reason);

  if (context.suggestedDecision !== "block") {
    context.suggestedDecision = "require_approval";
  }
}

function block(context: ResolutionContext, reason: string): void {
  context.allowed = false;
  context.suggestedDecision = "block";
  context.reasons.push(reason);
}

function suggestDecision(context: ResolutionContext): SuggestedPolicyDecision {
  if (!context.allowed) {
    return "block";
  }

  if (context.requiresApproval) {
    return "require_approval";
  }

  return "allow";
}
