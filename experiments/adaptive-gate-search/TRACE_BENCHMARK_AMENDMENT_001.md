\# ICTF Adaptive Gate Search — Trace Benchmark Amendment 001



Status: Pre-implementation amendment

Date: 2026-10-05



\## Purpose



This amendment freezes two implementation semantics that were not fully specified in TRACE\_BENCHMARK\_PLAN\_001.md:



1\. behavior after the first false admission

2\. passive proposer-state instrumentation



These decisions are being recorded before trace-benchmark implementation begins and before any trace-benchmark results are observed.



\---



\## Amendment A — Continue trajectories after first false admission



The original adaptive gate search benchmark terminated an episode immediately on the first false admission.



For Trace Benchmark 001, each episode will instead continue until the fixed maximum interaction horizon:



B = 256



even if a false admission occurs earlier.



\### Rationale



The purpose of the trace benchmark is to distinguish among:



\- proposer-state evolution

\- movement through proposal space

\- learning before and after independently invalid proposals

\- survivor-selection effects

\- temporal reachability of false-admission regions



Immediate termination at first escape prevents observation of the later trajectory for episodes that escape early.



Continuing the trace makes it possible to compare:



\- trajectories that have already escaped

\- trajectories that have not yet escaped

\- how proposer state evolves in both groups



This change is instrumentation-oriented and mechanism-oriented.



It does not redefine the first-escape event.



\---



\## First-escape semantics remain unchanged



For confirmatory and survival-style metrics, only the first false admission counts as the escape event.



The following remain defined by the first false admission only:



\- first escape total interaction index

\- first escape invalid-query index

\- cumulative escape by prefix budget

\- total-interaction conditional hazard

\- invalid-query conditional hazard

\- survivor-conditioned risk sets



Subsequent false admissions may be recorded descriptively but must not be treated as additional first-escape events.



\---



\## Proposer feedback after first escape



The proposer must not be informed that a held-out evaluator classified any proposal as a false admission.



After a false admission occurs, the proposer continues receiving only the same operational feedback permitted by its condition.



Specifically:



\### Random proposer



Receives no adaptive information.



\### Nonadaptive utility-ranked proposer



Receives no adaptive information.



\### Binary-feedback adaptive proposer



Receives only:



\- operational gate admit/reject



\### Score-feedback adaptive proposer



Receives only:



\- operational gate admit/reject

\- permitted operational gate score



The following must never be exposed to the proposer:



\- held-out G\* validity

\- independently invalid flag

\- false-admission flag

\- first-escape status

\- cumulative escape status

\- analysis-only labels



The held-out evaluator remains observational only.



\---



\## Counterfactual continuation interpretation



Post-first-escape trajectory records should be interpreted as:



> the trajectory the proposer would continue to generate under the same operational feedback process if the external experiment did not terminate at first escape.



They are not part of the original benchmark termination semantics.



They are collected solely to support mechanism analysis.



Any analysis involving post-first-escape behavior must be labeled accordingly.



\---



\## Amendment B — Passive proposer-state instrumentation



Trace Benchmark 001 may add internal trace variables to proposer implementations solely to expose already-existing internal state and proposal-generation mode.



Instrumentation must not alter proposer behavior.



No additional random-number-generator calls may be introduced by instrumentation.



No proposal, gate decision, or feedback value may change because tracing is enabled.



\---



\## Adaptive proposer trace fields



Where applicable, record the following state before and/or after each proposal:



\- anchor x1

\- anchor x2

\- anchor utility

\- last admitted state

\- last score

\- local sigma used for proposal generation

\- utility push used for proposal generation

\- proposal mode



Suggested proposal-mode labels:



\- initial\_random

\- random\_restart

\- local\_search

\- nonadaptive\_ranked

\- iid\_random



Exact labels may vary before implementation freeze, but their semantics must be documented.



\---



\## Random restart instrumentation



The adaptive proposers currently determine random restart inside next\_proposal().



Trace instrumentation may record whether the existing restart branch was taken.



It must do so using the already-generated branch decision.



Instrumentation must not:



\- call rng.random() again

\- resample the branch decision

\- change RNG ordering

\- change proposal-generation order



The purpose is to observe the existing control path, not alter it.



\---



\## Sigma and utility-push instrumentation



For score-feedback adaptive search, the trace may record the sigma and utility-push values already computed by the proposer.



For binary-feedback adaptive search, the fixed local sigma and utility push may be recorded when local search is used.



For random-restart proposals, sigma and push may be blank or null if they were not used.



Instrumentation must not recompute stochastic proposal values in a way that changes RNG state.



\---



\## State timing



Trace output should distinguish state timing where necessary.



At minimum, the implementation should make it possible to reconstruct:



\- proposer state immediately before proposal generation

\- proposal-generation mode and parameters

\- operational feedback received

\- proposer state after observe()



This is required for analyzing:



\- pre-invalid learning

\- anchor formation

\- state changes caused by accepted proposals

\- state evolution before and after first escape



\---



\## Behavioral equivalence requirement



Before executing the trace benchmark, implementation must be tested for behavioral equivalence against the frozen proposer and gate logic.



For identical:



\- master seed

\- geometry

\- proposer

\- episode seed

\- B = 256



the first-escape trajectory generated by the instrumented implementation should match the trajectory implied by the frozen apparatus up to the point where the original benchmark would terminate.



At minimum compare:



\- proposals

\- gate decisions

\- gate scores

\- proposer-observable feedback

\- held-out validity

\- first false-admission location



Any mismatch must be treated as implementation drift and resolved before execution.



\---



\## Analysis boundary



Post-first-escape traces are mechanism-analysis data.



They must not be used to redefine the original first-escape hazard in a way that mixes:



\- first escapes

\- repeated false admissions

\- already-escaped episodes



Standard first-escape hazard remains survivor-conditioned.



Separate all-trajectory summaries may be used to study proposer movement and survivor-selection effects.



These summaries must be clearly labeled and must not be substituted for first-escape hazard.



\---



\## No AGS evaluation



This amendment concerns only the synthetic ICTF adaptive gate search trace benchmark.



No AGS component is introduced or evaluated here.



\---



\## Freeze condition



No implementation work should proceed until this amendment is:



1\. saved

2\. committed

3\. pushed

4\. tagged or otherwise historically anchored



Any later semantic change must be recorded in a new pre-run amendment before execution.

