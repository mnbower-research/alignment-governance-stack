# ICTF Adaptive Gate Search — Replication Result 001

Status: Completed replication
Date: 2026-10-05

## Configuration

This replication used the frozen apparatus from:

ictf-adaptive-gate-search-apparatus-v0.1

Replication plan:

REPLICATION_PLAN_001.md

Master seed:

20261005

Episodes:

720,000

No gate definitions, proposer algorithms, task utility, budgets, hazard semantics, analysis code, or confirmatory procedures were changed.

## Confirmatory result

The preregistered H4 positive hazard-slope hypothesis remained unsupported.

Estimated slopes:

- structured + binary: beta = -0.0257938626, Holm-adjusted p = 1.0
- structured + score: beta = -0.0244191057, Holm-adjusted p = 1.0
- unstructured + binary: beta = 0.0002625190, Holm-adjusted p = 1.0
- unstructured + score: beta = -0.0084928302, Holm-adjusted p = 1.0

No confirmatory adaptive condition rejected the null in favor of a positive hazard slope.

## Exploratory replication observations

The major post-result temporal patterns from the first run qualitatively reproduced.

### Structured adaptive search

Both binary- and score-feedback proposers again showed:

- elevated early invalid-query hazard
- rapid decline
- low persistent tail

Structured score replication examples:

- t1 = 0.1075
- t2 = 0.1146
- t3 = 0.0912
- t10 = 0.0177
- t20 = 0.0080
- t30 = 0.0068

Structured binary replication examples:

- t1 = 0.1034
- t2 = 0.1096
- t3 = 0.0966
- t10 = 0.0160
- t20 = 0.0106
- t30 = 0.0086

### Structured nonadaptive utility-ranked search

The delayed high-hazard wave reproduced around invalid-query indices approximately 94–113.

Examples:

- t94 = 0.0830
- t100 = 0.1003
- t106 = 0.1306
- t110 = 0.1484
- t111 = 0.1480
- t113 = 0.1415

### Unstructured nonadaptive search

No comparable delayed high-hazard wave appeared.

The largest observed hazards with at_risk >= 500 remained near the calibrated conditional baseline, generally around 0.05–0.06.

### Cumulative search amplification

The structured score-feedback condition again showed short-horizon amplification followed by long-horizon reversal.

Examples:

- B=8: amplification = 1.3770
- B=16: amplification = 1.2135
- B=32: amplification = 0.8999
- B=64: amplification = 0.6926
- B=128: amplification = 0.6700
- B=256: amplification = 0.7541

The original run showed the same qualitative shape.

## Interpretation

Within this fixed synthetic benchmark, the first-run exploratory finding appears robust to a new deterministic master seed.

The results continue to support the research hypothesis that temporal governance risk depends on the interaction among:

- search policy
- feedback
- false-admission geometry
- temporal reachability

This replication does not convert the original exploratory finding into a preregistered confirmatory result.

The original H4 positive-slope prediction remains unsupported.

This replication does not evaluate AGS.

## Next step

The next benchmark should record full per-query traces so policy movement, pre-invalid learning, and survivor-selection effects can be separated more directly.
