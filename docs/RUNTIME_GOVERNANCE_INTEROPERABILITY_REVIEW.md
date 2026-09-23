# Runtime Governance Interoperability Architecture Review

## 1. Review Scope

This review pressure-tests the current Runtime Governance Interoperability Specification before implementation expands into conformance fixtures, adapters, runtime permits, or additional UI.

The purpose is to test whether the current specification can support deterministic and explainable modular governance decisions. The review treats the specification as early internal design work, not as implemented runtime behavior.

The review also considers the current Workbench sample contract and preview rendering. Those local samples help expose useful information shapes, but they do not execute actions, issue permits, write approvals, call adapters, or enforce governance decisions.

## 2. Current Strengths

The current model has several strong foundations.

- It separates advisory and binding authority. This prevents recommendations, warnings, and evidence contributions from being mistaken for execution gates.
- It distinguishes individual module verdicts from the final AAG authorization decision. That distinction is essential if modules are allowed to disagree.
- It frames runtime execution as permit-bound. This gives Runtime Binding a clear job: reject action drift, tool substitution, target substitution, scope expansion, stale approvals, and expired authorization.
- It defines a receipt lifecycle concept before and after execution. This keeps audit evidence connected to the decision path instead of treating receipts as a loose log.
- It separates Governance Memory recommendations from silent policy mutation. That boundary preserves human review before recommendations become policy changes.
- It is substrate-agnostic. The model can theoretically support different governance layers, domains, and runtime environments without hard-coding one vendor or deployment shape.
- It clearly distinguishes sample preview data from implemented runtime behavior. The Workbench sample records and UI do not claim live agents, adapters, permit issuance, approval write-back, or external execution.

## 3. Critical Ambiguities

The specification is directionally sound, but several concepts remain underspecified for deterministic implementation.

- PGDL is described as proposal scrutiny before AAG, but it is not yet clear whether PGDL is always a fixed stage, whether a PGDL-like module can be plugged into the manifest system, or whether both representations are allowed.
- AAG is described as the hard execution gate, but the specification does not fully define whether AAG is always a fixed central resolver or whether domain profiles can compose multiple AAG-like gates.
- The ordering of domain-specific modules relative to PGDL is ambiguous. The spec mentions domain and policy module evaluation and PGDL proposal scrutiny, but does not state whether domain checks always run before PGDL, after PGDL, both before and after revision, or according to a profile.
- Multiple binding modules can apparently block execution, but the resolution model does not yet define whether each binding block independently prevents permit issuance or whether AAG can override some binding verdicts.
- AAG authority over binding verdicts is unclear. If AAG is final, it needs rules for whether it can override binding modules, and if it cannot, the specification should state that binding non-overridable decisions constrain AAG.
- Human overrides are mentioned as explicit, scoped, and recorded, but the model does not yet define which binding constraints are overrideable, which are non-overridable, and how override authority is verified.
- Mandatory and optional modules are referenced, but the manifest does not yet define how mandatory status is declared, scoped, inherited from domain profiles, or changed over time.
- Stale evaluation invalidation is a principle, not yet a mechanism. The spec does not define freshness fields, dependency hashes, action-envelope versioning, or invalidation triggers.
- Revised proposals must be re-evaluated, but the spec does not define whether every module must re-run or only modules whose declared inputs changed.
- Module outages may fail closed, but the spec does not define outage classes, retry behavior, partial evidence confidence, or permit outcomes for optional unavailable modules.
- Receipt lifecycle stages are conceptually defined, but not state-named. It is unclear when a receipt is reserved, appended, finalized, integrity-checked, reopened, or superseded.
- Receipt recording could be interpreted as a stage, a service, or a cross-cutting requirement. The current Workbench sample treats it as a governance path layer, while the spec also describes it as an evidence lifecycle.
- Runtime-permit revocation is listed as a field, but the revocation process is not defined. Open questions include who revokes, how runtime checks discover revocation, and whether receipts record attempted use after revocation.
- Governance Memory recommendations need stronger linkage to source receipts. The spec says recommendations should arise from receipts, objections, approvals, refusals, and outcomes, but does not define stable references back to the evidence that motivated them.

## 4. Scenario Tests

### Scenario A: External Release Email

**Objective:** Prepare and distribute release notes.

**Proposed action:** An agent prepares a release-note draft and attempts to send it to an external mailing list.

**Action-envelope summary:** Actor is an internal docs agent. Tool is an email or mailing-list sender. Target is an external release list. Scope includes public-facing release language. Sensitivity is external commitment risk. Reversibility is limited after sending.

**Modules involved:** Identity verification, policy boundary, domain release-language review, PGDL, AAG, Runtime Binding, receipt recording, Governance Memory.

**Module inputs:** Actor identity, release-owner authority, target list, proposed message, publication scope, current approval evidence, action-envelope version.

**Module verdicts:** Identity may pass if the agent is known. Policy boundary may require release-owner approval. Domain review may require human wording review. PGDL may recommend revision from send to draft-only. AAG may require approval or block external send without authority.

**Authority classes:** Identity, policy boundary, AAG, Runtime Binding, and receipt recording are binding. Domain review and PGDL are advisory in the current sample shape, though PGDL's exact authority remains ambiguous.

**Conflicts:** Advisory PGDL revision can coexist with binding policy pass if the target remains draft-only. If the action remains external send, a binding policy concern should prevent automatic execution.

**AAG decision:** The likely deterministic decision should be require human review or block until release-owner authority is present and the envelope is narrowed.

**Human-review requirement:** Required before external send.

**Runtime-permit outcome:** No permit should be issued for external send without scoped approval. A draft-only permit could be issued only if the action envelope is revised and re-evaluated.

**Receipt outcome:** Receipt should reserve the proposal, record PGDL objection, module verdicts, AAG decision, human-review state, and any denied or revised permit path.

**Ambiguity exposed:** The spec does not yet define whether PGDL advisory revision is mandatory before AAG can act, or whether AAG may issue a narrowed permit based on PGDL's recommended revision.

### Scenario B: Finance Summary With Sensitive Data

**Objective:** Summarize internal financial figures for planning.

**Proposed action:** An agent summarizes internal financial figures and attempts to place the summary in a workspace without verified destination authority.

**Action-envelope summary:** Actor is a finance summary agent. Target is an internal workspace. Tool may be a document or workspace writer. Scope includes sensitive Q2 figures. Sensitivity is high. Reversibility is partial because data exposure can persist after writing.

**Modules involved:** Identity verification, destination authority, sensitive-data policy, finance domain review, PGDL, AAG, Runtime Binding, receipt recording.

**Module inputs:** Actor identity, destination workspace, approver reference, data classification, field list, intended audience, target permissions.

**Module verdicts:** Identity may be partial if requester is known but approver is incomplete. Sensitive-data policy may block external transmission and require internal target verification. Finance domain review may require human review. PGDL may recommend narrowing fields and audience. AAG may require target-bound approval.

**Authority classes:** Identity, sensitive-data policy, AAG, Runtime Binding, and receipt recording are binding. Finance domain review and PGDL may be advisory unless a domain profile makes them mandatory.

**Conflicts:** A binding destination-authority concern should override an advisory pass from another module. Human approval should not authorize a different target than the one in the action envelope.

**AAG decision:** Require approval or block until the destination authority is verified and the envelope is narrowed.

**Human-review requirement:** Required.

**Runtime-permit outcome:** Permit should remain unissued while destination authority is incomplete.

**Receipt outcome:** Receipt should capture missing approval, sensitive-data classification, field narrowing, human-review requirement, and no-permit outcome.

**Ambiguity exposed:** The spec does not define whether target-bound authority is a core action-envelope field, a module input, a domain-profile field, or all three.

### Scenario C: Software Deployment

**Objective:** Deploy code after tests pass.

**Proposed action:** An agent proposes deploying code after tests pass, but a secret-scanning module reports a binding block.

**Action-envelope summary:** Actor is a deployment agent. Tool is deployment automation. Target is a production or staging environment. Scope includes a specific build artifact and environment. Sensitivity includes operational risk and possible secret exposure. Reversibility depends on rollback evidence.

**Modules involved:** Identity verification, CI test result check, secret scanner, deployment-window policy, PGDL, AAG, Runtime Binding, receipt recording.

**Module inputs:** Commit SHA, build artifact, target environment, test results, secret-scan result, deployment window, rollback plan, approval references.

**Module verdicts:** Tests pass. Deployment window may pass. Secret scanner returns binding block. PGDL may recommend remediation before AAG. AAG must resolve whether any permit can be issued.

**Authority classes:** Secret scanner is binding. CI tests may be binding or evidence-only depending on profile. AAG and Runtime Binding are binding.

**Conflicts:** Binding secret block conflicts with advisory or binding passes from tests and deployment window.

**AAG decision:** Block. AAG should not issue a permit until the secret finding is resolved and re-evaluated.

**Human-review requirement:** Human review may be required for remediation, but should not override a non-overridable secret block unless that override path is explicitly modeled.

**Runtime-permit outcome:** No permit should be issued for the blocked artifact.

**Receipt outcome:** Receipt should record the passing tests, binding secret block, AAG block, no-permit outcome, and remediation requirement.

**Ambiguity exposed:** The spec does not define whether AAG can override a binding block, nor how non-overridable constraints are declared.

### Scenario D: Healthcare Scheduling

**Objective:** Schedule a patient follow-up.

**Proposed action:** An agent proposes scheduling a patient follow-up. Identity and scheduling checks pass, but a clinical module requires licensed-human review because the proposed message includes treatment guidance.

**Action-envelope summary:** Actor is a scheduling agent. Tool is a scheduling or patient-message system. Target is a patient record and message. Scope is appointment scheduling plus message content. Sensitivity includes protected health information and clinical guidance. Reversibility is limited once a message is sent.

**Modules involved:** Identity verification, patient-context check, scheduling policy, clinical content review, PGDL, AAG, Runtime Binding, receipt recording.

**Module inputs:** Patient identifier, appointment context, proposed message, actor role, delegated authority, system target, patient communication channel.

**Module verdicts:** Identity passes. Scheduling check passes for appointment creation. Clinical module requires licensed-human review for treatment guidance. PGDL may recommend removing treatment guidance or splitting the action into scheduling and clinical-message actions. AAG must decide whether partial permit is allowed.

**Authority classes:** Identity, patient-context, clinical content review, AAG, and Runtime Binding may be binding. PGDL may be advisory unless the domain profile requires its revision path.

**Conflicts:** Scheduling can pass while clinical content blocks or escalates part of the proposed message.

**AAG decision:** Require human review or require action-envelope revision. AAG could allow a scheduling-only permit if the clinical guidance is removed and the revised envelope is re-evaluated.

**Human-review requirement:** Required for the treatment-guidance content.

**Runtime-permit outcome:** Permit should not include treatment guidance until licensed-human review is recorded. A narrower scheduling-only permit may be possible after revision.

**Receipt outcome:** Receipt should record the split between scheduling and clinical content, the clinical review requirement, the AAG decision, and any revised-envelope permit.

**Ambiguity exposed:** The spec does not define how to split one proposed action into multiple envelopes when only part of the action is blocked.

### Scenario E: Module Outage

**Objective:** Perform a low-risk internal metadata update.

**Proposed action:** A mandatory identity module becomes unavailable while an otherwise low-risk agent action is being evaluated.

**Action-envelope summary:** Actor is an internal maintenance agent. Tool updates an internal metadata field. Target is a low-risk internal record. Scope is narrow. Sensitivity is low. Reversibility is high.

**Modules involved:** Identity verification, policy boundary, PGDL, AAG, Runtime Binding, receipt recording.

**Module inputs:** Actor identity, delegated authority, target record, requested field change, current environment, module availability.

**Module verdicts:** Identity module returns unavailable. Other checks may pass. PGDL may have no objection. AAG must determine whether unavailable mandatory identity prevents permit issuance.

**Authority classes:** Identity is binding and mandatory. Other modules may be advisory or binding depending on profile.

**Conflicts:** Low operational risk conflicts with missing mandatory identity evidence.

**AAG decision:** If identity is mandatory and configured to fail closed, AAG should block or hold pending. If optional, AAG may continue with reduced confidence, but that needs explicit profile rules.

**Human-review requirement:** Possibly required if policy allows human verification fallback; otherwise no override should proceed.

**Runtime-permit outcome:** No permit if mandatory identity fails closed. Permit may be delayed pending retry or manual identity evidence if explicitly modeled.

**Receipt outcome:** Receipt should record module outage, mandatory status, AAG decision, any fallback evidence, and no-permit or delayed-permit outcome.

**Ambiguity exposed:** The specification does not define mandatory module declaration, outage handling states, retry policy, or human fallback evidence requirements.

## 5. Conflict Matrix

| Combination | Expected deterministic outcome | Defined clearly today? |
| --- | --- | --- |
| advisory pass + advisory warning | Continue unless policy elevates warning; record warning in receipt. | Partially. Receipt visibility is defined, but escalation thresholds are not. |
| advisory pass + binding block | Do not issue permit; AAG should block or require revision. | Mostly. Binding block precedence is stated, but AAG override limits are unclear. |
| advisory revision + binding pass | Require revision if the advisory module is mandatory or configured to block continuation; otherwise AAG may continue with receipt visibility. | Partially. Mandatory advisory behavior is not defined. |
| binding pass + binding require-human-review | No automatic execution; human review required before permit. | Mostly. Human review blocking is stated, but approval evidence shape is missing. |
| binding pass + mandatory module unavailable | Fail closed or hold pending if the unavailable module is mandatory. | Partially. Principle exists, but mandatory declaration and outage states are missing. |
| human approval + non-overridable block | Do not issue permit unless the non-overridable constraint has an explicit modeled exception path. | Partially. Non-overridable constraints are named but not modeled. |
| stale evaluation + previous permit reference | Reject permit issuance or runtime validation; require re-evaluation. | Partially. Stale evaluations are prohibited, but invalidation mechanics are absent. |
| revised action envelope + prior module evaluations | Re-evaluate modules affected by changed inputs; do not reuse incompatible verdicts. | Partially. Re-evaluation is required, but dependency-based reuse is undefined. |

## 6. Minimal Stable Core

The stable core should stay small and avoid becoming a universal ontology.

### Required Core Fields

- action ID
- objective ID
- action-envelope version
- actor
- delegated authority reference
- action type
- requested tool
- target
- parameters
- scope
- sensitivity
- reversibility
- expiration or freshness window
- current action state
- module evaluation references
- AAG decision
- human-review requirement and decision reference
- runtime-permit reference
- receipt reference

### Optional Extension Fields

- natural-language objective summary
- recommended operator action
- expected outcome
- confidence level
- evidence summaries
- display labels
- workflow or run references
- Governance Memory recommendation reference

### Domain-Profile Fields

- required modules
- optional modules
- authority rules
- non-overridable constraints
- human-review roles
- domain-specific sensitivity categories
- receipt requirements
- outage behavior
- permit expiration policy

### Implementation-Specific Fields

- UI grouping labels
- dashboard status text
- sample activity timestamps
- local file paths
- adapter configuration handles
- provider-specific identifiers
- visual severity labels

## 7. Required Clarifications Before Fixtures

### Blocking

- Define whether PGDL is a fixed stage, module, or both.
- Define whether AAG can override binding module verdicts.
- Define how mandatory and optional modules are declared.
- Define stale evaluation invalidation using action-envelope versions, input hashes, timestamps, or equivalent freshness rules.
- Define runtime-permit issuance prerequisites, including human-review evidence and mandatory module availability.

### Important

- Define whether domain-specific modules run before PGDL, after PGDL, or both.
- Define how revised proposals trigger full or partial re-evaluation.
- Define receipt lifecycle state names and integrity-check timing.
- Define human override semantics, including non-overridable constraints.
- Define module outage states and fallback evidence requirements.
- Define how Governance Memory recommendations retain source receipt references.

### Can Wait

- Define optional extension fields for operator display.
- Define domain-profile examples beyond minimal fixtures.
- Define receipt replay UX expectations.
- Define adapter-specific configuration references.
- Define how additional Console views should progressively derive from shared governed-action records.

## 8. Recommended Next Step

The project is ready for specification revision, not yet for conformance fixtures.

The current specification is strong enough to guide discussion and sample-data refinement. It is not yet deterministic enough for conformance fixtures because fixtures require expected outcomes for conflicts, stale evaluations, mandatory outages, human overrides, partial revisions, receipt lifecycle transitions, and permit eligibility.

Recommended next step:

1. Revise the specification to resolve the blocking clarifications above.
2. Refine the existing typed sample records only if the revised specification exposes a minimal missing field.
3. Add module-manifest and runtime-permit fixtures after authority, freshness, outage, and receipt lifecycle rules are explicit.
4. Delay external adapters until at least one internal conformance fixture can demonstrate deterministic AAG and Runtime Binding outcomes.

Another sample-contract refinement may be useful after the specification revision, but it should not precede the core authority and freshness decisions.
