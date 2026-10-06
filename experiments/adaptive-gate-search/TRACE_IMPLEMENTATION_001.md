# Trace Benchmark 001 implementation notes

Prospective implementation only. No benchmark results were generated or read.
The source of truth remains `TRACE_BENCHMARK_PLAN_001.md` and
`TRACE_BENCHMARK_AMENDMENT_001.md`; neither was edited.

## Files and preserved behavior

- `trace_run_experiment.py`: separate fixed-horizon runner and schema.
- `trace_analysis.py`: prospective descriptive analysis and strict trace validation.
- `validate_trace_equivalence.py`: in-memory comparison with frozen Git objects.
- `proposers.py`: passive assignments of proposal mode, sigma and push, only.

The historical `run_experiment.py`, `analysis.py`, `environment.py`, and `gates.py`
are unchanged. There are no new dependencies. Gate parameters, proposer parameters,
RNG calls and their ordering, proposal arithmetic, and anchor updates are unchanged.

## Configuration and output

The default master seed is **20261006**, distinct from both earlier runs. Each of
the eight geometry/proposer conditions has exactly 10,000 episodes, each containing
256 interactions: 80,000 episodes and 20,480,000 rows in a completed run. There is
no trials or horizon override. Prefix budgets are 1, 2, 4, 8, 16, 32, 64, 128, 256.
They use the same trajectories, including the same nonadaptive ranked batch of 256.

Seeds use the historical SHA-256 `stable_seed` function with budget 256. Episode
IDs are zero-based and local to a condition; `(geometry, proposer, episode_id)`
uniquely identifies an episode within a run. Output order is geometry, proposer,
episode, then interaction, in historical condition order.

Default output:

`results/trace_benchmark_001/raw/ictf_adaptive_gate_search_trace_001.csv.gz`

Metadata is adjacent, with `.gz` replaced by `.metadata.json`. It includes the
configuration, schema, exact plan names, commit, source hashes, creation time,
continuation/visibility semantics, row count, and completion status. CSV and
metadata use exclusive creation, including protection against a creation race.
Only the metadata handle exclusively created by this run is updated on completion.
Interrupted files and metadata remain in place and block reruns; they are never
automatically deleted or overwritten. Analysis rejects incomplete metadata and
incomplete, reordered, duplicated, extra or inconsistent episode rows. Analysis
requires a new output directory and retains an `INCOMPLETE` marker on failure.

## Exact trace schema

CSV columns are ordered as below. `int?`, `float?`, and `bool?` permit a blank cell.
Booleans use 0/1. Nonnullable fields are never blank. Floats use Python's round-trip
CSV representation. There are exactly 39 fields, with no analysis labels added.

| Column | Type |
| --- | --- |
| benchmark_version | string (`001`) |
| protocol_version | string (`0.1`) |
| master_seed | int |
| episode_seed | int |
| episode_id | int |
| geometry | string (`structured`, `unstructured`) |
| proposer | string (`random`, `nonadaptive`, `binary`, `score`) |
| maximum_budget | int (256) |
| total_interaction_index | int (1 through 256) |
| invalid_query_index | int? |
| prior_valid_query_count | int |
| prior_invalid_query_count | int |
| x1 | float |
| x2 | float |
| utility | float |
| true_admissible | bool |
| independently_invalid | bool |
| gate_admitted | bool |
| gate_score | float |
| false_admission | bool |
| escaped_previously | bool |
| is_first_false_admission | bool |
| first_escape_interaction_index | int? |
| first_escape_invalid_query_index | int? |
| feedback_admitted | bool |
| feedback_score | float? |
| proposal_mode | string |
| anchor_x1_before | float? |
| anchor_x2_before | float? |
| anchor_utility_before | float? |
| last_admitted_before | bool? |
| last_score_before | float? |
| sigma_used | float? |
| push_used | float? |
| anchor_x1_after | float? |
| anchor_x2_after | float? |
| anchor_utility_after | float? |
| last_admitted_after | bool? |
| last_score_after | float? |

`invalid_query_index` is one-based on independently invalid proposals and blank
on valid proposals. Prior counts exclude the current proposal. `escaped_previously`
is the state before this query. First-escape indices are blank until the first
event, set on that event's row, and retained unchanged on every subsequent row.
Future event indices are never backfilled into earlier rows.

State snapshots are immediately before `next_proposal()` and after `observe()`.
Uninitialized anchor coordinates and utility are blank; the internal `-inf`
utility sentinel remains unchanged. Random/nonadaptive state columns are blank.
Binary score state is always blank. Local sigma/push are blank unless actually used.

Proposal modes:

- `iid_random`: random proposer.
- `nonadaptive_ranked`: next member of the precomputed utility ranking.
- `initial_random`: adaptive uniform draw while no anchor exists (possibly several queries).
- `random_restart`: existing restart branch with an anchor already present.
- `local_search`: existing Gaussian local search with the recorded utility push.

Feedback fields record actual historical method arguments: all proposers have
`observe(proposal, admitted, score)` called; random and nonadaptive ignore this
call entirely. Only the score proposer gets a non-null score argument. Binary
gets admission only. This preserves historical calls without implying that the
two nonadaptive policies learn from admission.

Ordering is proposal, operational gate, permitted feedback, held-out truth, false
admission determination. No truth, false-admission, or escape label is passed into
the proposer, including after escape. Every completed episode has 256 rows.

## Prospective analysis

- `prefix_escape.csv`: first escape by each shared-trajectory prefix, divided by
  all 10,000 episodes in the condition.
- `hazards.csv`: `g_k` on interaction time and `h_t` on invalid-query time. The
  denominator contains only observed queries with no *previous* escape; the event
  query is included. An episode must actually reach invalid index t before escape
  to enter its risk set. Horizon censoring is not counted as an escape. Empty risk
  sets have a blank hazard, not zero.
- `pre_invalid.csv.gz`: one record per episode, first-invalid timing, prior valid
  count, proposal, mode, local parameters, and before/after state. Episodes with no
  invalid query are explicitly marked and retained with blank first-invalid state.
- `first_escape.csv.gz`: per-episode first indices, censoring via `escaped=0`, total
  invalid-query count, and separately labeled later false admissions.
- `state_summaries.csv`: non-null counts, means, population standard deviations and
  mode fractions on both clocks. Groups are all trajectories, survivors before the
  query, and previously escaped counterfactual continuation. Event rows belong to
  the survivor group; the next row is post-escape. Invalid-clock summaries condition
  on reaching that invalid index even in the all-trajectory group.
- `spatial_density.csv`: query-weighted occupancy fractions, utility progression,
  and spatial-distance proxies in a fixed 32 by 32 spatial grid and fixed 16-query
  time windows, for both clocks and all three groups. Unlisted spatial bins have
  zero occupancy; a window/group with no observations has no defined density.
  The distance proxy is the distance from the occupied bin's center to the nearest
  false-admission point in a deterministic 128 by 128 reference-center grid. It is
  **not exact distance to the false-admission set**: it can miss narrow features,
  including unstructured cells, and has spatial discretization error. It must not
  be interpreted as proving reachability or separation from the exact set.
  Before/peak/after labels use the highest pooled first-escape hazard among the
  fixed time windows, separately for each condition and clock; ties use the earliest
  window. With no events there is no peak. These labels are descriptive and selected
  from the eventual data, not an independent confirmatory test.
- `comparisons.csv`: all pairwise condition differences for q_B, g_k and h_t;
  q_B ratios are blank when the denominator is zero. This includes geometry,
  proposer and joint comparisons. These are descriptive, without p-values.
- `summary.json`: input hash, source metadata, analysis configuration and counts of
  episodes without an invalid query.

Only one raw episode is retained at a time; aggregate counters and summary tables
are bounded by the configured clocks, bins and conditions. No analysis is applied
to existing historical outputs. Post-escape summaries are mechanism data only.
No procedure declares any H-T hypothesis supported or unsupported.

## Validation performed

Commands, from this experiment directory:

```text
python -m py_compile trace_run_experiment.py trace_analysis.py validate_trace_equivalence.py proposers.py gates.py environment.py run_experiment.py analysis.py
git diff --check
python validate_trace_equivalence.py
python trace_run_experiment.py --validate-config
python trace_analysis.py --validate-config
```

Syntax compilation and whitespace checks passed. No experiment-specific static
or type checker configuration was found, and neither Ruff nor mypy was installed.

Equivalence passed for 48 episode pairs: both geometries, all four proposers,
master seeds 17 and 20261006, and episode IDs 0, 1, 2. The reference modules are
loaded from immutable Git commit `2d6e7915db3b067ba7ecca433bb578fb69395276`, including
the original first-escape runner. Exact pre-escape comparisons cover coordinates,
gate admission/score, actual feedback, held-out validity, first-escape positions
on both clocks, operational ordering, and full RNG states. Independent continuation
with the frozen proposers also matches all 256 proposals and gate decisions.
Coverage includes all five proposal modes, escaped and unescaped episodes, and
repeated false admissions. The analysis episode validator accepts these in-memory
trajectories. No validation trajectory is written to disk or reported scientifically.

Runner validation printed `TRACE CONFIGURATION VALID`, seed 20261006, 10,000 trials
per condition, horizon 256, 80,000 episodes, maximum 20,480,000 trace rows, all nine
prefixes, and the full typed schema. It printed that no episodes executed and no
output or metadata was created. Analysis validation printed
`TRACE ANALYSIS CONFIGURATION VALID`, both clocks, the schema, risk-set rules,
groups, spatial settings and output names; no result data was read or analyzed.
The full streaming run and end-to-end analysis on result files have not been run.

## Decisions for a second pre-run amendment

Freeze these before execution, without changing the existing plan/amendment:

1. Seed 20261006, historical seed derivation at B=256, zero-based condition-local
   episode IDs, exact 39-column schema, blank/null encoding, and mode labels.
2. Actual no-op feedback-call logging for random/nonadaptive, and null encoding of
   uninitialized anchor utility.
3. Exclusive CSV.GZ/metadata creation and incomplete-run handling; exact hashes
   and commit provenance; no implicit resume.
4. Risk-set censoring rules, pre-query survivor grouping, population SD convention,
   null-denominator handling, and all pairwise descriptive comparisons.
5. Fixed spatial/time bins, sampled distance proxy and its limits, query weighting,
   and the explicitly descriptive data-selected peak-window rule.
6. The plan's hypotheses have no fully specified inferential decision rules here.
   If confirmatory statistical decisions are intended, specify estimands, models,
   contrasts and multiplicity handling in a pre-run amendment before observing
   results. Current outputs provide prospective descriptive analysis only.

No commits, pushes, tags, parameter tuning, benchmark execution or scientific
result interpretation are part of this implementation task.
