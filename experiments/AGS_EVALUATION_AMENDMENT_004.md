# AGS Evaluation 001 — Pre-Run Amendment 004

**Date:** 2026-10-07

**Status:** Prospective pre-run provenance clarification

**Parent preregistration:** `experiments/AGS_EVALUATION_PLAN_001.md`

**Prior amendments:** `experiments/AGS_EVALUATION_AMENDMENT_001.md`, `experiments/AGS_EVALUATION_AMENDMENT_002.md`, `experiments/AGS_EVALUATION_AMENDMENT_003.md`

**Prior amendment tag:** `ags-evaluation-001-amendment-003-v0.1`

**System under test:** Alignment Governance Stack (AGS)

**Measurement framework:** Invariant-Constrained Transition Framework (ICTF)

**Scientific status:** Benchmark implementation has begun, but no AGS Evaluation 001 scientific condition-runs, endpoint calculations, or scientific outcome inspections have occurred.

---

## 1. Purpose

The frozen apparatus defined the exact `provenance.json` schema before Amendments 003 and 004 existed.

That schema requires hashes for:

- the preregistration,
- Amendment 001,
- Amendment 002,
- the apparatus,

and prohibits unknown additional fields.

Amendment 003 subsequently became a governing pre-run document.

This amendment prospectively updates the provenance schema so the final scientific provenance record cryptographically identifies every governing amendment in force before scientific execution.

No scientific outcome motivated this change.

---

## 2. Provenance schema change

The scientific provenance record defined by the apparatus is modified only by adding these two required fields immediately after `amendment_002_file_hash`:

`amendment_003_file_hash`

`amendment_004_file_hash`

Each field must be a string matching:

`^sha256:[0-9a-f]{64}$`

Each value is SHA-256 over the exact finalized raw bytes of its corresponding amendment file, using lowercase hexadecimal and the `sha256:` prefix.

---

## 3. Governing-document hash set

For AGS Evaluation 001, the provenance record must therefore contain exactly these governing-document hash fields:

- `preregistration_file_hash`
- `amendment_001_file_hash`
- `amendment_002_file_hash`
- `amendment_003_file_hash`
- `amendment_004_file_hash`
- `apparatus_file_hash`

No other amendment-hash field is permitted unless another prospective pre-run amendment is created before scientific execution.

---

## 4. No self-reference problem

`amendment_004_file_hash` does not create a self-referential scientific record.

Amendment 004 is finalized, committed, pushed, and tagged before scientific execution.

The later scientific `provenance.json` record hashes the already-finalized Amendment 004 file.

`provenance_hash` continues to be computed from the canonical serialization of the provenance object with only `provenance_hash` omitted, exactly as frozen by the apparatus.

---

## 5. Required implementation updates

Before scientific execution:

- `types.ts` must require `amendment_003_file_hash` and `amendment_004_file_hash` in `ProvenanceRecord`,
- `schemas.ts` must require those exact fields and continue rejecting unknown fields,
- `provenance.ts` must calculate and verify hashes for Amendments 003 and 004,
- the frozen-document path set used for provenance must include Amendments 003 and 004,
- engineering schema validation must verify both new fields.

These are benchmark-measurement implementation changes only.

They do not modify AGS production governance behavior.

---

## 6. Unchanged scientific design

This amendment does not change:

- the frozen AGS base commit,
- the system under test,
- any scenario family,
- any oracle decision,
- any perturbation,
- any transition mapping,
- any condition,
- any sample size,
- H-AGS1,
- H-AGS2,
- any statistical test,
- any alpha level,
- F7,
- the Local Gate,
- Direct Execution,
- the side-effect adapter,
- any scientific endpoint.

---

## 7. Implementation status disclosure

At the time of this amendment:

- benchmark implementation had begun,
- Amendment 003 had been committed, pushed, and tagged,
- no scientific scenario manifest had been frozen for execution,
- no scientific condition-run had been executed,
- no scientific endpoint had been calculated,
- no scientific outcome had been inspected.

This amendment is therefore prospective with respect to all AGS Evaluation 001 scientific outcomes.

---

## 8. Freeze statement

After review, this amendment must be:

1. committed,
2. pushed,
3. tagged,

before benchmark implementation proceeds.

The final scientific provenance record must include exact finalized raw-byte hashes for Amendments 001, 002, 003, and 004.

No scientific execution may begin until the remaining implementation, engineering-validation, clean-tree, manifest-freeze, and provenance requirements are satisfied.