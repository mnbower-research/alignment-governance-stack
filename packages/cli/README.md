# AGS CLI

Dependency-light developer CLI for local Alignment Governance Stack evals, governance checks, and receipt verification.

```bash
corepack pnpm --filter @alignment-governance-stack/cli build
corepack pnpm --filter @alignment-governance-stack/cli ags help
corepack pnpm --filter @alignment-governance-stack/cli ags eval
```

The CLI does not execute governed actions. It runs deterministic local checks against workspace packages.

## Commands

- `ags help`
- `ags version`
- `ags eval`
- `ags govern <input.json>`
- `ags govern <input.json> --json`
- `ags receipt verify <receipt.json>`
- `ags receipt hash <receipt.json>`

See `docs/CLI.md` for examples and exit codes.
