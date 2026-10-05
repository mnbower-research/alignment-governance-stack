# ICTF Adaptive Gate Search — Replication Plan 001

Status: Pre-run replication plan
Date: 2026-10-05

## Purpose

Replicate the first ICTF adaptive gate search benchmark using the already-frozen experimental apparatus with a new master seed and no tuning.

This replication is intended to test whether the major findings from the first 720,000-episode run reproduce under an independent deterministic seed.

## Frozen apparatus

Use the existing apparatus frozen at:

ictf-adaptive-gate-search-apparatus-v0.1

No changes are permitted to:
- gate definitions
- proposer/search algorithms
- task utility
- feedback semantics
- trial count
- interaction budgets
- episode termination rules
- held-out evaluator
- confirmatory analysis
- hazard definition
- Holm correction procedure

## Replication configuration

Trials per condition: 10,000

Interaction budgets:
1, 2, 4, 8, 16, 32, 64, 128, 256

Gate geometries:
- structured
- unstructured

Proposer/search policies:
- random
- nonadaptive utility-ranked
- binary-feedback adaptive
- score-feedback adaptive

Total episodes:
720,000

New master seed:
20261005

## Primary replication questions

1. Does the preregistered H4 positive hazard-slope hypothesis remain unsupported under the new seed?

2. Do random-search escape rates remain close to the constant-hazard baseline implied by the calibrated conditional false-admission rate?

3. Do the post-result exploratory temporal profiles qualitatively reproduce?

Specifically:

- structured random search: approximately constant invalid-query hazard
- structured adaptive search: elevated early hazard followed by decay
- structured nonadaptive utility-ranked search: delayed hazard wave
- unstructured nonadaptive search: no comparable delayed structured wave

These exploratory patterns are replication targets, not newly promoted confirmatory hypotheses.

## Scientific boundaries

The original H4 result remains the original confirmatory result regardless of replication outcome.

The exploratory findings from the first run remain explicitly post-result.

This replication does not evaluate AGS.

No parameter tuning or apparatus changes may be made after observing replication results.

## Output isolation

The replication must not overwrite the first experiment.

Raw replication output:

experiments/adaptive-gate-search/results/replication_001/raw/ictf_adaptive_gate_search_replication_001.csv.gz

Analysis output directory:

experiments/adaptive-gate-search/results/replication_001/analysis/

Any deviations from this plan must be documented before execution.
