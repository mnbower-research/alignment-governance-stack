import { createHash } from "node:crypto";
import type {
  ExecutionConstraint,
  ExecutionConstraintSet,
  JsonValue
} from "@alignment-governance-stack/shared-types";
import type { RuntimeBindingFailure } from "./types.js";

export function hashExecutionConstraintSet(constraints: ExecutionConstraintSet): string {
  return sha256Stable(canonicalizeExecutionConstraintSet(constraints));
}

export function canonicalizeExecutionConstraintSet(constraints: ExecutionConstraintSet): ExecutionConstraintSet {
  return {
    version: constraints.version,
    constraints: Object.fromEntries(
      Object.keys(constraints.constraints)
        .sort()
        .map((key) => [key, canonicalizeExecutionConstraint(constraints.constraints[key]!)])
    ),
    ...(constraints.metadata !== undefined ? { metadata: canonicalizeJsonObject(constraints.metadata) } : {})
  };
}

export function compareExecutionConstraintSets(
  expected: ExecutionConstraintSet | undefined,
  actual: ExecutionConstraintSet | undefined
): RuntimeBindingFailure[] {
  if (expected === undefined && actual === undefined) {
    return [];
  }

  if (expected === undefined && actual !== undefined) {
    return [
      {
        code: "execution_constraint_unexpected",
        reason: "Execution denied because the runtime action added bound execution constraints that were not in the permit.",
        actual
      }
    ];
  }

  if (expected !== undefined && actual === undefined) {
    return [
      {
        code: "execution_constraint_missing",
        reason: "Execution denied because the runtime action omitted required bound execution constraints.",
        expected
      }
    ];
  }

  const expectedSet = canonicalizeExecutionConstraintSet(expected!);
  const actualSet = canonicalizeExecutionConstraintSet(actual!);
  const failures: RuntimeBindingFailure[] = [];
  const expectedKeys = Object.keys(expectedSet.constraints).sort();
  const actualKeys = Object.keys(actualSet.constraints).sort();

  for (const key of expectedKeys) {
    if (!(key in actualSet.constraints)) {
      failures.push({
        code: "execution_constraint_missing",
        reason: `Execution denied because required bound constraint '${key}' is missing.`,
        expected: expectedSet.constraints[key]
      });
      continue;
    }

    failures.push(...compareExecutionConstraint(key, expectedSet.constraints[key]!, actualSet.constraints[key]!));
  }

  for (const key of actualKeys) {
    if (!(key in expectedSet.constraints)) {
      failures.push({
        code: "execution_constraint_unexpected",
        reason: `Execution denied because runtime action supplied unexpected bound constraint '${key}'.`,
        actual: actualSet.constraints[key]
      });
    }
  }

  return failures;
}

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(",")}}`;
}

export function sha256Stable(value: unknown): string {
  return `sha256:${createHash("sha256").update(stableStringify(value)).digest("hex")}`;
}

function compareExecutionConstraint(
  key: string,
  expected: ExecutionConstraint,
  actual: ExecutionConstraint
): RuntimeBindingFailure[] {
  if (expected.type !== actual.type) {
    return [
      {
        code: "execution_constraint_type_mismatch",
        reason: `Execution denied because bound constraint '${key}' changed type.`,
        expected: expected.type,
        actual: actual.type
      }
    ];
  }

  if (expected.type === "numeric_range" && actual.type === "numeric_range") {
    return compareNumericRange(key, expected, actual);
  }

  if (expected.type === "time_window" && actual.type === "time_window") {
    return compareTimeWindow(key, expected, actual);
  }

  if (expected.type === "string_set" && actual.type === "string_set") {
    return compareStringSet(key, expected, actual);
  }

  const expectedCanonical = canonicalizeExecutionConstraint(expected);
  const actualCanonical = canonicalizeExecutionConstraint(actual);

  if (stableStringify(expectedCanonical) !== stableStringify(actualCanonical)) {
    return [
      {
        code: "execution_constraint_value_mismatch",
        reason: `Execution denied because bound constraint '${key}' value changed.`,
        expected: expectedCanonical,
        actual: actualCanonical
      }
    ];
  }

  return [];
}

function compareNumericRange(
  key: string,
  expected: Extract<ExecutionConstraint, { type: "numeric_range" }>,
  actual: Extract<ExecutionConstraint, { type: "numeric_range" }>
): RuntimeBindingFailure[] {
  if (expected.unit !== actual.unit) {
    return [
      {
        code: "execution_constraint_value_mismatch",
        reason: `Execution denied because bound numeric range '${key}' unit changed.`,
        expected: expected.unit,
        actual: actual.unit
      }
    ];
  }

  if (actual.min < expected.min || actual.max > expected.max) {
    return [
      {
        code: "execution_constraint_range_expansion",
        reason: `Execution denied because bound numeric range '${key}' was widened.`,
        expected,
        actual
      }
    ];
  }

  if (
    actual.min !== expected.min ||
    actual.max !== expected.max ||
    (actual.inclusiveMin ?? true) !== (expected.inclusiveMin ?? true) ||
    (actual.inclusiveMax ?? true) !== (expected.inclusiveMax ?? true)
  ) {
    return [
      {
        code: "execution_constraint_value_mismatch",
        reason: `Execution denied because bound numeric range '${key}' changed.`,
        expected,
        actual
      }
    ];
  }

  return [];
}

function compareStringSet(
  key: string,
  expected: Extract<ExecutionConstraint, { type: "string_set" }>,
  actual: Extract<ExecutionConstraint, { type: "string_set" }>
): RuntimeBindingFailure[] {
  const expectedValues = [...new Set(expected.values)].sort();
  const actualValues = [...new Set(actual.values)].sort();
  const expanded = actualValues.some((value) => !expectedValues.includes(value));

  if (expanded) {
    return [
      {
        code: "execution_constraint_set_expansion",
        reason: `Execution denied because bound string set '${key}' was expanded.`,
        expected: expectedValues,
        actual: actualValues
      }
    ];
  }

  if (stableStringify(expectedValues) !== stableStringify(actualValues)) {
    return [
      {
        code: "execution_constraint_value_mismatch",
        reason: `Execution denied because bound string set '${key}' changed.`,
        expected: expectedValues,
        actual: actualValues
      }
    ];
  }

  return [];
}

function compareTimeWindow(
  key: string,
  expected: Extract<ExecutionConstraint, { type: "time_window" }>,
  actual: Extract<ExecutionConstraint, { type: "time_window" }>
): RuntimeBindingFailure[] {
  const expectedStart = Date.parse(expected.startsAt);
  const expectedEnd = Date.parse(expected.endsAt);
  const actualStart = Date.parse(actual.startsAt);
  const actualEnd = Date.parse(actual.endsAt);

  if (
    Number.isFinite(expectedStart) &&
    Number.isFinite(expectedEnd) &&
    Number.isFinite(actualStart) &&
    Number.isFinite(actualEnd) &&
    (actualStart < expectedStart || actualEnd > expectedEnd)
  ) {
    return [
      {
        code: "execution_constraint_time_window_expansion",
        reason: `Execution denied because bound time window '${key}' was widened.`,
        expected,
        actual
      }
    ];
  }

  if (expected.startsAt !== actual.startsAt || expected.endsAt !== actual.endsAt) {
    return [
      {
        code: "execution_constraint_value_mismatch",
        reason: `Execution denied because bound time window '${key}' changed.`,
        expected,
        actual
      }
    ];
  }

  return [];
}

function canonicalizeExecutionConstraint(constraint: ExecutionConstraint): ExecutionConstraint {
  if (constraint.type === "enum") {
    return { ...constraint, allowedValues: [...new Set(constraint.allowedValues)].sort() };
  }

  if (constraint.type === "string_set") {
    return { ...constraint, values: [...new Set(constraint.values)].sort() };
  }

  if (constraint.type === "structured_object") {
    return { ...constraint, value: canonicalizeJsonValue(constraint.value) };
  }

  return { ...constraint };
}

function canonicalizeJsonValue(value: JsonValue): JsonValue {
  if (value === null || typeof value !== "object") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => canonicalizeJsonValue(item));
  }

  return canonicalizeJsonObject(value);
}

function canonicalizeJsonObject(value: Record<string, JsonValue>): Record<string, JsonValue> {
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalizeJsonValue(value[key]!)]));
}
