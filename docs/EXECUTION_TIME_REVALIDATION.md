# Execution-Time Revalidation - Phase 1

A permit is not permanent authority.

Execution-Time Revalidation may preserve or defeat existing permission; it never creates authority.

Permission at the execution boundary is not proof of consequence.

## Problem and placement

PermitIssued(t0) != ExecutionAuthorized(t1).

Authority and environmental state may change after a permit is issued. This opt-in `governance-core` boundary checks an existing permit immediately before the host attempts a side effect. It reuses Runtime Binding, Delegation Formation and Current Standing; it neither executes actions nor creates a second permit type. Public architecture numbering is unchanged.

The path is: confirmed delegation -> existing governance and AAG -> Current Standing when applicable -> existing Runtime Binding permit -> later execution request -> fresh revalidation -> permission result and receipt -> host-controlled possible consequence.

This implementation starts from `ags-core-current-standing-1` (`c90fa36da339149c066fde7f5a75028756827187`).

## Confirmed execution contract

`DelegationProposal.executionRevalidation` explicitly opts in with positive integer `maxEvidenceAgeMs` and `maxExecutionDelayMs`. These fields participate in existing whole-envelope confirmation, canonical hashing and material provenance. They cannot be widened after confirmation without re-establishment. Existing delegations without this field remain usable by legacy APIs; they are not silently opted in by the new issuer.

All revalidated executions require current permit/action binding and current delegated authority. If `currentStanding` exists, every applicable standing condition is also rechecked. Those existing deterministic conditions serve as execution preconditions; no second predicate language is introduced. Unconditional delegations need fresh authority/history observation but no invented environmental evidence.

Freshness has two limits: standing's original dependency maximum age, and the confirmed execution-specific maximum age. Observations must not predate permit issuance or lie in the future. They cease to be current at the exact freshness boundary. A still-recent observation can be reused within the explicitly confirmed tolerance; Phase 1 does not claim that every call fetches a new observation. Hosts supply observations, and no fetching occurs inside Core.

## Issuance and explicit linkage

`issueRevalidatedPermit({ delegation, action, host, evidence, governance? })`:

1. Validates existing current delegated authority.
2. Passes exact originating approval into the existing PGDL/AAG/runtime pipeline, deriving `knownApproval` from successful authority validation.
3. Rechecks Current Standing when the delegation has conditions and caps permit expiry using existing authority/standing limits.
4. Returns the normal governance packet and receipt. Only successful issuance also returns `ExecutionIssuanceBasis`.

The basis is immutable issuance evidence, not an independent permission. It binds the full canonical existing permit digest, exact approval action binding, delegation ID/digest, receiver, issuance time and horizon, issuance receipt hash, and original standing evaluation when applicable. It adds no mutable field to the runtime action or permit and avoids a circular self-hash.

The trusted host must retain the actual permit, issuance receipt and basis, then register `issuedBasisDigests[permit.id] = basis.digest` only for successful issuance. Never derive that trusted registry entry from untrusted evidence at execution time. The execution API requires the registered digest; a self-hashed basis or replacement delegation is insufficient. Renaming or modifying a permit, changing its expiry, dropping required standing, or using a renewed delegation does not repair the original linkage.

The original receipt predates the basis. The basis references that receipt; the later execution receipt retains the basis and chains to the issuance receipt. This is an audit relationship backed by the host registry, not a signature or independent authentication protocol.

## Execution request and result

`revalidateExecution(request)` accepts the existing permit, registered basis, attempted action, exact established delegation, current host context, current standing evidence, and `authorityObservation` with an ID, observation timestamp, retained reference and host revision token. Assurance inputs may be supplied for existing assurance-protected Runtime Binding checks. No favorable result is an input requirement or substitute.

The implementation checks:

- Canonical JSON representation using the existing hardened delegation guard.
- Registered full-permit/delegation/receiver linkage.
- Existing `bindActionToPermit` validation, including assurance where applicable.
- Existing exact approval action identity and purpose, supplementing Runtime Binding's execution hash.
- Current `validateDelegatedAction`, including originating scope, approvals, expiry, active windows and revocations.
- Required current authority observation and history presence.
- Fresh `evaluateCurrentStanding` against the supplied observations, where required.
- All applicable validity horizons.

Outcomes:

| State | Meaning |
| --- | --- |
| `execution_revalidated` | Existing permission remains supported at this checked boundary |
| `execution_defeated` | Permit, binding, authority or an evaluable required condition fails |
| `execution_unresolved` | Required current evidence/history/clock cannot establish permission |

Neither defeated nor unresolved authorizes a side effect. Malformed or noncanonical inputs throw before they can authorize; callers must also fail closed on exceptions. Missing history supplied as no field is unresolved. An empty history can be legitimate and cannot be distinguished from an omitted-record attack without host authentication/completeness guarantees.

Results include permit identity/full digest/action hash, issuance-basis digest, delegation identity/digest, action binding, receiver, evaluation time, host-state/evidence digests, authority observation, current standing evaluation where applicable, findings and a deterministic digest. Only successful results contain `executionValidUntil`. All results explicitly report consequence as `not_observed`.

`verifyExecutionRevalidation(result, currentRequest)` recomputes against current inputs. It checks reproduction, not merely self-consistency of a supplied hash; `true` can also mean that a defeated result was faithfully reproduced. Permission requires the freshly evaluated state to be `execution_revalidated`. Old results are historical evidence, never reusable bearer authorization.

## Effective horizon

The execution horizon is conservatively capped by:

- Original permit expiry and registered issuance horizon.
- Current delegation/approval expiry and active-window end.
- Original standing horizon and freshly evaluated standing horizon.
- Supplied observation freshness and any standing evidence/condition expiry.
- Fresh authority-observation horizon.
- Current assurance horizon when returned by Runtime Binding.
- Evaluation time plus confirmed `maxExecutionDelayMs`.

Favorable newer evidence cannot extend the old permit. When it expires, obtain a new governed permit. If a host records a malformed permit extending beyond delegation expiry, current delegated-authority validation still rejects expired authority.

## Receipts and reconstruction

`revalidateExecutionWithReceipt(request)` returns the result plus an existing-format governance receipt. It retains the attempted action and old permit, chains to the issuance receipt, and stores the issuance basis, result, delegation, current authority/history snapshot, authority observation, supplied standing documents and issuer registry evidence in receipt metadata. If assurance is supplied, it is retained as well.

This deliberately favors reconstructability in Phase 1. Receipts may contain sensitive authority/source material; hosts control retention and access. A future reference-only export would need independently retained evidence and content hashes. Receipt hashing preserves supplied content; it does not authenticate its source.

A successful receipt says permission was revalidated and that external execution and consequence were not observed. It does not claim a purchase, deployment, or other effect occurred. Unknown result strings must not be interpreted as execution observations by downstream consumers.

## Demonstrated scenarios

Tests cover a flight price of 420 at issuance followed by 780 at execution, a staging deployment whose current environment becomes production, revocation after issuance, expiry, missing/stale/future evidence, wrong receiver, action mutations, unconditional authority, renewed delegation, forged results, and freshness/horizon boundaries. In the revocation and price-change cases, ordinary Runtime Binding still accepts the old unexpired permit while the new execution boundary denies permission.

The flight example explicitly supplies the synthetic `reviewedForExternalRelease` attestation required by existing PGDL, inside the confirmed action metadata. Without it, PGDL escalates the external action; this phase does not bypass or change that behavior. The previously documented AAG narrowing-word `only` false positive also remains unchanged.

## Trusted-host boundary and remaining race

Hosts still authenticate human confirmation, issuer registration, registry integrity, source observations, subject/unit mapping, clocks, evidence completeness and complete revocation history. A host may lie about a fresh observation or omit a revocation while reporting a fresh revision. Core cannot detect that from supplied data. A stale observation label is rejected; a dishonest fresh label is not independently authenticated.

Hosts must actually call and enforce this opt-in boundary immediately before consequence. Legacy APIs and low-level Runtime Binding remain available and are not made universally dependent on it.

Revalidation reduces the gap but does not eliminate:

revalidate -> reality changes -> side effect.

Within the returned short horizon, external conditions or revocations can change again. Already-issued permits are not globally deleted or modified. Revalidation also does not consume permits or impose single-use semantics. Hosts must not treat the result as permission to replay side effects indefinitely.

For future compare-and-act adapters, the result retains authority revision, authority/evidence digests, delegation and permit identities, and standing source references. An executor could require the referenced authority/source versions and conditions to remain unchanged atomically with the side effect. Phase 1 does not claim those opaque revisions are monotonic, externally authenticated, or atomically enforced.

## Compatibility and next phase

Existing callers are unchanged unless they opt in. No AAG, PGDL, Context Admission, Runtime Binding, receipt hashing, or approval algorithm is replaced. The existing hardened JSON guard is exposed under a named authority-map export and reused; no second canonicalization model is introduced.

Open questions include authenticated issuer registration and observation versions, single-use execution receipts, atomic precondition adapters, revocation delivery, reference-only evidence retention, and downstream reporting of this distinct permission stage. Recommended next steps are independent adversarial review, a preregistered host-integration experiment, then a narrowly scoped simulated compare-and-act adapter. No polling service, production connector, distributed transaction or external side effect is part of Phase 1.
