# Runtime Governance Interoperability Specification

## 1. Status

This is an early internal design specification. It is not an implemented runtime contract, adapter API, SDK, certification program, or production standard.

The repository currently contains typed local sample records for governed actions and a Workbench preview that derives several sample UI sections from those records. The sample records are useful for clarifying shape, language, and operator workflow, but they do not create live interoperability.

This proposed interoperability protocol has no live orchestrator, dynamic external adapter registry, approval write-back, or production interoperability implementation. Existing AGS core packages do issue and validate local runtime permits, and static conformance fixtures and pure reference resolvers exist in the Console. Those implementations do not establish conformance to this entire proposed protocol. No live agents, external side effects, hosted service, or automatic policy mutation are added.

This revision responds to the adversarial architecture review in `docs/RUNTIME_GOVERNANCE_INTEROPERABILITY_REVIEW.md`. The review remains a separate critique document.

## 2. Problem Statement

The practical authorization question is:

```text
Can this agent perform this exact action, against this target, under this delegated authority, within this scope, through this tool, under the current conditions?
```

Future governed action paths need more than a single allow or deny value. Governance frameworks, organizational policies, identity systems, domain controls, human approvals, runtime enforcement, and audit evidence must eventually contribute to one coherent action-path decision.

The challenge is to keep those contributions structured, traceable, and scoped so that each governance layer can be inspected without implying authority it does not have.

## 3. Design Goal

The model is intended to support modular governance without collapsing every layer into one opaque score or allowing modules to silently exceed their declared authority.

The intended future sequence is:

```text
Governance requirements
-> structured module evaluations
-> scoped advisory and binding verdicts
-> PGDL proposal scrutiny
-> AAG authorization decision
-> runtime permit
-> permit-bound execution
-> unified receipt
-> Governance Memory recommendation
```

PGDL is a fixed architectural stage. It challenges proposals before they become authorized action candidates. PGDL may consume objections, evidence, and recommendations from pluggable governance evaluators, and it may recommend revision, escalation, rejection before AAG, or continuation. PGDL does not approve execution and does not issue runtime permits. External evaluators may participate in PGDL without replacing the fixed PGDL stage.

AAG is a fixed final authorization stage before runtime-permit issuance. AAG resolves the final configured action-path decision after module verdicts, PGDL recommendations, human-review requirements, and policy constraints are available. AAG authorization is not the same as an individual module verdict.

AAG may process advisory verdicts according to configured policy. AAG cannot allow automatic execution while a binding `require human review` verdict remains unresolved. AAG cannot override a binding block. AAG cannot override a non-overridable constraint. AAG may issue an `allow` decision only when permit-eligibility conditions are satisfied. AAG decisions must be recorded in the unified receipt lifecycle.

Runtime Binding validates that the exact runtime action matches a valid permit. Receipts preserve evidence across the decision path. Governance Memory may surface recommendations, but it must not silently mutate policy.

Open implementation detail: some advisory evaluators may run before PGDL, within PGDL, or both. Domain profiles should eventually define that ordering without replacing PGDL as a fixed stage.

## 4. Existing Preview Implementation

The implemented preview currently exists only as local sample data and read-only UI rendering.

Current sample-data structures include:

- typed governed-action sample records
- assignments derived from shared records
- review packets derived from shared records
- governance-path evaluations
- advisory and binding authority labels
- runtime-permit state
- receipt state
- recent activity events
- separate agent/team health summaries

The Workbench derives assignments, review packets, governance path details, runtime permit state, receipt state, and recent governed activity from `sampleGovernedActions`. It does not connect to live agents, issue permits, execute actions, write approvals, mutate policies, or write receipts.

Agent/team health remains separate from individual governed-action records because it summarizes operational and governance conditions across an agent team. Forcing those summary indicators into an individual action record would blur action-specific evidence with team-level status.

## 5. Canonical Governed-Action Record

The current sample record shape is a preview-stage local model. Its conceptual purpose is to describe one governed action clearly enough that multiple Workbench sections can derive from the same sample source.

Current sample fields include:

- action ID
- objective ID
- objective
- assigned agent
- scope
- status
- next expected step
- human-review requirement
- proposed action
- target
- reversibility
- recommended operator action
- governance evaluations
- runtime-permit state
- receipt state
- activity events

The current sample model also includes Workbench-supporting fields such as review reason and strongest concern. Those fields help the current preview explain why an operator should inspect the action.

Future views should derive from shared governed-action records where appropriate, but the current implementation only uses this shared sample model in the Workbench preview.

## 6. Action Envelope

An action envelope is a proposed future contract. It is the minimum structured action description needed before runtime authorization.

A future action envelope should include:

- action ID
- action-envelope version
- envelope integrity reference or hash
- created timestamp
- last-modified timestamp
- evaluation freshness state
- action type
- actor
- delegated authority
- target
- parameters
- requested tool
- scope
- expected outcome
- sensitivity
- reversibility
- expiration
- supporting evidence

Some of these concepts are represented in the current sample model, such as proposed action, assigned agent, target, scope, reversibility, and review evidence summaries. The current sample model is not yet a full action envelope.

Evaluations are bound to one exact action-envelope version. Material changes create a new envelope version. Prior evaluations become stale after a material envelope revision. Stale evaluations cannot support runtime-permit issuance. Prior permit eligibility is invalidated after material revision. Revised envelopes must be re-evaluated by all required modules. Runtime permits must reference the exact envelope version and integrity reference.

Material changes include changes to:

- target
- recipient
- parameters
- amount
- requested tool
- scope
- sensitivity
- delegated authority
- expected outcome

Vague natural-language intent is insufficient for permit-bound execution. Runtime Binding needs stable fields that can be compared against permits, tool calls, targets, parameters, approval evidence, override evidence, and receipts.

## 7. Governance Module Manifest

A governance module manifest is proposed future behavior. It would declare where an external governance module belongs, what it evaluates, what authority it has, and how it behaves when unavailable.

Proposed manifest metadata includes:

- module ID
- name
- version
- provider
- purpose
- governed domain
- accepted action types
- applicable action types
- applicable domain profiles
- required inputs
- supported outputs
- requirement class: `mandatory` or `optional`
- authority class
- failure behavior
- degraded-mode behavior
- overrideability
- non-overridable flag where appropriate
- receipt contribution
- configuration reference

A manifest is not proof of safety, enforcement, testing, production validation, or live integration. It is a declaration that can be inspected and compared with configured authority rules.

External modules must not silently assign themselves broader authority than their manifest declares.

Default outage behavior:

- Mandatory binding module unavailable: fail closed and do not issue a runtime permit.
- Optional advisory module unavailable: continue only if the configured profile permits degraded operation, and record the unavailable state.
- Evidence-only module unavailable: record the evidence gap and follow configured profile behavior.
- Module outages must remain visible in the receipt.

Domain profiles may tighten these defaults. They may require fail-closed behavior for additional module classes, shorten retry windows, or disallow degraded operation for specific action types.

## 8. Governance Evaluation

The current Workbench sample records include governance evaluations. Each evaluation is a structured contribution from a named governance layer in the sample action path.

Current sample evaluation fields include:

- evaluation ID
- layer name
- plain-language purpose
- current verdict
- authority class
- status
- technical details

Future evaluations should also reference the exact action-envelope version and integrity reference they evaluated. They should expose freshness state so stale evaluations cannot be reused for runtime-permit issuance.

Evaluations allow separate governance layers to contribute scoped evidence without controlling unrelated parts of the action path. For example, an advisory domain-specific constraint can recommend review while a binding AAG authority check prevents automatic continuation.

The current evaluations are local sample records only. They do not call external modules, enforce policy, or produce runtime permits.

## 9. Verdict Schema

The following shared verdict vocabulary is proposed future design work. It is not yet implemented as a repository-wide runtime contract.

| Verdict | Automatic execution may continue? | Must the action envelope be revised? | Human review required? | Must appear in receipt? |
| --- | --- | --- | --- | --- |
| `pass` | Yes, unless another required check or AAG blocks it. | No. | No, unless another rule requires it. | Yes, when used in the action path. |
| `warn` | Usually yes, subject to configured authority rules. | Not necessarily. | Optional or policy-specific. | Yes. |
| `recommend revision` | Not automatically when the module is binding, mandatory, or profile-configured to stop continuation. | Yes, before the recommendation is resolved. | Often, depending on policy. | Yes. |
| `require human review` | No automatic execution when binding or required by profile. | Not necessarily. | Yes. | Yes. |
| `escalate` | No automatic execution until escalation resolves. | Not necessarily. | Yes or domain-specific escalation. | Yes. |
| `block` | No. | Possibly, but the current envelope is not authorized. | Optional for appeal or remediation. | Yes. |
| `pending` | No automatic execution if the check is mandatory. | Not yet known. | Possibly. | Yes, if it affects the decision path. |
| `unavailable` | Depends on mandatory or optional configuration. Mandatory binding modules fail closed by default. | Not necessarily. | Possibly. | Yes, when it affects confidence or authorization. |

An individual module verdict is not the same as the final AAG authorization decision. AAG resolves the final action-path decision according to configured authority rules, mandatory checks, human-review requirements, override records, freshness state, receipt readiness, and runtime constraints.

## 10. Authority Classes

The current Workbench sample evaluations represent these authority classes:

- `advisory`
- `binding`

Proposed future authority classes may include:

- `escalation-triggering`
- `evidence-only`

`advisory` evaluations can contribute warnings, recommendations, or evidence without directly authorizing or blocking execution. `binding` evaluations can prevent automatic continuation according to configured authority rules. `escalation-triggering` evaluations require human or organizational review before the action path can continue. `evidence-only` evaluations contribute receipt, audit, provenance, or context evidence without issuing action-path verdicts.

External modules must not silently assign themselves broader authority. AAG resolves the final action-path decision according to configured authority rules, including which modules are mandatory for a domain, action type, environment, target, or sensitivity class.

## 11. Human Overrides

A human override is a proposed future record for exceptional continuation where policy explicitly allows a constraint to be overridden.

A proposed human-override record should include:

- override ID
- action ID
- action-envelope version
- reviewer identity
- reviewer authority
- affected constraint or verdict
- justification
- scope
- expiration
- created timestamp
- receipt reference

Human overrides are allowed only where policy explicitly marks a constraint as overrideable. Overrides must be scoped to one exact action-envelope version. Overrides must be explicit, attributable, time-bound, and receipt-recorded. Overrides cannot silently erase the underlying module verdict. Non-overridable constraints cannot be bypassed by AAG or a human reviewer. Revised action envelopes invalidate prior overrides unless explicitly re-reviewed.

Human review is not the same as a human override. Human review may satisfy a required review step. A human override changes the action path only when an overrideable constraint remains and policy allows a scoped exception.

## 12. Conflict Resolution

The deterministic conflict model should follow these principles:

- binding block overrides advisory pass
- required human review prevents automatic execution
- mandatory binding modules that are unavailable fail closed by default
- optional advisory outages may continue only under configured degraded-mode rules
- advisory disagreement remains visible in the receipt
- revised proposals must be re-evaluated by all required modules
- stale evaluations must not produce runtime permits
- human override must be explicit, scoped, unexpired, and recorded
- non-overridable constraints cannot be bypassed by AAG or a human reviewer
- receipt reservation failure prevents permit issuance for consequential actions when configured fail-closed

| Combination | Resulting action-path outcome | Automatic execution may continue? | Runtime permit may be issued? | Receipt requirement |
| --- | --- | --- | --- | --- |
| advisory pass + advisory warning | Continue unless policy elevates warning. | Yes, if AAG and required checks allow. | Yes, if permit eligibility is otherwise satisfied. | Record both advisory results. |
| advisory pass + binding block | Block or require revision according to the binding verdict. | No. | No. | Record advisory pass, binding block, and AAG decision. |
| advisory revision + binding pass | Continue only if policy allows unresolved advisory revision; otherwise revise before AAG allow. | Maybe, according to profile. | Only if AAG determines revision is not required and all eligibility conditions hold. | Record advisory revision and AAG rationale. |
| binding pass + binding require-human-review | Hold for human review. | No. | No, until review is complete. | Record binding pass, review requirement, and review result. |
| binding pass + mandatory module unavailable | Fail closed or hold pending according to profile; default is no permit. | No. | No. | Record unavailable mandatory module and outage state. |
| human approval + overrideable binding constraint | Continue only if a valid scoped override record exists. | Maybe, after AAG accepts the override under policy. | Yes, only if all permit eligibility conditions hold. | Record original verdict, approval, override record, and AAG decision. |
| human approval + non-overridable block | Block. | No. | No. | Record human approval attempt and non-overridable block. |
| stale evaluation + prior permit reference | Invalidate prior permit eligibility; require re-evaluation. | No. | No. | Record stale state and invalidation reason. |
| revised action envelope + prior evaluations | Prior evaluations become stale; required modules must re-evaluate the new envelope version. | No automatic continuation until required evaluations are current. | No, until re-evaluation and eligibility pass. | Record new envelope version and stale prior evaluations. |
| receipt reservation failure + consequential action | Fail closed if configured as consequential or receipt-required. | No. | No. | Record failure if any fallback audit path is available. |

Open design questions remain around remediation ordering when multiple binding modules block with different recommended fixes, and around whether repeated advisory disagreement should be elevated by specific domain profiles.

## 13. Runtime Permit

A runtime permit is a proposed future contract. It would bind authorization to a specific runtime action.

A proposed permit should include:

- permit ID
- action ID
- action-envelope version
- action-envelope integrity reference
- authorized actor
- authorized tool
- authorized target
- authorized parameters
- permitted scope
- expiration
- required preconditions
- approval references
- valid override references where applicable
- governance-evaluation references
- receipt reference
- revocation state
- integrity proof

Runtime Binding prevents an approved action from drifting during execution. It should reject tool substitution, target substitution, scope expansion, stale approvals, stale evaluations, expired permits, missing preconditions, unpermitted parameter changes, and material envelope changes after permit issuance.

A runtime permit may be issued only when:

- the current action-envelope version is explicit and integrity-referenced
- all mandatory evaluations are current
- no binding block remains
- no non-overridable constraint remains unsatisfied
- all required human reviews are complete
- any allowed override is valid, scoped, unexpired, and receipt-recorded
- the authorized actor is explicit
- the authorized tool is explicit
- the authorized target is explicit
- permitted parameters and scope are explicit
- expiration is explicit
- required preconditions are satisfied
- a receipt record has already been reserved

Runtime permits become invalid when:

- the envelope changes materially
- a required evaluation becomes stale
- a permit expires
- an approval or override expires
- a required module later reports a blocking state
- revocation is recorded

Permit issuance and permit validation are not implemented yet. The Workbench currently displays only sample runtime-permit state labels.

## 14. Unified Receipt

Receipt continuity is a cross-cutting requirement, not a single post-execution logging step.

Proposed receipt lifecycle states:

- `reserved`
- `decision-recorded`
- `permit-issued`
- `execution-appended`
- `finalized`
- `aborted`
- `failed`
- `revoked`

Before execution, a future receipt lifecycle should:

- reserve receipt record
- capture proposal and envelope version
- append module evaluations
- append PGDL objections
- append AAG decision
- attach human-review and override evidence where applicable
- attach runtime-permit reference if issued

After execution, a future receipt lifecycle should:

- append execution evidence
- append outcome
- append mismatch evidence if applicable
- finalize receipt
- record integrity proof

A unified receipt should include:

- objective
- action envelope
- governance evaluations
- PGDL objections
- AAG decision
- human-review evidence
- human-override evidence where applicable
- runtime permit
- execution evidence
- outcome
- timestamps
- integrity proof
- Governance Memory recommendation

Receipts should support audit, replay, accountability, and future improvement. They should make clear what was proposed, what objected, what changed, what was authorized, what executed, and whether execution matched the permit.

Receipt-recording failures must follow configured fail-closed behavior for consequential actions. A consequential action should not receive a runtime permit when a required receipt record cannot be reserved.

## 15. Governance Memory

Governance Memory should surface recommendations from receipts, objections, approvals, refusals, overrides, and outcomes.

Governance Memory may recommend changes. It must not silently mutate policy. Human review is required before recommendations become policy updates.

Future Governance Memory recommendations should keep stable references to the receipts, evaluations, objections, decisions, overrides, refusals, and outcomes that motivated them.

In the current Workbench sample data, Governance Memory appears only as sample activity text. No policy update, recommendation acceptance, or mutation behavior is implemented.

## 16. Domain Profiles

A stable core may support different required governance modules for different domains. Domain profiles could identify required inputs, mandatory modules, optional modules, authority rules, non-overridable constraints, receipt requirements, outage behavior, degraded-mode behavior, human-review roles, overrideability, and permit expiration policy.

Restrained examples:

- healthcare
- banking
- software deployment
- human resources
- public-sector workflows

This specification does not attempt detailed legal or regulatory mappings. Domain profiles should remain conservative until concrete implementation requirements and evidence expectations are defined.

## 17. Console Mapping

Shared governed-action records may eventually support:

- Home
- Flows
- Runs
- Findings
- Approvals
- Workbench
- Receipts
- Governance Memory

Only the Workbench sample preview currently derives from the new shared governed-action sample records. Other Console views still use their existing data projections, typed sample data, or imported evidence snapshots.

Local Evidence Mode remains read-only and separate. Imported Console evidence may be normalized, displayed, filtered, and exported, but the Console must not edit source artifacts, mutate approvals, write policy updates, execute actions, or imply live enforcement.

## 18. Terminology Clarification

These terms are related but not interchangeable:

- Governance module verdict: a scoped evaluation result from a configured governance module.
- PGDL recommendation: proposal-scrutiny output before AAG, such as revision, escalation, rejection before AAG, or continuation.
- AAG authorization decision: the final configured authorization decision before runtime-permit issuance.
- Human-review result: a recorded human decision satisfying a required review step.
- Human override: a scoped exception record for an overrideable constraint, where policy explicitly allows it.
- Runtime permit: a narrow authorization artifact binding actor, tool, target, parameters, scope, expiration, preconditions, and envelope version.
- Receipt lifecycle state: the current evidence-recording state for the governed action path.
- Governance Memory recommendation: a human-reviewable improvement suggestion derived from prior evidence; it is not a policy mutation.

The model must not treat a module verdict as an AAG decision, a human review as an override, a permit as execution, or a Governance Memory recommendation as a policy update.

## 19. Future Implementation Sequence

A restrained future implementation order is:

1. Review and refine the specification.
2. Review the existing typed sample records against the specification.
3. Add any minimal missing TypeScript contract fields only when justified.
4. Derive additional sample views from shared records where appropriate.
5. Design documentation-only conformance fixture cases.
6. Add conformance fixtures.
7. Define module-manifest fixtures.
8. Define runtime-permit fixtures.
9. Define unified-receipt fixtures.
10. Prototype one narrow governed workflow.
11. Add one external adapter only after the internal contract stabilizes.

This sequence keeps design clarity ahead of runtime claims and avoids premature adapter, execution, or approval write-back behavior.

## 20. Open Questions

- Which fields belong in the stable interoperability core versus optional extensions?
- Which domain profiles should be modeled first?
- Which receipt elements require cryptographic integrity in the earliest prototype?
- Should some advisory evaluators run before PGDL, within PGDL, or both?
- How do revocation signals propagate after permit issuance?
- Which local-evidence artifacts should eventually map into the proposed contracts?
- How should multiple binding remediation recommendations be ordered for operator action?
- When should repeated advisory disagreement become a profile-level escalation trigger?
- When should a Governance Memory recommendation become a proposed policy update?

## 21. Non-Goals

This early specification does not attempt to define:

- a universal regulatory ontology
- a complete identity platform
- a production adapter SDK
- a marketplace
- a certification program
- automatic policy mutation
- autonomous self-governance
- a finished industry standard

It also does not implement live agents, external execution, approval write-back, adapters, backend services, databases, authentication, billing, hosted infrastructure, filesystem watchers, new Console pages, new UI controls, runtime behavior, conformance fixtures, or new governance logic.

## Reference vocabulary boundary

The Console conformance model uses hyphenated protocol verdicts such as `require-human-review`, `recommend-revision` and `withhold-permit`. Core AAG uses `require_approval`, `revise_action`, `block` and `allow`; these are different schemas and are not interchangeable serialized values. Conceptually, review maps to approval withholding, revision to action revision, and permit withholding to no execution authorization, but no automatic protocol adapter is implemented. Profile `moderate` and fixture `medium` denote the middle reference consequence tier; neither is a new core risk enum. The pure Console resolvers are isolated test/reference utilities and must never be used as live gate or binding replacements.
