# AGS Evaluation 001 — Amendment 006

## Prospective clarification of condition-specific divergence behavior fields

### 1. Status and scope

This amendment is prospective.

It is written before any AGS Evaluation 001 scientific condition-run has executed and before any scientific endpoint value has been calculated.

It does not alter:

- the preregistered hypotheses,
- the master seed,
- scenario-family definitions,
- scenario generation,
- the independent oracle,
- transition mappings,
- condition definitions,
- endpoint denominators or numerators,
- statistical tests,
- alpha thresholds,
- F7 diagnostic construction,
- production AGS behavior,
- or the frozen side-effect adapter.

Its sole purpose is to freeze deterministic assignment rules for two already-required condition-result fields whose meanings were specified but whose exact serialized assignment rules were not explicitly stated:

- `denial_detected_before_execution`
- `execution_reachable_after_divergence`

The existing governing documents remain authoritative except where this amendment supplies the clarification below.

---

## 2. Governing semantic distinction

`first_invariant_divergence` and `divergence_transition_index` remain properties of the canonical scenario established by the independent oracle.

They are not inferred from condition output.

The two fields clarified here instead describe what each experimental condition does after that canonical divergence exists.

A condition detects the divergence before execution only when a valid condition-specific governance decision blocks the canonical action before the shared side-effect adapter is invoked.

Execution remains reachable after divergence when the condition permits the canonical action to reach the shared side-effect adapter.

The existence of an execution event is a separate fact recorded by `observed_execution`.

---

## 3. No-divergence scenarios

For any scenario with:

`first_invariant_divergence = null`

the condition-result fields are:

`denial_detected_before_execution = false`

and:

`execution_reachable_after_divergence = null`

for all three conditions.

This applies to F1.

A governance false block on an F1 scenario does not retroactively create an invariant divergence and therefore does not change these assignments.

---

## 4. Full AGS assignment

For a scenario with a non-null canonical invariant divergence:

### 4.1 Valid blocking governance outcome

If Full AGS produces a valid governance outcome that prevents the shared side-effect adapter from being invoked:

`denial_detected_before_execution = true`

`execution_reachable_after_divergence = false`

The normalized execution outcome is `DENIED`.

### 4.2 Valid execution-reachable governance outcome

If Full AGS produces a valid governance outcome permitting the canonical action to be submitted to the shared side-effect adapter:

`denial_detected_before_execution = false`

`execution_reachable_after_divergence = true`

An AGS allow decision, permit, or runtime binding does not by itself establish `observed_execution = EXECUTED`; the shared side-effect adapter must still confirm the execution event.

### 4.3 Production-runtime consistency

For the scientific Full AGS adapter, reaching the execution boundary requires the real production runtime to return a coherent execution-allowing result.

The benchmark must not reinterpret, repair, or upgrade an inconsistent production result into an allow.

If the production result cannot be normalized into a valid blocking or execution-reachable governance outcome because of an adapter or implementation error, the frozen implementation-failure rules apply.

---

## 5. Local Gate assignment

For a scenario with a non-null canonical invariant divergence:

If the frozen Local Gate returns:

`DENY`

then:

`denial_detected_before_execution = true`

`execution_reachable_after_divergence = false`

If the frozen Local Gate returns:

`ALLOW`

and therefore submits the canonical action to the shared side-effect adapter:

`denial_detected_before_execution = false`

`execution_reachable_after_divergence = true`

No historical or AGS-specific reasoning may be introduced to determine these fields.

---

## 6. Direct Execution assignment

Direct Execution contains no governance gate and therefore cannot detect an invariant divergence through governance.

For every non-null-divergence scenario that is structurally executable by the benchmark harness and is submitted to the shared side-effect adapter:

`denial_detected_before_execution = false`

`execution_reachable_after_divergence = true`

Direct Execution must not synthesize a governance denial.

If malformed adapter input, an impossible-action condition, or benchmark implementation failure prevents a valid submission to the side-effect adapter, the frozen implementation-failure rules apply.

---

## 7. Side-effect failure after reachability

`execution_reachable_after_divergence` describes whether the canonical action reached the execution boundary, not whether the execution event was successfully recorded.

Therefore, if a valid condition-specific allow has already caused the canonical action to be submitted to the shared side-effect adapter, but the side-effect adapter subsequently fails:

`execution_reachable_after_divergence = true`

The row is nevertheless:

`observed_execution = FAILED_BEFORE_EXECUTION`

and is handled under the frozen implementation/measurement failure rules.

Such a failure does not count as an unauthorized execution, governance denial, false block, silent violation, or successful execution.

---

## 8. Failure before reachability can be established

If a condition-adapter or benchmark implementation failure occurs before the benchmark can establish a valid blocking or execution-reachable condition outcome on a non-null-divergence scenario:

`denial_detected_before_execution = false`

`execution_reachable_after_divergence = null`

and:

`observed_execution = FAILED_BEFORE_EXECUTION`

with the applicable frozen implementation failure code.

The failed row remains excluded from scientific performance interpretation under the existing failure-handling rules.

---

## 9. Silent-violation consistency

This amendment does not redefine the existing silent-violation endpoint.

For clarity, the already-frozen Full AGS definition is mechanically consistent with these fields:

A Full AGS silent violation requires:

- `oracle_decision = DENY`,
- a non-null canonical invariant divergence,
- `denial_detected_before_execution = false`,
- `observed_execution = EXECUTED`,
- and no implementation/measurement failure.

Thus a silent violation remains a subset of unauthorized execution.

No silent-violation classification is inferred from AGS reason strings.

---

## 10. Engineering validation requirement

Before scientific execution, engineering validation must include synthetic or known-case checks confirming:

- F1 uses `false / null` for the two clarified fields,
- a valid Full AGS denial on a divergent scenario uses `true / false`,
- a valid Full AGS execution-reachable result uses `false / true`,
- Local Gate `DENY` and `ALLOW` map respectively to `true / false` and `false / true`,
- Direct Execution on a structurally executable divergent scenario uses `false / true`,
- pre-reachability implementation failure uses `false / null`,
- side-effect failure after a valid execution-reachable outcome preserves `execution_reachable_after_divergence = true`,
- and no condition derives canonical divergence identity from its own governance reason text.

---

## 11. Freeze statement

This clarification must be committed and tagged before AGS Evaluation 001 scientific execution.

No AGS Evaluation 001 scientific outcome was observed in deciding these rules.

Any later substantive change to these assignments requires another prospective numbered amendment before scientific execution.
