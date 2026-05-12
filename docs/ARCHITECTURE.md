# Architecture

Alignment Governance Stack separates proposal maturation from execution approval and runtime authorization.

```text
User goal
-> Agent proposal
-> PGDL
-> Resolved proposal or escalation
-> AAG
-> Permit decision
-> Runtime Binding
-> Execution
-> Receipt / audit trail
```

## First End-to-End Spine

`governance-core` connects the first real AGS flow.

PGDL evaluates proposal maturity. Only proposals that PGDL forwards or resolves are sent to AAG.

AAG evaluates execution permission for the proposal it receives. It does not mature proposals and does not execute actions.

Runtime Binding and receipts are next in the enforcement and proof chain.

## Runtime-Bound Governance Flow

PGDL matures the proposal.

AAG decides whether the proposal may proceed.

If AAG allows, `governance-core` can issue a runtime permit for the exact proposal AAG allowed.

Runtime Binding verifies the exact runtime action against that permit. It prevents the original dangerous action from running when PGDL revised it into a safer proposal.

Receipts come next.
