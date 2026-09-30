# Current Standing - deterministic Phase 1

Past legitimacy does not imply present standing.

Standing preserves or defeats existing authority; it never creates authority.

## Placement and scope

Delegation Formation answers whether bounded authority was established. Current Standing answers whether that already-established authority supports this exact action under the supplied current-state evidence. An unexpired flight-purchase grant can lose standing when its current quoted total rises above its confirmed ceiling. That does not erase the historical grant or create permission to buy a different flight.

The model and evaluator live in `authority-map`, beside Delegation Formation and existing approval validation. This is an opt-in contribution to business-level runtime admissibility, not a new numbered architectural layer. `governance-core` supplies the optional integration before permit issuance. No new package, dependency, general rules engine, parser, fetching, monitoring or polling is introduced.

The supported path is:

Human expression -> Delegation Formation -> Established Delegation -> optional Context Admission -> PGDL / AAG -> fresh Current Standing -> Runtime Binding -> possible consequence -> receipt.

Hosts may evaluate standing before reasoning as well. Neither that earlier result nor an imported evaluation can replace the fresh permit-boundary evaluation.

## Confirmed contract

`DelegationProposal.currentStanding` optionally contains a `standing-contract/v1` contract. The existing `standing` boolean still denotes intended recurrence; it is not a standing verdict. Each dependency names an ID, expected source ID, JSON Pointer into supplied observation documents, and positive integer `maxAgeMs`. Each condition names one permitted action ID and dependency ID, a predicate, and an optional absolute `validUntil`.

All actions in an opted-in contract must have at least one condition. Action, dependency and condition IDs must be unambiguous. Every condition is ANDed with the other conditions applicable to that exact action. Changing, removing or adding a condition changes the existing full-envelope confirmation digest; existing material-field provenance requirements also cover the entire contract. Unsupported operators fail establishment even if someone supplies a matching confirmation digest.

Operators are deliberately small:

| Operator | Meaning |
| --- | --- |
| `eq`, `neq` | Scalar equality / inequality; no string-to-number coercion |
| `lte`, `gte` | Numeric maximum / minimum |
| `in` | Membership in an explicitly confirmed scalar set |
| `exists`, `absent` | Presence / absence at a location in a supplied document |

Missing evidence never proves absence. `absent` needs an observed document; the host is responsible for its completeness. No executable predicates, arbitrary expressions, unit conversion or intent interpretation are supported. Hosts must bind units, subject, currency, account and executor parameters into the reviewed action and appropriate source contract. Phase 1 preserves exact-action approval semantics; it does not make a range authorize arbitrary new action payloads.

## Evidence and provenance

A `StandingEvidence` record identifies its dependency and source, exact delegation digest, existing approval action binding (`proposalId`, `userRequest`, `actionHash`), observation time, optional earlier evidence expiry, status, and retained reference. Observed evidence supplies a canonical JSON document. A dependency pointer selects the value from that document.

Reference kinds distinguish:

- `local_artifact`: Core inspects the supplied document location, reporting `local_resolved` when evaluable. It does not open the reference path or authenticate the file.
- `external_source`: the host supplies the observation document; results report `external_supplied`. Core does not contact or authenticate the external source.
- `unresolved`: cannot satisfy a condition, even if a favorable value accompanies the label.

Every source must be recognized in the host's `sourceIds`. Recognition is not proof of external truth. A content digest preserves the exact supplied evidence, including references and timestamps, but does not authenticate it. Hosts retain full observation documents and their origins. Root and escaped JSON Pointers follow the existing own-property JSON convention; inherited fields are not evidence.

Missing records, stale/future observations, wrong bindings, unknown sources, wrong value types, and multiple observations for one dependency are not silently selected or repaired. Duplicate IDs and evidence unrelated to the evaluated action make the result unresolved. Supply evidence only for the current action's dependencies. Contradictory observations are conservatively unresolved, rather than selecting the favorable one.

## Evaluation and freshness

`evaluateCurrentStanding({ delegation, action, evidence, host })` first invokes existing `validateDelegatedAction`. Favorable environmental evidence cannot repair missing registration, revocation, expiry, receiver mismatch, changed originating authority or an action outside the exact established alternatives.

Results contain delegation ID/digest, existing action binding, evaluation time, per-condition outcomes, evidence IDs/references/content digests, findings, an optional effective horizon and a deterministic digest using existing `sha256Stable`.

- `standing_valid`: current authority is valid and every applicable condition is satisfied.
- `standing_defeated`: current authority is invalid or an evaluable condition is false.
- `standing_unresolved`: no confirmed contract, or required evidence cannot establish the conditions.

A false condition takes precedence over unresolved conditions; both prevent runtime permission. Noncanonical JavaScript input throws before canonicalization and is rejected by the integrated runtime path. The hardened Delegation Formation JSON guard is shared internally without changing its rules. No new hashing scheme is introduced.

Only valid results have `standingValidUntil`. It is the minimum of the existing delegated-action authority horizon (including grant expiry, approval and active windows), each observation time plus confirmed maximum age, any supplied evidence expiry, and any applicable condition horizon. Windows are half-open: evidence becomes stale exactly at its horizon. Future observations and invalid timestamps cannot extend it.

`verifyCurrentStanding(result, currentInputs)` recomputes the evaluation and compares the whole canonical result. It rejects replay against another action, delegation, evidence set or evaluation time, and rejects a self-rehashed extension of the horizon. A digest-only check would not establish current standing. Determinism means identical ordered canonical inputs and host state yield identical standing results; runtime permits retain their existing random IDs.

## Opt-in integration

Call `evaluateGovernedRuntimeActionWithReceipt` (or its non-receipt counterpart) with `currentStanding: { delegation, evidence, host }`. Supply the existing originating `authorityMap` and `approvalEvidence`, and derive `knownApproval` from successful existing authority preflight where required by PGDL. Use the trusted `validationOptions.now` clock. The integration normalizes the standing evaluation to that clock; an earlier `host.now` cannot replay fresh standing at a later execution boundary.

The pipeline evaluates existing Context Admission, PGDL, authority and AAG behavior. Before issuing a permit it freshly evaluates standing for the action actually sent to AAG, and also checks any supplied runtime action. A defeated, unresolved, malformed or substituted action receives `execution_denied` and no permit. A valid standing result cannot override a PGDL/AAG rejection. Context Admission's receiver must match the standing receiver when supplied. Standing does not replace Context Admission's source, transformation, scope or inheritance validation.

The integration tests demonstrate a confirmed staging deployment, an observed staging environment, AAG allowance, runtime permission, receipt retention and expiry at the standing horizon. Production evidence or missing evidence prevents permission. They also preserve an existing AAG limitation: deployment requests containing the narrowing word `only` can trigger `unauthorized_scope`; this task does not change that detector. The positive example uses an explicit staging deployment request and the confirmed staging equality condition.

## What is actually bound

| Element | Enforcement / retention |
| --- | --- |
| Conditions and dependency definitions | Full delegation confirmation and registered establishment digest |
| Evidence content and references | Standing evaluation content digests; host retains documents |
| Exact action and delegation | Standing evaluation bindings, rechecked with current host state |
| Runtime permission horizon | Permit expiry capped to standing and other existing validity limits |
| Runtime action parameters | Existing canonical action hash and Runtime Binding |
| Standing result and digest | Receipt metadata `currentStanding`, covered by receipt hashing |

The receipt integration overwrites caller-supplied `currentStanding` metadata with the freshly evaluated result, or an explicit unavailable/unresolved marker if no evaluation could be produced. An attempted runtime action is retained on standing denial. A valid result does not mean execution or consequence was observed.

The standing digest is **receipt-bound, not a new Runtime Binding action field**. The permit enforces the capped horizon and exact action, but does not independently authenticate a standing report or consult live evidence. No standing digest is injected into the previously approved action: doing that after confirmation would invalidate the existing approval binding. Hosts must retain the receipt-to-permit relationship and route opted-in actions through this integration. Legacy callers and low-level permit APIs do not acquire mandatory standing enforcement.

## Handoffs, host trust and TOCTOU

A handoff must retain the confirmed contract, complete established artifact, evidence documents, source references, temporal bounds and evaluation receipt. A prior passing evaluation is historical evidence, not transferable current authority. Receivers must use current host registry/revocation state and reevaluate for their action and clock.

The host authenticates people and sources, maps real-world observations to the correct subject and units, maintains complete revocation history, supplies a trustworthy clock and current authority map, and retains evidence. A synthetic fixture must not be represented as authenticated real-world evidence. Structurally resolved references do not establish semantic entailment or external truth.

A maximum age is a confirmed tolerance, not a guarantee that reality stays constant. Price or environment can change immediately after evaluation, even before the horizon. Reevaluate close to execution and use executor-side atomic preconditions or source version checks where needed. Phase 1 does not implement those facilities or revoke already-issued permits. It does not execute an action, prove consequence, authenticate remote observations, infer conditions, schedule checks or grant transitive authority.

## Compatibility and follow-up questions

Absent `currentStanding`, legacy behavior remains unchanged. Existing Delegation Formation, approval, AAG, Context Admission, Runtime Binding and receipt schemas are reused; the new optional contract does not alter old envelope hashes. New canonical types are exported from authority-map. No package versions or architecture numbering change.

Phase 2 questions are authenticated evidence/version protocols, atomic execution preconditions, live revocation, a first-class permit-to-standing reference without circular hashing, richer contradiction handling and preregistered evaluation of host integrations. These should follow independent adversarial review of this deterministic foundation, rather than expansion into a general rules engine.
