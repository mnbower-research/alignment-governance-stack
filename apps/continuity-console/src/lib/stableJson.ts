function normalizeForJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizeForJson);
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.keys(record)
        .sort()
        .map((key) => [key, normalizeForJson(record[key])]),
    );
  }

  return value;
}

export function stableStringify(value: unknown): string {
  return `${JSON.stringify(normalizeForJson(value), null, 2)}\n`;
}

