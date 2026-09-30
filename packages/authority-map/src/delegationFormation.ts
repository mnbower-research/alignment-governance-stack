import type { AgentActionProposal } from "@alignment-governance-stack/shared-types";
import { sha256Stable } from "@alignment-governance-stack/runtime-binding";
import { createApprovalBinding, validateApproval } from "./validateApproval.js";
import type { ApprovalValidationResult } from "./types.js";
import type { CurrentDelegationContext, DelegationConfirmation, DelegationHostContext, DelegationProposal,
  DelegationRevocation, DelegationState, EstablishedDelegation, HumanExpression, IntentProposal } from "./delegationTypes.js";

export function hashDelegationProposal(proposal: DelegationProposal): string {
  assertJson(proposal);
  return sha256Stable(proposal);
}

export function delegationFormationState(expression: HumanExpression, intent?: IntentProposal): DelegationState {
  if (!expression.id || !expression.humanId || !expression.text || !Number.isFinite(Date.parse(expression.expressedAt))) throw new Error("Invalid human expression");
  if (!intent) return "task_initiated";
  if (intent.status !== "provisional" || intent.expressionId !== expression.id) throw new Error("Intent must remain provisional and traceable");
  return intent.unresolved.length ? "clarification_required" : "interpretation_proposed";
}

/** Enumerate material leaf paths using JSON Pointer escaping, including empty containers. */
export function delegationMaterialPaths(proposal: Omit<DelegationProposal, "provenance">): string[] {
  const paths: string[] = [];
  function visit(value: unknown, path: string): void {
    if (value && typeof value === "object" && Object.keys(value).length) {
      for (const [key, child] of Object.entries(value)) visit(child, `${path}/${key.replace(/~/g, "~0").replace(/\//g, "~1")}`);
    } else paths.push(path);
  }
  visit(proposal, "");
  return paths;
}

export function establishDelegation(proposal: DelegationProposal, confirmation: DelegationConfirmation | undefined,
  host: DelegationHostContext): { state: DelegationState; reasons: string[]; delegation?: EstablishedDelegation } {
  try {
    validateProposal(proposal, host);
    const unresolved = proposal.intent.unresolved;
    if (unresolved.some(item => host.minimumConsequence === "high" || proposal.consequence === "high" || item.kind !== "preference_uncertainty" || proposal.discretion !== "choose_listed_action")) {
      return { state: "clarification_required", reasons: ["Material unresolved conditions require clarification before confirmation."] };
    }
    if (!proposal.permittedActions.length) return { state: "clarification_required", reasons: ["Specify bounded actions before authority can be established."] };
    if (!confirmation) return { state: "confirmation_required", reasons: ["Explicit confirmation of this exact envelope is required regardless of confidence."] };
    assertJson(confirmation);
    if (!confirmation.id || confirmation.humanId !== host.humanId || confirmation.proposalDigest !== hashDelegationProposal(proposal)
      || !Number.isFinite(Date.parse(confirmation.confirmedAt)) || Date.parse(confirmation.confirmedAt) > Date.parse(host.now)
      || Date.parse(confirmation.confirmedAt) < Date.parse(proposal.expression.expressedAt)) throw new Error("Confirmation identity, time or envelope mismatch");
    if (confirmation.decision === "reject") return { state: "authority_rejected", reasons: ["Human rejected this envelope."] };
    if (isRevoked(proposal, confirmation, host)) return { state: "authority_revoked", reasons: ["Revoked authority requires a fresh confirmation event after revocation."] };
    if (confirmation.decision !== "confirm" || confirmation.approvals.length !== proposal.permittedActions.length) throw new Error("Exact-action approvals required");
    proposal.permittedActions.forEach((action, i) => {
      const approval = confirmation.approvals[i]!;
      const result = validateApproval(host.authorityMap, action, approval, { now: host.now });
      if (approval.approverId !== host.humanId || !result.valid || result.decision !== "approval_valid"
        || Date.parse(approval.approvedAt) > Date.parse(confirmation.confirmedAt)
        || !result.validUntil || Date.parse(result.validUntil) < Date.parse(proposal.expiresAt)) throw new Error("Originating approval does not cover the action and entire delegation window");
    });
    const body = { version: "established-delegation/v1" as const, state: "authority_established" as const,
      proposal: structuredClone(proposal), confirmation: structuredClone(confirmation), establishedAt: host.now };
    return { state: "authority_established", reasons: ["Exact envelope confirmed within originating authority; no execution is implied."],
      delegation: { ...body, digest: sha256Stable(body) } };
  } catch (error) {
    return { state: "authority_rejected", reasons: [error instanceof Error ? error.message : "Invalid delegation"] };
  }
}

export function currentDelegationState(delegation: EstablishedDelegation, host: CurrentDelegationContext): DelegationState {
  try {
    assertJson(delegation);
    const { digest, ...body } = delegation;
    if (digest !== sha256Stable(body) || host.establishedDigests[delegation.proposal.id] !== digest
      || delegation.version !== "established-delegation/v1" || delegation.state !== "authority_established"
      || host.delegateId !== delegation.proposal.delegateId) return "authority_rejected";
    const now = Date.parse(host.now);
    if (!Number.isFinite(now) || !Number.isFinite(Date.parse(delegation.establishedAt)) || Date.parse(delegation.establishedAt) > now) return "authority_rejected";
    if (isRevoked(delegation.proposal, delegation.confirmation, host, digest)) return "authority_revoked";
    if (now >= Date.parse(delegation.proposal.expiresAt)) return "authority_expired";
    if (now < Date.parse(delegation.proposal.validFrom)) return "authority_rejected";
    // Revalidate current originating map and approval evidence; historical validity is not current authority.
    if (establishDelegation(delegation.proposal, delegation.confirmation, host).state !== "authority_established") return "authority_rejected";
    if (delegation.proposal.activeWindows.length && !delegation.proposal.activeWindows.some(w => Date.parse(w.startsAt) <= now && now < Date.parse(w.endsAt))) return "authority_rejected";
    return "authority_established";
  } catch { return "authority_rejected"; }
}

/** Host invokes only after authenticating the revoking human; does not interpret the text. */
export function revokeDelegation(delegation: EstablishedDelegation, expression: HumanExpression, host: CurrentDelegationContext): DelegationRevocation {
  assertJson(delegation);
  assertJson(expression);
  const { digest, ...body } = delegation;
  // Revocation must work outside a standing routine's active execution window.
  if (digest !== sha256Stable(body) || host.establishedDigests[delegation.proposal.id] !== digest
    || delegation.proposal.expression.humanId !== host.humanId || expression.humanId !== host.humanId
    || !Number.isFinite(Date.parse(host.now))
    || !expression.id || !expression.text || !Number.isFinite(Date.parse(expression.expressedAt))
    || Date.parse(expression.expressedAt) > Date.parse(host.now)) throw new Error("Invalid current delegation or revocation authority");
  return { authorizationEventId: authorizationEventId(delegation.confirmation), delegationId: delegation.proposal.id,
    delegationDigest: delegation.digest, expression: structuredClone(expression), revokedAt: host.now };
}

/** Opt-in authority preflight. AAG and Runtime Binding remain separately required. */
export function validateDelegatedAction(delegation: EstablishedDelegation, action: AgentActionProposal,
  host: CurrentDelegationContext): ApprovalValidationResult & { delegationRef?: { id: string; digest: string } } {
  const denied = (reason: string): ApprovalValidationResult => ({ valid: false, decision: "approval_out_of_scope", reasons: [reason] });
  if (currentDelegationState(delegation, host) !== "authority_established") return denied("Delegation is not current for this receiver.");
  try {
    assertJson(action);
    const index = delegation.proposal.permittedActions.findIndex(a => sha256Stable(createApprovalBinding(a)) === sha256Stable(createApprovalBinding(action)));
    if (index < 0 || delegation.proposal.prohibitedActionTypes.includes(action.actionType)) return denied("Action is outside the exact confirmed alternatives.");
    const result = validateApproval(host.authorityMap, action, delegation.confirmation.approvals[index], { now: host.now });
    return { ...result, validUntil: new Date(Math.min(Date.parse(result.validUntil!), Date.parse(delegation.proposal.expiresAt),
      ...delegation.proposal.activeWindows.filter(w => Date.parse(w.startsAt) <= Date.parse(host.now) && Date.parse(host.now) < Date.parse(w.endsAt)).map(w => Date.parse(w.endsAt)))).toISOString(),
      delegationRef: { id: delegation.proposal.id, digest: delegation.digest } };
  } catch { return denied("Invalid exact action contract."); }
}

function validateProposal(p: DelegationProposal, host: DelegationHostContext): void {
  hashDelegationProposal(p);
  assertJson(host.revocations);
  if (!Array.isArray(host.revocations)) throw new Error("Complete revocation history required");
  delegationFormationState(p.expression, p.intent);
  if (p.version !== "delegation-proposal/v1" || !p.id || !p.delegateId || !p.intent.objective || !p.intent.id
    || !["low", "high"].includes(host.minimumConsequence)
    || p.expression.humanId !== host.humanId || !["low", "high"].includes(p.consequence)
    || !["none", "choose_listed_action"].includes(p.discretion) || p.delegationRights !== "none"
    || p.approvalRequirement !== "confirmed_exact_actions" || p.revocationCondition !== "human_revocation_or_host_withdrawal"
    || typeof p.standing !== "boolean" || !Number.isFinite(p.intent.confidence) || p.intent.confidence < 0 || p.intent.confidence > 1) throw new Error("Invalid delegation contract");
  const from = Date.parse(p.validFrom), until = Date.parse(p.expiresAt), now = Date.parse(host.now);
  if (![from, until, now].every(Number.isFinite) || until <= now || until <= from
    || Date.parse(p.expression.expressedAt) > now) throw new Error("Invalid or non-current temporal window");
  if (p.discretion === "none" && p.permittedActions.length > 1) throw new Error("Multiple alternatives require explicit bounded discretion");
  for (const a of p.permittedActions) {
    if (![a.id, a.userRequest, a.tool, a.actionType, a.target, a.environment].every(v => typeof v === "string" && v.trim())
      || ![a.reversible, a.externalFacing, a.requiresApproval, a.knownApproval].every(v => typeof v === "boolean")
      || !["low", "medium", "high"].includes(a.dataSensitivity)
      || p.prohibitedActionTypes.includes(a.actionType)) throw new Error("Missing exact scope or prohibited action");
    createApprovalBinding(a);
  }
  for (const w of p.activeWindows) if (![Date.parse(w.startsAt), Date.parse(w.endsAt)].every(Number.isFinite)
    || Date.parse(w.startsAt) < from || Date.parse(w.endsAt) > until || Date.parse(w.startsAt) >= Date.parse(w.endsAt)) throw new Error("Invalid active window");
  for (const c of p.intent.unresolved) if (!c.id || !c.question || !["missing_information", "ambiguity", "conflicting_instructions", "preference_uncertainty", "authority_uncertainty"].includes(c.kind)) throw new Error("Invalid clarification");
  const { provenance, ...material } = p;
  const paths = delegationMaterialPaths(material);
  if (paths.length !== Object.keys(provenance).length) throw new Error("Incomplete material provenance");
  for (const path of paths) {
    const o = provenance[path];
    if (!o || !["explicit_expression", "standing_delegation", "permitted_preference", "inference_awaiting_confirmation"].includes(o.kind)
      || typeof o.pointer !== "string" || (o.pointer !== "" && !o.pointer.startsWith("/")) || /~(?![01])/.test(o.pointer) || !o.sourceId
      || (o.kind === "explicit_expression" ? o.sourceId !== p.expression.id : !host.sourceIds.includes(o.sourceId))) throw new Error(`Unresolved provenance: ${path}`);
    if (o.sourceId === p.expression.id && !resolvesPointer(p.expression, o.pointer)) throw new Error(`Embedded provenance pointer does not resolve: ${path}`);
  }
}

/** Confirmation IDs are host-authenticated event identities, not timestamps or artifact IDs. */
function authorizationEventId(confirmation: DelegationConfirmation): string {
  return sha256Stable({ humanId: confirmation.humanId, confirmationId: confirmation.id });
}

function isRevoked(proposal: DelegationProposal, confirmation: DelegationConfirmation,
  host: DelegationHostContext, digest?: string): boolean {
  assertJson(host.revocations);
  if (!Array.isArray(host.revocations) || host.revocations.some(r =>
    !r.authorizationEventId || !r.delegationId || !r.delegationDigest || !r.expression?.humanId
    || !Number.isFinite(Date.parse(r.revokedAt)))) throw new Error("Complete event-bound revocation history required");
  const event = authorizationEventId(confirmation), now = Date.parse(host.now);
  return host.revocations.some(r => r.expression.humanId === host.humanId
    && Number.isFinite(Date.parse(r.revokedAt)) && Date.parse(r.revokedAt) <= now
    && (r.authorizationEventId === event || (digest !== undefined && r.delegationDigest === digest)
      || (r.delegationId === proposal.id && Date.parse(confirmation.confirmedAt) <= Date.parse(r.revokedAt))));
}

function resolvesPointer(source: unknown, pointer: string): boolean {
  if (pointer === "") return true;
  let value = source;
  for (const part of pointer.slice(1).split("/")) {
    const key = part.replace(/~1/g, "/").replace(/~0/g, "~");
    if (value === null || typeof value !== "object" || !Object.prototype.hasOwnProperty.call(value, key)) return false;
    if (Array.isArray(value) && !/^(0|[1-9][0-9]*)$/.test(key)) return false;
    value = (value as Record<string, unknown>)[key];
  }
  return true;
}

/** Reject non-JSON and lossy values before applying the existing stable canonicalizer. */
function assertJson(value: unknown): void {
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
