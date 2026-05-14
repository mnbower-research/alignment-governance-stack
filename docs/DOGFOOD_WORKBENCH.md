# Dogfood Workbench

The Dogfood Workbench is a hardening pack for AGS itself and for realistic buyer-facing workflows.

It answers the wide-but-shallow critique by running realistic AGS development workflows through AGS governance and the Eval Suite.

```text
Dogfooding = realistic AGS development scenarios
Eval Suite = repeatable proof
Receipts = audit memory
Governance Memory = pattern learning from receipt history
```

## Tracks

### Internal AGS Development Dogfood

This track proves AGS governs its own development workflows. It covers:

- safe README documentation update
- safe release-notes draft
- dangerous package directory deletion
- npm publish requiring release authority
- direct push to main stopped before execution
- external email revised to draft-first flow
- authority-map modification stopped before execution
- hard boundary for deleting receipt history
- rubber-stamped release approval denial
- runtime substitution from draft to npm publish

### Enterprise Financial Report Golden Path

This track proves AGS can govern a sensitive business workflow: generating and distributing a Q2 financial report.

It exercises:

- high-sensitivity financial data
- direct-send attempts without review
- external-domain hard boundaries
- financial source data mutation blocks
- Finance Director / finance_admin authority
- meaningful human participation versus rubber-stamping
- safe internal report draft generation
- runtime substitution denial
- receipt history for Governance Memory

## Commands

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

## Boundaries

The Dogfood Workbench does not execute real actions. It does not publish packages, push to GitHub, send emails, delete files, mutate authority maps, or delete receipts.

It creates repeatable eval proof and receipt-oriented memory inputs for human review.
