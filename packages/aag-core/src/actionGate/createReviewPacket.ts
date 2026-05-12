import type {
  ActionGateInput,
  ActionGateResult,
  GateDetectorResult,
  PolicyProfileResultMetadata,
  ReviewPacket,
  ReviewPacketDiffPreview,
  ReviewPacketScope,
} from "./types";

const previewLimit = 500;

export function createReviewPacket(
  input: ActionGateInput,
  decision: ActionGateResult["decision"],
  rankedResults: GateDetectorResult[],
  policyProfile?: PolicyProfileResultMetadata,
): ReviewPacket | undefined {
  if (decision === "allow") {
    return createAllowPacket(input, policyProfile);
  }

  const primaryResult = rankedResults[0];
  const riskReason =
    getAppliedPolicyReason(decision, policyProfile) ??
    primaryResult?.evidence[0] ??
    "The proposed action needs review before execution.";

  return {
    proposedAction: describeProposedAction(input),
    scope: createScope(input, primaryResult),
    diffPreview: createDiffPreview(input),
    rollbackPath: createRollbackPath(input),
    riskReason,
    reviewerQuestion: getReviewerQuestion(decision),
    saferAlternative: getSaferAlternative(decision, primaryResult, policyProfile),
  };
}

function createAllowPacket(
  input: ActionGateInput,
  policyProfile?: PolicyProfileResultMetadata,
): ReviewPacket {
  return {
    proposedAction: describeProposedAction(input),
    scope: createScope(input),
    diffPreview: createDiffPreview(input),
    rollbackPath: createRollbackPath(input),
    riskReason:
      getAppliedPolicyReason("allow", policyProfile) ??
      "No detector triggered; the proposed action appears low risk.",
    reviewerQuestion: getReviewerQuestion("allow"),
  };
}

function describeProposedAction(input: ActionGateInput): string {
  const target = input.proposedAction.target
    ? ` on ${input.proposedAction.target}`
    : "";

  return `${input.proposedAction.actionType} via ${input.proposedAction.tool}${target}`;
}

function createScope(
  input: ActionGateInput,
  primaryResult?: GateDetectorResult,
): ReviewPacketScope {
  return {
    target: input.proposedAction.target,
    affectedSystems: [input.proposedAction.tool],
    externalEffect: input.proposedAction.externalFacing ?? false,
    dataSensitivity: inferDataSensitivity(primaryResult),
    blastRadius: inferBlastRadius(input),
  };
}

function inferDataSensitivity(
  primaryResult: GateDetectorResult | undefined,
): ReviewPacketScope["dataSensitivity"] {
  if (
    primaryResult?.type === "sensitive_data_exposure" ||
    primaryResult?.type === "data_exfiltration" ||
    primaryResult?.type === "credential_access"
  ) {
    return "high";
  }

  if (
    primaryResult?.severity === "high" ||
    primaryResult?.severity === "critical"
  ) {
    return "medium";
  }

  return "low";
}

function inferBlastRadius(input: ActionGateInput): ReviewPacketScope["blastRadius"] {
  const actionText = [
    input.proposedAction.actionType,
    input.proposedAction.target,
    stringifyPayload(input.proposedAction.payload),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (/\b(public|publish|linkedin|social|post)\b/.test(actionText)) {
    return "public";
  }

  if (/\b(export|list|bulk|all|database|table)\b/.test(actionText)) {
    return "multi_record";
  }

  if (/\b(system|production|deploy|cluster|repository)\b/.test(actionText)) {
    return "system_wide";
  }

  if (input.proposedAction.externalFacing) {
    return "single_external_contact";
  }

  return "single_record";
}

function createDiffPreview(input: ActionGateInput): ReviewPacketDiffPreview {
  const type = inferDiffPreviewType(input);
  const payload = input.proposedAction.payload;

  if (!payload) {
    return { type };
  }

  const before = payload.before;
  const after = payload.after;
  const preview = getPayloadPreview(payload);

  return {
    type,
    ...(before !== undefined ? { before } : {}),
    ...(after !== undefined ? { after } : {}),
    ...(preview ? { preview } : {}),
  };
}

function inferDiffPreviewType(
  input: ActionGateInput,
): ReviewPacketDiffPreview["type"] {
  const actionText = `${input.proposedAction.tool} ${input.proposedAction.actionType}`.toLowerCase();

  if (/\b(email|mail|gmail)\b/.test(actionText)) {
    return "email";
  }

  if (/\b(post|publish|linkedin|social)\b/.test(actionText)) {
    return "post";
  }

  if (/\b(update|note|record|crm)\b/.test(actionText)) {
    return "record_update";
  }

  if (/\b(file|write)\b/.test(actionText)) {
    return "file_change";
  }

  if (/\b(delete|remove|drop|destroy|purge)\b/.test(actionText)) {
    return "delete";
  }

  if (/\b(export|dump|extract)\b/.test(actionText)) {
    return "export";
  }

  return "none";
}

function getPayloadPreview(payload: Record<string, unknown>): string | undefined {
  const explicitPreview = firstString(
    payload.preview,
    payload.bodyPreview,
    payload.body,
    payload.content,
    payload.postText,
    payload.command,
  );

  if (explicitPreview) {
    return truncatePreview(explicitPreview);
  }

  return truncatePreview(stringifyPayload(payload));
}

function firstString(...values: unknown[]): string | undefined {
  return values.find((value): value is string => typeof value === "string");
}

function createRollbackPath(
  input: ActionGateInput,
): ReviewPacket["rollbackPath"] {
  if (input.proposedAction.reversible === false) {
    return {
      available: false,
      description:
        "No reliable rollback path is declared for this action. Review is required before execution.",
    };
  }

  return {
    available: true,
    description:
      "The action is marked reversible, but reviewers should confirm the actual restore path before execution.",
  };
}

function getReviewerQuestion(
  decision: ActionGateResult["decision"],
): string {
  if (decision === "allow") {
    return "What was allowed, and why was it low risk?";
  }

  if (decision === "require_approval") {
    return "Do you approve this exact action with this scope and consequence?";
  }

  if (decision === "revise_action") {
    return "What must change before this can be approved?";
  }

  return "What safer alternative should the agent propose instead?";
}

function getSaferAlternative(
  decision: ActionGateResult["decision"],
  primaryResult: GateDetectorResult | undefined,
  policyProfile?: PolicyProfileResultMetadata,
): string | undefined {
  if (
    policyProfile?.decision === decision &&
    policyProfile.saferAlternative
  ) {
    return policyProfile.saferAlternative;
  }

  if (decision === "block") {
    return primaryResult
      ? `Propose a narrower action that avoids ${primaryResult.type}.`
      : "Propose a narrower, reversible action for review.";
  }

  if (decision === "revise_action") {
    return primaryResult
      ? `Revise the action to resolve ${primaryResult.type}.`
      : "Revise the action to match the requested scope.";
  }

  return undefined;
}

function getAppliedPolicyReason(
  decision: ActionGateResult["decision"],
  policyProfile: PolicyProfileResultMetadata | undefined,
): string | undefined {
  return policyProfile?.decision === decision ? policyProfile.reason : undefined;
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

function truncatePreview(value: string): string {
  if (value.length <= previewLimit) {
    return value;
  }

  return `${value.slice(0, previewLimit)}...[truncated]`;
}
