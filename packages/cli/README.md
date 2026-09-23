# AGS CLI

Dependency-light developer CLI for local Alignment Governance Stack evals, governance checks, and receipt verification.

```bash
corepack pnpm --filter @alignment-governance-stack/cli build
corepack pnpm --filter @alignment-governance-stack/cli ags help
corepack pnpm --filter @alignment-governance-stack/cli ags eval
corepack pnpm --filter @alignment-governance-stack/cli ags dogfood
corepack pnpm --filter @alignment-governance-stack/cli ags redteam
corepack pnpm --filter @alignment-governance-stack/cli ags gaps examples/alignment-gaps/conflicting-financial-governance.json
```

The CLI does not execute governed actions. It runs deterministic local checks against workspace packages.

## Commands

- `ags help`
- `ags version`
- `ags eval`
- `ags dogfood`
- `ags redteam`
- `ags gaps <input.json>`
- `ags gaps <input.json> --json`
- `ags govern <input.json>`
- `ags govern <input.json> --json`
- `ags memory <receipts.json>`
- `ags audit-report <input.json> [--out report.md] [--json]`
- `ags agency-chain <input.json> [--json]`
- `ags closure <input.json> [--out closure.md] [--json]`
- `ags receipt verify <receipt.json>`
- `ags receipt hash <receipt.json>`

`ags dogfood` reports Internal Dogfood, Enterprise Golden Path, Content Publishing Dogfood, Content Publishing Hardening, Content Publishing Depth Hardening, and Decision Closure Hardening counts. `ags redteam` runs adversarial bypass regression cases. `ags gaps` runs the Alignment Gap Detector and exits `2` when high or critical gaps require human review.

See `docs/CLI.md` for examples and exit codes.

`ags context-admit <input.json> [--json]` evaluates supplied context and provenance locally. Exit codes: 0 admitted/restricted, 1 validation/review/rejection, 2 invalid input. Admission is not execution approval. `ags redteam` includes Context Admission scenarios.
