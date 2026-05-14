# Alignment Governance Stack

Alignment Governance Stack is a full-stack governance architecture for agentic AI systems. It preserves human agency across the action lifecycle by separating company policy, authority validation, human participation quality, proposal maturation, execution gating, runtime authorization, and proof.

Core thesis:

```text
Proposal must not outrun objection.
Action must not outrun discernment.
```

## Current Stack

```text
Company Alignment Profile Generator
-> Policy Profile with Hard Boundaries
-> Authority Map / Approval Validation
-> Human Participation Quality
-> PGDL
-> Policy Resolution
-> AAG
-> Runtime Binding
-> Receipt
```

- Company Alignment Profile Generator turns structured company roles, tools, environments, data classes, and decision boundaries into draft Policy Profiles and draft Authority Maps.
- Policy Profiles define organization-specific governance rules.
- Hard Boundaries enforce explicit "never automate" rules before actions reach AAG.
- Authority Map defines who is allowed to approve which actions, scopes, environments, and risk categories.
- Approval Validation checks whether supplied approval evidence is valid, current, and in scope.
- Human Participation Quality evaluates whether approval looked like meaningful participation or likely rubber-stamping.
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
- Hard Boundary Policy Compiler for explicit `neverAutomate` rules
- Authority Map and scoped approval validation
- Human Participation Quality rubber-stamp detection
- Cross-stack deterministic eval suite
- Company Alignment Profile Generator

## Package Map

- `@alignment-governance-stack/shared-types`: shared TypeScript types for proposals, decisions, risk, packets, and receipts.
- `@alignment-governance-stack/pgdl-core`: deterministic Pre-Gate Deliberation Layer proposal maturation.
- `@alignment-governance-stack/aag-core`: canonical Agent Action Gate integration.
- `@alignment-governance-stack/runtime-binding`: exact-action permit creation and runtime validation.
- `@alignment-governance-stack/governance-core`: orchestration for PGDL, optional policy resolution, optional authority validation, optional participation quality, AAG, Runtime Binding, and receipts.
- `@alignment-governance-stack/receipts`: tamper-evident governance receipts and stable receipt hashing.
- `@alignment-governance-stack/policy-profiles`: organization-specific governance rules, hard boundaries, and deterministic policy resolution.
- `@alignment-governance-stack/authority-map`: role, scope, and approval evidence validation for governed actions.
- `@alignment-governance-stack/human-participation`: deterministic evaluation of meaningful participation and likely rubber-stamping.
- `@alignment-governance-stack/eval-suite`: deterministic cross-stack eval cases, runners, and result summaries.
- `@alignment-governance-stack/company-profile-generator`: deterministic draft PolicyProfile and AuthorityMap generation from structured company governance inputs.

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
- Authority Map validates scoped approval evidence; it does not store approvals or replace AAG.
- Human Participation Quality evaluates participation evidence; it does not identify people, store approvals, or replace Authority Map.
- Approval and participation cannot override hard boundaries in v0.6.
- The Company Alignment Profile Generator creates draft Policy Profiles and draft Authority Maps, not legal or compliance guarantees.

## Current Status

Current version: v0.7.0

The core AGS spine is working:

```text
Company Alignment Profile Generator -> Policy Profile with Hard Boundaries -> Authority Map / Approval Validation -> Human Participation Quality -> PGDL -> Policy Resolution -> AAG -> Runtime Binding -> Receipt
```

No UI, database, auth, dashboard, LLM ingestion, SOP parser, approval storage, signatures, human identity verification, analytics dashboard, or persistent storage is included yet.
