# Agent Action Governance

Initial scaffold for a TypeScript monorepo that separates proposal maturation from execution approval for agentic AI systems.

## What PGDL Is

PGDL means Pre-Gate Deliberation Layer.

PGDL runs before AAG and asks:

> What kind of action should be proposed in the first place?

PGDL matures an agent proposal through objection, compliance theater detection, internalized principle extraction, safer revision, and discernment resolution. PGDL does not execute actions and does not approve execution.

## What AAG Is

AAG means Agent Action Gate.

AAG is the execution gate and asks:

> Should this action be allowed before execution?

AAG evaluates authority, scope, reversibility, approval, sensitive data exposure, wrong target risk, tool mismatch, objective drift, runtime safety, and receipt requirements.

## Why PGDL Comes Before AAG

PGDL improves the proposal before it reaches the execution gate. AAG then evaluates whether the proposed action should be allowed, revised, approved by a human, or blocked.

Proposal maturation is not execution approval. PGDL may forward, revise, escalate, or reject a proposal before AAG. AAG remains the hard execution gate.

## Installation

```bash
pnpm install
pnpm build
pnpm test
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

Scaffold only. The repository contains minimal placeholder implementations, clean exports, test stubs, and TODO comments where real governance logic belongs. No UI, database, auth, LLM provider, or production business logic is included yet.
