import type {
  CompanyAlignmentInput,
  CompanyAlignmentInputValidationResult
} from "./types.js";

export function validateCompanyAlignmentInput(
  input: CompanyAlignmentInput
): CompanyAlignmentInputValidationResult {
  const errors: string[] = [];

  if (!isRecord(input)) {
    return {
      valid: false,
      errors: ["Company alignment input must be an object."]
    };
  }

  if (typeof input.id !== "string" || input.id.trim() === "") {
    errors.push("Company alignment input is missing required id.");
  }

  if (typeof input.name !== "string" || input.name.trim() === "") {
    errors.push("Company alignment input is missing required name.");
  }

  collectUniqueIdErrors("value", input.values, errors);
  collectUniqueIdErrors("role", input.roles, errors);
  collectUniqueIdErrors("data class", input.dataClasses, errors);
  collectUniqueIdErrors("environment", input.environments, errors);
  collectUniqueIdErrors("decision boundary", input.decisionBoundaries, errors);

  for (const tool of input.tools ?? []) {
    if (typeof tool.tool !== "string" || tool.tool.trim() === "") {
      errors.push("Tool entry is missing required tool.");
    }
  }

  for (const boundary of input.decisionBoundaries ?? []) {
    if (typeof boundary.id !== "string" || boundary.id.trim() === "") {
      errors.push("Decision boundary is missing required id.");
    }

    if (typeof boundary.label !== "string" || boundary.label.trim() === "") {
      errors.push("Decision boundary is missing required label.");
    }

    if (typeof boundary.requiresHumanApproval !== "boolean") {
      errors.push(`Decision boundary requiresHumanApproval must be boolean: ${boundary.id ?? "unknown"}.`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

function collectUniqueIdErrors(
  label: string,
  values: { id: string }[] | undefined,
  errors: string[]
): void {
  const seen = new Set<string>();

  for (const value of values ?? []) {
    if (typeof value.id !== "string" || value.id.trim() === "") {
      errors.push(`${capitalize(label)} entry is missing required id.`);
      continue;
    }

    if (seen.has(value.id)) {
      errors.push(`${capitalize(label)} ids must be unique: ${value.id}.`);
    }

    seen.add(value.id);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function capitalize(value: string): string {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}
