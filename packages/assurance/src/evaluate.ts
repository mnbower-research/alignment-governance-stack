import type { AgentActionProposal, AssuranceDecision, AssuranceEvidence, AssuranceFinding, AssuranceInput, AssuranceSlot, ValidatorAttestation } from "@alignment-governance-stack/shared-types" with { "resolution-mode": "import" };
import { assuranceDigest, assertAssuranceInput, createAssuranceBinding, verifyValidatorAttestation } from "./index.js";
import { canonicalAssurance, evaluateRisk } from "./model.js";

/** Evaluates trusted host policy/registry/history against supplied artifacts. Does not confer authority. */
export function evaluateAssurance(action: AgentActionProposal, supplied: AssuranceInput): AssuranceEvidence {
  assertAssuranceInput(supplied);
  const input = structuredClone(supplied);
  const { policy } = input;
  const now = Date.parse(input.evaluatedAt);
  const binding = createAssuranceBinding(action, input);
  const risk = evaluateRisk(action, input.risk, policy);
  const requirement = policy.requirements[risk.level === "unknown" ? "critical" : risk.level];
  const findings: AssuranceFinding[] = [];
  const add = (code: string, reason: string, attestationId?: string): void => { findings.push({ code, reason, ...(attestationId ? { attestationId } : {}) }); };
  let blocked = false;
  if (!input.historyComplete) { add("history_incomplete", "The host has not supplied complete case history; approval shopping cannot be excluded."); blocked = true; }
  if (action.assuranceRequirement && (action.assuranceRequirement.policyId !== policy.id || action.assuranceRequirement.policyVersion !== policy.version)) {
    add("policy_mismatch", "The host policy does not match the action's mandatory assurance requirement."); blocked = true;
  }
  for (const dimension of risk.unknown) add("risk_unknown", `Material risk ${dimension} is unknown; additional host information is required.`);
  const validators = new Map(input.validators.map(v => [v.id, v]));
  for (const validator of input.validators) {
    if (input.validators.some(other => other.subjectId === validator.subjectId && (other.type !== validator.type || other.independenceGroup !== validator.independenceGroup))) {
      add("identity_conflict", "Aliases of the same subject have conflicting type or independence metadata."); blocked = true;
    }
  }
  const ids = new Set<string>();
  const approvals: ValidatorAttestation[] = [];
  const rejectedAttestations: AssuranceEvidence["rejectedAttestations"] = [];
  const unresolvedDenialIds: string[] = [];
  const resolvedDenials: AssuranceEvidence["resolvedDenials"] = [];
  const activeResolutionExpiries: number[] = [];
  const attestations = [...input.attestations].sort((a, b) => a.id.localeCompare(b.id, "en"));
  let revision = false; let abstention = false;
  for (const attestation of attestations) {
    const reasons: string[] = [];
    const validator = validators.get(attestation.validatorId);
    const integrity = verifyValidatorAttestation(attestation);
    if (!integrity) { reasons.push("integrity_invalid"); blocked = true; }
    if (ids.has(attestation.id)) { reasons.push("duplicate_attestation_id"); blocked = true; }
    ids.add(attestation.id);
    const recognized = validator && validator.type === attestation.validatorType && validator.roles.includes(attestation.role) &&
      validator.authorityDomains.includes(attestation.authorityDomain) && validator.independenceGroup === attestation.independenceGroup;
    if (!recognized) reasons.push("validator_unrecognized");
    if (validator?.revoked || attestation.revoked || (attestation.revokedAt !== undefined && Date.parse(attestation.revokedAt) <= now)) reasons.push("attestation_revoked");
    if (Date.parse(attestation.createdAt) > now) reasons.push("attestation_from_future");
    if (Date.parse(attestation.expiresAt) <= now) reasons.push("attestation_expired");
    if (Date.parse(attestation.createdAt) + requirement.maxAgeMs <= now) reasons.push("attestation_stale");
    if (attestation.policyVersion !== policy.version) reasons.push("policy_version_mismatch");
    if (canonicalAssurance(attestation.binding) !== canonicalAssurance(binding)) reasons.push("material_binding_mismatch");
    if (attestation.authorityDomain !== input.authorityDomain && !requirement.slots.some(s => s.authorityDomain === attestation.authorityDomain)) reasons.push("authority_domain_mismatch");
    if (requirement.requiredEvidence.some(ref => !attestation.evidenceRefs.includes(ref))) reasons.push("evidence_missing");

    // Refusals from this case remain history even when stale, revoked, or bound to an earlier revision.
    if (integrity && attestation.binding.caseId === input.caseId && ["deny", "request_revision"].includes(attestation.verdict)) {
      const resolution = input.resolutions.find(r => {
        const resolver = validators.get(r.resolverId);
        return r.attestationIds.includes(attestation.id) && canonicalAssurance(r.binding) === canonicalAssurance(binding) &&
          resolver?.type === "human" && !resolver.revoked && resolver.authorityDomains.includes(input.authorityDomain) &&
          (policy.resolutionRoles[r.kind] ?? []).some(role => resolver.roles.includes(role)) &&
          Date.parse(r.createdAt) >= Date.parse(attestation.createdAt) && Date.parse(r.createdAt) <= now && now < Date.parse(r.expiresAt) &&
          (r.kind !== "material_revision" || r.binding.actionDigest !== attestation.binding.actionDigest || r.binding.riskDigest !== attestation.binding.riskDigest);
      });
      if (resolution) { resolvedDenials.push({ attestationId: attestation.id, resolutionId: resolution.id }); activeResolutionExpiries.push(Date.parse(resolution.expiresAt)); }
      else if (policy.denialExpiry === "attestation_expiry" && Date.parse(attestation.expiresAt) <= now) resolvedDenials.push({ attestationId: attestation.id, resolutionId: "policy:attestation_expiry" });
      else { unresolvedDenialIds.push(attestation.id); revision ||= attestation.verdict === "request_revision"; add("unresolved_denial", "An earlier material refusal remains unresolved; approval is not a resolution and refusal is not a truth claim.", attestation.id); }
    }
    if (reasons.length) {
      rejectedAttestations.push({ id: attestation.id, reasons });
      reasons.forEach(reason => add(reason, `Attestation ${attestation.id} cannot occupy an assurance slot: ${reason}.`, attestation.id));
    } else if (attestation.verdict === "approve") approvals.push(attestation);
    else if (attestation.verdict === "abstain") { abstention = true; add("validator_abstained", "A current validator abstained; no positive assurance was provided.", attestation.id); }
  }
  // Keep role alternatives available to the assignment search; identity cannot occupy two slots.
  // Prefer longer valid evidence so an optional short-lived duplicate cannot shorten the window.
  const horizon = (a: ValidatorAttestation): number => Math.min(Date.parse(a.expiresAt), Date.parse(a.createdAt) + requirement.maxAgeMs);
  const candidates = [...approvals].sort((a, b) => horizon(b) - horizon(a) || a.id.localeCompare(b.id, "en"));
  const slots: AssuranceSlot[] = [...requirement.slots];
  while (slots.length < requirement.minimumAttestations) {
    let id = `$quorum-${slots.length}`;
    while (slots.some(s => s.id === id)) id = `$${id}`;
    slots.push({ id });
  }
  let assignments: Record<string, ValidatorAttestation> | undefined;
  let attempts = 0;
  const search = (index: number, selected: Record<string, ValidatorAttestation>): void => {
    if (assignments || ++attempts > 50_000) return;
    if (index === slots.length) {
      if (requirement.mandatoryHuman && !Object.values(selected).some(a => a.validatorType === "human")) return;
      if (requirement.sequence.some((id, n) => n > 0 && Date.parse(selected[id]!.createdAt) <= Date.parse(selected[requirement.sequence[n - 1]!]!.createdAt))) return;
      assignments = { ...selected }; return;
    }
    const slot = slots[index]!;
    for (const a of candidates) {
      if (Object.values(selected).some(other => validators.get(other.validatorId)!.subjectId === validators.get(a.validatorId)!.subjectId || (requirement.distinctGroups && other.independenceGroup === a.independenceGroup))) continue;
      if ((slot.role && slot.role !== a.role) || (slot.authorityDomain && slot.authorityDomain !== a.authorityDomain) || (slot.independenceGroup && slot.independenceGroup !== a.independenceGroup) || (slot.validatorType && slot.validatorType !== a.validatorType)) continue;
      search(index + 1, { ...selected, [slot.id]: a });
    }
  };
  search(0, {});
  // Named non-human slots are a floor, not a prohibition on an additional human.
  if (!assignments && requirement.mandatoryHuman && attempts <= 50_000) {
    let id = "$human";
    while (slots.some(s => s.id === id)) id = `$${id}`;
    slots.push({ id, validatorType: "human" });
    search(0, {});
  }
  if (!assignments) add("independent_slots_missing", "Required roles, domains, sequence, quorum, or distinct independent slots are not satisfied.");
  if (requirement.mandatoryHuman && !candidates.some(a => a.validatorType === "human")) add("mandatory_human_missing", "A mandatory human validator cannot be replaced by agent consensus.");
  if (attempts > 50_000) add("evaluation_limit", "Review assignment complexity exceeded the deterministic limit; narrow the supplied candidate set.");
  let decision: AssuranceDecision = "satisfied";
  if (blocked) decision = "blocked";
  else if (unresolvedDenialIds.length) decision = revision ? "request_revision" : requirement.denialBlocks ? "blocked" : "escalate";
  else if (risk.unknown.length) decision = "escalate";
  else if (!assignments || (requirement.unanimity && abstention)) decision = requirement.onInsufficient;
  const accepted = Object.values(assignments ?? {});
  const subjects = new Set<string>();
  for (const a of [...accepted, ...candidates.filter(a => !accepted.includes(a))]) {
    const subject = validators.get(a.validatorId)!.subjectId;
    if (subjects.has(subject)) {
      rejectedAttestations.push({ id: a.id, reasons: ["duplicate_validator"] });
      add("duplicate_validator", "The same underlying subject cannot count twice, including aliases.", a.id);
    }
    subjects.add(subject);
  }
  const validUntil = decision === "satisfied" ? new Date(Math.min(now + requirement.ttlMs, ...activeResolutionExpiries,
    ...accepted.map(a => Math.min(Date.parse(a.expiresAt), Date.parse(a.createdAt) + requirement.maxAgeMs)))).toISOString() : undefined;
  const body: Omit<AssuranceEvidence, "digest"> = {
    version: "assurance-evidence/v0.1", historyComplete: input.historyComplete, binding, evaluatedAt: input.evaluatedAt, ...(validUntil ? { validUntil } : {}), risk: risk.risk, policy,
    requirement, validators: input.validators, attestations, resolutions: input.resolutions,
    acceptedAttestationIds: accepted.map(a => a.id).sort(), rejectedAttestations,
    unresolvedDenialIds: [...new Set(unresolvedDenialIds)], resolvedDenials, slotAssignments: Object.fromEntries(Object.entries(assignments ?? {}).map(([id, a]) => [id, a.id])),
    independenceGroups: [...new Set(accepted.map(a => a.independenceGroup))].sort(), decision, findings
  };
  return { ...body, digest: assuranceDigest(body) };
}
