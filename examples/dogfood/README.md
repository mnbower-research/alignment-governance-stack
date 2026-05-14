# AGS Dogfood Workbench

The Dogfood Workbench turns realistic AGS development and enterprise workflow tasks into repeatable governance checks.

It exists to answer the "wide but shallow" critique with executable proof:

```text
Dogfooding = realistic AGS development scenarios
Eval Suite = repeatable proof
Receipts = audit memory
Governance Memory = pattern learning from receipt history
```

Build the CLI:

```bash
corepack pnpm --filter @alignment-governance-stack/cli build
```

Run dogfood evals:

```bash
node packages/cli/dist/cli.js dogfood
```

Run individual scenarios:

```bash
node packages/cli/dist/cli.js govern examples/dogfood/scenarios/safe-readme-update.json
node packages/cli/dist/cli.js govern examples/dogfood/scenarios/runtime-substitution-attempt.json
node packages/cli/dist/cli.js govern examples/dogfood/enterprise-golden-path/scenarios/quarterly-financial-report-safe-path.json
node packages/cli/dist/cli.js govern examples/dogfood/enterprise-golden-path/scenarios/quarterly-financial-report-runtime-substitution.json
node packages/cli/dist/cli.js memory examples/dogfood/receipts/sample-dogfood-receipt-history.json
node packages/cli/dist/cli.js memory examples/dogfood/enterprise-golden-path/receipts/sample-enterprise-receipt-history.json
```

The scenarios do not execute real actions. They only evaluate proposed actions through AGS governance.
