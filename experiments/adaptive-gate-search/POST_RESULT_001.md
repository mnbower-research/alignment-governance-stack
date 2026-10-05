# POST-RESULT 001
## First ICTF Adaptive Gate Search Result

**Experiment:** ICTF Adaptive Gate Search  
**Protocol:** v0.1  
**Status:** POST-RESULT record  
**Dataset:** First preregistered comparative run  
**Episodes:** 720,000

## Confirmatory H4 result

The preregistered confirmatory hypothesis was:

H0: beta <= 0

H1: beta > 0

under:

logit(h_t) = alpha + beta * t

where t is independently labeled invalid-query index.

Results:

- structured / binary:
  beta = -0.0267992297
  one-sided p = 1.0
  Holm p = 1.0
  reject H0 = False

- structured / score:
  beta = -0.0241509567
  one-sided p = 1.0
  Holm p = 1.0
  reject H0 = False

- unstructured / binary:
  beta = -0.0008235596
  one-sided p = 0.9309269514
  Holm p = 1.0
  reject H0 = False

- unstructured / score:
  beta = -0.0080162950
  one-sided p = 1.0
  Holm p = 1.0
  reject H0 = False

H4 was therefore not supported under the preregistered proposer models.

No confirmatory adaptive condition produced a positive hazard slope.

## Random-baseline sanity check

At interaction budget B = 256:

Structured:

- random empirical q_B = 0.9986
- matched constant-hazard prediction approximately 0.99836

Unstructured:

- random empirical q_B = 0.9987
- matched constant-hazard prediction approximately 0.99870

The iid random condition therefore closely tracked the calibrated constant-hazard baseline.

## Descriptive adaptive-search findings

Although H4 was not supported, adaptive search changed cumulative escape trajectories.

### Structured gate

Binary amplification relative to random:

- B=1: 1.058
- B=8: 1.044
- B=16: 1.083
- B=32: 0.872
- B=256: 0.788

Score-feedback amplification relative to random:

- B=1: 1.192
- B=2: 1.150
- B=4: 1.347
- B=8: 1.419
- B=16: 1.199
- B=32: 0.842
- B=256: 0.763

Structured score feedback therefore produced substantial short-horizon escape amplification, peaking near 1.42x at B=8, before reversing relative to random search at longer horizons.

### Unstructured gate

Binary and score-feedback conditions generally underperformed random search at small budgets and approached approximately random cumulative escape at larger budgets.

At B=256:

- random q_B = 0.9987
- binary q_B = 0.9998
- score q_B = 0.9939

## Initial interpretation

The preregistered monotonic-increasing-hazard formulation of H4 was not supported.

However, the results indicate that adaptive search can alter escape trajectories in ways that depend on:

- error-region geometry
- feedback type
- proposer search policy
- interaction horizon

The first-run evidence is therefore more consistent with a history-dependent but non-monotonic adaptive-risk model than with a universal positive hazard slope.

This interpretation is descriptive and post-result.

It must not be substituted for the preregistered H4 test.

## Next steps

Any further investigation of:

- survivor-selection effects
- hazard-curve shape
- uncertainty intervals
- alternative functional forms
- proposer dynamics
- geometry-feedback interaction

will be labeled exploratory or preregistered as a new experiment.

The frozen first-run data and confirmatory analysis will not be altered.
