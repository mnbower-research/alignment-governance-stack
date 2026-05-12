import type { PolicyProfile, PolicyProfileValidationResult } from "./types.js";

export function validatePolicyProfile(profile: PolicyProfile): PolicyProfileValidationResult {
  if (!isRecord(profile)) {
    throw new TypeError("Policy profile must be an object.");
  }

  const errors: string[] = [];

  if (typeof profile.id !== "string" || profile.id.trim() === "") {
    errors.push("Policy profile is missing required id.");
  }

  if (typeof profile.name !== "string" || profile.name.trim() === "") {
    errors.push("Policy profile is missing required name.");
  }

  if (typeof profile.version !== "string" || profile.version.trim() === "") {
    errors.push("Policy profile is missing required version.");
  }

  if (!isDefaultMode(profile.defaultMode)) {
    errors.push("Policy profile is missing required defaultMode.");
  }

  const approvalRuleIds = new Set<string>();
  for (const rule of profile.approvalRules ?? []) {
    if (typeof rule.id !== "string" || rule.id.trim() === "") {
      errors.push("Approval rule is missing required id.");
      continue;
    }

    if (approvalRuleIds.has(rule.id)) {
      errors.push(`Approval rule id must be unique: ${rule.id}.`);
    }

    approvalRuleIds.add(rule.id);
  }

  for (const toolPolicy of profile.tools ?? []) {
    if (typeof toolPolicy.tool !== "string" || toolPolicy.tool.trim() === "") {
      errors.push("Tool policy entry is missing required tool.");
    }
  }

  for (const environmentPolicy of profile.environments ?? []) {
    if (typeof environmentPolicy.environment !== "string" || environmentPolicy.environment.trim() === "") {
      errors.push("Environment policy entry is missing required environment.");
    }
  }

  const hardBoundaryIds = new Set<string>();
  for (const hardBoundary of profile.hardBoundaries ?? []) {
    if (typeof hardBoundary.id !== "string" || hardBoundary.id.trim() === "") {
      errors.push("Hard boundary is missing required id.");
      continue;
    }

    if (hardBoundaryIds.has(hardBoundary.id)) {
      errors.push(`Hard boundary id must be unique: ${hardBoundary.id}.`);
    }

    hardBoundaryIds.add(hardBoundary.id);

    if (typeof hardBoundary.label !== "string" || hardBoundary.label.trim() === "") {
      errors.push(`Hard boundary is missing required label: ${hardBoundary.id}.`);
    }

    if (hardBoundary.effect !== "block") {
      errors.push(`Hard boundary effect must be block: ${hardBoundary.id}.`);
    }

    if (typeof hardBoundary.reason !== "string" || hardBoundary.reason.trim() === "") {
      errors.push(`Hard boundary is missing required reason: ${hardBoundary.id}.`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isDefaultMode(value: unknown): value is PolicyProfile["defaultMode"] {
  return value === "permissive" || value === "balanced" || value === "strict";
}
