# Eval Suite

The AGS Eval Suite is a deterministic cross-stack evaluation layer.

It asks:

> Does AGS stop, revise, escalate, bind, and prove the right things across the whole governance chain?

## v0.7.0 Foundation

`@alignment-governance-stack/eval-suite` provides:

- `AgsEvalCase`
- `AgsEvalExpected`
- `AgsEvalResult`
- `AgsEvalSuiteResult`
- `builtInEvalCases`
- `runEvalCase`
- `runEvalSuite`
- `summarizeEvalResults`

Each eval runs through `governance-core` with receipts enabled, verifies the governance receipt, and compares actual outcomes against expected decisions.

## Categories

Built-in eval categories include:

- safe path
- PGDL revision
- policy block
- authority failure
- participation failure
- AAG block
- runtime binding failure
- receipt integrity
- invalid policy

## Built-In Cases

The v0.7.0 built-ins cover safe internal reporting, destructive delete revision, hard boundary blocking, missing authority approval, out-of-scope approval, rubber-stamp approval, runtime tool substitution, high-sensitivity external send maturation, invalid policy handling, and receipt tamper verification in tests.

## Running

Run the package tests:

```bash
corepack pnpm --filter @alignment-governance-stack/eval-suite test
```

Or run the full workspace:

```bash
corepack pnpm -r test
```

## Future Work

Future versions can add a dependency-free CLI, dashboard views, regression history, fixture loading from JSON, and a larger real-world scenario library.


## Context Admission evals

`runContextAdmissionEvalSuite` and `ags redteam` cover twelve deterministic inheritance scenarios, including all ten adversarial/temporal scenarios and two positive controls. See [example catalog](../examples/context-admission/README.md).
