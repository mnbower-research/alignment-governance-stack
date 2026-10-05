# PRE-RUN AMENDMENT 001
## Match baseline false-admission rates across gate geometries

**Experiment:** ICTF Adaptive Gate Search  
**Protocol:** v0.1  
**Status:** PRE-RUN amendment  
**Reason:** Calibration before adaptive proposer implementation or comparative experiment execution.

## Change

The default `invalid_cell_escape_rate` for the unstructured gate was changed:

From:

0.02

To:

0.05

## Rationale

Initial preregistration calibration with:

- N = 100,000
- master calibration seed = 12345
- baseline proposal distribution = Uniform([0,1]^2)

produced:

Structured gate:

- whole-space false-admission measure = 0.02473
- conditional false-admission rate among invalid proposals = 0.0497185364

Unstructured gate:

- whole-space false-admission measure = 0.01024
- conditional false-admission rate among invalid proposals = 0.0205870527

The original gate conditions therefore differed substantially in baseline false-admission rate.

Because the primary comparison concerns whether adaptive search exploits **error-region structure**, baseline gate weakness should be approximately matched.

After changing the unstructured gate parameter to 0.05, the same calibration procedure produced:

Structured gate:

- whole-space false-admission measure = 0.02473
- conditional false-admission rate among invalid proposals = 0.0497185364

Unstructured gate:

- whole-space false-admission measure = 0.02563
- conditional false-admission rate among invalid proposals = 0.0515279453

The two conditions are therefore approximately matched in baseline false-admission frequency while retaining different error geometry.

## Timing

This amendment was made:

- before implementation of adaptive proposers,
- before comparative H4 experiment execution,
- before viewing adaptive-search outcome curves.

No H4 result existed when this amendment was made.

## Interpretation

The experimental contrast is now intended to approximate:

same baseline false-admission rate
+
different spatial/error structure

rather than:

different baseline false-admission rate
+
different structure.
