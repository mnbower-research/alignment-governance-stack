# Alignment Governance Stack

Alignment Governance Stack is a full-stack governance architecture for agentic AI systems. It preserves human agency across the action lifecycle by separating company policy, authority validation, human participation quality, proposal maturation, execution gating, runtime authorization, and proof.

Core thesis:

```text
Proposal must not outrun objection.
Action must not outrun discernment.
```

## Current Stack

```text
Integration Adapters
-> Company Alignment Profile Generator
-> Policy Profile with Hard Boundaries
-> Authority Map / Approval Validation
-> Human Participation Quality
-> PGDL
-> Policy Resolution
-> AAG
-> Runtime Binding
-> Receipt
-> Governance Memory / Internalization Layer
-> Evaluation Suite
-> Developer CLI
```

- Integration Adapters translate external workflow and tool payloads into AGS governance inputs.
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
- Governance Memory analyzes receipt history and produces human-reviewable improvement recommendations.
- Evaluation Suite runs deterministic cross-stack scenarios.
- Developer CLI runs local eval, governance, and receipt checks.

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
- Developer CLI for local evals, governance checks, and receipt verification
- Integration Adapters foundation with n8n action mapping and workflow templates
- Governance Memory receipt-history analysis with human-reviewable recommendations

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
- `@alignment-governance-stack/cli`: dependency-light terminal CLI for local evals, governance checks, and receipt verification.
- `@alignment-governance-stack/integration-adapters`: edge adapters for workflow systems, starting with n8n payload mappers and response helpers.
- `@alignment-governance-stack/governance-memory`: deterministic receipt-history pattern detection and human-reviewable governance recommendations.

## Governance Memory

Governance Memory analyzes receipts over time and recommends improvements for humans to review. It can identify repeated PGDL revisions, hard boundary blocks, missing authority approvals, rubber-stamp signals, runtime substitutions, invalid policies, repeated safe allows, and other governance patterns.

It does not silently mutate Policy Profiles, Hard Boundaries, Authority Maps, or Human Participation policies.

## Integration Adapters

Integration Adapters help external workflow tools send proposed actions into AGS and receive workflow-friendly governance results back. v0.9.0 starts with n8n helpers and example workflow templates.

Adapters do not execute actions, call networks, store data, or host an API. They normalize payloads and map AGS decisions back to integration-friendly JSON.

See `docs/INTEGRATION_ADAPTERS.md` and `examples/integrations/n8n`.

## Developer CLI

The CLI is for local governance, eval, and receipt checks. It does not execute governed actions, make network calls, store data, or run a server.

```bash
corepack pnpm --filter @alignment-governance-stack/cli build
corepack pnpm --filter @alignment-governance-stack/cli ags help
corepack pnpm --filter @alignment-governance-stack/cli ags eval
corepack pnpm --filter @alignment-governance-stack/cli ags govern examples/cli/safe-internal-report.json
corepack pnpm --filter @alignment-governance-stack/cli ags memory path/to/receipts.json
```

See `docs/CLI.md` for command details and exit codes.

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
- Governance Memory does not auto-update governance policy.
- Integration Adapters do not execute actions or host a service.
- Policy Profiles do not replace PGDL or AAG.
- Hard Boundaries stop explicit organization-defined "never automate" actions before AAG.
- Authority Map validates scoped approval evidence; it does not store approvals or replace AAG.
- Human Participation Quality evaluates participation evidence; it does not identify people, store approvals, or replace Authority Map.
- Approval and participation cannot override hard boundaries in v0.6.
- The Company Alignment Profile Generator creates draft Policy Profiles and draft Authority Maps, not legal or compliance guarantees.

## Current Status

Current version: v1.0.0

The core AGS spine is working:

```text
Integration Adapters -> Company Alignment Profile Generator -> Policy Profile with Hard Boundaries -> Authority Map / Approval Validation -> Human Participation Quality -> PGDL -> Policy Resolution -> AAG -> Runtime Binding -> Receipt -> Governance Memory / Internalization Layer -> Evaluation Suite -> Developer CLI
```

No UI, database, auth, dashboard, LLM ingestion, SOP parser, approval storage, signatures, human identity verification, analytics dashboard, or persistent storage is included yet.
