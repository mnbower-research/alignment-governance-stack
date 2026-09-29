# Risk-Scaled Assurance and Independent Validation

Terminology: Alignment Governance Stack (AGS); Pre-Gate Deliberation Layer (PGDL); Agent Action Gate (AAG). See the [canonical architectural concepts](MODULAR_ARCHITECTURE.md#core-architectural-concepts).

v1.14.0 principle: **the required strength of assurance must scale with consequence**.

Context Admission decides whether supplied inherited information is admissible for a receiving use. Assurance evaluates the validation burden of a proposed action. Authority determines who can authorize its consequence. None implies the others. Consensus does not create authority; approval does not establish truth; denial does not establish falsehood.

## Architecture and applicability

The `assurance` package implements deterministic risk assessment and assurance evaluation. It supports AAG within the existing modular architecture; it does not add another top-level governance layer.

```text
Trusted host policy, risk facts, validator registry, complete case history
                         |
Context Admission -> PGDL -> policy / authority / human participation
                         -> AAG (required assurance evaluation)
                         -> permit with assurance evidence
                         -> Runtime Binding with current host assurance inputs
                         -> host execution boundary -> receipt / human review
```

Hosts opt actions into mandatory assurance using `AgentActionProposal.assuranceRequirement: { policyId, policyVersion }`. Supply `assurance: AssuranceInput` alongside the governed proposal. Both are required for this path. A missing input, a mismatched policy, or unresolved assurance blocks AAG. Supplying a report marked `satisfied` is not a substitute for evaluation. Standalone `evaluateAag` accepts the trusted input as its fourth argument.

Legacy actions without an assurance requirement and without assurance inputs retain v1.13 semantics. **This is not automatic assurance enforcement for all existing applications.** The host must apply its mandatory policy to every covered action before proposals enter AGS and prevent a caller from stripping the requirement or using a legacy path. Existing low-level `evaluateAction` is not a replacement for this assured AAG path. Separate scripts or fabricated permits are outside the library's trust boundary.

## Risk vector

Ten dimensions are represented: consequence severity, irreversibility, uncertainty, blast radius, sensitivity, financial exposure, external consequence, authority-domain sensitivity, context confidence, and novelty. Each fact contains a level (`low`, `medium`, `high`, `critical`, or `unknown`), a source (`host_supplied`, `derived`, or `unknown`), and evidence references. Levels express concern: higher `contextConfidence` means greater concern about the sufficiency of context confidence.

The risk class is the maximum material dimension, not an average that can hide a severe consequence. Missing material facts remain unknown and produce escalation. The default policy treats all dimensions as material. An explicit policy can exclude a dimension such as novelty, allowing a low-risk routine action with unknown non-material novelty. Consequence severity, irreversibility, sensitivity, and external consequence always remain material. Core action fields establish minimum derived levels for irreversibility, sensitivity, and external consequence; declarations cannot lower these floors.

Financial exposure is a host-assessed concern level, not an intrinsic valuation or currency converter. Hosts must derive their exposure bands from real amounts and organizational limits, preserve evidence references, and bind actual amounts as execution constraints. AGS does not intrinsically discover real-world risk, hidden dependencies, or inaccurate host declarations.

## Assurance requirements

The default tiers require one, two, three, and four validators respectively. High and critical tiers require a human. Distinct independence groups and unanimity are required by default; freshness windows tighten as consequence rises. A policy carries an ID and version, material dimensions, tier requirements, refusal-expiration behavior, and authorized resolution roles.

Each tier supports minimum attestations, explicit review slots (role, authority domain, independence group, validator type), distinct groups, mandatory human review, unanimity, refusal blocking, required evidence references, maximum attestation age, assurance TTL, required slot sequence, and an insufficient-assurance outcome. Sequence timestamps must be strictly ordered. Policy validation prevents stronger tiers from dropping lower-tier requirements or lengthening freshness windows. High-risk tiers cannot waive multiple independent validators or human review.

The effective assurance expiry is the earliest selected attestation expiry, selected attestation maximum age, active resolution expiry, or policy TTL. Unused optional attestations do not shorten the authorization window. Windows are half-open: `createdAt <= now < expiry`. The clock is supplied by the trusted host. Canonical assurance timestamps use UTC ISO strings with milliseconds. Runtime Governance Core uses its host runtime clock rather than an artifact's historical evaluation time.

Explicit unknown concerns remain unknown even when a core action field supplies a low minimum risk. Omitted irreversibility, sensitivity, and external-consequence facts can be derived from their canonical action fields. A mandatory human may occupy an additional slot when all named slots require non-human validators; the minimum quorum is a floor, not a maximum.

## Attestations and material binding

`createAssuranceBinding` binds case ID, proposal ID, purpose and action fields, target, canonical execution constraints as supplied, authority domain, evaluated risk facts and their provenance, complete assurance policy, selected requirements, and risk class. Nonempty proposal metadata is included to prevent reuse for a changed payload; `knownApproval` is excluded because it is an authority result, not assurance about the proposed consequence. Other consequential parameters must be execution constraints. Equivalent constraint arrays in a different order may require reevaluation: assurance uses exact JSON structure and does not weaken exact binding through semantic guesses.

`createValidatorAttestation` creates a digest-bound artifact containing validator identity/type/role/domain/group, verdict, binding, policy version, evidence references, creation/expiry/revocation, rationale, and lineage. It creates an artifact, not a credential. `verifyValidatorAttestation` verifies the schema and digest, not the issuer's identity.

Changing a target, amount, resource, environment, scope, constraints, purpose, risk fact, authority domain, or policy invalidates the old binding. PGDL revisions must receive assurance for the resolved action that reaches AAG. Do not rewrite an old attestation's binding to make it appear current.

## Declared independence

The host supplies a validator registry with stable subject identities, roles, domains, types, independence groups, and current revocation state. Attestation claims must match that registry. Renaming a validator ID does not produce another independent subject. Aliases declaring conflicting subject type or group fail conservatively.

The evaluator searches for distinct assignments to required slots. One subject never occupies multiple slots, and one group cannot occupy multiple slots when distinct groups are required. Human slots require host-recognized humans. Different display names alone establish nothing. Input limits and a bounded deterministic assignment search stop excessive inputs conservatively.

## Refusals, revision, escalation, and overrides

The host must supply complete history for a stable case ID and set `historyComplete` explicitly. Missing history blocks evaluation. A new approval does not supersede a refusal. A changed target does not silently erase the case's earlier refusal. By default, expired or revoked refusal artifacts remain recorded and active. A policy may explicitly allow refusal expiry at its declared expiration; that resolution remains visible as `policy:attestation_expiry`.

An explicit resolution identifies the refusal IDs, current action/risk/policy binding, resolver, time window, rationale, and evidence references. Only a current host-recognized human with the policy's designated resolution role and receiving authority domain may resolve the refusal. Default policy defines no override or escalation authority. Supported resolution kinds are material revision, authorized escalation, and explicit override. Material revision additionally requires a changed action or risk digest. Every resolution remains in the receipt. Refusal is governance evidence, not a claim that a proposition is objectively false.

The library does not own a durable history store. It cannot detect a dishonest host omitting refusals while asserting complete history or changing the case ID. A production host must anchor stable cases and append-only history externally. Runtime checks additionally reject omission or alteration of any attestation already recorded in the permit.

## Outcomes and evidence

`evaluateAssurance` returns `satisfied`, `insufficient`, `request_validation`, `request_revision`, `escalate`, or `blocked`. Malformed inputs throw and AAG fails closed. Evidence includes the risk vector, complete policy and requirement, validator declarations, every attestation, accepted and rejected IDs/reasons, independent slot assignments, refusals, resolutions, machine-readable findings, validity, and a digest.

AAG still evaluates action authority and its existing detectors after assurance succeeds. Authority Map, policy boundaries, Context Admission, and explicit human refusal retain their v1.13 responsibilities. A valid approval cannot waive mandatory assurance. Assurance cannot repair a missing legitimate approval.

## Runtime and final mutation boundary

Protected permits require an allowed assurance-aware AAG packet and current assurance input. Direct permit construction without them fails. Permits include the assurance record and cannot outlive its validity. Runtime Binding requires fresh host assurance inputs, reevaluates the supplied action, compares policy/risk/requirements and validator declarations, preserves refusal history, and checks that the previously selected attestations still satisfy the requirement. Expiry, revocation, changed policy, missing history, or material substitution denies execution.

Run this check immediately before the mutation-capable tool call. The returned result is authorization, not proof execution occurred. AGS has no atomic external transaction, provider-specific payload encoder, live revocation service, or cross-process enforcement. A host may still incorrectly map the bound abstract action to a different payload or delay execution after validation. Close that gap in the host with a controlled immutable payload mapper, current evidence, a final check, and appropriate transactional controls. Metadata-only values are not covered by assurance or runtime binding.

## Receipts, memory, and Console

Receipts preserve the canonical run assurance and matching AAG snapshot. Their hashes include the new optional field. Existing v1.13 receipts and hashes remain valid. Evidence proves what was recorded within the supplied-evidence boundary, not external execution.

`runtimeBinding.assurance` preserves the fresh boundary evaluation separately from the permit's earlier assurance. A runtime revocation can therefore appear beside earlier satisfaction without erasing either event. Malformed runtime inputs fail closed with a runtime failure reason if no well-formed assurance report can be produced. Receipt hash verification checks the envelope; Continuity Ingest additionally validates nested assurance schemas, internal claims, and digests before displaying imported evidence. Invalid nested artifacts are quarantined with diagnostics, not promoted to trusted reports.

Governance Memory can report recurring refusals, escalations, missing evidence, disagreement, and independence failures, grouped by action and risk class. Recommendations require human review and never mutate policy or turn recurrence into authority or truth.

Continuity Ingest verifies assurance schemas and digests recursively. The Console shows historical risk, requirements, accepted validators and declared groups, mandatory human review, refusals, resolutions, and validity. Material findings remain visible in Simple Mode and exports. Technical details retain the full record. Imported satisfaction never grants current permission; Sample Mode does not borrow imported provenance.

## CLI and examples

```sh
node packages/cli/dist/cli.js assurance-evaluate examples/assurance/low-risk.json --json
node packages/cli/dist/cli.js assurance-evaluate examples/assurance/high-risk.json --json
node packages/cli/dist/cli.js assurance-evaluate examples/assurance/denial-history.json --json
```

These deterministic fixtures use an explicit historical evaluation clock. Exit status is 0 for satisfied assurance, 1 for unresolved assurance, and 2 for malformed/unreadable input. No exit status confers execution authority.

## Limits and compatibility

AGS does not intrinsically prove genuine human identity, organizational or physical independence, objective truth, external execution, absence of out-of-band actions, or host integration correctness. High assurance does not eliminate risk. Hash integrity is not issuer authentication. Identity, policy adoption, clocks, current revocation, history completeness, and external execution evidence remain host responsibilities.

Public APIs add optional inputs and fields. Unprotected legacy actions preserve v1.13 behavior. The protected path intentionally rejects missing current assurance, unbound legacy attestations, malformed timestamps, incomplete history, and copied reports. No prior v1.13 tag or package version is changed. v1.14 remains an unreleased candidate until separately approved.
