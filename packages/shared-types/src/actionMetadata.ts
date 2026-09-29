/** Metadata entering authorization hashes must have unambiguous JSON values.
 * Reject values that JSON would drop, coerce, execute or serialize by identity.
 */
export function assertActionMetadata(metadata: unknown): asserts metadata is Record<string, unknown> {
  const ancestors = new Set<object>();
  function visit(value: unknown): void {
    if (value === null || typeof value === "string" || typeof value === "boolean") return;
    if (typeof value === "number" && Number.isFinite(value)) return;
    if (typeof value !== "object" || value === null || ancestors.has(value)) throw new Error("Action metadata must contain only finite, acyclic JSON values.");
    const array = Array.isArray(value);
    if (!array && Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) {
      throw new Error("Action metadata must contain only plain JSON objects.");
    }
    ancestors.add(value);
    const keys = Reflect.ownKeys(value).filter(key => !(array && key === "length"));
    if (array && (keys.length !== value.length || keys.some((key, i) => key !== String(i)))) {
      throw new Error("Action metadata arrays must be dense JSON arrays.");
    }
    for (const key of keys) {
      const property = Object.getOwnPropertyDescriptor(value, key)!;
      if (typeof key !== "string" || !property.enumerable || !("value" in property)) {
        throw new Error("Action metadata must contain only enumerable JSON data properties.");
      }
      visit(property.value);
    }
    ancestors.delete(value);
  }
  if (metadata === null || typeof metadata !== "object" || Array.isArray(metadata)) {
    throw new Error("Action metadata must be a JSON object.");
  }
  visit(metadata);
}
