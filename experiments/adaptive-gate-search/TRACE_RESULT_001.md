\# ICTF Adaptive Gate Search — Trace Benchmark Result 001



\*\*Status:\*\* Prospective analysis complete; interpretation record  

\*\*Benchmark:\*\* ICTF Trace Benchmark 001  

\*\*Run date:\*\* 2026-10-05 local / 2026-10-06 UTC  

\*\*Scientific status:\*\* Synthetic benchmark; descriptive and mechanism-oriented; not an AGS evaluation



\## 1. Purpose



Trace Benchmark 001 was designed to investigate the temporal mechanism behind the hazard patterns observed in the original ICTF Adaptive Gate Search experiment and its independent-seed replication.



The principal unresolved question was whether changing first-escape hazard could be explained by:



\- proposer-state evolution,

\- movement through proposal space,

\- pre-invalid learning,

\- survivor-selection effects,

\- the distinction between total-interaction and invalid-query clocks,

\- or some combination of these mechanisms.



The benchmark did not introduce new confirmatory hypothesis tests.



H-T1 through H-T5 do not have fully specified inferential decision procedures in this benchmark and are therefore not assigned formal supported/unsupported outcomes.



\## 2. Frozen provenance



The benchmark apparatus was frozen before execution.



Pre-run apparatus tag:



`ictf-adaptive-gate-search-trace-apparatus-v0.1`



Apparatus Git commit:



`5ae32fbac8e028134482fdda5b74437978c73388`



The completed raw run independently recorded the same Git commit.



The raw-complete pre-analysis state was tagged:



`ictf-adaptive-gate-search-trace-raw-complete-v0.1`



The prospective analysis-complete pre-interpretation state was tagged:



`ictf-adaptive-gate-search-trace-analysis-complete-v0.1`



The raw trace SHA-256 was:



`5A8FD465588C9A2A15F4BBCFD3931AFC96C576CEBAB6CB738DCDA5C070E27D17`



An independent backup produced the identical SHA-256.



\## 3. Benchmark configuration



\- Master seed: `20261006`

\- Geometries: `structured`, `unstructured`

\- Proposers: `random`, `nonadaptive`, `binary`, `score`

\- Conditions: 8

\- Episodes per condition: 10,000

\- Total episodes: 80,000

\- Fixed horizon: 256 interactions

\- Total trace rows: 20,480,000

\- Prefix budgets: 1, 2, 4, 8, 16, 32, 64, 128, 256



Each episode continued through the complete 256-interaction horizon.



First-escape indices remained immutable after the first false admission.



Post-first-escape rows were retained only as counterfactual continuation for mechanism analysis and were not treated as continued first-escape risk.



\## 4. Cumulative first-escape risk



The shared-prefix trajectories reproduced the principal qualitative cumulative-risk pattern previously observed in the original benchmark and independent-seed replication.



\### Structured geometry



For random search:



\- B=8: q\_B = 0.1839

\- B=16: q\_B = 0.3326

\- B=32: q\_B = 0.5579

\- B=256: q\_B = 0.9989



For score-feedback adaptive search:



\- B=8: q\_B = 0.2600

\- B=16: q\_B = 0.4133

\- B=32: q\_B = 0.4957

\- B=256: q\_B = 0.7600



At B=8, score-feedback search produced approximately 1.41x the cumulative first-escape probability of random search.



The relationship later reversed.



By B=32, score-feedback search was below random search, and by B=256 the difference was substantial.



Binary-feedback search showed a related but weaker pattern:



\- B=16: binary = 0.3767 vs random = 0.3326

\- B=256: binary = 0.7936 vs random = 0.9989



Therefore adaptive search was not uniformly more or less risky than random search.



The relationship depended strongly on search horizon.



\### Structured nonadaptive search



The structured nonadaptive proposer showed an extreme delayed transition:



\- B<=32: q\_B = 0

\- B=64: q\_B = 0.0006

\- B=128: q\_B = 0.9960

\- B=256: q\_B = 0.9983



This reproduced the previously observed delayed hazard wave.



\### Unstructured geometry



The unstructured geometry produced a different temporal pattern.



Adaptive binary and score search were generally suppressed relative to random search at shorter horizons and approached random-search cumulative risk at long horizons.



At B=256:



\- random = 0.9986

\- binary = 0.9998

\- score = 0.9920



These differences reinforce that search policy cannot be assigned a single geometry-independent risk level.



\## 5. Invalid-query hazard



The structured geometry produced sharply different hazard profiles under different proposers.



\### Random search



Random-search first-escape hazard remained approximately stationary near 5% throughout the well-populated portion of the invalid-query trajectory.



Examples:



\- t=1: 0.0513

\- t=2: 0.0488

\- t=10: 0.0528

\- t=20: 0.0548



Late random-query estimates were based on very small survivor risk sets and should not be strongly interpreted.



\### Binary-feedback adaptive search



Binary search showed a high early hazard followed by strong decline:



\- t=1: 0.1092

\- t=2: 0.1132

\- t=3: 0.1041

\- t=10: 0.0200

\- t=20: 0.0128

\- t=64: 0.0045



\### Score-feedback adaptive search



Score search showed a similar but somewhat stronger decline:



\- t=1: 0.1104

\- t=2: 0.1088

\- t=3: 0.0956

\- t=10: 0.0143

\- t=20: 0.0052

\- t=64: 0.0047



\### Nonadaptive utility-ranked search



The structured nonadaptive proposer showed approximately zero early hazard followed by a delayed high-hazard wave.



Examples:



\- t=32: 0

\- t=64: 0.0003

\- t=90: 0.0590

\- t=94: 0.0786

\- t=100: 0.1066

\- t=106: 0.1312

\- t=110: 0.1487



The same fixed gate therefore generated qualitatively different temporal risk profiles depending on proposer policy.



\## 6. Proposer-state evolution



The trace data show that declining adaptive hazard cannot be explained by survivor selection alone.



\### Binary proposer



Binary search used effectively fixed nominal search parameters throughout the inspected trajectory:



\- sigma approximately 0.06

\- push approximately 0.02



Despite fixed search parameters, the full trajectory population changed state.



Mean anchor utility across all binary trajectories increased from approximately:



\- 0.894 at invalid query 1

\- to 1.116 at invalid query 64



This full-population change demonstrates genuine trajectory/state evolution independent of survivor-set composition.



At invalid query 64:



Previously escaped counterfactual trajectories:



\- mean utility = 1.223

\- mean anchor utility = 1.175



Survivors before query:



\- mean utility = 1.098

\- mean anchor utility = 0.998



Thus strong survivor selection occurred on top of genuine state evolution.



\### Score proposer



Score-feedback search showed both state evolution and explicit search-parameter adaptation.



Across all score trajectories:



Mean sigma decreased from approximately:



\- 0.0634 at invalid query 1

\- to 0.0164 at invalid query 64



Mean push decreased from approximately:



\- 0.0388 at invalid query 1

\- to 0.0090 at invalid query 64



Mean anchor utility increased from approximately:



\- 0.873 at invalid query 1

\- to 1.099 at invalid query 64



At invalid query 64:



Previously escaped counterfactual trajectories:



\- mean utility = 1.190

\- mean anchor utility = 1.163



Survivors before query:



\- mean utility = 1.046

\- mean anchor utility = 0.999



The score-feedback hazard decline is therefore consistent with multiple simultaneous mechanisms:



1\. proposer-state evolution,

2\. reduction in search aggressiveness,

3\. movement through proposal space,

4\. survivor selection.



The benchmark does not causally decompose the relative contribution of these mechanisms.



\## 7. Spatial relationship to the false-admission region



The frozen spatial analysis used:



\- a 32x32 proposal-space occupancy grid,

\- fixed 16-query temporal windows,

\- a deterministic 128x128 reference-center approximation of the false-admission region.



The distance measure is a proxy and is not an exact geometric distance to the true false-admission set F.



\### Binary proposer



During the descriptive peak window:



Previously escaped counterfactual trajectories:



\- mean distance to sampled false region = 0.0513

\- mean utility = 1.1731



Survivors before query:



\- mean distance = 0.2745

\- mean utility = 1.1251



After the peak:



Previously escaped counterfactual trajectories:



\- mean distance = 0.0634

\- mean utility = 1.2275



Survivors:



\- mean distance = 0.3444

\- mean utility = 1.0986



\### Score proposer



During the descriptive peak window:



Previously escaped counterfactual trajectories:



\- mean distance to sampled false region = 0.0353

\- mean utility = 1.1448



Survivors before query:



\- mean distance = 0.2744

\- mean utility = 1.0898



After the peak:



Previously escaped counterfactual trajectories:



\- mean distance = 0.0376

\- mean utility = 1.2006



Survivors:



\- mean distance = 0.3294

\- mean utility = 1.0455



The adaptive trajectories that had escaped therefore occupied substantially different spatial regimes from trajectories that remained at risk.



The spatial result is consistent with the interpretation that policy-dependent access to the structured false-admission region changes over time.



\### Nonadaptive proposer



The nonadaptive spatial summaries were less diagnostically clean.



Its descriptive hazard peak occurred late in the trajectory and the survivor population had largely collapsed by the peak window.



Only 132 pooled survivor queries remained in the reported nonadaptive peak-window spatial summary.



The coarse spatial-distance proxy therefore should not be used to make a strong mechanistic claim about the delayed nonadaptive wave.



\## 8. Mechanistic interpretation



Within this fixed synthetic benchmark, the results are consistent with false-admission risk depending on the interaction between:



\- gate error geometry,

\- proposal policy,

\- feedback structure,

\- trajectory state,

\- search horizon,

\- and survivor composition.



A useful exploratory representation remains:



`R\_pi(t) ∩ F`



where:



\- `F` is the false-admission region,

\- `R\_pi(t)` represents the region effectively reachable or sampled by policy pi at time t.



Trace Benchmark 001 does not formally identify `R\_pi(t)` and does not prove that this representation is the unique causal mechanism.



However, the data provide empirical motivation for treating effective exposure to gate failure regions as policy- and history-dependent rather than stationary.



\## 9. Relationship to the original H4 result



The benchmark does not rescue the original positive-slope H4 hypothesis.



The structured adaptive invalid-query hazards decline sharply rather than increase.



The original positive-slope H4 test remains unsupported.



What has reproduced is a broader and more informative observation:



First-escape hazard can be strongly history-dependent even when the underlying gate is fixed.



The form of that history dependence differs by proposer and gate-error geometry.



\## 10. What the benchmark supports



Within this synthetic benchmark, the evidence supports the following descriptive conclusions:



Average gate-level pass/error rates are insufficient to characterize search-conditioned risk.



Search horizon materially changes comparative risk conclusions.



Feedback type materially changes trajectory behavior.



Gate-error geometry interacts with proposer policy.



Structured adaptive hazard decline reflects both genuine proposer-state evolution and survivor-selection effects.



Score-feedback search additionally changes its own search aggressiveness over time.



Adaptive escaped and surviving trajectories occupy substantially different spatial regimes relative to the sampled structured false-admission region.



The principal temporal patterns observed in the original experiment were qualitatively reproduced under an independent replication and again under the frozen trace benchmark.



\## 11. What the benchmark does not establish



Trace Benchmark 001 does not establish:



\- that these mechanisms generalize to real AI systems,

\- that all governance gates exhibit comparable geometry,

\- that adaptive search is categorically safer or more dangerous than random search,

\- that the proposed reachable-error-set representation is a proven causal law,

\- that H-T1 through H-T5 have been statistically confirmed,

\- that AGS has been evaluated,

\- or that ICTF as a whole has been validated.



The benchmark remains a controlled synthetic mechanism study.



\## 12. Implication for ICTF



The results strengthen the motivation for trajectory-aware governance measurement.



A system can present the same underlying gate while producing very different realized risk depending on how a proposer searches against that gate over time.



This suggests that consequential-system evaluation should distinguish at least:



\- static gate properties,

\- trajectory-conditioned exposure,

\- policy state,

\- feedback history,

\- search horizon,

\- and reachable failure structure.



A single aggregate pass rate may conceal these differences.



\## 13. Next experimental direction



The synthetic adaptive-gate program has now served its primary purpose:



1\. the original experiment identified temporal and geometry-dependent effects,

2\. an independent-seed replication established seed robustness within the fixed benchmark,

3\. Trace Benchmark 001 exposed plausible mechanisms behind those effects.



The next major experimental step should move from synthetic ICTF mechanism work toward evaluation of an actual governed architecture.



The recommended next phase is an AGS-focused evaluation in which ICTF is used as the measurement framework rather than the system under test.



That experiment should be preregistered separately before execution.

