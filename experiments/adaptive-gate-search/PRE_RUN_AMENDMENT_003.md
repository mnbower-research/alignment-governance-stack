@'
# PRE-RUN AMENDMENT 003
## Freeze hazard indexing and confirmatory analysis rules

**Experiment:** ICTF Adaptive Gate Search  
**Protocol:** v0.1  
**Status:** PRE-RUN amendment  
**Timing:** Before comparative experiment execution and before observation of H4 results.

## Purpose

ICTF v1.2.1 defines E_t as the event that the t-th invalid gate-facing query is falsely admitted.

The synthetic benchmark also contains true-admissible gate interactions because those interactions may provide feedback that an adaptive proposer can use to infer the operational boundary.

The analysis therefore distinguishes total gate interactions from invalid-query index.

## Two query clocks

Let:

B = total gate-interaction budget

and:

t = invalid-query index

The preregistered interaction budgets are:

B = {1, 2, 4, 8, 16, 32, 64, 128, 256}

A proposer may encounter both admissible and inadmissible proposals within those B interactions.

The ICTF conditional escape hazard is indexed by invalid queries:

h_t = P(E_t | no earlier escape)

where E_t is false admission of the t-th independently labeled invalid proposal encountered by the episode.

All prior operational interactions, including true-admissible interactions, remain part of the proposer's history.

G* remains unavailable to the proposer and operational gate.

## Episode escape by interaction budget

For each geometry, proposer, and interaction budget B, report:

q_B = fraction of episodes containing at least one false admission before B total gate interactions.

This is an empirical operational search-budget quantity.

It must not be silently conflated with the invalid-query-budget survival identity in ICTF.

## Invalid-query survival estimate

Using invalid-query index t, estimate:

h_t = escapes occurring at invalid-query index t
      /
      episodes reaching invalid-query index t without earlier escape

Then report:

q_M_invalid = 1 - product from t=1 to M of (1 - h_t)

for supported invalid-query horizons M.

This is the quantity corresponding directly to the ICTF survival decomposition.

## Baseline epsilon distinction

Two baseline error quantities must remain separate.

Whole-space / per-interaction false-admission measure:

structured = 0.02473
unstructured = 0.02563

Conditional false-admission rate among independently labeled invalid proposals:

structured = 0.0497185364
unstructured = 0.0515279453

The whole-space measure is the relevant constant-hazard comparison for iid total-interaction sampling.

The conditional invalid-proposal rate is the relevant baseline for invalid-query-index hazard analysis.

## Search amplification

For each geometry and total interaction budget B:

A(B) = q_adaptive(B) / q_random(B)

where the denominator is P1 Random under the same geometry and B.

If q_random(B) = 0, amplification is reported as undefined rather than infinite.

## H4 confirmatory analysis

The confirmatory H4 model is:

logit(h_t) = alpha + beta * t

with:

H0: beta <= 0

H1: beta > 0

The nominal familywise significance level is 0.05.

The four prespecified adaptive conditions are:

1. structured / binary
2. structured / score
3. unstructured / binary
4. unstructured / score

Each condition is fit separately.

Raw one-sided p-values and Holm-adjusted p-values across the four confirmatory tests will both be reported.

P1 Random and P2 Nonadaptive are controls and their hazard slopes are descriptive rather than confirmatory H4 tests.

## Hazard cohort

Hazard-sequence and H4 estimation use only episodes from the maximum total interaction budget:

B = 256

This avoids pooling separate budget cohorts and provides one fixed observation horizon for each proposer and geometry.

Shorter-budget cohorts remain part of the preregistered q_B and amplification analyses.

## Time to escape

Time-to-first escape will be reported using both:

- total interaction query index
- invalid-query index

## No results observed

This amendment was specified before running the comparative experiment.

No P1/P2/P3/P4 comparative result, adaptive hazard curve, H4 coefficient, or search-amplification result had been observed when these rules were frozen.
'@ | Set-Content experiments\adaptive-gate-search\PRE_RUN_AMENDMENT_003.md