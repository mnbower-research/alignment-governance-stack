# Runtime Governance Conformance Fixture Design

## 1. Status and Scope

This document defines deterministic reference cases. Static TypeScript fixtures and reference resolution tests are implemented in the Continuity Console; they are reference examples, not production runtime enforcement.

The fixtures are intended to test whether future modules, manifests, permits, receipts, and adapters conform to the hardened Runtime Governance Interoperability Specification. They do not implement runtime behavior.

No runtime execution, external adapters, permit issuance, approval write-back, production interoperability, production cryptography, backend service, database, authentication, billing, marketplace behavior, filesystem watcher, new Console page, new UI control, is implemented by this document. The Console contains the corresponding static fixture implementation.

## 2. Purpose

A conforming implementation should produce the same expected action-path outcome for the same governed-action inputs.

The fixture suite should test:

- module verdict handling
- advisory and binding authority separation
- PGDL recommendation handling
- AAG authorization limits
- human-review boundaries
- envelope freshness
- outage behavior
- permit eligibility
- receipt lifecycle continuity
- override boundaries
- revocation behavior

The fixture design is intentionally small and deterministic. It is not a complete domain ontology and does not attempt to model every regulated environment.

## 3. Fixture Format

Each future fixture should document:

- fixture ID
- title
- purpose
- objective
- action-envelope summary
- envelope version
- participating modules
- module requirement classes
- module authority classes
- module verdicts
- PGDL recommendation
- AAG decision
- human-review state
- override state if applicable
- runtime-permit eligibility
- expected runtime-permit outcome
- expected receipt lifecycle state
- expected operator-facing explanation
- expected audit evidence
- deterministic rule being tested

This format is documentation-first. A later TypeScript implementation should preserve the expected outcomes rather than inventing new behavior.

## 4. Core Fixture Suite

### Fixture 01: Valid Low-Risk Internal Draft

**Fixture ID:** `rgcf-001-valid-low-risk-internal-draft`

**Purpose:** Establish the positive control case where all required checks pass.

**Objective:** Prepare an internal documentation draft.

**Action-envelope summary:** Internal documentation agent writes a draft to an approved internal workspace. The target, tool, actor, parameters, and scope are explicit. No external transmission occurs.

**Envelope version:** `env-v1`, current, integrity-referenced.

**Participating modules:** identity verification, policy boundary, PGDL, AAG, Runtime Binding, receipt continuity.

**Module requirement classes:** identity and policy are mandatory; receipt continuity is mandatory.

**Module authority classes:** identity, policy, AAG, Runtime Binding, and receipt continuity are binding.

**Module verdicts:** identity passes; policy passes; receipt record is reserved.

**PGDL recommendation:** continue.

**AAG decision:** allow.

**Human-review state:** not required.

**Override state:** none.

**Runtime-permit eligibility:** eligible.

**Expected runtime-permit outcome:** narrow permit may be issued for the exact actor, tool, target, parameters, scope, expiration, envelope version, and integrity reference.

**Expected receipt lifecycle state:** `reserved` -> `decision-recorded` -> `permit-issued`; after execution evidence, `execution-appended` -> `finalized`.

**Expected operator-facing explanation:** All mandatory checks are current, no human review is required, and the action is limited to an approved internal draft target.

**Expected audit evidence:** envelope version, integrity reference, module evaluations, PGDL continuation, AAG allow decision, permit reference, execution evidence, final outcome.

**Deterministic rule being tested:** A permit may be issued only when all mandatory evaluations are current, no binding block remains, no review is required, and receipt continuity is available.

### Fixture 02: Advisory Revision Before Authorization

**Fixture ID:** `rgcf-002-advisory-revision-before-authorization`

**Purpose:** Prove that PGDL revision changes envelope freshness and prevents stale evaluations from supporting permit issuance.

**Objective:** Prepare public-release wording.

**Action-envelope summary:** Agent proposes a public-release draft but the envelope blurs draft-only preparation with publication scope.

**Envelope version:** Original `env-v1`; revised draft-only envelope `env-v2`.

**Participating modules:** release policy, domain wording review, PGDL, AAG, receipt continuity.

**Module requirement classes:** release policy is mandatory; domain wording review is optional advisory unless profile elevates it; receipt continuity is mandatory.

**Module authority classes:** release policy and AAG are binding; domain wording review and PGDL input are advisory.

**Module verdicts:** release policy passes only for draft-only scope; domain wording review warns about public-facing language.

**PGDL recommendation:** revise to draft-only.

**AAG decision:** original envelope is not allowed; revised envelope may proceed only after required re-evaluation.

**Human-review state:** not required for draft-only envelope unless profile requires release-owner review.

**Override state:** none.

**Runtime-permit eligibility:** `env-v1` is not eligible; `env-v2` is eligible only after required modules re-evaluate it.

**Expected runtime-permit outcome:** no permit for `env-v1`; a narrow draft-only permit may be issued for `env-v2` only after fresh evaluations.

**Expected receipt lifecycle state:** receipt records `env-v1`, PGDL revision recommendation, stale `env-v1` evaluations, new `env-v2`, and any later permit decision.

**Expected operator-facing explanation:** PGDL narrowed the action; previous evaluations do not authorize the revised envelope.

**Expected audit evidence:** original envelope, revision reason, new envelope version, stale prior evaluations, fresh required evaluations, AAG decision.

**Deterministic rule being tested:** Material envelope revisions create a new version and invalidate prior evaluations and prior permit eligibility.

### Fixture 03: Binding Human-Review Requirement

**Fixture ID:** `rgcf-003-binding-human-review-requirement`

**Purpose:** Confirm that unresolved binding human review prevents automatic execution.

**Objective:** Summarize sensitive internal financial figures.

**Action-envelope summary:** Finance-summary agent writes sensitive figures to a target workspace without verified destination approval.

**Envelope version:** `env-v1`, current.

**Participating modules:** identity verification, destination authority, sensitive-data policy, finance domain review, PGDL, AAG, receipt continuity.

**Module requirement classes:** identity, destination authority, sensitive-data policy, and receipt continuity are mandatory.

**Module authority classes:** identity, destination authority, sensitive-data policy, and AAG are binding; finance domain review and PGDL recommendations may be advisory.

**Module verdicts:** identity passes for requester; destination authority returns binding `require human review`; sensitive-data policy requires verified target approval.

**PGDL recommendation:** narrow audience and fields before authorization.

**AAG decision:** require human review; no automatic allow.

**Human-review state:** required and unresolved.

**Override state:** none.

**Runtime-permit eligibility:** not eligible until the required human review is complete for the exact envelope version.

**Expected runtime-permit outcome:** no permit while review is unresolved.

**Expected receipt lifecycle state:** `reserved` -> `decision-recorded`; no `permit-issued` until review is satisfied.

**Expected operator-facing explanation:** Destination authority for sensitive financial data is not verified.

**Expected audit evidence:** sensitive-data classification, destination target, review requirement, PGDL recommendation, AAG decision, receipt reservation.

**Deterministic rule being tested:** AAG cannot allow automatic execution while a binding human-review requirement remains unresolved.

### Fixture 04: Binding Block

**Fixture ID:** `rgcf-004-binding-block`

**Purpose:** Confirm that a binding block prevents permit issuance.

**Objective:** Deploy code after tests pass.

**Action-envelope summary:** Deployment agent requests production deployment of a specific build artifact after tests pass.

**Envelope version:** `env-v1`, current.

**Participating modules:** identity verification, CI test evidence, secret scanner, deployment-window policy, PGDL, AAG, receipt continuity.

**Module requirement classes:** identity, secret scanner, deployment-window policy, and receipt continuity are mandatory.

**Module authority classes:** secret scanner and AAG are binding; CI test evidence may be evidence-only or binding by profile.

**Module verdicts:** tests pass; deployment window passes; secret scanner returns binding block for exposed credential.

**PGDL recommendation:** remediate credential exposure before authorization.

**AAG decision:** block.

**Human-review state:** human approval alone is not sufficient unless the constraint is explicitly modeled as overrideable.

**Override state:** none.

**Runtime-permit eligibility:** not eligible.

**Expected runtime-permit outcome:** no runtime permit.

**Expected receipt lifecycle state:** `reserved` -> `decision-recorded` -> `aborted`.

**Expected operator-facing explanation:** Mandatory secret scanner blocked the deployment because an exposed credential was detected.

**Expected audit evidence:** build artifact reference, test result, secret-scanner finding, module authority class, PGDL recommendation, AAG block, no-permit outcome.

**Deterministic rule being tested:** AAG cannot override a binding block.

### Fixture 05: Non-Overridable Constraint

**Fixture ID:** `rgcf-005-non-overridable-constraint`

**Purpose:** Verify that non-overridable constraints cannot be bypassed.

**Objective:** Attempt an action prohibited by an explicitly non-overridable policy.

**Action-envelope summary:** Agent proposes an action whose target and parameters violate a non-overridable constraint defined by the applicable domain profile.

**Envelope version:** `env-v1`, current.

**Participating modules:** policy boundary, domain profile constraint, AAG, receipt continuity.

**Module requirement classes:** policy boundary and receipt continuity are mandatory.

**Module authority classes:** policy boundary is binding; non-overridable flag is true.

**Module verdicts:** binding block with non-overridable constraint.

**PGDL recommendation:** reject before authorization or revise away from the prohibited constraint.

**AAG decision:** block.

**Human-review state:** approval attempt may be present but cannot satisfy the constraint.

**Override state:** attempted override rejected.

**Runtime-permit eligibility:** not eligible.

**Expected runtime-permit outcome:** no runtime permit.

**Expected receipt lifecycle state:** `reserved` -> `decision-recorded` -> `aborted`.

**Expected operator-facing explanation:** The constraint is marked non-overridable, so neither AAG nor human approval can bypass it.

**Expected audit evidence:** non-overridable flag, module verdict, attempted override or approval if present, AAG block, receipt record.

**Deterministic rule being tested:** Non-overridable constraints cannot be bypassed by AAG or human reviewers.

### Fixture 06: Mandatory Module Outage

**Fixture ID:** `rgcf-006-mandatory-module-outage`

**Purpose:** Verify fail-closed behavior for mandatory binding module outage.

**Objective:** Perform a low-risk internal metadata update.

**Action-envelope summary:** Internal maintenance agent proposes a narrow reversible metadata update, but mandatory identity verification is unavailable.

**Envelope version:** `env-v1`, current.

**Participating modules:** identity verification, policy boundary, PGDL, AAG, receipt continuity.

**Module requirement classes:** identity verification is mandatory; policy boundary and receipt continuity are mandatory.

**Module authority classes:** identity verification and AAG are binding.

**Module verdicts:** identity verification unavailable; policy boundary may pass.

**PGDL recommendation:** hold pending required identity evidence.

**AAG decision:** block or hold pending according to profile; default no permit.

**Human-review state:** no human fallback unless profile explicitly models one.

**Override state:** none.

**Runtime-permit eligibility:** not eligible.

**Expected runtime-permit outcome:** no runtime permit.

**Expected receipt lifecycle state:** `reserved` -> `decision-recorded`; may end as `aborted` or remain pending according to profile state naming.

**Expected operator-facing explanation:** Mandatory identity verification is unavailable, so the action fails closed.

**Expected audit evidence:** unavailable module state, requirement class, authority class, profile failure behavior, AAG decision.

**Deterministic rule being tested:** Mandatory binding module unavailable means fail closed by default and no permit.

### Fixture 07: Optional Advisory Module Outage

**Fixture ID:** `rgcf-007-optional-advisory-module-outage`

**Purpose:** Verify degraded operation for optional advisory outage when profile permits it.

**Objective:** Prepare an internal draft.

**Action-envelope summary:** Internal documentation agent writes a draft to an approved workspace while an optional wording-review module is unavailable.

**Envelope version:** `env-v1`, current.

**Participating modules:** identity verification, policy boundary, optional wording review, PGDL, AAG, receipt continuity.

**Module requirement classes:** identity, policy, and receipt continuity are mandatory; wording review is optional.

**Module authority classes:** wording review is advisory; identity, policy, AAG, and receipt continuity are binding.

**Module verdicts:** identity passes; policy passes; wording review unavailable.

**PGDL recommendation:** continue if profile permits degraded advisory operation.

**AAG decision:** allow if all mandatory checks pass and degraded operation is permitted.

**Human-review state:** not required.

**Override state:** none.

**Runtime-permit eligibility:** eligible only because profile permits degraded operation for this optional advisory module.

**Expected runtime-permit outcome:** narrow permit may be issued.

**Expected receipt lifecycle state:** `reserved` -> `decision-recorded` -> `permit-issued`; later finalized after execution evidence.

**Expected operator-facing explanation:** Optional wording review is unavailable, but this internal draft profile permits degraded operation.

**Expected audit evidence:** unavailable advisory module state, profile degraded-mode allowance, mandatory passes, AAG allow decision.

**Deterministic rule being tested:** Optional advisory outage may continue only under configured degraded-mode rules and must remain visible in the receipt.

### Fixture 08: Material Envelope Revision Invalidates Prior Evaluations

**Fixture ID:** `rgcf-008-material-revision-invalidates-evaluations`

**Purpose:** Verify that material changes invalidate evaluations and prior permit eligibility.

**Objective:** Send an approved internal email draft.

**Action-envelope summary:** Agent initially drafts an internal email, then revises the envelope to add an external recipient.

**Envelope version:** Original `env-v1`; revised `env-v2`.

**Participating modules:** identity verification, policy boundary, recipient classification, PGDL, AAG, Runtime Binding, receipt continuity.

**Module requirement classes:** identity, policy boundary, recipient classification, and receipt continuity are mandatory.

**Module authority classes:** policy boundary, recipient classification, AAG, and Runtime Binding are binding.

**Module verdicts:** `env-v1` passes; `env-v2` has not yet been evaluated.

**PGDL recommendation:** re-evaluate because recipient changed.

**AAG decision:** prior allow for `env-v1` does not apply to `env-v2`.

**Human-review state:** may become required for external recipient.

**Override state:** none.

**Runtime-permit eligibility:** prior eligibility invalidated.

**Expected runtime-permit outcome:** no prior permit may authorize `env-v2`; no new permit until all mandatory checks run again.

**Expected receipt lifecycle state:** receipt records the material revision, stale prior evaluations, and new decision path.

**Expected operator-facing explanation:** Adding an external recipient materially changed the envelope.

**Expected audit evidence:** `env-v1`, `env-v2`, changed recipient field, stale evaluation markers, re-evaluation requirement.

**Deterministic rule being tested:** Material envelope changes require a new version and fresh required evaluations.

### Fixture 09: Valid Scoped Human Override

**Fixture ID:** `rgcf-009-valid-scoped-human-override`

**Purpose:** Verify that valid overrides restore eligibility only within explicit limits.

**Objective:** Continue an action with an overrideable binding constraint.

**Action-envelope summary:** Agent proposes a constrained internal action. A binding module flags an overrideable constraint, and an authorized reviewer grants a scoped exception for the exact envelope version.

**Envelope version:** `env-v1`, current.

**Participating modules:** policy boundary, reviewer authority, AAG, receipt continuity.

**Module requirement classes:** policy boundary, reviewer authority, and receipt continuity are mandatory.

**Module authority classes:** policy boundary and reviewer authority are binding.

**Module verdicts:** policy boundary returns binding constraint marked overrideable; reviewer authority passes.

**PGDL recommendation:** continue only if override is valid and scoped.

**AAG decision:** may allow if all permit-eligibility conditions pass.

**Human-review state:** completed by authorized reviewer.

**Override state:** valid, scoped, unexpired, exact `env-v1`, receipt-recorded.

**Runtime-permit eligibility:** restored only if all other conditions pass.

**Expected runtime-permit outcome:** permit may be issued for exact envelope version and scope.

**Expected receipt lifecycle state:** `reserved` -> `decision-recorded` -> `permit-issued`; finalized after execution evidence.

**Expected operator-facing explanation:** The original binding verdict remains visible, and the scoped override satisfies the configured exception path.

**Expected audit evidence:** original verdict, override ID, reviewer identity, reviewer authority, scope, justification, expiration, receipt reference, AAG rationale.

**Deterministic rule being tested:** Human override can affect the path only when policy marks the constraint overrideable and the override is explicit, scoped, unexpired, and recorded.

### Fixture 10: Invalid Human Override

**Fixture ID:** `rgcf-010-invalid-human-override`

**Purpose:** Verify rejection of non-overridable or stale-envelope overrides.

**Objective:** Attempt to override an invalid constraint state.

**Action-envelope summary:** Reviewer attempts to override a non-overridable block or applies an override to a stale envelope version.

**Envelope version:** Current `env-v2`; attempted override references non-overridable constraint or stale `env-v1`.

**Participating modules:** policy boundary, reviewer authority, AAG, receipt continuity.

**Module requirement classes:** policy boundary and receipt continuity are mandatory.

**Module authority classes:** policy boundary and AAG are binding.

**Module verdicts:** non-overridable block or stale-envelope mismatch.

**PGDL recommendation:** reject override path; revise or abandon action.

**AAG decision:** block.

**Human-review state:** review attempt is insufficient.

**Override state:** rejected.

**Runtime-permit eligibility:** not eligible.

**Expected runtime-permit outcome:** no runtime permit.

**Expected receipt lifecycle state:** `reserved` -> `decision-recorded` -> `aborted`.

**Expected operator-facing explanation:** The override is invalid because the constraint is non-overridable or the override does not match the current envelope version.

**Expected audit evidence:** attempted override, reviewer identity if available, invalid reason, current envelope version, AAG block.

**Deterministic rule being tested:** Invalid overrides cannot restore permit eligibility.

### Fixture 11: Receipt Reservation Failure

**Fixture ID:** `rgcf-011-receipt-reservation-failure`

**Purpose:** Verify receipt continuity as a permit prerequisite for consequential actions.

**Objective:** Execute a consequential action after policy checks pass.

**Action-envelope summary:** Agent proposes a consequential action with passing mandatory checks, but the system cannot reserve a receipt record before permit issuance. This fixture models a consequential action only.

**Envelope version:** `env-v1`, current.

**Participating modules:** identity verification, policy boundary, AAG, receipt continuity.

**Module requirement classes:** identity, policy, and receipt continuity are mandatory.

**Module authority classes:** identity, policy, AAG, and receipt continuity are binding.

**Module verdicts:** identity passes; policy passes; receipt reservation fails.

**PGDL recommendation:** continue only if receipt continuity is available.

**AAG decision:** fail closed for consequential action.

**Human-review state:** not sufficient to bypass receipt requirement unless profile explicitly models a fallback audit path.

**Override state:** none.

**Runtime-permit eligibility:** not eligible because receipt continuity could not be established.

**Expected runtime-permit outcome:** no runtime permit and no execution.

**Expected receipt lifecycle state:** no unified-receipt lifecycle begins because no receipt record was successfully reserved.

**Expected operator-facing explanation:** The action cannot proceed because receipt continuity could not be established before permit issuance.

**Expected audit evidence:** a separate system-level audit event or observable operational error records the receipt-reservation failure, action consequence classification, AAG decision, no-permit outcome, and no-execution outcome.

**Deterministic rule being tested:** Receipt reservation failure prevents permit issuance for consequential actions when configured fail-closed.

**Open design note:** Whether low-consequence actions may ever proceed without receipt reservation remains unresolved.

### Fixture 12: Permit Revocation Before Execution

**Fixture ID:** `rgcf-012-permit-revocation-before-execution`

**Purpose:** Verify that a later blocking state invalidates an issued permit before execution.

**Objective:** Execute an action with a previously valid permit.

**Action-envelope summary:** Permit has been issued for a specific envelope, but before execution a required module reports a blocking condition.

**Envelope version:** `env-v1`, unchanged.

**Participating modules:** original mandatory modules, newly blocking required module, Runtime Binding, receipt continuity.

**Module requirement classes:** blocking module is mandatory.

**Module authority classes:** blocking module and Runtime Binding are binding.

**Module verdicts:** original evaluations passed; later required module reports binding block.

**PGDL recommendation:** not applicable to revocation event unless proposal revision is required after block.

**AAG decision:** prior allow no longer supports execution.

**Human-review state:** may be required for remediation, but cannot execute under revoked permit.

**Override state:** none unless explicitly valid and scoped.

**Runtime-permit eligibility:** invalidated.

**Expected runtime-permit outcome:** permit revoked; execution prohibited.

**Expected receipt lifecycle state:** `permit-issued` -> `revoked`.

**Expected operator-facing explanation:** A required module reported a blocking condition after permit issuance.

**Expected audit evidence:** original permit, blocking module report, revocation trigger, revocation timestamp, receipt update.

**Deterministic rule being tested:** Runtime permits become invalid when a required module later reports a blocking state or revocation is recorded.

### Fixture 13: Permit Expiration

**Fixture ID:** `rgcf-013-permit-expiration`

**Purpose:** Verify that expired permits cannot authorize execution.

**Objective:** Execute an otherwise valid permitted action.

**Action-envelope summary:** Agent attempts execution after the permit expiration timestamp.

**Envelope version:** `env-v1`, unchanged.

**Participating modules:** Runtime Binding, receipt continuity.

**Module requirement classes:** Runtime Binding and receipt continuity are mandatory.

**Module authority classes:** Runtime Binding is binding.

**Module verdicts:** permit expiration detected.

**PGDL recommendation:** not applicable unless a new proposal is required.

**AAG decision:** prior allow no longer supports execution without re-evaluation or new permit.

**Human-review state:** prior review may be stale if tied to expired permit.

**Override state:** any override must be unexpired to remain valid.

**Runtime-permit eligibility:** invalidated.

**Expected runtime-permit outcome:** execution prohibited; re-evaluation or new permit required.

**Expected receipt lifecycle state:** receipt records expiration outcome; exact state may be `aborted` or a future distinct expiration state.

**Expected operator-facing explanation:** The permit expired before execution.

**Expected audit evidence:** permit ID, expiration timestamp, attempted execution timestamp, Runtime Binding rejection.

**Deterministic rule being tested:** Expired permits cannot authorize execution.

### Fixture 14: Runtime Mismatch

**Fixture ID:** `rgcf-014-runtime-mismatch`

**Purpose:** Verify Runtime Binding blocks action drift.

**Objective:** Execute a permitted internal draft write.

**Action-envelope summary:** A valid permit authorizes an internal draft write, but the execution attempt targets an external publishing endpoint. This fixture models mismatch detection before any external side effect occurs.

**Envelope version:** `env-v1`, permit references current envelope.

**Participating modules:** Runtime Binding, receipt continuity.

**Module requirement classes:** Runtime Binding and receipt continuity are mandatory.

**Module authority classes:** Runtime Binding is binding.

**Module verdicts:** Runtime Binding detects the target mismatch before side effect.

**PGDL recommendation:** not applicable to the runtime mismatch event; new proposal required for external publish.

**AAG decision:** prior allow applies only to internal draft write.

**Human-review state:** any prior review applies only to the permitted envelope and target.

**Override state:** none.

**Runtime-permit eligibility:** prior permit remains valid only for the authorized internal draft write and cannot authorize the mismatched execution attempt.

**Expected runtime-permit outcome:** Runtime Binding blocks execution; permit cannot be reused for mismatched target.

**Expected receipt lifecycle state:** `permit-issued` -> mismatch evidence appended -> `aborted`.

**Expected operator-facing explanation:** The authorized scope was internal draft storage, but the attempted scope was external publishing.

**Expected audit evidence:** authorized scope, attempted scope, permit target, attempted target, mismatch evidence, Runtime Binding block, receipt update, no-side-effect assertion.

**Deterministic rule being tested:** Runtime Binding rejects tool, target, parameter, and scope drift.

**Open design note:** A runtime mismatch detected after a partial or completed side effect should be modeled as a separate future fixture.

### Fixture 15: Governance Memory Recommendation

**Fixture ID:** `rgcf-015-governance-memory-recommendation`

**Purpose:** Verify recommendations remain advisory and linked to source receipts.

**Objective:** Improve recurring target-description clarity.

**Action-envelope summary:** Several receipts show repeated human-review requirements caused by vague target descriptions.

**Envelope version:** Multiple historical envelope versions across receipts.

**Participating modules:** Governance Memory, receipt analysis, human review process.

**Module requirement classes:** Governance Memory recommendation is not an action authorization module.

**Module authority classes:** Governance Memory is advisory unless a future profile defines a different non-mutating review role.

**Module verdicts:** recommendation generated.

**PGDL recommendation:** future PGDL prompts may incorporate reviewed recommendation only after policy update approval.

**AAG decision:** not applicable to recommendation itself.

**Human-review state:** required before any policy update proposal advances.

**Override state:** none.

**Runtime-permit eligibility:** not applicable.

**Expected runtime-permit outcome:** no permit is issued for the recommendation itself.

**Expected receipt lifecycle state:** recommendation remains linked to motivating receipts.

**Expected operator-facing explanation:** Governance Memory found a pattern and recommends clearer target-bound prompts; no policy changed automatically.

**Expected audit evidence:** source receipt IDs, pattern summary, recommendation text, human-review requirement.

**Deterministic rule being tested:** Governance Memory may recommend changes but must not silently mutate policy.

## 5. Conflict-Coverage Matrix

| Fixture ID | Advisory verdict handling | Binding verdict handling | Human review | Override | Stale evaluation | Module outage | Permit issuance | Permit invalidation | Receipt lifecycle | Governance Memory |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `rgcf-001` | None | Passes required checks | Not required | None | No | No | Eligible | No | Reserve to finalized | No |
| `rgcf-002` | PGDL revision visible | Required checks re-run | Profile-specific | None | Yes | No | Not for original envelope | Yes | Records revision and stale evaluations | No |
| `rgcf-003` | PGDL narrowing visible | Binding review requirement | Required | None | No | No | Not until review complete | No | Records review requirement | No |
| `rgcf-004` | PGDL remediation visible | Binding block | Possible remediation only | None unless modeled | No | No | No | No | Records block and abort | No |
| `rgcf-005` | PGDL rejection or revision | Non-overridable block | Approval insufficient | Rejected | No | No | No | No | Records attempted bypass | No |
| `rgcf-006` | PGDL hold | Mandatory unavailable | No fallback by default | None | No | Mandatory outage | No | No | Records outage | No |
| `rgcf-007` | Optional advisory unavailable | Mandatory passes | Not required | None | No | Optional outage | Eligible if profile allows | No | Records degraded mode | No |
| `rgcf-008` | PGDL re-evaluation | Prior pass stale | May become required | None | Yes | No | No until re-evaluated | Yes | Records material revision | No |
| `rgcf-009` | PGDL conditional continue | Overrideable constraint | Completed | Valid | No | No | Eligible if all else passes | No | Records override | No |
| `rgcf-010` | PGDL reject override path | Block remains | Attempt insufficient | Invalid | Maybe | No | No | Yes if stale | Records rejected override | No |
| `rgcf-011` | PGDL requires receipt continuity | Mandatory receipt failure | Not sufficient by default | None | No | No | No | No | No unified receipt; system audit event records reservation failure | No |
| `rgcf-012` | Not primary | Later binding block | Possible remediation | None unless modeled | No | No | Previously issued | Revoked | Moves to revoked | No |
| `rgcf-013` | Not primary | Runtime expiration block | Prior review may expire | Must be unexpired | Maybe | No | Previously issued | Expired | Records expiration | No |
| `rgcf-014` | Not primary | Runtime mismatch block | Prior review scoped | None | No | No | Previously issued | Cannot authorize mismatch | Appends mismatch evidence and reaches `aborted` | No |
| `rgcf-015` | Recommendation only | No binding authorization verdict | Required before policy update | None | No | No | Not applicable | Not applicable | Links to source receipts | Yes |

## 6. Minimal First Implementation Set

The smallest future TypeScript fixture implementation should start with:

- Fixture 01: valid low-risk internal draft
- Fixture 03: binding human-review requirement
- Fixture 04: binding block
- Fixture 06: mandatory module outage
- Fixture 08: material envelope revision invalidates prior evaluations
- Fixture 11: receipt reservation failure
- Fixture 14: runtime mismatch

This subset exercises the most important permit and authority boundaries without implementing the entire suite at once. It covers a positive allow path, required human review, binding block, fail-closed outage, stale evaluation, receipt prerequisite, and Runtime Binding mismatch.

The remaining fixtures can follow once the first set proves that the fixture harness can express envelope versions, module authority, AAG outcomes, permit eligibility, and receipt lifecycle states deterministically.

## 7. Expected Future Artifact Shapes

Future fixture implementation may need these conceptual artifacts:

- action-envelope fixture
- module-manifest fixture
- governance-evaluation fixture
- PGDL recommendation fixture
- AAG decision fixture
- human-review fixture
- human-override fixture
- runtime-permit fixture
- unified-receipt fixture
- Governance Memory recommendation fixture

These should remain small and typed. They should encode expected outcomes, not production integrations.

## 8. Readiness Criteria for Fixture Implementation

Fixture implementation should begin only when:

- each fixture has one deterministic expected outcome
- permit eligibility is unambiguous
- receipt lifecycle behavior is unambiguous
- overrideability is explicit
- mandatory versus optional module behavior is explicit
- stale-evaluation handling is explicit
- operator-facing explanations are understandable
- the minimal first implementation set is agreed

The hardened specification currently supports documentation-only fixture design. A restrained TypeScript pass should implement only the minimal first implementation set first.

## 9. Open Questions

- Should expired permits use a distinct lifecycle state or a broader invalid state?
- May low-consequence actions ever continue after receipt-reservation failure?
- How do revocation signals propagate to in-flight execution?
- Which fixture should first model cryptographic integrity evidence?
- Should domain-profile fixtures follow the generic core fixtures or be developed in parallel?
- How should post-side-effect runtime mismatches be represented?

## 10. Recommended Next Step

The documentation-only fixture design appears ready for a restrained TypeScript implementation pass, limited to the minimal first implementation set.

That future pass should not add adapters, live execution, approval write-back, backend behavior, or production cryptography. It should define local deterministic fixture data and assertions only, using the hardened specification as the expected-outcome source.

If implementation reveals ambiguity in the seven-fixture minimal set, the specification should be revised before expanding to the remaining fixtures.
