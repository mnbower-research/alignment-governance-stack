# AGS Red-Team Workbench

The Red-Team Workbench contains adversarial governance inputs that try to bypass or confuse AGS.

It attacks:

- PGDL proposal maturation
- Policy Profiles and Hard Boundaries
- Authority Map approval validation
- Human Participation Quality
- AAG
- Runtime Binding
- Receipts
- Governance Memory

Run the eval pack:

```bash
corepack pnpm --filter @alignment-governance-stack/cli build
node packages/cli/dist/cli.js redteam
```

Run individual examples:

```bash
node packages/cli/dist/cli.js govern examples/redteam/scenarios/runtime-tool-substitution-after-allow.json
node packages/cli/dist/cli.js memory examples/redteam/receipts/noisy-receipt-history.json
node packages/cli/dist/cli.js receipt verify examples/redteam/receipts/tampered-receipt.json
```

These examples do not execute real actions. They are deterministic local governance and receipt-memory inputs.
