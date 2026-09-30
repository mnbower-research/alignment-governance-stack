# Delegation Formation — deterministic Phase 1

Inference may clarify intent; it may not manufacture permission.

Existing AGS preserves supplied authority through Context Admission, PGDL, AAG, Runtime Binding and receipts. It cannot recover a human's real meaning from an incorrectly formalized request. A perfectly preserved misunderstanding is still a governance failure. Delegation Formation addresses that upstream boundary within Human and Organizational Authority and Governance Substrate. This document does not renumber or replace the existing twelve architectural functions.

## Intent Formalization and Authority Establishment

Human Expression is retained evidence of communication or task initiation, never a grant. Intent Proposal is an explicitly provisional structured interpretation: objective, parameters, preferences, constraints, confidence and unresolved clarifications. An LLM, UI or host may propose those fields. Core contains no natural-language parser and does not interpret the expression's text.

Authority Establishment requires a host-authenticated human's explicit confirmation of the entire Delegation Proposal digest and existing exact-action approvals covering every candidate through the delegation expiry. It reuses `validateApproval` and `createApprovalBinding` against the host's originating Authority Map. Confidence, preferences, source recognition and inferred goals cannot replace that confirmation. A human may explicitly confirm an inferred interpretation, but its provenance remains an inference; it is not relabeled as original explicit speech.

The implementation extends `authority-map`, alongside its existing authority and approval types, rather than adding another authority engine or a package dependency cycle. Public named exports live in that package. Existing shared action, constraint and sensitivity types remain authoritative. No existing caller is required to adopt the new APIs.

## Canonical artifacts and bounded contract

- `HumanExpression`: retained text, human identity, source identifier and timestamp.
- `IntentProposal`: provisional interpretation, including separately retained preferences and categorized `ClarificationRequirement` records.
- `DelegationProposal` (`delegation-proposal/v1`): expression and intent, receiver identity, consequence, finite exact `AgentActionProposal` alternatives, prohibited action types, discretion, delegation rights, confirmation requirement, validity and active windows, revocation condition and field provenance.
- `DelegationConfirmation`: trusted host evidence of human confirmation or rejection, binding the full proposal digest and existing exact-action approvals. This is not a digital signature or proof of real human participation.
- `EstablishedDelegation` (`established-delegation/v1`): immutable establishment snapshot, confirmation and canonical digest. Its historical state is distinct from its current validity.
- `DelegationRevocation`: explicit host-authorized revocation tied to the established digest and a retained human expression. Text such as “Stop buying coffee” does not itself execute a transition; the authenticated host invokes the revocation API.

Scope, target, tools, consequential parameters and constraints live in the existing action contract. Phase 1 permits exact candidates only: even a range constraint does not authorize an unlisted changed payload. `choose_listed_action` permits selection among confirmed alternatives, not arbitrary substitutions. Prohibited types take precedence. Downstream delegation rights are `none`; transitive grants are not issued in this phase. Objectives and preference maps convey no independent action permissions.

## Lifecycle

`delegationFormationState` reports `task_initiated`, `clarification_required`, or `interpretation_proposed`. `establishDelegation` returns clarification/confirmation requirements, rejection, or an established artifact. A missing bounded action list requires clarification. Confirmation is always necessary; there is no confidence-to-authority transition.

Unresolved missing information, ambiguity, conflict or authority uncertainty blocks establishment at either risk level. Only low-consequence preference uncertainty can remain, and only under explicitly confirmed selection among listed candidates. High consequence, including the host-controlled minimum consequence floor, requires all unresolved clarifications to be removed through a newly confirmed proposal. This deliberately conservative rule is not a general risk engine.

`currentDelegationState` rechecks the canonical digest, host registry, receiver, host identity, current originating authority and approval evidence, clock, expiry and active window. It returns `authority_established`, `authority_rejected`, `authority_expired`, or `authority_revoked`. Execution windows are half-open. A future grant may be established now but cannot be used before its start. Invalid clocks fail closed. Revocation works outside an active routine window and never deletes preferences.

Standing delegation uses an explicit finite validity interval and optional absolute active windows. For “normal coffee every weekday morning until revoked,” a host must present the concrete coffee/order parameters and calendar windows for confirmation. Phase 1 provides no scheduler, timezone/calendar expansion or unbounded grant; renewal requires fresh establishment before expiry. The `standing` field describes intended recurrence; single-use consumption counters and maximum frequency are not implemented. Hosts must not infer a once-only guarantee from `standing: false`.

## Provenance and host trust

Every material proposal leaf, including empty containers, must have a JSON Pointer provenance entry. Entries distinguish explicit expression, historical standing delegation, explicitly permitted preference/default and inference awaiting confirmation. Source IDs must resolve to the expression or the host's retained source inventory. The whole map participates in the confirmed digest.

This establishes traceable references, not automatic semantic entailment of prose or authentication of sources. Hosts retain and inspect source documents and pointers and authenticate the human confirmation. Historical grants in provenance are evidence only: they do not bypass fresh confirmation or originating authority checks. A deployment proposal inferred from “review deployment,” or broad purchases inferred from “run to the store,” requires an explicit human decision about the exact actions; Core cannot decide what prose truly meant.

The registry and revocation list are trusted host inputs, never fields read from retrieved content. A self-hashed or forged “established” JSON object is insufficient without a current host registration. Hashes prove byte-level continuity under the canonical representation, not legitimacy. Hosts must maintain a complete current registry and revocation history and withdraw registrations when applicable. Omitted external revocation cannot be discovered by this offline library.

## Downstream integration and continuity

1. Authenticate human identity, retain source evidence, construct a provisional proposal, and obtain explicit confirmation of its complete digest.
2. Call `establishDelegation`; retain the returned artifact and register its ID/digest only on success.
3. Immediately before downstream authorization, call `validateDelegatedAction` with the actual receiver, host clock, current Authority Map, registry and revocations. Reject on failure. This function reuses the existing approval validator and returns a `delegationRef` and capped `validUntil`.
4. Pass the original exact action and its approved evidence through the existing governance pipeline. Set `knownApproval` from the successful validation result where PGDL requires it; existing approval binding deliberately normalizes that status field. Cap permit expiry at `validUntil`. Retain `delegationRef` in existing receipt metadata, along with the full artifact in the host evidence store. The integration test demonstrates this path through AAG, Runtime Binding and receipts.

Legacy governance entry points do not automatically enforce this new preflight. The host must wire it in; a standalone approval cannot carry live registry/revocation semantics. Check again at consequential execution time when revocation may have occurred. Already-issued permits do not gain live revocation through this extension. Authority validation is not execution permission, and permission is not evidence of execution or consequence.

Whole-artifact hashing uses existing Runtime Binding `sha256Stable`; exact action comparison uses existing approval binding semantics, including metadata and execution constraints. No new canonicalization algorithm, action hash projection or Runtime Binding schema is introduced. Existing fingerprint authority/approval references can identify retained evidence, but Phase 1 adds no automatic fingerprint field. Avoid embedding a delegation's own digest into its hashed action (a circular dependency); use an ID before confirmation and the artifact digest in receipt metadata afterward.

Context Admission still independently checks inherited information for the exact receiver, purpose and time. An admitted interpretation is not established authority. Handoffs must preserve the full delegation snapshot, confirmation, provenance and reference digest and recheck current host state; persistence never preserves current authority by itself. Governance Memory may retain coffee preferences after revocation, but cannot convert a learned preference into a new or renewed grant.

## Limits and next phase

No LLM parser, learning, autonomous routine creation, UI, Enterprise workflow, real-world executor or authentication service is included. Tests use explicit synthetic host attestations. Open questions include authenticated confirmation protocols, revocation delivery and permit invalidation, consumed-use budgets, transitive narrowing proofs, standing-calendar policy, richer provenance resolvers, and first-class receipt/fingerprint references. Phase 2 should prioritize an opt-in end-to-end host integration with authenticated confirmation and fresh revocation enforcement, followed by preregistered adversarial evaluation. Do not broaden natural-language heuristics to stand in for that boundary.


## Phase 1 adversarial hardening

Revocation binds both the historical artifact digest and an authorization-event identity, computed with the existing stable hash over the authenticated human ID and confirmation ID. Establishment time remains an audit timestamp, not a new authorization event. The host must issue a unique confirmation ID for each genuinely new human decision; changing a timestamp, envelope, or approval payload under an old ID cannot escape that event's revocation. This does not authenticate a confirmation: callers must not fabricate a fresh human decision by renaming an old record.

`DelegationHostContext.revocations` is now mandatory at establishment as well as current validation. `DelegationRevocation` retains `authorizationEventId` and `delegationId` in addition to the original digest, expression and revocation time. A revoked event returns `authority_revoked`. For the same delegation ID, a new confirmation must have a different event identity and occur strictly after the retained revocation; exact envelope binding and all originating approval checks still apply. Replaying establishment is not a new authorization event, even if the resulting artifact digest changes. Revocation records are never deleted by renewal. Pre-hardening digest-only revocations need event/lineage information recovered from retained artifacts by the host; incomplete records fail closed. These are intentional changes to the opt-in, not-yet-frozen Phase 1 API, not to legacy authority validation.

The delegation JSON guard rejects sparse arrays, named array properties, symbol keys/values, undefined, functions, non-finite numbers, negative zero, accessors, nonenumerable data, cycles, and nonstandard container prototypes before hashing. Ordinary dense JSON containers remain supported. The same guard protects actual delegated-action inputs. Canonical hashing itself is unchanged. Inputs must be inert data from a trusted host boundary; this library is not a sandbox for executable JavaScript proxies or a compromised JavaScript realm.

Provenance pointers into the embedded Human Expression must resolve to an own JSON location, regardless of the origin-kind label. Invalid JSON Pointer escapes and nonexistent paths fail establishment. The empty pointer resolves to the whole expression. A pointer to a different existing field is structurally valid, but does not prove that field entails the claimed interpretation or permission. Non-expression sources are explicitly external to this artifact: host inventory recognition is required, while pointer resolution and authentication remain host-owned and unverified by Core. No external reference is silently upgraded to structurally resolved evidence.

These changes do not revoke previously issued runtime permits, authenticate identity, interpret human intent, learn preferences, schedule tasks, count uses, or issue transitive delegation. Hosts must still supply complete current history and wire the opt-in preflight into execution.
