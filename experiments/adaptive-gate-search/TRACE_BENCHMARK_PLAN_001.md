\# ICTF Adaptive Gate Search — Trace Benchmark Plan 001



Status: Pre-run benchmark plan

Date: 2026-10-05



\## Purpose



This benchmark is designed to explain the temporal escape-hazard patterns observed in the first ICTF adaptive gate search experiment and reproduced under an independent master seed.



The previous runs established two things within the fixed synthetic benchmark:



1\. The preregistered H4 positive hazard-slope hypothesis was not supported.

2\. Post-result exploratory analysis showed reproducible differences in temporal hazard shape across search policies and error geometries.



However, the existing dataset stores episode-level summaries rather than complete per-query trajectories.



As a result, the previous analysis cannot cleanly distinguish among:



\- proposer-state evolution

\- learning before the first invalid query

\- movement through proposal space

\- survivor-selection effects

\- total-interaction time

\- invalid-query time



This benchmark will record complete interaction traces so those mechanisms can be analyzed separately.



\---



\## Scientific status



This is a new prospective benchmark motivated by exploratory findings from prior runs.



The original H4 result remains negative.



The prior exploratory findings remain exploratory.



This benchmark does not retroactively convert previous post-result observations into confirmatory findings.



No AGS components are evaluated in this benchmark.



\---



\## Core research question



Holding the gate definitions and proposer algorithms fixed:



> How much of the observed temporal escape-hazard profile is attributable to proposer-state evolution, pre-invalid learning, trajectory movement, and survivor conditioning?



A second research question is:



> Do search-policy × error-geometry interactions remain visible when temporal risk is analyzed on both total-interaction and invalid-query clocks using complete per-query trajectories?



\---



\## Benchmark design



\### Episode horizon



Each episode will run with a fixed maximum interaction budget:



B = 256



Shorter-budget outcomes will be derived from prefixes of the same trajectories.



This replaces the previous design in which separate cohorts were generated independently for each interaction budget.



Derived prefix budgets:



\- 1

\- 2

\- 4

\- 8

\- 16

\- 32

\- 64

\- 128

\- 256



This change is intended to permit within-trajectory comparison across horizons.



\---



\## Gate geometries



Use the same frozen gate definitions as the prior benchmark:



\- structured

\- unstructured



Do not change gate geometry, calibration, false-admission regions, or held-out truth conditions.



\---



\## Proposer/search policies



Use the same proposer algorithms as the prior benchmark:



\- random

\- nonadaptive utility-ranked

\- binary-feedback adaptive

\- score-feedback adaptive



Do not change:



\- task utility

\- mutation behavior

\- anchor logic

\- restart behavior

\- score-response behavior

\- information available to the proposer



The proposer must not receive held-out ground-truth validity.



\---



\## Trial count



Use:



10,000 episodes per geometry × proposer condition



Conditions:



2 geometries × 4 proposer/search policies



Total episodes:



80,000



Each episode may contain up to 256 interactions.



Maximum possible interaction records:



20,480,000



The implementation may stream or compress trace output to keep storage manageable, but trace semantics must not change.



\---



\## Required per-query trace fields



For every interaction, record at minimum:



\### Episode identity



\- protocol version

\- benchmark version

\- master seed

\- episode seed

\- episode id

\- geometry

\- proposer

\- maximum budget



\### Time



\- total interaction index k

\- invalid-query index t, if the proposal is independently invalid

\- count of prior valid queries

\- count of prior invalid queries



\### Proposal state



\- x1

\- x2

\- task utility U(x)



\### Independent evaluation



\- true validity under held-out G\*

\- independently invalid flag



\### Operational gate



\- gate admission decision

\- operational gate score, where defined

\- false-admission flag



\### Proposer-observable feedback



Record only what the proposer actually receives.



For example:



\- binary admit/reject feedback for binary proposer

\- permitted score feedback for score proposer

\- no adaptive feedback for nonadaptive proposer

\- no hidden held-out evaluation signal



\### Proposer internal state



Where meaningful and available, record:



\- current anchor

\- anchor utility

\- local mutation scale / sigma

\- restart indicator

\- state transition type

\- whether current proposal was local mutation, utility push, restart, or other defined proposal mode



Do not expose new information to the proposer merely because it is recorded for analysis.



\### Escape state



\- whether a false admission has occurred previously

\- whether this interaction is the first false admission

\- first-escape total interaction index

\- first-escape invalid-query index



The full trace may continue after first false admission if required for mechanism analysis, but this must be decided and frozen before implementation.



\---



\## Primary temporal clocks



Analyze all relevant outcomes on two clocks.



\### Clock 1 — total interaction index



k = 1, 2, ..., 256



This measures risk as experienced over actual interaction time.



\### Clock 2 — invalid-query index



t = 1, 2, ...



This conditions on independently invalid gate-facing proposals.



These clocks must remain distinct in all analysis and reporting.



\---



\## Primary analysis targets



\### 1. Prefix cumulative escape



For each derived interaction budget B:



q\_B = probability of at least one false admission by interaction B



Calculate from prefixes of the same B=256 trajectories.



This permits direct within-cohort horizon comparison.



\---



\### 2. Invalid-query conditional hazard



Estimate:



h\_t = P(first false admission at invalid query t | no earlier false admission)



Report by:



\- geometry

\- proposer

\- invalid-query index



\---



\### 3. Total-interaction conditional hazard



Estimate:



g\_k = P(first false admission at interaction k | no earlier false admission)



Report by:



\- geometry

\- proposer

\- total interaction index



\---



\### 4. Pre-invalid learning



For every episode reaching its first invalid query, measure:



\- total interactions before first invalid query

\- number of true-admissible interactions before first invalid query

\- proposer state immediately before the first invalid query

\- proposer state at the first invalid query



This will test whether adaptive proposers have already changed materially before invalid-query index t = 1.



\---



\### 5. Survivor-conditioning analysis



Compare hazard trajectories under:



A. standard survivor-conditioned first-escape analysis



and



B. trajectory-state summaries that include episodes regardless of whether an earlier escape occurred



The purpose is to determine whether declining h\_t reflects:



\- genuine proposer movement away from vulnerable regions

\- removal of vulnerable episodes from the risk set

\- or both



No causal claim should be made unless the recorded traces support it.



\---



\### 6. Spatial trajectory analysis



For each proposer and geometry, characterize how proposal locations evolve through time.



At minimum examine:



\- distance to the false-admission region where computable

\- x1 + x2 progression

\- proposal density by time

\- proposal density before and after high-hazard regions

\- differences between survivors and escaped episodes



This analysis is intended to test the reachable-error-set interpretation.



\---



\## Reachable-error-set research target



Let:



F = false-admission region



R\_pi(t) = region effectively reachable by proposer/search policy pi by time t



The central future-oriented question is whether temporal escape risk is better characterized by the evolving overlap:



R\_pi(t) ∩ F



rather than by static false-admission measure alone.



This benchmark does not assume that this formulation is correct.



It is a hypothesis-generating explanatory structure to be tested against recorded trajectories.



\---



\## Prospective hypotheses



\### H-T1 — temporal interaction hypothesis



Temporal escape profiles will differ across proposer/search policies even when evaluated against the same gate geometry.



This is expected to be visible on both total-interaction and invalid-query clocks.



\---



\### H-T2 — geometry interaction hypothesis



The shape of temporal escape hazard will depend on the interaction between:



\- proposer/search policy

\- false-admission geometry



The structured and unstructured gates are not expected to produce interchangeable hazard trajectories merely because their baseline false-admission rates are approximately matched.



\---



\### H-T3 — pre-invalid adaptation hypothesis



Adaptive proposers will show measurable state evolution before their first independently invalid query.



Therefore:



invalid-query index t = 1



may occur after substantial earlier interaction and should not be interpreted as the beginning of learning.



\---



\### H-T4 — survivor-conditioning hypothesis



Part of the declining hazard observed in structured adaptive conditions will be attributable to survivor selection.



However, survivor selection alone will not fully explain the temporal profile if proposer-state movement remains measurably different among surviving trajectories.



This hypothesis should be treated cautiously because mechanism separation depends on the adequacy of recorded state variables.



\---



\### H-T5 — delayed reachability hypothesis



The structured nonadaptive utility-ranked proposer will exhibit a delayed increase in false-admission risk because its fixed utility ranking traverses proposal space in a way that reaches the structured false-admission region later in the trajectory.



The unstructured geometry is not expected to produce the same delayed concentrated hazard wave.



\---



\## Analysis boundaries



The following must remain distinct:



\- confirmatory hypotheses defined in this document

\- descriptive statistics

\- exploratory analyses added after results

\- interpretation of mechanism



Do not redefine hypotheses after observing outputs.



If additional analyses are needed after results are observed, record them in a separate post-result exploratory document.



\---



\## Reproducibility requirements



Before execution:



\- freeze this plan in Git

\- freeze implementation code in Git

\- record exact master seed

\- validate configuration without running episodes

\- tag the pre-run state



After execution:



\- preserve raw trace data

\- preserve metadata

\- preserve analysis outputs

\- preserve hashes where practical

\- record result interpretation separately

\- tag the result state



\---



\## Output isolation



Do not overwrite prior experiments or replication outputs.



Suggested directory:



experiments/adaptive-gate-search/results/trace\_benchmark\_001/



Suggested structure:



results/trace\_benchmark\_001/

&#x20; raw/

&#x20; analysis/

&#x20; metadata/



Suggested raw trace file:



ictf\_adaptive\_gate\_search\_trace\_001.csv.gz



If a more efficient format is required due to trace size, the format may change before execution, but the schema and semantics must remain documented and frozen.



\---



\## Implementation constraint



The benchmark should reuse the previously frozen gate and proposer implementations wherever possible.



Changes should be limited to:



\- trace instrumentation

\- fixed B=256 cohort structure

\- prefix-derived horizon analysis

\- additional mechanism-oriented analysis



Any unavoidable behavioral change to the proposer, gate, evaluator, or episode semantics must be documented before execution.



\---



\## Stop condition



Do not execute the benchmark until:



1\. this plan is committed

2\. implementation is complete

3\. implementation has been inspected for behavioral drift

4\. analysis code is frozen

5\. configuration validation passes

6\. the pre-run state is tagged



No result should be observed before those steps are complete.

