# Governance Memory / Internalization Phase 1

**Memory may reduce uncertainty about what the human means. It may not increase what the agent is authorized to do.**

**Prediction confidence is not permission. A remembered routine is not a standing delegation. A capable assistant should need less explanation over time, not less authority.**

## Placement

This opt-in extension of `@alignment-governance-stack/governance-memory` leaves existing receipt-history analysis unchanged. It reuses receipt verification, hardened canonical JSON validation and Runtime Binding canonical SHA-256 hashing. There is no second authority, receipt or canonicalization system.

The path is receipt → observation → candidate snapshot → recommendation or provisional IntentProposal. Delegation Formation, Context Admission, PGDL, AAG, Current Standing, Runtime Binding and Execution-Time Revalidation remain independently required wherever applicable. Memory neither invokes nor substitutes for those gates. Inherited information still requires Context Admission before operational use.

## Evidence and provenance

`createMemoryObservation(receipt, pointer)` extracts a normalized record already retained inside a hash-verified receipt, for example `/metadata/memoryObservations/0`. Include records in metadata before creating the receipt, never by retrofitting a historical receipt. Records contain ID, category, subject, exact context key, proposition key, JSON value, explicit/inferred classification, observation time, supersession IDs and optional descriptive prediction confidence. Source receipt ID, hash and JSON pointer are bound into the observation digest.

`evaluateInternalization({ observations, receipts, host })` requires an independently trusted inventory of receipt IDs/hashes, explicit clock, maximum observation age and minimum inferred support. It re-extracts every observation and compares the full artifact. Self-rehashing changed observations or substituting receipts cannot satisfy the original inventory. Duplicate identities, future evidence, noncanonical JSON, unrelated correction and inferred supersession fail closed. Hash integrity is not external authentication or truth.

Preference describes what someone tends to want. Procedure describes a customary method. Observed routine describes recurrence. None describes current executable authority. Exact subject/context/category/key partitions prevent cross-principal or cross-context aggregation. Routine values are host-normalized descriptions: this API does not infer calendar patterns from raw events.

## State, correction and time

Candidates retain supporting observation digests/classifications, contradictory and superseded IDs, temporal bounds, distinct-receipt support counts, freshness and deterministic digests. The snapshot retains full observation history. Multiple rows in one receipt count once toward support. Prediction confidence never contributes to a permission or support threshold.

States are `candidate`, `supported`, `contested` and `superseded`; freshness is independently `current` or `stale`. One current explicit value can support a candidate. Inference requires the host-selected distinct-receipt threshold. Conflicting active explicit values are contested. Conflicting fresh inferred values are contested when no explicit value exists. Explicit evidence takes precedence over inference rather than participating in majority voting. Stale explicit evidence does not silently surrender precedence to inference. These conservative rules are not a universal preference-decay model.

An explicit correction can supersede named, strictly earlier observations in the same partition. History is retained, not rewritten or deleted. A stale correction does not resurrect retired evidence. Hosts must supply complete history: an omitted correction cannot be detected from hashes of the remaining subset.

`verifyInternalization(snapshot, input)` recomputes the complete snapshot. Imported maturity flags are not authoritative. Time and policy are digest inputs; changing either can legitimately change the snapshot. The new path reads no wall clock and uses no randomness.

## Interpretation and authority

`proposeMemoryAssistedIntent` requires a human expression, matching subject, explicit context and preference/procedure slots. It recomputes candidates and supplies only current supported values. Missing, stale or contested values leave clarification questions. Intent is always `provisional`; supplied parameters are always `inference_awaiting_confirmation`, including historical explicit preferences. Intent confidence is zero because no semantic confidence is estimated. Metrics count requested/supplied parameters and remaining slot clarifications, not alignment or understanding.

Parameter names must be nonempty primitive strings, unique by exact string identity; `__proto__`, `constructor` and `prototype` remain prohibited. Coercible arrays, numbers and objects are rejected before insertion or clarification counting. Constructed interpretation artifacts are checked against the existing hardened canonical JSON boundary before return. Observation time, source receipt time, expression time and the memory evaluation clock must be primitive timestamp strings before parsing. These checks reject malformed inputs without changing valid-input authority, correction or freshness semantics.

Hosts retain snapshots/candidates, register their source identities and map parameter provenance into a normal DelegationProposal. Every material memory-derived parameter must be inside the confirmed envelope/digest. Actual actions, tools, receiver, financial bounds, delegation rights and standing conditions must independently be stated and approved. Slot values are proposed information, not executable constraints. A remembered publish step does not add a permitted publish action.

Supported current routines yield `standing_delegation_recommendation` with `humanReviewRequired: true` and `authorityEffect: "none"`. This does not create a delegation, confirmation or permit. Human review and normal establishment remain necessary. Revocation affects authority while leaving memory intact. Preference changes do not mutate, renew or widen established authority.

## Demonstration and falsification

The coffee fixture retains 300 synthetic interaction receipts containing preference, procedure and routine observations with confidence 0.999. Each simulated interaction passes existing governance evaluation at its explicit timestamp. Purchase outcomes are explicitly synthetic fixture observations, not real execution evidence or 300 independently observed transactions. Authorization/runtime permission are not execution or consequence.

Without memory the paired request supplies zero of two parameters and needs two clarifications. Mature memory supplies two and needs zero slot clarifications. Normal confirmed authority remains necessary. No request, missing approval/permit, human rejection and revocation do not become permission. A draft-only report delegation permits drafting and rejects a remembered external-publication step.

Tests cover source/observation tampering and self-rehashing, subject/context substitution, supersession/stale replay, confidence, conflicting evidence, noncanonical values, fabricated maturity flags, spend/tool/receiver/delegation expansion and memory artifacts presented as confirmation, approval, standing evidence or execution authority. Integration uses existing establishment, standing and execution-revalidation APIs.

## Host boundaries, limitations and future work

Hosts authenticate interactions and principals, label context/classification, extract semantics, authenticate correction events, retain complete history, provide reliable time/inventories and route execution through AGS. A dishonest host registering fabricated receipts can fabricate memory evidence. Receipt integrity does not prove semantic entailment, truthful observations, independent experiences or completeness. Chain hashes are retained, but this API does not verify completeness of a receipt chain.

Phase 1 demonstrates neither autonomous semantic understanding, human-like memory, consciousness, moral internalization, production safety, autonomous rule rewriting, autonomous authority creation, complete preference learning, truthful external observations, correct natural-language extraction nor universal preference stability. No extractor, vector database, background agent, external persistence or autonomous execution is introduced.

The existing continuity-ingest handling of Execution-Time Revalidation terminal decisions remains a separate integration issue, unchanged here. Automatic console ingestion and executor integration are not implemented.

Future work includes human-approved recommendation promotion, richer corrections, provenance-bound extraction, longitudinal clarification measurement, privacy/deletion controls, multi-principal boundaries, context generalization and bounded standing routines. Production priorities include authenticated inventories, complete-history/revocation delivery, Context Admission wiring and executor enforcement. Increasing confidence does not solve these boundaries.
