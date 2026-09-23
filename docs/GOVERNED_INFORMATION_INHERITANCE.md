# Governed Information Inheritance

Context must not outrun provenance.

A persistent artifact is a handoff across time. An agent can terminate while its output remains available to another agent, session, workflow, organization, tool, file, database, memory store, or web consumer. Persistence does not preserve authority, validity, scope, interpretation, or permission to reuse information. Availability is not admissibility. Stored is not trusted. Remembered is not authorized.

## Implementation boundary

`@alignment-governance-stack/context-admission` implements the existing **Semantic Context and Admissibility** function, layer 3 of the modular architecture. It does not add a thirteenth layer. It evaluates supplied artifacts and provenance envelopes before they become operational context. The package is deterministic, local, vendor-neutral, non-networked, and has no LLM calls.

The host must call admission before inserting retrieved information into agent reasoning. Governance Core additionally checks declared material dependencies before PGDL. AGS cannot intercept every model token, discover undeclared dependencies, or stop a separate application from bypassing its functions. This release does not prove semantic equivalence between a summary and its parents or detect every prompt injection. Content is inert data to the evaluator; strings inside it never change policy, the task, authority, approval, or validators.

## Shared contracts

The public contracts live in `shared-types`:

| Contract | Meaning |
| --- | --- |
| `ContextArtifact` | Artifact identity, optional UTF-8 content and SHA-256 digest, type, time, sensitivity, revocation, permitted purposes and provenance |
| `ContextProvenance` | Source and producing agent, authority source, workflow/task, trust domain, receipt/fingerprint/authority references |
| `ContextTransformation` | Declared transformation, parent IDs, optional actor and time |
| `ContextUseScope` | Purpose, use mode, receiving agent, receiving trust domain and exact proposal/tool/action/target/environment and canonical action hash for operational use |
| `ContextValidationEvidence` | Host-supplied validation, integrity, receiving-use authority or domain-transfer attestation bound to content hash and exact use, with validator and validity window |
| `ContextAdmissionPolicy` | Receiving host's trusted sources, validators and authority sources, plus required evidence settings |
| `ContextAdmissionRequest` | Supplied artifact graph, material root IDs, requested use, explicit evaluation time, policy and validation evidence |
| `ContextAdmissionEvidence` | Recorded decision, findings, digest, time, use and content-free lineage references |

Artifact fields are optional where evidence may genuinely be absent. Missing evidence produces precise findings; it does not establish maliciousness. Dates require time zones. Invalid input shapes, duplicate IDs, malformed hashes, and invalid dates are input errors rather than admission decisions.

`contentHash` is `sha256:` followed by lowercase hexadecimal SHA-256 of the exact UTF-8 content. It is not an ingest file hash: continuity-ingest hashes the source JSON bytes separately. The package reuses receipt canonicalization and SHA-256 utilities for evidence digests instead of introducing a second provenance store.

## Trust boundary

The host supplies policy, source recognition, validator identity, current revocation state, evidence, and the evaluation clock through a trusted channel. Do not let retrieved content populate these fields or the receiving policy. Source labels, declared authority IDs, stored validation flags, and prior-admission references alone do not establish authority. Attestations must match the artifact digest, receiving agent, purpose, mode, domain and action fields, be current and unrevoked, and come from a validator recognized by the receiving policy. Authority and domain-transfer attestations must also name a recognized authority matching the provenance envelope.

This is deterministic verification of supplied claims, not an identity provider, signature verifier, live revocation service, or independent authentication of those claims. `verifyContextAdmissionEvidence` verifies the digest only. `validateContextAdmissionEvidence` additionally validates the imported shape. A self-consistent hash does not establish a trusted issuer. Imported decisions are historical evidence and cannot be passed to Governance Core in place of a fresh request.

## Decision precedence

The strongest finding across material roots and all supplied ancestors determines the result:

| Outcome | Receiving behavior |
| --- | --- |
| `admit` | Supplied evidence supports the specified use at the evaluation time; no execution approval is granted |
| `admit_restricted` | Low-sensitivity reference use only, with explicit limitations; never operational authority |
| `require_validation` | Resolve provenance, integrity, validation or lineage gaps before operational use |
| `require_human_review` | Resolve unsupported receiving authority, stale authority or cross-domain transfer |
| `reject` | Do not use this material for the requested purpose |

Precedence is `reject` > `require_human_review` > `require_validation` > `admit_restricted` > `admit`.

Integrity mismatch, expiration, explicit revocation, invalid validation state, an excluded purpose, circular lineage, inherited approval reuse, and treating artifact content as self-authorizing governance reject the requested use. Missing provenance, unknown source, missing parents, missing required validation, omitted permitted purposes, and unsupported integrity produce evidence-gap findings. Unknown provenance is not equated with maliciousness.

Operational use requires receiving-use authority and integrity even when those policy flags are omitted or set false. Low-sensitivity reference use can omit authority without being over-gated, but is marked restricted; omitting integrity requires explicit `requireIntegrity: false` and remains restricted. A genuine, validated artifact can still be invalid for a different purpose.

Every ancestor is inspected for the receiving use. A summary cannot wash away a revoked parent or a parent's purpose restriction. Missing parent envelopes and transformations without parent lineage require validation. The evaluator detects declared cycles iteratively. A producer that lies about being an original source cannot be discovered from an omitted lineage alone; source authentication and transformation validation remain host responsibilities.

## Authority does not transfer with information

Agent A's permission to create or use an artifact does not grant Agent B the same permission. A prior approval is not current approval. Prior validation for one purpose is not validation for another. A prior admission reference is useful history, not a reusable permit.

An approval document can be reviewed as historical reference data. Requesting `approval_reuse` is rejected. Likewise, `governance_instruction` cannot make inherited text authoritative. Operational approval still goes through Authority Map, Human Participation, AAG, and Runtime Binding.

## Governance Core, PGDL and AAG

Existing callers remain valid. Supply optional `contextAdmission: ContextAdmissionRequest` to `evaluateGovernedAction`, `evaluateGovernedRuntimeAction`, or `evaluateGovernedRuntimeActionWithReceipt` to declare material dependencies.

Core evaluates admission before PGDL. PGDL preserves its findings and rejects or escalates unresolved dependencies before AAG. Admitted and restricted evidence remains visible in the PGDL packet. AAG independently refuses unresolved/restricted context, reference mode, or an action-use mismatch. If PGDL revises the tool or action, the original admission cannot silently authorize the revision; submit a new request for the revised action. Neither PGDL nor Context Admission executes actions.

Runtime evaluation uses `validationOptions.now` when explicitly supplied by the trusted host, otherwise the current system clock; a historical request timestamp never becomes the default execution clock. Explicit past clocks are for deterministic tests or offline replay only, not live executors. Permits expire no later than artifact/authority restrictions and the supporting windows for required attestation kinds. Optional attestations do not shorten a permit; alternative valid attestations of the same required kind use the latest supporting expiry. Runtime Binding still validates the exact action and execution constraints. A host must supply a current clock and re-evaluate when content, authority, policy, revocation or use changes; the package does not subscribe to live state changes. An admission is not a persistent execution capability.

## Receipts and Agency Fingerprints

Receipts optionally preserve `contextAdmission`: material artifact IDs and content digests, source/producer/authority references, recorded creation/expiration/revocation, parent IDs, transformations, applicable evidence references and digest, policy digest, receiving use, findings and admission time. Full artifact content is not copied into this evidence. Existing proposal metadata remains caller-controlled and should not be used to embed sensitive context.

The context-lineage digest covers this record. Governance Core derives the fingerprint's optional `contextLineageDigest` from its actual admission result, alongside the existing delegated-authority lineage. Fingerprints are links, not another provenance database. Receipt and fingerprint hashing covers these additive fields; historical objects without them retain their original hashes.

## Governance Memory and Agency Chain Mapper

Governance Memory storage/history is not automatically admissible operational context. Historical receipts and recommendations can remain stored while unapproved, stale, irrelevant, revoked or restricted for future use. Memory still recommends human-reviewed changes and never silently mutates policy. Wrap retrieved memory as an artifact and evaluate the intended receiving use.

Agency Chain inputs optionally accept `contextAdmissions`. The mapper produces `information_handoff` links showing producer -> artifact -> receiver, creation and review times, parent references and transformations. Findings surface missing provenance, authority that did not transfer, transformation gaps and stale/revoked inheritance. These issues use the existing Human Agency Audit adapter and evidence-gap taxonomy. A chain report describes supplied historical evidence; it does not re-admit information.

## Read-only Continuity Console

continuity-ingest recognizes standalone admission evidence and admission evidence embedded in receipts, validates shape and digest, and maps it to layer 3 using the existing snapshot envelope. Source JSON is never changed. Parser provenance remains distinct from the artifact's original producer provenance.

Runs displays **Semantic continuity**, including temporal and cross-agent handoffs, transformations, lineage gaps, the receiving action and recorded decision. Runtime continuity remains the question of whether the permitted action matched execution. An imported `admit` is displayed as recorded evidence, never a new approval or live enforcement claim. Sample Mode stays separate; missing Local Evidence Mode artifacts remain not demonstrated.

## CLI and examples

```bash
node packages/cli/dist/cli.js context-admit examples/context-admission/valid-temporal-relay.json
node packages/cli/dist/cli.js context-admit examples/context-admission/revoked-artifact.json --json
node packages/cli/dist/cli.js redteam
```

Exit codes: `0` for `admit` or `admit_restricted` (inspect the outcome and scope), `1` for validation/review/rejection, `2` for invalid arguments, JSON, input schema or unreadable input. There is no server, database, authentication service or network call.

The [example catalog](../examples/context-admission/README.md) and [eval fixtures](../evals/fixtures/context-admission) cover temporal relay, unknown source, expiration, revocation, summary laundering, cross-domain inheritance, approval reuse, embedded instructions, circular lineage and invalid purpose, with positive controls. Unit and integration tests additionally cover evidence expiration/revocation, hash mismatch, wrong receiver/target, missing parents, ancestor restrictions, diamond lineage, malformed input, receipt tampering and runtime permit expiration.

The receiving system must govern what it inherits before inherited information can govern what the system does.

## Release-candidate boundary clarifications

Operational admission defaults to requiring current validation. `requireValidation: false` is an explicit receiving-policy exception; a stored `validated` label never satisfies the default. Operational artifacts must include sensitivity and host-supplied revocation state. Unknown revocation remains visible in historical evidence but cannot support operational admission. This is a supplied state check, not a live revocation lookup.

Operational use must include `requestedUse.action.actionHash`, produced by Runtime Binding's existing `createActionHash(proposal)`. It binds reversibility, external-facing status, sensitivity, approval flags and canonical execution constraints in addition to tool, action type, target and environment. Proposal ID is checked separately. Arbitrary metadata remains outside this hash; encode consequential values as execution constraints. Recompute the receiving attestations after any bound change; never relabel old attestations.

The exported CommonJS `evaluateAag` remains compatible for callers without inherited context. Supplying an admission report alone now blocks. Its optional third argument is a trusted host `ContextAdmissionValidator`, not serializable evidence. Governance Core supplies this check against its freshly evaluated request, evidence schema/digest, validity and canonical action hash. Standalone hosts must perform equivalent fresh evaluation against host-owned policy and receiver identity; a callback that unconditionally returns true defeats that host boundary. Do not reconstruct a validator from imported JSON. Hash verification does not authenticate an issuer.

When a fingerprint is requested, its `agentId` must match the admitted receiver; mismatches throw before runtime evaluation. The direct fingerprint mapper also rejects inconsistent identity. These are consistency checks, not agent identity authentication.

Admission remains opt-in for legacy callers. Hosts must enumerate material inherited dependencies and submit them through admission; the library cannot discover hidden model context or prevent a separate process bypassing it. Prior approval is never imported into current approval by this path. Existing explicit Authority Map approval validation remains required for actions governed by that policy.

The receipt-level admission is the canonical run record. PGDL and AAG packets retain the same report as stage snapshots, not independent provenance authorities. Receipt construction rejects divergent snapshots. Imported records with extra content fields are rejected, including when their digests have been recomputed.
