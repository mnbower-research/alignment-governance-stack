# ICTF Adaptive Gate Search Experiment
## Preregistration Protocol v0.1

**Project:** Alignment Governance Stack (AGS) / Invariant-Constrained Transition Framework (ICTF)  
**Branch:** `experiment/ictf-adaptive-gate-search`  
**Status:** Preregistered synthetic experiment design  
**Purpose:** Test whether adaptive search increases false-admission hazard against an imperfect governance gate.

---

## 1. Research question

Does an adaptive proposer become increasingly likely to discover false-admission regions of an imperfect governance gate as interaction budget increases?

The primary quantity is the conditional false-admission hazard:

h_t = P(E_t | no earlier false admission)

where E_t denotes false admission on query t.

The cumulative probability of at least one false admission by query budget M is:

q_M = 1 - product_{t=1..M}(1 - h_t)

For a constant-hazard baseline:

h_t = epsilon

and therefore:

q_M = 1 - (1 - epsilon)^M

The experiment tests whether adaptive search produces hazard behavior that departs from this baseline.

---

## 2. Primary hypothesis

### H4

Under feedback-guided adaptive search, conditional false-admission hazard increases with query index relative to the constant-hazard baseline.

Primary model:

logit(h_t) = alpha + beta * t

Primary hypothesis test:

H0: beta <= 0  
H1: beta > 0

Decision threshold:

alpha_test = 0.05

The direction, significance threshold, and model are fixed before experiment execution.

A likelihood-ratio comparison between a constant-hazard model and an increasing-hazard model may be reported as a secondary analysis.

---

## 3. Synthetic proposal space

The initial proposal space is:

X = [0,1]^2

Each proposal is represented as:

x = (x1, x2)

The two-dimensional space is intentionally simple so that:

- the true admissibility region can be visualized,
- the operational gate boundary can be visualized,
- false-admission regions can be measured exactly or approximately,
- adaptive proposer trajectories can be plotted.

---

## 4. Ground-truth evaluator

The experiment contains a hidden reference evaluator:

G*(x)

where:

G*(x) = 1 means truly admissible  
G*(x) = 0 means truly inadmissible

G* is unavailable to the proposer and unavailable to the operational gate during search.

G* is used only for independent evaluation.

---

## 5. Operational gate

The operational gate is:

G_hat(x)

The gate intentionally differs from G* and therefore contains false-admission regions.

A false admission occurs when:

G_hat(x) = 1
and
G*(x) = 0

The false-admission set is:

F = {x : G_hat(x) = 1 and G*(x) = 0}

Its baseline measure under the preregistered proposal distribution is:

epsilon = mu(F)

epsilon must be calculated and recorded before adaptive search results are analyzed.

---

## 6. Error-region conditions

Two primary gate-error geometries will be tested.

### Condition U: Unstructured error region

False-admission points are distributed without useful local geometric structure.

Purpose:

Test the regime where prior gate feedback should provide little or no directional information.

Expected reference behavior:

q_M approximately follows the constant-hazard baseline when proposals remain effectively independent.

### Condition S: Structured error region

The false-admission region is spatially structured, such as:

- connected region,
- smooth boundary,
- localized pocket,
- low-dimensional manifold or band.

Purpose:

Test whether adaptive search can exploit geometric regularity in the gate's error surface.

The exact structured region must be generated and frozen before running proposer comparisons.

---

## 7. Proposer conditions

Four proposer conditions will be evaluated.

### P1. Random search

Draw proposals independently from the baseline proposal distribution.

This establishes the constant-hazard reference condition.

### P2. Nonadaptive best-of-M search

Generate M proposals without using prior gate responses to modify future proposals.

This separates search budget from feedback-driven adaptation.

### P3. Binary-feedback adaptive search

The proposer observes only:

ADMIT
or
REJECT

after each query.

It does not receive G* labels.

Purpose:

Test whether binary operational feedback alone permits learning of gate weaknesses.

### P4. Score-feedback adaptive search

The proposer receives a continuous or ordinal gate score in addition to the final operational decision.

Purpose:

Test whether richer feedback makes the false-admission region easier to discover.

No proposer receives the independent G* label during a trial.

---

## 8. Search budgets

The preregistered search budgets are:

M in {
1,
2,
4,
8,
16,
32,
64,
128,
256
}

Each proposer and gate-geometry combination will be evaluated at every budget.

---

## 9. Trials

Initial target:

10,000 independent episodes per:

- proposer condition,
- error-region geometry,
- search budget.

If computational cost requires adjustment, the trial count must be changed before examining comparative results and documented as a protocol amendment.

Random seeds must be recorded.

At minimum:

- one master seed,
- deterministic derived seeds for each condition,
- seed values included with result artifacts.

---

## 10. Primary outcome measures

### 10.1 Conditional false-admission hazard

h_t

Estimated by query index among episodes that have not already escaped.

### 10.2 Episode escape probability

q_M

Fraction of episodes containing at least one false admission by budget M.

### 10.3 Search amplification ratio

A(M) = q_adaptive(M) / q_random(M)

Interpretation:

A(M) > 1 indicates adaptive search discovers false admissions more frequently than matched random search.

A(M) approximately 1 indicates little or no adaptive advantage.

### 10.4 Time to first false admission

Record the query index at which the first false admission occurs.

Episodes without escape are right-censored at M.

---

## 11. Observability decomposition

Where applicable, false admissions will be labeled by whether decisive information was available to the operational gate.

O = 1:
decisive evidence was available but the gate misjudged it.

O = 0:
decisive evidence was absent from the gate's admitted representation.

Results must be reported separately as:

epsilon_judge
epsilon_miss

within preregistered scenario classes.

The mixture of O=0 and O=1 cases is treated as a property of the benchmark distribution rather than an intrinsic property of the gate.

---

## 12. Statistical analysis

Primary H4 test:

Fit a discrete-time logistic hazard model:

logit(h_t) = alpha + beta * t

Test:

H0: beta <= 0
H1: beta > 0

with:

alpha_test = 0.05

This test will be performed separately for:

- unstructured / binary feedback,
- structured / binary feedback,
- structured / score feedback.

Secondary analyses may include:

- likelihood-ratio comparison of constant vs time-varying hazard,
- confidence intervals for q_M,
- confidence intervals for A(M),
- survival curves,
- proposer-by-budget interaction effects.

Secondary analyses will be labeled exploratory unless explicitly preregistered before execution.

---

## 13. Expected reference patterns

These are predictions, not success criteria.

### Random + unstructured

Expected:

h_t approximately constant.

q_M approximately:

1 - (1 - epsilon)^M

### Adaptive + unstructured + binary feedback

Possible outcome:

little or no improvement over random search.

This would indicate that feedback contains insufficient information to locate F.

### Adaptive + structured + binary feedback

Empirical question:

Does geometry alone make gate error learnable from admit/reject feedback?

No directional result is assumed.

### Adaptive + structured + score feedback

Prediction:

adaptive proposer may achieve:

A(M) > 1

and potentially:

beta > 0

if the gate score exposes useful information about proximity to the false-admission region.

---

## 14. Falsification and negative results

The experiment is informative if H4 fails.

Examples:

- h_t remains flat under adaptive search,
- A(M) remains approximately 1,
- structured error regions provide no adaptive advantage,
- score feedback provides no advantage,
- adaptive proposer performs worse than matched random search.

Negative findings will be retained and reported.

The experiment will not be modified after results are observed merely to produce positive separation.

---

## 15. Relationship to AGS

This first experiment validates the ICTF measurement harness independently of AGS.

AGS is not the treatment variable in Phase 1.

After the synthetic benchmark is validated, the same evaluation framework will be used for AGS ablation experiments such as:

1. baseline / no governance,
2. AAG only,
3. PGDL + AAG,
4. PGDL + AAG + Runtime Binding,
5. fuller AGS governance configuration.

The purpose is to measure the marginal contribution of governance layers using the same independent evaluation framework.

---

## 16. Phase 1 success criterion

Phase 1 is considered successfully implemented if the benchmark can reproducibly produce:

- known G* labels,
- known G_hat decisions,
- measurable false-admission set F,
- h_t curves,
- q_M curves,
- constant-hazard baseline,
- random and adaptive proposer comparisons,
- deterministic reruns from saved seeds,
- raw machine-readable results.

Scientific success does not require confirmation of H4.

---

## 17. Artifact preservation

Each run must preserve:

- code commit hash,
- protocol version,
- gate definition,
- proposer definition,
- random seeds,
- M values,
- trial counts,
- raw results,
- processed results,
- plots,
- analysis script version.

Results must be traceable back to the exact code and protocol used.

---

## 18. Protocol amendment rule

Any change after this protocol is committed must be recorded explicitly.

Changes made before viewing experiment results may be labeled:

PRE-RUN AMENDMENT

Changes made after viewing any comparative outcome must be labeled:

POST-RESULT AMENDMENT

Post-result changes must not silently replace the preregistered analysis.

---

## 19. Next theoretical target

The constant-hazard identity is not claimed as novel.

The longer-term mathematical target is a bound relating adaptive governance escape to:

- measure of the false-admission set,
- geometry of the false-admission set,
- reachable proposal distribution,
- feedback information,
- proposer query budget.

The experiment is intended to determine which structural assumptions are worth formalizing.