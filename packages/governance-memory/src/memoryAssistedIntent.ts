import { assertCanonicalDelegationJson } from "@alignment-governance-stack/authority-map";
import { sha256Stable } from "@alignment-governance-stack/runtime-binding";
import { evaluateInternalization } from "./evaluateInternalization.js";
import type { MemoryAssistedInterpretation, MemoryInterpretationInput } from "./internalizationTypes.js";

/** Produces provisional information only. Never creates or updates an action or delegation. */
export function proposeMemoryAssistedIntent(input: MemoryInterpretationInput): MemoryAssistedInterpretation {
  assertCanonicalDelegationJson(input);
  // Establish exact string identities before duplicate checks or object insertion.
  for (const slot of input.slots) {
    if (typeof slot.parameter !== "string" || !slot.parameter || typeof slot.key !== "string" || !slot.key
      || !["preference","procedure"].includes(slot.category)
      || ["__proto__","constructor","prototype"].includes(slot.parameter)) throw new Error("Invalid interpretation slot");
  }
  if (input.subjectId !== input.expression.humanId || !input.expression.id || !input.expression.text || !input.intentId || !input.objective
    || typeof input.expression.expressedAt !== "string" || typeof input.history.host.now !== "string"
    || !Number.isFinite(Date.parse(input.expression.expressedAt)) || Date.parse(input.expression.expressedAt) > Date.parse(input.history.host.now)
    || new Set(input.slots.map(s => s.parameter)).size !== input.slots.length) throw new Error("Invalid subject, expression or interpretation slots");
  const snapshot = evaluateInternalization(input.history);
  const intent: MemoryAssistedInterpretation["intent"] = { id: input.intentId, status: "provisional", expressionId: input.expression.id,
    objective: input.objective, parameters: {}, preferences: {}, constraints: [], unresolved: [], confidence: 0 };
  const provenance: MemoryAssistedInterpretation["parameterProvenance"] = {};
  for (const slot of input.slots) {
    const candidate = snapshot.candidates.find(c => c.subjectId === input.subjectId && c.contextKey === input.contextKey && c.category === slot.category
      && c.key === slot.key && c.state === "supported" && c.freshness === "current");
    if (!candidate) { intent.unresolved.push({ id: `memory:${slot.parameter}`, kind: slot.category === "preference" ? "preference_uncertainty" : "missing_information", question: `Specify ${slot.parameter}; current memory does not resolve it.` }); continue; }
    intent.parameters[slot.parameter] = structuredClone(candidate.value);
    provenance[slot.parameter] = { kind: "inference_awaiting_confirmation", sourceId: candidate.digest, pointer: "/value" };
  }
  const body = { intent, parameterProvenance: provenance, memoryDigest: snapshot.digest,
    metrics: { requestedParameters: input.slots.length, suppliedParameters: Object.keys(provenance).length, remainingClarifications: intent.unresolved.length }, authorityEffect: "none" as const };
  assertCanonicalDelegationJson(body);
  const result = { ...body, digest: sha256Stable(body) };
  assertCanonicalDelegationJson(result);
  return result;
}
