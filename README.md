# Alignment Governance Stack

Alignment Governance Stack is a TypeScript monorepo scaffold for agentic AI governance. It separates proposal maturation, execution gating, runtime authorization, receipts, docs, examples, and evaluation fixtures into clear package boundaries.

Core thesis:

```text
Proposal must not outrun objection.
Action must not outrun discernment.
```

## Architecture Flow

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

## PGDL

PGDL means Pre-Gate Deliberation Layer.

PGDL runs before AAG and asks:

> What kind of action should be proposed in the first place?

PGDL matures an agent proposal through objection, compliance theater detection, internalized principle extraction, safer revision, and discernment resolution. PGDL v0.1 does this with deterministic rule-based packet generation. PGDL does not execute actions and does not approve execution.

## AAG

AAG means Agent Action Gate.

AAG is the hard execution gate and asks:

> Should this action be allowed before execution?

AAG evaluates authority, scope, reversibility, approval, sensitive data exposure, wrong target risk, tool mismatch, objective drift, runtime safety, and receipt requirements. `aag-core` is adapted from the existing Agent Action Gate implementation.

## Runtime Binding

Runtime Binding validates that the exact action being executed matches a valid permit. It is intended to prevent approved proposal drift, tool substitution, target substitution, scope expansion, stale approvals, and execution without a valid permit.

## Receipts

Receipts preserve proof after decisions. They should eventually capture what was proposed, what objections were raised, what changed, who approved it, what was allowed or blocked, what action actually ran, and whether runtime execution matched the permit.

## Proposal Maturation vs Execution Approval

Proposal maturation happens in PGDL before the execution gate. PGDL may forward, revise, escalate, or reject a proposal before AAG.

Execution approval happens in AAG. AAG decides whether a proposed action should be allowed, require approval, be revised, or be blocked before execution.

## Commands

```bash
corepack pnpm install
corepack pnpm -r build
corepack pnpm -r test
```

## Package Map

- `packages/shared-types`: shared TypeScript types for proposals, decisions, risk, packets, and receipts.
- `packages/pgdl-core`: Pre-Gate Deliberation Layer scaffold.
- `packages/aag-core`: Agent Action Gate scaffold.
- `packages/runtime-binding`: permit creation and runtime validation scaffold.
- `examples/pgdl-to-aag`: example inputs and a placeholder pipeline runner.
- `docs`: architecture notes and component documentation.
- `evals`: fixture directory for future evaluation cases.

## Current Status

Scaffold only. The repository contains minimal placeholder implementations, clean exports, test stubs, and TODO comments where real governance logic belongs.

No UI, database, auth, dashboard, LLM provider, or production business logic is included yet. PGDL is described only as a proposal maturation, objection, and discernment layer, not as a conscious, sentient, alive, or self-aware system.
