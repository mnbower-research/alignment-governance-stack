import type { AgentActionProposal } from "@alignment-governance-stack/shared-types";
import type { StandingContract, StandingScalar } from "./standingTypes.js";
import { assertJson } from "./jsonBoundary.js";

export function validStandingPointer(pointer: unknown): pointer is string {
  return typeof pointer === "string" && (pointer === "" || pointer.startsWith("/")) && !/~(?![01])/.test(pointer);
}
const scalar = (v: unknown): v is StandingScalar => v === null || ["string", "number", "boolean"].includes(typeof v);
export function validateStandingContract(contract: StandingContract, actions: AgentActionProposal[]): void {
  assertJson(contract);
  if (contract.version !== "standing-contract/v1" || !Array.isArray(contract.dependencies) || !Array.isArray(contract.conditions)
    || !contract.conditions.length || !contract.dependencies.length) throw new Error("Invalid standing contract");
  const unique = (ids: string[]): boolean => ids.every(id => typeof id === "string" && id.length > 0) && new Set(ids).size === ids.length;
  if (!unique(actions.map(a => a.id)) || !unique(contract.dependencies.map(d => d.id)) || !unique(contract.conditions.map(c => c.id))) throw new Error("Ambiguous standing identities");
  for (const d of contract.dependencies) if (typeof d.sourceId !== "string" || !d.sourceId || !validStandingPointer(d.pointer)
    || !Number.isSafeInteger(d.maxAgeMs) || d.maxAgeMs <= 0) throw new Error("Invalid standing dependency");
  for (const c of contract.conditions) {
    if (!actions.some(a => a.id === c.actionId) || !contract.dependencies.some(d => d.id === c.dependencyId)
      || (c.validUntil !== undefined && !Number.isFinite(Date.parse(c.validUntil)))) throw new Error("Invalid standing condition binding");
    const p = c.predicate;
    switch (p.operator) {
      case "eq": case "neq": if (!scalar(p.value)) throw new Error("Scalar standing operand required"); break;
      case "lte": case "gte": if (typeof p.value !== "number" || !Number.isFinite(p.value)) throw new Error("Numeric standing operand required"); break;
      case "in": if (!Array.isArray(p.values) || !p.values.length || !p.values.every(scalar)) throw new Error("Explicit standing set required"); break;
      case "exists": case "absent": break;
      default: throw new Error("Unsupported standing operator");
    }
  }
  if (actions.some(a => !contract.conditions.some(c => c.actionId === a.id))) throw new Error("Every opted-in action requires standing conditions");
}

/** Resolves own JSON locations; absent is distinct from null or unresolved evidence. */
export function standingPointerValue(document: unknown, pointer: string): { found: boolean; value?: unknown } {
  let value = document;
  if (pointer === "") return { found: true, value };
  for (const token of pointer.slice(1).split("/")) {
    const key = token.replace(/~1/g, "/").replace(/~0/g, "~");
    if (value === null || typeof value !== "object" || !Object.prototype.hasOwnProperty.call(value, key)
      || (Array.isArray(value) && !/^(0|[1-9][0-9]*)$/.test(key))) return { found: false };
    value = (value as Record<string, unknown>)[key];
  }
  return { found: true, value };
}
