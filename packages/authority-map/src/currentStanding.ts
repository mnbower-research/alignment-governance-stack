import { sha256Stable } from "@alignment-governance-stack/runtime-binding";
import { createApprovalBinding } from "./validateApproval.js";
import { validateDelegatedAction } from "./delegationFormation.js";
import { assertJson } from "./jsonBoundary.js";
import { standingPointerValue, validateStandingContract } from "./standingContract.js";
import type { EvaluateCurrentStandingInput, StandingConditionResult, StandingEvaluation, StandingPredicate } from "./standingTypes.js";

/** No fetching, inference, cached verdict acceptance, or authority creation. Malformed JSON throws. */
export function evaluateCurrentStanding(input: EvaluateCurrentStandingInput): StandingEvaluation {
  const { delegation, action, evidence, host } = input;
  assertJson(delegation); assertJson(action); assertJson(evidence);
  if (!Array.isArray(evidence)) throw new Error("Standing evidence must be an array");
  const binding = createApprovalBinding(action);
  const result: Omit<StandingEvaluation, "digest"> = {
    version: "standing-evaluation/v1", delegation: { id: delegation.proposal.id, digest: delegation.digest },
    action: binding, evaluatedAt: host.now, state: "standing_unresolved", evidence: [], conditions: [], findings: []
  };
  // Retain content digests even for unusable canonical evidence; never synthesize favorable observations.
  for (const e of evidence) {
    if (!e || typeof e.id !== "string" || !e.id || !e.reference || typeof e.reference.ref !== "string"
      || !e.reference.ref || !["local_artifact", "external_source", "unresolved"].includes(e.reference.kind)) throw new Error("Invalid standing evidence reference");
    result.evidence.push({ id: e.id, digest: sha256Stable(e), reference: structuredClone(e.reference) });
  }
  const finish = (): StandingEvaluation => ({ ...result, digest: sha256Stable(result) });
  const authority = validateDelegatedAction(delegation, action, host);
  if (!authority.valid) {
    result.state = "standing_defeated";
    result.findings.push({ code: "standing_authority_invalid", reason: authority.reasons.join(" ") });
    return finish();
  }
  const contract = delegation.proposal.currentStanding;
  if (!contract) {
    result.findings.push({ code: "standing_contract_missing", reason: "No confirmed standing contract; no standing claim can be made." });
    return finish();
  }
  validateStandingContract(contract, delegation.proposal.permittedActions);
  const now = Date.parse(host.now);
  const horizons = [Date.parse(authority.validUntil!)];
  const conditions = contract.conditions.filter(c => c.actionId === action.id);
  const needed = new Set(conditions.map(c => c.dependencyId));
  if (new Set(evidence.map(e => e.id)).size !== evidence.length || evidence.some(e => !needed.has(e.dependencyId))) {
    result.findings.push({ code: "standing_evidence_ambiguous", reason: "Duplicate evidence IDs or evidence unrelated to this action." });
  }
  for (const condition of conditions) {
    const dependency = contract.dependencies.find(d => d.id === condition.dependencyId)!;
    const supplied = evidence.filter(e => e.dependencyId === dependency.id);
    const outcome: StandingConditionResult = { conditionId: condition.id, dependencyId: dependency.id,
      state: "standing_unresolved", code: "standing_evidence_missing", evidenceIds: supplied.map(e => e.id), resolution: "unresolved" };
    result.conditions.push(outcome);
    if (supplied.length === 0) continue;
    if (supplied.length !== 1) { outcome.code = "standing_evidence_conflicting"; continue; }
    const e = supplied[0]!;
    if (e.status !== "observed" || e.reference.kind === "unresolved" || e.document === undefined) { outcome.code = "standing_evidence_unusable"; continue; }
    if (e.delegationDigest !== delegation.digest || sha256Stable(e.action) !== sha256Stable(binding)
      || e.sourceId !== dependency.sourceId || !host.sourceIds.includes(e.sourceId)) { outcome.code = "standing_evidence_binding_mismatch"; continue; }
    const observed = Date.parse(e.observedAt);
    const expiry = e.validUntil === undefined ? Infinity : Date.parse(e.validUntil);
    const conditionExpiry = condition.validUntil === undefined ? Infinity : Date.parse(condition.validUntil);
    const freshUntil = observed + dependency.maxAgeMs;
    if (!Number.isFinite(observed) || observed > now || Number.isNaN(expiry) || expiry <= observed || !Number.isFinite(freshUntil)) {
      outcome.code = "standing_evidence_invalid_time"; continue;
    }
    const until = Math.min(freshUntil, expiry, conditionExpiry);
    if (until <= now) { outcome.code = "standing_evidence_stale"; continue; }
    const location = standingPointerValue(e.document, dependency.pointer);
    const truth = testPredicate(condition.predicate, location);
    if (truth === undefined) { outcome.code = "standing_evidence_unusable"; continue; }
    outcome.resolution = e.reference.kind === "local_artifact" ? "local_resolved" : "external_supplied";
    outcome.state = truth ? "standing_valid" : "standing_defeated";
    outcome.code = truth ? "standing_condition_satisfied" : "standing_condition_false";
    horizons.push(until);
  }
  for (const c of result.conditions) if (c.state !== "standing_valid") result.findings.push({ code: c.code, reason: `Condition ${c.conditionId}: ${c.state}.` });
  result.state = result.conditions.some(c => c.state === "standing_defeated") ? "standing_defeated"
    : result.findings.length || !result.conditions.length ? "standing_unresolved" : "standing_valid";
  if (result.state === "standing_valid") result.standingValidUntil = new Date(Math.min(...horizons)).toISOString();
  return finish();
}

/** Replay verification requires current inputs and host state, not merely a self-consistent result hash. */
export function verifyCurrentStanding(evaluation: StandingEvaluation, input: EvaluateCurrentStandingInput): boolean {
  try {
    assertJson(evaluation);
    return sha256Stable(evaluation) === sha256Stable(evaluateCurrentStanding(input));
  } catch { return false; }
}

function testPredicate(predicate: StandingPredicate, location: { found: boolean; value?: unknown }): boolean | undefined {
  if (predicate.operator === "exists") return location.found;
  if (predicate.operator === "absent") return !location.found;
  if (!location.found) return undefined;
  const value = location.value;
  if (value !== null && !["string", "number", "boolean"].includes(typeof value)) return undefined;
  switch (predicate.operator) {
    case "eq": return value === predicate.value;
    case "neq": return typeof value === typeof predicate.value ? value !== predicate.value : undefined;
    case "lte": return typeof value === "number" ? value <= predicate.value : undefined;
    case "gte": return typeof value === "number" ? value >= predicate.value : undefined;
    case "in": return predicate.values.some(v => v === value);
    default: return undefined;
  }
}
