# Evals

Evaluation fixtures describe deterministic governance scenarios for AGS.

- `fixtures/pgdl`: proposal maturation fixtures.
- `fixtures/aag`: execution gate fixtures.
- `fixtures/full-stack`: cross-stack scenarios for PGDL, Policy Profiles, Hard Boundaries, Authority Map, Human Participation Quality, AAG, Runtime Binding, and Receipts.

The executable v0.7.0 eval suite lives in `@alignment-governance-stack/eval-suite`. The JSON fixtures are readable scenario artifacts for review and future fixture loading.

Context Admission expectations live in [fixtures/context-admission](fixtures/context-admission). Inputs are canonical [context-admission examples](../examples/context-admission/README.md). Run them through `ags redteam` or `runContextAdmissionEvalSuite`. Positive controls prevent treating low-risk reference use or quoted hostile text as automatic execution authority.
