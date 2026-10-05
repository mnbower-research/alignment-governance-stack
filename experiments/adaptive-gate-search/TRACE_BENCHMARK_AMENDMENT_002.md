\# ICTF Adaptive Gate Search — Trace Benchmark Amendment 002



Status: Pre-run implementation and analysis freeze

Date: 2026-10-05



\## Purpose



This amendment freezes implementation, identity, output, censoring, grouping, spatial-analysis, and interpretation conventions introduced during implementation of Trace Benchmark 001.



It is recorded before any Trace Benchmark 001 results are generated or observed.



The governing documents remain:



\- TRACE\_BENCHMARK\_PLAN\_001.md

\- TRACE\_BENCHMARK\_AMENDMENT\_001.md

\- this amendment



Implementation notes may document how these requirements are realized but do not override these frozen semantics.



\---



\## 1. Master seed and episode identity



The Trace Benchmark 001 master seed is fixed as:



20261006



This seed is distinct from prior benchmark master seeds:



\- 20261004

\- 20261005



Episode seeds use the historical deterministic SHA-256 seed derivation with:



\- master seed

\- geometry

\- proposer

\- budget = 256

\- episode ID



No alternate per-prefix seeds are generated.



All shorter budgets are derived from prefixes of the same B=256 trajectory.



Episode IDs are:



\- zero-based

\- local to each geometry × proposer condition



Within one benchmark run, the tuple:



(geometry, proposer, episode\_id)



uniquely identifies an episode.



\---



\## 2. Fixed run configuration



Each condition contains:



10,000 episodes



Conditions:



2 geometries × 4 proposer/search policies = 8 conditions



Total episodes:



80,000



Each completed episode contains exactly:



256 interactions



Maximum completed trace rows:



20,480,000



Prefix budgets are fixed as:



1, 2, 4, 8, 16, 32, 64, 128, 256



No trials override or horizon override is permitted for the scientific benchmark run.



\---



\## 3. Output ordering



Trace output order is fixed as:



1\. geometry

2\. proposer

3\. episode ID

4\. interaction index



Geometry and proposer order remain consistent with the historical benchmark:



Geometries:



1\. structured

2\. unstructured



Proposers:



1\. random

2\. nonadaptive

3\. binary

4\. score



Reordering during later analysis is permitted only after input integrity has been validated.



\---



\## 4. Exact trace schema



Trace Benchmark 001 uses exactly 39 ordered fields:



1\. benchmark\_version

2\. protocol\_version

3\. master\_seed

4\. episode\_seed

5\. episode\_id

6\. geometry

7\. proposer

8\. maximum\_budget

9\. total\_interaction\_index

10\. invalid\_query\_index

11\. prior\_valid\_query\_count

12\. prior\_invalid\_query\_count

13\. x1

14\. x2

15\. utility

16\. true\_admissible

17\. independently\_invalid

18\. gate\_admitted

19\. gate\_score

20\. false\_admission

21\. escaped\_previously

22\. is\_first\_false\_admission

23\. first\_escape\_interaction\_index

24\. first\_escape\_invalid\_query\_index

25\. feedback\_admitted

26\. feedback\_score

27\. proposal\_mode

28\. anchor\_x1\_before

29\. anchor\_x2\_before

30\. anchor\_utility\_before

31\. last\_admitted\_before

32\. last\_score\_before

33\. sigma\_used

34\. push\_used

35\. anchor\_x1\_after

36\. anchor\_x2\_after

37\. anchor\_utility\_after

38\. last\_admitted\_after

39\. last\_score\_after



No result-dependent fields may be added after execution begins.



Additional derived variables belong in analysis outputs rather than the raw trace.



\---



\## 5. Null and encoding conventions



Boolean values are encoded as:



\- 1 = true

\- 0 = false



Nullable values use blank CSV cells.



No string such as:



\- NA

\- null

\- None

\- NaN



is used as the raw-file null representation.



Floats use Python round-trip serialization.



\### Nullable trace fields



The following may be blank where semantically inapplicable:



\- invalid\_query\_index

\- first\_escape\_interaction\_index

\- first\_escape\_invalid\_query\_index

\- feedback\_score

\- anchor\_x1\_before

\- anchor\_x2\_before

\- anchor\_utility\_before

\- last\_admitted\_before

\- last\_score\_before

\- sigma\_used

\- push\_used

\- anchor\_x1\_after

\- anchor\_x2\_after

\- anchor\_utility\_after

\- last\_admitted\_after

\- last\_score\_after



The internal negative-infinity anchor-utility sentinel is not serialized as a numeric value when the anchor is uninitialized.



Instead, the corresponding raw field is blank.



\---



\## 6. Invalid-query indexing



invalid\_query\_index is:



\- one-based

\- incremented only for independently invalid proposals

\- blank for independently valid proposals



prior\_valid\_query\_count and prior\_invalid\_query\_count:



\- describe counts before the current interaction

\- exclude the current proposal



This convention must remain fixed throughout analysis.



\---



\## 7. First-escape field timing



escaped\_previously describes state before the current query.



On the first false-admission row:



\- escaped\_previously = 0

\- is\_first\_false\_admission = 1

\- first\_escape\_interaction\_index is set

\- first\_escape\_invalid\_query\_index is set



On later rows:



\- escaped\_previously = 1

\- is\_first\_false\_admission = 0

\- first-escape indices retain their original values



Before the first escape:



\- first-escape indices remain blank



Future escape indices are never backfilled into earlier trace rows.



\---



\## 8. Proposal-mode labels



The following proposal-mode labels are frozen:



\### Random proposer



iid\_random



\### Nonadaptive utility-ranked proposer



nonadaptive\_ranked



\### Adaptive proposer with no anchor



initial\_random



\### Adaptive proposer taking the existing restart branch after anchor formation



random\_restart



\### Adaptive proposer using the existing local mutation path



local\_search



No new RNG calls may be introduced to determine or log proposal mode.



The logged mode must reflect the branch already taken by the existing proposer.



\---



\## 9. Sigma and push logging



For binary adaptive local search:



\- sigma\_used records the existing fixed local sigma

\- push\_used records the existing fixed utility push



For score adaptive local search:



\- sigma\_used records the value already computed by the proposer

\- push\_used records the value already computed by the proposer



For initial random and random restart proposals:



\- sigma\_used is blank

\- push\_used is blank



Instrumentation must not recompute stochastic proposal behavior or alter RNG state.



\---



\## 10. State timing



State fields ending in `\_before` are snapshots taken immediately before:



next\_proposal()



State fields ending in `\_after` are snapshots taken immediately after:



observe()



This allows analysis of state changes caused by operational feedback.



The held-out evaluator remains outside proposer state and proposer feedback.



\---



\## 11. Feedback-call logging



The raw trace records the actual arguments passed to the historical proposer observe() call.



\### Random proposer



observe() is still called with operational admission and no score.



The proposer ignores the call.



\### Nonadaptive proposer



observe() is still called with operational admission and no score.



The proposer ignores the call.



\### Binary adaptive proposer



Receives:



\- operational admission

\- no score



\### Score adaptive proposer



Receives:



\- operational admission

\- operational gate score



Therefore:



feedback\_admitted records the operational admission argument for all proposer classes.



feedback\_score is:



\- populated only for score-feedback proposer

\- blank for random, nonadaptive, and binary proposer conditions



The presence of logged feedback arguments for random and nonadaptive proposers must not be interpreted as adaptive learning.



\---



\## 12. Operational ordering



The order remains frozen as:



1\. proposer generates proposal

2\. operational gate evaluates proposal

3\. proposer receives permitted operational feedback

4\. held-out G\* evaluates proposal

5\. evaluator determines false admission



G\* evaluation must not move before proposer feedback.



No held-out truth, false-admission label, escape status, or analysis label may be returned to the proposer.



This remains true after the first false admission.



\---



\## 13. Post-first-escape continuation



Every completed Trace Benchmark 001 episode continues through interaction 256.



Post-first-escape rows are:



counterfactual continuation traces under the same operational feedback process



They are mechanism-analysis data.



They do not redefine first-escape risk.



Only the first false admission defines:



\- escaped status

\- first escape interaction index

\- first escape invalid-query index

\- cumulative prefix escape

\- survivor-conditioned hazards



Subsequent false admissions may be recorded descriptively.



\---



\## 14. Output creation and overwrite protection



The default raw output is:



results/trace\_benchmark\_001/raw/ictf\_adaptive\_gate\_search\_trace\_001.csv.gz



Associated metadata is stored adjacent to the raw output.



Raw output and metadata must use exclusive creation.



The benchmark must refuse to overwrite an existing raw result or metadata file.



There is no implicit resume behavior.



\---



\## 15. Interrupted-run handling



If execution is interrupted:



\- partial raw output remains in place

\- incomplete metadata remains in place

\- the implementation does not automatically delete either artifact

\- the existing artifacts block an accidental rerun to the same path



A new run requires deliberate operator action after inspecting the incomplete artifacts.



Analysis must reject incomplete benchmark metadata.



Analysis must also reject incomplete, missing, duplicated, reordered, extra, or internally inconsistent episode rows.



No incomplete benchmark may be interpreted scientifically as a completed result.



\---



\## 16. Metadata and provenance



Metadata must include at minimum:



\- benchmark name

\- benchmark version

\- protocol version

\- exact execution Git commit

\- master seed

\- trials per condition

\- fixed horizon

\- prefix budgets

\- geometries

\- proposers

\- expected episode count

\- expected maximum row count

\- raw schema

\- continuation-after-first-escape semantics

\- G\* visibility semantics

\- source plan name

\- amendment names

\- source-file hashes where implemented

\- creation timestamp

\- completion status



The exact execution commit must be recorded so the benchmark result can be tied to immutable source history.



\---



\## 17. Prefix cumulative escape



For each prefix budget B:



q\_B = proportion of all 10,000 episodes in the condition whose first false admission occurred at or before B



The denominator is always:



10,000 episodes in that condition



All prefix budgets are derived from the same B=256 trajectory cohort.



An episode that never escapes by B contributes zero to the numerator.



\---



\## 18. Total-interaction first-escape hazard



Define:



g\_k = P(first false admission at interaction k | no earlier false admission)



Risk-set membership requires:



\- the episode exists at interaction k

\- no first false admission occurred before k



Because every completed episode contains 256 interactions, there is no administrative loss before k=256 other than first escape for the survivor-conditioned risk set.



The first-escape event row remains part of the risk set at k.



Episodes with earlier escape are excluded from later g\_k risk sets.



\---



\## 19. Invalid-query first-escape hazard



Define:



h\_t = P(first false admission at invalid query t | no earlier false admission)



An episode enters the risk set for invalid-query index t only if:



\- it actually reaches invalid-query index t

\- it has not escaped before that query



An episode that never reaches invalid-query index t does not enter that risk set.



The event query itself is included.



A risk set with zero observations has:



hazard = blank



not zero.



\---



\## 20. Censoring convention



No observed first escape is coded as censoring.



An episode completing interaction 256 without first escape is right-censored at the fixed horizon for first-escape analyses.



Failure to reach later invalid-query indices before the interaction horizon is not counted as an escape.



\---



\## 21. Pre-invalid learning summary



For each episode, preserve a record describing the first independently invalid proposal.



At minimum include:



\- whether any invalid query occurred

\- total interaction index of first invalid query

\- prior valid interaction count

\- proposal coordinates

\- utility

\- proposal mode

\- sigma/push where applicable

\- proposer state immediately before the proposal

\- proposer state immediately after operational feedback



Episodes with no invalid query remain in the summary with:



\- explicit no-invalid indicator

\- blank first-invalid state fields



They must not be silently dropped.



\---



\## 22. Survivor and continuation groups



State and spatial summaries may use three explicitly distinct groups:



\### All trajectories



All trace rows satisfying the relevant clock/index condition.



\### Survivor-before-query



Rows whose episode had not escaped before the current query.



The first-escape event row remains in this group because escaped\_previously = 0.



\### Previously escaped continuation



Rows after a first false admission.



These are counterfactual continuation traces and must remain separately labeled.



The first row after escape, not the escape row itself, begins the previously escaped continuation group.



\---



\## 23. Invalid-clock grouping



For invalid-query-clock summaries, a row contributes only if that episode actually reaches the specified invalid-query index.



Even the all-trajectories group must satisfy this reachability condition.



Episodes are not synthetically projected into invalid-query indices they never reach.



\---



\## 24. Summary statistics



For numeric state summaries, report where applicable:



\- non-null count

\- arithmetic mean

\- population standard deviation



Population standard deviation is used rather than sample standard deviation.



Fractions may be reported for categorical proposal modes.



A statistic with no valid denominator or no non-null observations remains blank/undefined rather than being forced to zero.



\---



\## 25. Pairwise comparisons



The prospective analysis may generate all pairwise descriptive differences among relevant conditions for:



\- q\_B

\- g\_k

\- h\_t



This includes comparisons across:



\- geometry

\- proposer

\- joint geometry × proposer condition



Ratios are blank when their denominator is zero.



These comparisons are descriptive.



No p-value or inferential significance claim is implied by the existence of a pairwise comparison row.



\---



\## 26. Spatial binning



Spatial trajectory summaries use a fixed:



32 × 32



grid over the proposal space.



Occupancy is query-weighted.



Unlisted spatial bins are interpreted as zero observed occupancy for the relevant aggregation.



A group/window with no observations has undefined density rather than a fabricated zero-denominator fraction.



\---



\## 27. Time-window binning



Mechanism-oriented spatial and state summaries use fixed windows of:



16 queries



where applicable.



Total-interaction windows and invalid-query windows remain separate.



No result-dependent change to window width is permitted after execution.



\---



\## 28. False-admission distance proxy



Spatial analysis may use the implemented deterministic proxy:



distance from an occupied spatial bin center to the nearest false-admission reference point on a fixed 128 × 128 reference-center grid



This is explicitly an approximate spatial proxy.



It is not:



\- exact distance to the mathematical false-admission set

\- proof of reachability

\- proof of separation

\- exact geometric boundary distance



The proxy can miss:



\- narrow features

\- discretized unstructured cells

\- geometry below reference-grid resolution



Any interpretation must state these limitations.



\---



\## 29. Descriptive peak-window selection



For visualization and mechanism description, a condition/clock may identify a peak time window using:



the fixed time window containing the highest pooled first-escape hazard



Ties use the earliest matching window.



If no first-escape events occur, no peak is defined.



Labels such as:



\- before peak

\- peak

\- after peak



are descriptive and data-selected.



They are not an independent preregistered significance test and must not be presented as one.



\---



\## 30. Hypothesis decision status



TRACE\_BENCHMARK\_PLAN\_001.md defines prospective hypotheses H-T1 through H-T5.



This amendment freezes an important interpretation boundary:



Trace Benchmark 001 does not currently specify a complete inferential decision procedure for declaring H-T1 through H-T5 statistically “supported” or “rejected.”



The prospective analysis is therefore primarily:



\- descriptive

\- mechanism-oriented

\- trajectory-based

\- hypothesis-discriminating



but not a binary null-hypothesis-testing protocol for H-T1 through H-T5.



The benchmark may report whether observed patterns are:



\- consistent with

\- inconsistent with

\- qualitatively matching

\- failing to show the predicted pattern



but must not retroactively invent p-value thresholds, model choices, contrasts, or multiplicity corrections after seeing the data.



If formal confirmatory statistical decisions are desired, they require a separately preregistered follow-up analysis or benchmark with:



\- explicit estimands

\- explicit statistical models

\- explicit contrasts

\- explicit significance thresholds

\- explicit multiplicity handling



frozen before its results are observed.



\---



\## 31. Historical apparatus equivalence



Before execution, the implemented trace apparatus must demonstrate behavioral equivalence against the historically frozen apparatus up to the original first-escape termination point.



The completed implementation validation compared against immutable Git history and covered:



\- both geometries

\- all four proposer classes

\- deterministic master seeds

\- multiple episode IDs

\- proposal coordinates

\- gate decisions

\- gate scores

\- proposer-visible feedback

\- held-out validity

\- first-escape positions on both clocks

\- RNG states



The historical apparatus tag:



ictf-adaptive-gate-search-apparatus-v0.1



is confirmed to be an ancestor of the implementation reference history.



The relevant historical experiment source files were also verified byte-for-byte unchanged between the apparatus tag and the pre-instrumentation reference commit.



This equivalence evidence must be preserved in the implementation record before execution.



\---



\## 32. No scientific result has yet been observed



At the time this amendment is frozen:



\- Trace Benchmark 001 has not been executed

\- no trace result file exists

\- no Trace Benchmark 001 analysis has been run on scientific result data

\- no H-T hypothesis has been evaluated against trace-benchmark outcomes

\- no parameter tuning has occurred in response to trace-benchmark results



Validation trajectories used for behavioral-equivalence testing are engineering checks only and are not scientific benchmark results.



\---



\## 33. No AGS evaluation



Trace Benchmark 001 remains a synthetic ICTF mechanism benchmark.



It does not evaluate:



\- AAG

\- PGDL

\- Runtime Binding

\- fuller AGS configurations



AGS evaluation remains a later experimental phase.



\---



\## 34. Freeze and execution condition



Trace Benchmark 001 must not execute until:



1\. this amendment is saved

2\. this amendment is committed and pushed

3\. implementation files are reviewed

4\. implementation files are committed and pushed

5\. behavioral-equivalence validation passes from the committed implementation

6\. runner configuration validation passes

7\. analysis configuration validation passes

8\. the exact pre-run apparatus state is tagged

9\. the working tree is clean



Any semantic or analytical change after this amendment but before execution requires another pre-run amendment.



Any new analysis introduced after scientific results are observed must be labeled post-result exploratory.

