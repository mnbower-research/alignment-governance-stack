/** Reject non-JSON and lossy values before applying the existing stable canonicalizer. */
export function assertJson(value: unknown): void {
  const seen = new Set<object>();
  function visit(v: unknown): void {
    if (v === null || typeof v === "string" || typeof v === "boolean"
      || (typeof v === "number" && Number.isFinite(v) && !Object.is(v, -0))) return;
    if (typeof v !== "object" || seen.has(v)) throw new Error("Delegation artifacts must be finite, acyclic JSON");
    const array = Array.isArray(v);
    if (Object.getPrototypeOf(v) !== (array ? Array.prototype : Object.prototype)) throw new Error("Delegation artifacts require plain JSON containers");
    const keys = Reflect.ownKeys(v);
    if (array && keys.length !== v.length + 1) throw new Error("Sparse arrays or named array properties are not JSON");
    seen.add(v);
    for (const key of keys) {
      if (array && key === "length") continue;
      if (typeof key !== "string" || (array && (!/^(0|[1-9][0-9]*)$/.test(key) || Number(key) >= v.length))) throw new Error("Non-JSON property");
      const descriptor = Object.getOwnPropertyDescriptor(v, key)!;
      if (!descriptor.enumerable || !("value" in descriptor)) throw new Error("Non-JSON descriptor");
      visit(descriptor.value);
    }
    seen.delete(v);
  }
  visit(value);
}
