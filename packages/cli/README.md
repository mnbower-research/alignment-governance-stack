# AGS CLI

Dependency-light developer CLI for local Alignment Governance Stack evals, governance checks, and receipt verification.

```bash
corepack pnpm --filter @alignment-governance-stack/cli build
corepack pnpm --filter @alignment-governance-stack/cli ags help
corepack pnpm --filter @alignment-governance-stack/cli ags eval
corepack pnpm --filter @alignment-governance-stack/cli ags dogfood
```

The CLI does not execute governed actions. It runs deterministic local checks against workspace packages.

## Commands

- `ags help`
- `ags version`
- `ags eval`
- `ags dogfood`
- `ags govern <input.json>`
- `ags govern <input.json> --json`
- `ags memory <receipts.json>`
- `ags receipt verify <receipt.json>`
- `ags receipt hash <receipt.json>`

`ags dogfood` reports Internal Dogfood and Enterprise Golden Path counts.

See `docs/CLI.md` for examples and exit codes.
