# AGS Evaluation 001 — Amendment 005

## Status

Prospective amendment created during benchmark implementation and before any scientific condition-run, scientific endpoint calculation, or scientific outcome inspection.

This amendment does not alter the hypotheses, scenario counts, family composition, condition definitions, statistical tests, decision thresholds, or scientific endpoints of AGS Evaluation 001.

## 1. Purpose

The frozen scenario-manifest schema requires `primary_invariant_family` to be a string for every scenario.

Families F2, F3, F4, F5, F6, and F8 have defined primary invariant families. F1 is the clean authorized family and intentionally has no invariant violation or first invariant divergence. The frozen documents did not previously define the serialized string to use for F1.

This amendment prospectively resolves that serialization ambiguity before scenario generation or scientific execution.

## 2. F1 primary-invariant sentinel

For every F1 scenario:

`primary_invariant_family = "none"`

This value means only that the clean authorized trajectory contains no intentionally violated primary invariant.

It does not introduce a new invariant family.

For F1:

- `oracle_decision = "PERMIT"`
- `primary_invariant_family = "none"`
- `expected_first_invariant_divergence = null`
- `expected_divergence_transition = null`

The Amendment 003 divergence-transition semantics remain unchanged.

## 3. Other family values

The primary invariant families for denial scenarios remain:

- F2: `temporal validity`
- F3: `scope`
- F4: `context continuity`
- F5: `evidence/provenance`
- F6: `admission trust`
- F8: `delegation`

No family assignment is changed by this amendment.

## 4. Condition-result interpretation

`primary_invariant_family` remains a scenario-semantic field copied identically into all three condition-result rows for the same scenario.

For F1 it must therefore also be serialized as:

`"none"`

This field must not be derived from an AGS reason code, comparator output, or observed condition result.

## 5. Provenance schema extension

Because this amendment becomes part of the frozen governing document set, the exact provenance schema is extended with one required field:

`amendment_005_file_hash`

It must appear immediately after:

`amendment_004_file_hash`

and immediately before:

`apparatus_file_hash`

The value must match:

`^sha256:[0-9a-f]{64}$`

and must be the SHA-256 hash of the exact raw bytes of:

`experiments/AGS_EVALUATION_AMENDMENT_005.md`

Unknown provenance fields remain prohibited.

The governing-document hash set is now exactly:

1. `experiments/AGS_EVALUATION_PLAN_001.md`
2. `experiments/AGS_EVALUATION_AMENDMENT_001.md`
3. `experiments/AGS_EVALUATION_AMENDMENT_002.md`
4. `experiments/AGS_EVALUATION_AMENDMENT_003.md`
5. `experiments/AGS_EVALUATION_AMENDMENT_004.md`
6. `experiments/AGS_EVALUATION_AMENDMENT_005.md`
7. `experiments/AGS_EVALUATION_APPARATUS_001.md`

## 6. Required implementation updates

Before engineering validation is considered complete:

- `types.ts` must require `amendment_005_file_hash`.
- `schemas.ts` must require and validate `amendment_005_file_hash` and continue rejecting unknown provenance fields.
- `paths.ts` must include Amendment 005 in the frozen-document path set.
- provenance generation and verification must hash Amendment 005 raw bytes.
- scenario generation must serialize F1 `primary_invariant_family` exactly as `"none"`.
- engineering schema validation must verify the F1 sentinel and Amendment 005 provenance field.

## 7. Scientific integrity

No scientific execution has occurred before this amendment.

No scientific condition results, endpoint statistics, family outcome summaries, or F7 scientific diagnostic outcomes have been generated or inspected.

This amendment resolves a serialization ambiguity discovered during implementation. It does not modify benchmark difficulty or expected comparative performance.