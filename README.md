# Alignment Governance Stack

Alignment Governance Stack is a full-stack governance architecture for agentic AI systems. It preserves human agency across the action lifecycle by separating proposal maturation, organization policy, execution gating, runtime authorization, and proof.

Core thesis:

```text
Proposal must not outrun objection.
Action must not outrun discernment.
```

## Current Stack

```text
Company Alignment Profile Generator
↓
Policy Profile with Hard Boundaries
↓
PGDL
↓
Policy Resolution
↓
AAG
↓
Runtime Binding
↓
Receipt
```

- Company Alignment Profile Generator turns structured company roles, tools, environments, data classes, and decision boundaries into draft Policy Profiles.
- Policy Profiles define organization-specific governance rules.
- Hard Boundaries enforce explicit "never automate" rules before actions reach AAG.
- PGDL matures agent proposals before execution gating.
- Policy Resolution applies organization-specific rules to the proposal that PGDL intends to send to AAG.
- AAG evaluates whether a proposed action should be allowed before execution.
- Runtime Binding verifies the exact runtime action matches the permitted action.
- Receipts preserve tamper-evident proof of the governance path.

## Current Features

- Deterministic PGDL proposal maturation
- Canonical Agent Action Gate integration
- Governance Core orchestration
- Runtime Binding exact-action permit validation
- Tamper-evident governance receipts
- Policy Profiles with deterministic policy resolution
- Company Alignment Profile Generator
- Hard Boundary Policy Compiler for explicit `neverAutomate` rules

## Package Map

- `@alignment-governance-stack/shared-types`: shared TypeScript types for proposals, decisions, risk, packets, and receipts.
- `@alignment-governance-stack/pgdl-core`: deterministic Pre-Gate Deliberation Layer proposal maturation.
- `@alignment-governance-stack/aag-core`: canonical Agent Action Gate integration.
- `@alignment-governance-stack/runtime-binding`: exact-action permit creation and runtime validation.
- `@alignment-governance-stack/governance-core`: orchestration for PGDL, optional policy resolution, AAG, Runtime Binding, and receipts.
- `@alignment-governance-stack/receipts`: tamper-evident governance receipts and stable receipt hashing.
- `@alignment-governance-stack/policy-profiles`: organization-specific governance rules, hard boundaries, and deterministic policy resolution.
- `@alignment-governance-stack/company-profile-generator`: deterministic draft PolicyProfile generation from structured company governance inputs.

## Basic Commands

```bash
corepack pnpm install
corepack pnpm -r build
corepack pnpm -r test
corepack pnpm -r typecheck
corepack pnpm audit --audit-level moderate
corepack pnpm -r exec npm pack --dry-run
```

## Boundaries

- PGDL does not execute actions.
- AAG does not mature proposals.
- Runtime Binding does not decide wisdom or policy.
- Receipts do not execute or approve actions.
- Policy Profiles do not replace PGDL or AAG.
- Hard Boundaries stop explicit organization-defined "never automate" actions before AAG.
- The Company Alignment Profile Generator creates draft Policy Profiles, not legal or compliance guarantees.

## Current Status

Current version: v0.4.0

The core AGS spine is working:

```text
Company Alignment Profile Generator → Policy Profile with Hard Boundaries → PGDL → Policy Resolution → AAG → Runtime Binding → Receipt
```

No UI, database, auth, dashboard, LLM ingestion, SOP parser, or persistent storage is included yet.

