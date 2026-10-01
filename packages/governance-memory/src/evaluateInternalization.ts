import { assertCanonicalDelegationJson } from "@alignment-governance-stack/authority-map";
import { sha256Stable } from "@alignment-governance-stack/runtime-binding";
import { createMemoryObservation } from "./memoryObservation.js";
import type { InternalizationInput, InternalizationSnapshot, MemoryCandidate, MemoryObservation, InternalizationRecommendation } from "./internalizationTypes.js";

const partition = (o: MemoryObservation): string => sha256Stable([o.category, o.subjectId, o.contextKey, o.key]);
const compare = (a: string, b: string): number => a < b ? -1 : a > b ? 1 : 0;
/** No imported maturity flags, prediction thresholds, authority mutation, or hidden clock. */
export function evaluateInternalization(input: InternalizationInput): InternalizationSnapshot {
  assertCanonicalDelegationJson(input);
  if (typeof input.host.now !== "string") throw new Error("Memory clock must be a primitive timestamp string");
  const now = Date.parse(input.host.now), age = input.host.maxObservationAgeMs, minimum = input.host.minInferredSupport;
  if (!Number.isFinite(now) || !Number.isSafeInteger(age) || age <= 0 || !Number.isSafeInteger(minimum) || minimum < 1) throw new Error("Explicit valid memory clock and support/freshness policy required");
  const receipts = new Map(input.receipts.map(r => [r.id,r]));
  const observations = [...input.observations].sort((a,b) => compare(a.id,b.id));
  const byId = new Map(observations.map(o => [o.id,o]));
  if (receipts.size !== input.receipts.length || byId.size !== observations.length) throw new Error("Duplicate memory/source identities");
  for (const o of observations) {
    const receipt = receipts.get(o.source.receiptId);
    if (!receipt || input.host.receiptHashes[receipt.id] !== receipt.receiptHash || receipt.receiptHash !== o.source.receiptHash
      || typeof receipt.createdAt !== "string" || typeof o.observedAt !== "string"
      || Date.parse(receipt.createdAt) > now || Date.parse(o.observedAt) > now) throw new Error("Unrecognized, missing, malformed or future source evidence");
    if (sha256Stable(o) !== sha256Stable(createMemoryObservation(receipt,o.source.pointer))) throw new Error("Memory observation does not match retained receipt provenance");
  }
  const superseded = new Set<string>();
  for (const o of observations) for (const id of o.supersedes) {
    const previous = byId.get(id);
    if (!previous || partition(previous) !== partition(o) || Date.parse(previous.observedAt) >= Date.parse(o.observedAt)) throw new Error("Correction must reference earlier evidence of the same subject, context and memory key");
    superseded.add(id);
  }
  const fresh = (o: MemoryObservation): boolean => now < Date.parse(o.observedAt) + age;
  const receiptCount = (list: MemoryObservation[]): number => new Set(list.map(o => o.source.receiptHash)).size;
  const groups = new Map<string,MemoryObservation[]>();
  for (const o of observations) { const k = partition(o); groups.set(k,[...(groups.get(k) ?? []),o]); }
  const candidates: MemoryCandidate[] = [];
  for (const entries of groups.values()) {
    const active = entries.filter(o => !superseded.has(o.id));
    const explicitValues = new Set(active.filter(o => o.classification === "explicit").map(o => sha256Stable(o.value)));
    const freshValues = new Set(active.filter(fresh).map(o => sha256Stable(o.value)));
    const values = new Map<string,MemoryObservation[]>();
    for (const o of entries) { const k = sha256Stable(o.value); values.set(k,[...(values.get(k) ?? []),o]); }
    for (const [valueHash,history] of values) {
      const sample = history[0]!, current = history.filter(o => !superseded.has(o.id)), supporting = current.filter(fresh);
      const explicit = supporting.filter(o => o.classification === "explicit"), inferred = supporting.filter(o => o.classification === "inferred");
      let state: MemoryCandidate["state"] = "candidate";
      if (!current.length) state = "superseded";
      else if (explicitValues.size > 1 || (explicitValues.size === 0 && freshValues.size > 1)) state = "contested";
      else if (explicitValues.size === 1) state = !explicitValues.has(valueHash) ? "contested" : explicit.length ? "supported" : "candidate";
      else if (receiptCount(inferred) >= minimum) state = "supported";
      const times = history.map(o => Date.parse(o.observedAt));
      const body: Omit<MemoryCandidate,"digest"> = { category: sample.category, subjectId: sample.subjectId, contextKey: sample.contextKey, key: sample.key,
        value: structuredClone(sample.value), state, freshness: supporting.length ? "current" : "stale",
        evidence: history.map(o => ({ observationId: o.id, digest: o.digest, classification: o.classification, observedAt: o.observedAt })),
        activeSupportIds: supporting.map(o => o.id), contradictoryIds: active.filter(o => sha256Stable(o.value) !== valueHash).map(o => o.id),
        supersededIds: history.filter(o => superseded.has(o.id)).map(o => o.id), supportCount: receiptCount(supporting),
        explicitSupportCount: receiptCount(explicit), inferredSupportCount: receiptCount(inferred),
        firstObservedAt: new Date(Math.min(...times)).toISOString(), lastObservedAt: new Date(Math.max(...times)).toISOString() };
      candidates.push({ ...body, digest: sha256Stable(body) });
    }
  }
  candidates.sort((a,b) => compare(a.digest,b.digest));
  const recommendations: InternalizationRecommendation[] = candidates.filter(c => c.category === "observed_routine" && c.state === "supported" && c.freshness === "current").map(c => {
    const body = { type: "standing_delegation_recommendation" as const, candidateDigest: c.digest, subjectId: c.subjectId, contextKey: c.contextKey,
      humanReviewRequired: true as const, authorityEffect: "none" as const,
      rationale: "Consider human review of a bounded standing delegation. Historical recurrence grants no authority; normal formation and confirmation remain required." };
    return { ...body, digest: sha256Stable(body) };
  });
  const body: Omit<InternalizationSnapshot,"digest"> = { version: "internalization/v1", evaluatedAt: input.host.now,
    policy: { maxObservationAgeMs: age, minInferredSupport: minimum }, observations: structuredClone(observations), candidates, recommendations, authorityEffect: "none" };
  return { ...body, digest: sha256Stable(body) };
}
export function verifyInternalization(snapshot: InternalizationSnapshot, input: InternalizationInput): boolean {
  try { assertCanonicalDelegationJson(snapshot); return sha256Stable(snapshot) === sha256Stable(evaluateInternalization(input)); } catch { return false; }
}
