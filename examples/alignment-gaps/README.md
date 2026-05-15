# Alignment Gap Detector Examples

These examples are CLI-ready inputs for the v1.3.0 Alignment Gap Detector / Policy Conflict Analyzer.

Build the CLI first:

```bash
corepack pnpm --filter @alignment-governance-stack/cli build
```

Run a coherent profile:

```bash
node packages/cli/dist/cli.js gaps examples/alignment-gaps/coherent-company-profile.json
```

Run a conflicting profile:

```bash
node packages/cli/dist/cli.js gaps examples/alignment-gaps/conflicting-financial-governance.json
node packages/cli/dist/cli.js gaps examples/alignment-gaps/conflicting-financial-governance.json --json
```

The detector does not mutate policy profiles, authority maps, or participation policies. It produces a human-reviewable report so company governance can be corrected before agents amplify the conflict.
