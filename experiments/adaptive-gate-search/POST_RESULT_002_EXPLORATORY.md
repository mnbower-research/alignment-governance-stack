# POST-RESULT 002 — EXPLORATORY
## Search Policy × Error Geometry and Temporal Hazard Structure

**Experiment:** ICTF Adaptive Gate Search  
**Protocol:** v0.1  
**Status:** POST-RESULT EXPLORATORY  
**Dataset:** First preregistered comparative run  
**Episodes:** 720,000  

## Scope

This document records exploratory observations made only after the preregistered experiment and confirmatory H4 analysis were completed and frozen.

These observations do not replace the preregistered H4 result.

The preregistered H4 hypothesis was not supported.

All analyses below are descriptive and hypothesis-generating.

---

## 1. Structured random search produced approximately constant hazard

For the structured gate under P1 Random, invalid-query conditional escape hazard remained close to the calibrated conditional false-admission baseline:

epsilon_invalid ≈ 0.0497

Across the first 30 invalid-query indices, observed h_t generally remained near approximately 5%.

Examples:

- t=1: h_t = 0.0502
- t=2: h_t = 0.0500
- t=5: h_t = 0.0516
- t=10: h_t = 0.0516
- t=20: h_t = 0.0471
- t=30: h_t = 0.0560

This behavior is consistent with the matched constant-hazard baseline.

---

## 2. Structured adaptive search produced strongly front-loaded hazard

Both adaptive proposer conditions showed substantially elevated hazard at the beginning of the invalid-query sequence.

### P3 Binary feedback

- t=1: h_t = 0.1132
- t=2: h_t = 0.1107
- t=3: h_t = 0.0919
- t=4: h_t = 0.0691
- t=5: h_t = 0.0629

Hazard then declined substantially:

- t=10: h_t = 0.0207
- t=20: h_t = 0.0110
- t=30: h_t = 0.0079

### P4 Score feedback

- t=1: h_t = 0.1059
- t=2: h_t = 0.1136
- t=3: h_t = 0.0968
- t=4: h_t = 0.0726
- t=5: h_t = 0.0556

Hazard also declined substantially:

- t=10: h_t = 0.0171
- t=20: h_t = 0.0062
- t=30: h_t = 0.0049

Thus, under the structured gate, adaptive feedback did not create a monotonically increasing hazard trajectory.

Instead, it produced a pattern approximately characterized as:

high early hazard
→
rapid decline
→
low later hazard

This is consistent with the negative beta estimates observed in the preregistered H4 analysis.

---

## 3. Structured nonadaptive optimization produced delayed hazard

P2 Nonadaptive Utility-Ranked Search showed a qualitatively different profile.

The first 30 invalid-query indices produced:

h_t = 0

for every t from 1 through 30.

However, hazard increased substantially later in the search sequence.

Restricting attention to points with at least 500 episodes still at risk:

- t=94: h_t = 0.0809
- t=96: h_t = 0.0927
- t=99: h_t = 0.1000
- t=101: h_t = 0.1172
- t=103: h_t = 0.1280
- t=109: h_t = 0.1315
- t=112: h_t = 0.1334
- t=113: h_t = 0.1452

This indicates a delayed high-risk region rather than a constant or front-loaded hazard profile.

---

## 4. Unstructured nonadaptive search did not show the same delayed wave

For the unstructured gate under P2 Nonadaptive Utility-Ranked Search, observed hazard remained much closer to the calibrated invalid-proposal baseline:

epsilon_invalid ≈ 0.0515

Among hazard points with at least 500 episodes at risk, the largest observed hazards were approximately:

- 0.0529
- 0.0532
- 0.0536
- 0.0546
- 0.0557
- 0.0566
- 0.0588

No delayed wave comparable to the structured condition's approximately 8%–14.5% hazard region was observed.

---

## 5. Exploratory interpretation

The same approximate baseline false-admission frequency produced substantially different temporal escape profiles depending on proposer policy and error-region geometry.

Observed qualitative profiles were:

Structured + Random:

approximately constant hazard near 5%

Structured + Adaptive Binary/Score:

approximately 11% early hazard
→
rapid decay below baseline

Structured + Nonadaptive Utility Ranking:

approximately 0% early hazard
→
delayed high-risk wave above baseline

Unstructured + Nonadaptive Utility Ranking:

approximately baseline-level hazard without the structured delayed wave

These findings suggest that operational escape risk is not fully characterized by a single static false-admission rate.

A candidate explanatory structure is:

h_t = f(error geometry, search policy, feedback, interaction history)

rather than:

h_t = epsilon

---

## 6. Reachable-error-set hypothesis

The results motivate a new exploratory concept.

Let:

F = false-admission region

R_pi(t) = region effectively reachable by proposer policy pi by search time t

Then temporal governance risk may depend on the evolving intersection:

R_pi(t) ∩ F

Under this interpretation, a gate weakness can exist continuously while being:

- immediately reachable under one search policy,
- reached only after many queries under another,
- approximately randomly encountered under another,
- or effectively avoided by a particular search trajectory.

This may explain why matched gates with similar baseline false-admission frequency can produce different hazard trajectories.

---

## 7. Important limitations

These observations do not establish a general law.

The benchmark deliberately couples:

- a synthetic two-dimensional proposal space,
- a specific structured false-admission region,
- a specific task utility U(x) = x1 + x2,
- fixed proposer algorithms,
- fixed feedback schemes.

The delayed P2 hazard is therefore partly a consequence of the relationship between the utility-ranking rule and the location of the structured false-admission region.

Similarly, the decline in adaptive hazard may reflect some combination of:

- proposer dynamics,
- early removal of vulnerable episodes,
- survivor selection,
- movement of surviving search trajectories away from the false-admission region.

The first-run dataset contains episode-level summaries rather than full per-query trajectories, so these mechanisms cannot yet be cleanly separated.

---

## 8. New hypothesis for replication

A future preregistered experiment should test:

Holding baseline false-admission measure approximately constant, the temporal escape-hazard profile depends on the interaction between proposer policy and false-admission geometry.

Symbolically:

h_t(pi, F) != h_t(pi', F)

and:

h_t(pi, F_structured) != h_t(pi, F_unstructured)

The stronger theoretical target is to determine whether governance risk can be bounded using:

- false-admission measure,
- false-admission geometry,
- proposer search policy,
- feedback information,
- reachable proposal distribution,
- query budget.

---

## 9. Status

This document records exploratory findings only.

The original preregistered H4 result remains:

H4 not supported.

No exploratory result in this document is to be retroactively labeled confirmatory.