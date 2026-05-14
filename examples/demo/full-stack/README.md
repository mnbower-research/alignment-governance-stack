# Full-Stack Demo

This demo uses the Developer CLI to exercise the v1.0.0 stack locally.

Build the CLI first:

```bash
corepack pnpm --filter @alignment-governance-stack/cli build
```

Run the built-in eval suite:

```bash
node packages/cli/dist/cli.js eval
```

Run a safe governance path:

```bash
node packages/cli/dist/cli.js govern examples/demo/full-stack/safe-internal-report.json
```

Run a Runtime Binding denial:

```bash
node packages/cli/dist/cli.js govern examples/demo/full-stack/runtime-substitution-denied.json
```

Run Governance Memory over a receipt-history fixture:

```bash
node packages/cli/dist/cli.js memory examples/demo/full-stack/receipt-history.json
```

Additional focused examples also live under `examples/cli` and `examples/integrations/n8n`.
