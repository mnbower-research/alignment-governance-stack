import { createHash } from "node:crypto";

export function stableStringify(value: unknown): string {
  return stringifyStableValue(value);
}

export function sha256Stable(value: unknown): string {
  return `sha256:${createHash("sha256")
    .update(stableStringify(value))
    .digest("hex")}`;
}

function stringifyStableValue(value: unknown): string {
  if (value === null) {
    return "null";
  }

  if (Array.isArray(value)) {
    return `[${value
      .map((item) =>
        item === undefined ? "null" : stringifyStableValue(item),
      )
      .join(",")}]`;
  }

  if (value instanceof Date) {
    return JSON.stringify(value.toISOString());
  }

  const valueType = typeof value;

  if (
    valueType === "string" ||
    valueType === "number" ||
    valueType === "boolean"
  ) {
    return JSON.stringify(value);
  }

  if (valueType === "bigint") {
    return JSON.stringify((value as bigint).toString());
  }

  if (valueType === "object") {
    const record = value as Record<string, unknown>;
    const entries = Object.entries(record)
      .filter(([, entryValue]) => entryValue !== undefined)
      .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey));

    return `{${entries
      .map(
        ([key, entryValue]) =>
          `${JSON.stringify(key)}:${stringifyStableValue(entryValue)}`,
      )
      .join(",")}}`;
  }

  return "null";
}
