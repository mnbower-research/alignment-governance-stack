import type { AgentActionProposal } from "@alignment-governance-stack/shared-types";
import { compareExecutionConstraintSets } from "./constraints.js";
import { createActionHash } from "./hashAction.js";
import type {
  RuntimeBindingFailure,
  RuntimeBindingResult,
  RuntimePermit,
  ValidateRuntimePermitOptions
} from "./types.js";

export function validateRuntimePermit(
  action: AgentActionProposal,
  permit?: RuntimePermit,
  options: ValidateRuntimePermitOptions = {}
): RuntimeBindingResult {
  if (permit === undefined) {
    return deny(undefined, [
      {
        code: "missing_permit",
        reason: "Execution denied because no runtime permit was provided."
      }
    ]);
  }

  const failures: RuntimeBindingFailure[] = [];

  if (permit.aagDecision !== "allow") {
    failures.push({
      code: "permit_not_allowed",
      reason: "Execution denied because the permit was not issued from an allowed AAG decision.",
      expected: "allow",
      actual: permit.aagDecision
    });
  }

  if (permit.expiresAt !== undefined && isExpired(permit.expiresAt, options.now)) {
    failures.push({
      code: "expired_permit",
      reason: "Execution denied because the runtime permit is expired.",
      expected: `expires after ${options.now ?? new Date().toISOString()}`,
      actual: permit.expiresAt
    });
  }

  const runtimeActionHash = createActionHash(action);

  if (runtimeActionHash !== permit.actionHash) {
    failures.push({
      code: "action_hash_mismatch",
      reason: "Execution denied because the runtime action hash does not match the permit.",
      expected: permit.actionHash,
      actual: runtimeActionHash
    });
  }

  failures.push(...getFieldMismatchFailures(action, permit.allowedAction));
  failures.push(
    ...compareExecutionConstraintSets(
      permit.executionConstraints ?? permit.allowedAction.executionConstraints,
      action.executionConstraints
    )
  );

  if (failures.length > 0) {
    return deny(permit, failures);
  }

  return {
    decision: "execution_allowed",
    allowed: true,
    permit,
    failures: [],
    reasonForDecision: "Runtime action exactly matches a valid permit."
  };
}

function getFieldMismatchFailures(
  action: AgentActionProposal,
  allowedAction: AgentActionProposal
): RuntimeBindingFailure[] {
  return [
    fieldMismatch("tool_mismatch", "Tool substitution is not permitted.", allowedAction.tool, action.tool),
    fieldMismatch(
      "action_type_mismatch",
      "Action type substitution is not permitted.",
      allowedAction.actionType,
      action.actionType
    ),
    fieldMismatch("target_mismatch", "Target substitution is not permitted.", allowedAction.target, action.target),
    fieldMismatch(
      "environment_mismatch",
      "Environment substitution is not permitted.",
      allowedAction.environment,
      action.environment
    ),
    fieldMismatch(
      "reversibility_mismatch",
      "Reversibility changes are not permitted.",
      allowedAction.reversible,
      action.reversible
    ),
    fieldMismatch(
      "external_impact_mismatch",
      "External-facing escalation is not permitted.",
      allowedAction.externalFacing,
      action.externalFacing
    ),
    fieldMismatch(
      "data_sensitivity_mismatch",
      "Sensitive-data escalation is not permitted.",
      allowedAction.dataSensitivity,
      action.dataSensitivity
    ),
    fieldMismatch(
      "approval_requirement_mismatch",
      "Approval requirement changes are not permitted.",
      allowedAction.requiresApproval,
      action.requiresApproval
    ),
    fieldMismatch(
      "approval_requirement_mismatch",
      "Known approval changes are not permitted.",
      allowedAction.knownApproval,
      action.knownApproval
    )
  ].filter((failure): failure is RuntimeBindingFailure => failure !== undefined);
}

function fieldMismatch(
  code: RuntimeBindingFailure["code"],
  reason: string,
  expected: unknown,
  actual: unknown
): RuntimeBindingFailure | undefined {
  return Object.is(expected, actual) ? undefined : { code, reason, expected, actual };
}

function isExpired(expiresAt: string, now: string | undefined): boolean {
  const expiresAtDate = new Date(expiresAt);
  const nowDate = new Date(now ?? new Date().toISOString());

  return Number.isNaN(expiresAtDate.getTime()) || expiresAtDate.getTime() < nowDate.getTime();
}

function deny(permit: RuntimePermit | undefined, failures: RuntimeBindingFailure[]): RuntimeBindingResult {
  return {
    decision: "execution_denied",
    allowed: false,
    ...(permit !== undefined ? { permit } : {}),
    failures,
    reasonForDecision: failures.map((failure) => failure.reason).join(" ")
  };
}
