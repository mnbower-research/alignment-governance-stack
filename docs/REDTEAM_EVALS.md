# Red-Team Evals

The Adversarial Red-Team Eval Pack is a deterministic hardening suite for AGS.

It exists to answer the next version of the wide-but-shallow critique: the stack must work not only on Golden Paths, but also when an agent, workflow, approval artifact, runtime action, receipt, or receipt history tries to bypass governance.

## What It Attacks

- PGDL: compliance theater, laundered email sends, disguised destructive work
- Policy Profiles and Hard Boundaries: archive wording, approval override attempts, source-data mutation
- Authority Map: forged, expired, and out-of-scope approvals
- Human Participation Quality: valid authority with rubber-stamped review
- AAG and Runtime Binding: tool substitution, target expansion, environment escalation
- Receipts: final-decision tampering
- Governance Memory: noisy histories with mixed safe and adversarial patterns

## Commands

```bash
corepack pnpm --filter @alignment-governance-stack/cli build
node packages/cli/dist/cli.js redteam
node packages/cli/dist/cli.js govern examples/redteam/scenarios/runtime-tool-substitution-after-allow.json
node packages/cli/dist/cli.js memory examples/redteam/receipts/noisy-receipt-history.json
```

## Boundaries

Red-team evals do not execute real actions, call networks, mutate files outside the examples, store data, or provide a hosted service. They are local regression cases for governance behavior.

## Governed Information Inheritance

`ags redteam` additionally runs twelve Context Admission scenarios: valid temporal relay, unknown source, expired/revoked artifacts, transformation laundering, cross-domain inheritance, prior-approval reuse, embedded authority instructions, circular lineage, invalid purpose, restricted low-risk reference use and inert malicious text. See [examples](../examples/context-admission/README.md).
