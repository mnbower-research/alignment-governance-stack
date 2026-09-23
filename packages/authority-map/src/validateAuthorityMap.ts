import type { AuthorityMap, AuthorityMapValidationResult } from "./types.js";

export function validateAuthorityMap(authorityMap: AuthorityMap): AuthorityMapValidationResult {
  if (!isRecord(authorityMap)) {
    throw new TypeError("Authority map must be an object.");
  }

  const errors: string[] = [];

  if (typeof authorityMap.id !== "string" || authorityMap.id.trim() === "") {
    errors.push("Authority map is missing required id.");
  }

  if (typeof authorityMap.name !== "string" || authorityMap.name.trim() === "") {
    errors.push("Authority map is missing required name.");
  }

  if (typeof authorityMap.version !== "string" || authorityMap.version.trim() === "") {
    errors.push("Authority map is missing required version.");
  }

  if (!Array.isArray(authorityMap.roles)) {
    errors.push("Authority map roles must be an array.");
    return { valid: false, errors };
  }

  if (authorityMap.defaultApprovalTtlMinutes !== undefined && (!Number.isFinite(authorityMap.defaultApprovalTtlMinutes) || authorityMap.defaultApprovalTtlMinutes <= 0)) errors.push("Approval TTL must be a positive finite number.");

  const roleIds = new Set<string>();

  for (const role of authorityMap.roles) {
    if (typeof role.id !== "string" || role.id.trim() === "") {
      errors.push("Authority role is missing required id.");
      continue;
    }

    if (roleIds.has(role.id)) {
      errors.push(`Authority role id must be unique: ${role.id}.`);
    }

    roleIds.add(role.id);

    if (typeof role.label !== "string" || role.label.trim() === "") {
      errors.push(`Authority role is missing required label: ${role.id}.`);
    }

    if (!Array.isArray(role.scopes)) {
      errors.push(`Authority role scopes must be an array: ${role.id}.`);
      continue;
    }

    const scopeIds = new Set<string>();

    for (const scope of role.scopes) {
      if (typeof scope.id !== "string" || scope.id.trim() === "") {
        errors.push(`Authority scope is missing required id for role: ${role.id}.`);
        continue;
      }

      if (scopeIds.has(scope.id)) {
        errors.push(`Authority scope id must be unique within role ${role.id}: ${scope.id}.`);
      }

      scopeIds.add(scope.id);
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

