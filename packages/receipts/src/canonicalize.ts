const omitted = Symbol("omitted");

type Omitted = typeof omitted;

export function canonicalizeForHash(value: unknown): string {
  const normalized = normalizeForHash(value);

  if (normalized === omitted) {
    return JSON.stringify(null);
  }

  return JSON.stringify(normalized);
}

function normalizeForHash(value: unknown): unknown | Omitted {
  if (value === undefined || typeof value === "function" || typeof value === "symbol") {
    return omitted;
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (value === null || typeof value !== "object") {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeForHash(item))
      .filter((item): item is Exclude<unknown, Omitted> => item !== omitted);
  }

  const record = value as Record<string, unknown>;
  const normalized: Record<string, unknown> = {};

  for (const key of Object.keys(record).sort()) {
    const normalizedValue = normalizeForHash(record[key]);

    if (normalizedValue !== omitted) {
      normalized[key] = normalizedValue;
    }
  }

  return normalized;
}
