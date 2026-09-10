# Runtime Execution Constraint Binding Design

## Problem

Runtime Binding currently binds canonical `AgentActionProposal` fields such as tool, action type, target, environment, reversibility, external-facing status, data sensitivity, and approval flags. Domain-specific consequential constraints such as budget, currency, platform, property, campaign, content, audience, deployment region, or communication recipient can appear in metadata, but metadata is not execution-authoritative.

The missing distinction is:

- Unbound context: explanatory metadata for receipts, UI, provenance, and trace context.
- Bound execution constraints: exact approved values or bounded scopes that must match at runtime.

Only values represented as canonical bound execution constraints are protected as domain-specific execution-authoritative values by Runtime Binding. Ordinary metadata remains non-authoritative.

## Existing Architecture Summary

- `shared-types` defines `AgentActionProposal` and ordinary `metadata`.
- `runtime-binding` hashes canonical proposal fields, issues `RuntimePermit`, and compares a runtime action to the permit.
- `governance-core` orders PolicyProfile, PGDL, Authority/Human Participation, AAG, permit issuance, and Runtime Binding.
- `receipts` stores the governance packet, permit, runtime action, runtime binding result, and receipt hash.
- `agency-fingerprint` hashes action, permit, PGDL, and AAG continuity evidence.
- `decision-closure` represents execution boundary proof and scope.
- adapters map domain actions into canonical `AgentActionProposal` values.

## Approach A: Expand AgentActionProposal With Domain-Specific Fields

Add fields such as `budgetAmount`, `currency`, `platform`, `propertyId`, `campaignId`, `contentId`, `audience`, and `experimentWindow` directly to `AgentActionProposal`.

### Analysis

- Backward compatibility: optional fields could preserve old callers, but each domain would pressure the shared model.
- Deterministic hashing: simple for known fields, brittle as domains multiply.
- Schema evolution: poor; every new adopter needs shared-type changes.
- Adapter ergonomics: convenient for the AI media agency, awkward for deployments, commerce, communications, and future domains.
- Receipt compatibility: receipts would include the fields, but reviewers would need domain-specific semantics.
- Fingerprint compatibility: action hash would change per new field, but only after core updates.
- Authority-map scope: tempting to overload authority scopes with every domain field.
- Permit issuance/runtime comparison: straightforward but not general.
- Extensibility: weak.
- Security properties: strong for fields that exist, weak for anything still stuck in metadata.

Conclusion: reject. This hard-codes AGS toward the media agency and does not scale.

## Approach B: Add A Canonical `executionConstraints` Field

Add optional `executionConstraints` to `AgentActionProposal`. It contains deterministic typed constraints. Runtime Binding includes this field in action hashing, permit evidence, and field-level comparison.

### Analysis

- Backward compatibility: strong. Existing proposals without constraints continue to behave as before.
- Deterministic hashing: strong if the constraint set is canonicalized with sorted keys and stable object handling.
- Schema evolution: good. New constraint names can be added without changing proposal fields.
- Adapter ergonomics: good. Adapters can promote domain-specific values from local models into constraints only when those values must be runtime-authoritative.
- Receipt compatibility: good. Receipts already store the proposal, permit, and runtime binding result; adding an optional field preserves old receipts and makes exact constraints visible.
- Fingerprint compatibility: good. The action hash includes constraints, and the permit hash includes allowed constraints.
- Authority-map scope: can remain a later optional integration; no need to overload AuthorityMap now.
- Permit issuance/runtime comparison: direct.
- Extensibility: good for typed primitives, ranges, windows, sets, and deterministic structured values.
- Security properties: strong when Runtime Binding emits specific constraint failures.

Conclusion: viable and minimal.

## Approach C: Typed Bound-Context / Constraint-Envelope Abstraction

Introduce a reusable `ExecutionConstraintSet` abstraction and expose it through optional `AgentActionProposal.executionConstraints`. Keep `metadata` as unbound context. The runtime package owns canonical hashing, validation, and comparison helpers for the constraint envelope.

### Analysis

- Backward compatibility: strong. Optional field and no-constraint actions remain unchanged.
- Deterministic hashing: strong. The constraint envelope has explicit schema version and stable canonicalization.
- Schema evolution: strongest. Constraint versions and primitive types evolve independently of domain adapters.
- Adapter ergonomics: strong. Media agency, deployments, commerce, finance, and communications can all bind domain-specific fields through the same envelope.
- Receipt compatibility: strong. Receipts preserve proposals and permits; adding explicit constraint hash/evidence improves auditability without breaking old receipts.
- Fingerprint compatibility: strong. The action hash includes constraints; fingerprint may also include a dedicated constraint hash.
- Authority-map scope: can be added later as optional approval-scope constraints without conflating runtime binding with approval authorization.
- Permit issuance/runtime comparison: clear. Permit stores action hash, constraint hash, and allowed constraint set.
- Extensibility: strong, without arbitrary executable predicates.
- Security properties: strong. Runtime action cannot omit required constraints, add conflicting values, substitute values, alter types, widen ranges, expand sets, widen time windows, change identifiers, units, or currency without denial.

Conclusion: recommended.

## Recommended Architecture

Implement Approach C:

1. Add `ExecutionConstraintSet` and typed `ExecutionConstraint` values to `shared-types`.
2. Add optional `executionConstraints?: ExecutionConstraintSet` to `AgentActionProposal`.
3. Keep `metadata` unbound and non-authoritative.
4. Add runtime-binding helpers to canonicalize, hash, validate, and compare constraint sets.
5. Include constraint hash in `RuntimePermit` when constraints exist.
6. Include constraint comparison failures in `RuntimeBindingResult` with deterministic failure codes.
7. Add optional constraint hash/scope fields to receipt/fingerprint/decision-closure types where appropriate.
8. Preserve old no-constraint behavior.

## Constraint Types

Supported primitive constraints:

- `exact_string`
- `exact_number`
- `exact_boolean`
- `enum`
- `identifier`
- `timestamp`
- `numeric_range`
- `time_window`
- `string_set`
- `structured_object`

No arbitrary executable predicates are allowed. Structured objects must be deterministic JSON-like values.

## Security Model

Runtime Binding denies when a runtime action:

- omits a required bound constraint
- adds an unexpected bound constraint
- changes constraint type
- changes exact value
- changes identifiers, units, or currency represented as exact/identifier constraints
- widens a numeric range
- expands a set
- widens a time window
- changes structured deterministic content

Metadata changes do not affect authoritative binding unless promoted into `executionConstraints`.

## Hashing

The canonical action hash includes `executionConstraints` when present. Constraint hashing uses stable sorted-key canonicalization. Equivalent structured values hash consistently regardless of object key order.

Runtime permits store:

- `actionHash`
- `executionConstraintHash` when constraints exist
- `executionConstraints` evidence when constraints exist

Receipts include permit/runtime-binding evidence and therefore preserve exact authorized constraints and checked runtime values.

## Governance Ordering

The ordering remains:

`PolicyProfile -> PGDL resolved proposal -> Authority/Human Participation -> AAG -> Runtime Permit -> Runtime Binding`

Bound execution constraints add runtime exactness only. They do not replace policy, authority, approval, human participation, or AAG.

If PGDL revises a proposal, the constraints on the resolved action sent to AAG are the constraints that get bound. Runtime execution against pre-revision constraints must be denied.

## Authority Map

Approval scope could later optionally constrain bound execution constraints, such as approving spend up to a platform/property budget. That should be a later milestone unless AuthorityMap gets a clean general constraint-scope model. This milestone does not overload AuthorityMap.

## Receipts

Governance receipts should preserve enough evidence to answer:

- What exact business constraints were authorized?
- What runtime values were checked?

Do not store secrets in constraints. Future sensitive constraints should be represented by hashes, opaque identifiers, or redacted display values.

## Agency Fingerprint

Because the action hash includes execution constraints, consequential constraint changes alter the fingerprint input by default. Add an optional dedicated `executionConstraintHash` field for reviewer clarity and continuity analysis.

## Decision Closure

Decision Closure should optionally reference `executionConstraintHash` and a redacted/auditable constraint summary in the execution boundary or conditions, allowing third-party reviewers to determine approved scope and runtime matching.

## Migration Guidance

The AI media agency should promote execution-authoritative fields from metadata into constraints:

- `budgetAmount` -> exact number or numeric range
- `budgetCurrency` -> exact string or enum
- `platform` -> exact string / identifier
- `propertyId` -> identifier
- `campaignId` -> identifier
- `contentId` -> identifier
- `audience` -> identifier or string set
- `experimentWindow` -> time window

Ordinary explanatory context can remain in metadata.

## Compatibility Decision

This design does not require a major incompatible redesign. Implementation can proceed with optional fields and additive exports.
