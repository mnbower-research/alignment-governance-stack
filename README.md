# Alignment Governance Stack

Alignment Governance Stack is a full-stack governance architecture for agentic AI systems. It preserves human agency across the action lifecycle by separating company policy, authority validation, human participation quality, proposal maturation, execution gating, runtime authorization, and proof.

Core thesis:

```text
Proposal must not outrun objection.
Action must not outrun discernment.
Execution must not outrun authorization.
Memory must not outrun human review.
```

## Current Stack

```text
Integration Adapters
-> Company Alignment Profile Generator
-> Alignment Gap Detector / Policy Conflict Analyzer
-> Policy Profile with Hard Boundaries
-> Authority Map / Approval Validation
-> Human Participation Quality
-> PGDL
-> Policy Resolution
-> AAG
-> Runtime Binding
-> Receipt
-> Governance Memory / Internalization Layer
-> Agency Chain Mapper
-> Governance Reality Reports / Audit Core
-> Evaluation Suite
-> Developer CLI
```

- Integration Adapters translate external workflow and tool payloads into AGS governance inputs.
- Company Alignment Profile Generator turns structured company roles, tools, environments, data classes, and decision boundaries into draft Policy Profiles and draft Authority Maps.
- Alignment Gap Detector checks company governance inputs for contradictions, missing authority, ambiguous boundaries, and performative oversight before they become enforceable agent governance.
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
- Agency Chain Mapper identifies where human or organizational agency is preserved, weakened, bypassed, or not demonstrated across delegated workflows.
- Governance Reality Reports turn AGS outputs into professional audit findings, evidence-gap summaries, and remediation plans.
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
- Alignment Gap Detector / Policy Conflict Analyzer for pre-runtime company governance diagnostics
- Developer CLI for local evals, governance checks, and receipt verification
- Integration Adapters foundation with n8n action mapping and workflow templates
- Governance Memory receipt-history analysis with human-reviewable recommendations
- Agency Chain Mapper for human authority, delegation, runtime binding, execution boundary, receipt, and memory chain review
- Governance Reality Report foundation and report hardening for professional audit outputs that identify potential governance theater signals, evidence gaps, severity/confidence posture, and remediation paths without making external accusations
- Dogfood Workbench Eval Pack for realistic AGS development and enterprise financial-report workflows
- Content Publishing Dogfood Agent for public voice, claims, provenance, approval, and runtime publishing checks
- Adversarial Red-Team Eval Pack for bypass, authority, runtime, receipt, and memory attacks

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
- `@alignment-governance-stack/agency-chain`: deterministic agency-chain mapping, broken-link detection, summaries, and audit finding adaptation.
- `@alignment-governance-stack/audit-core`: deterministic taxonomy, finding schemas, report model, Markdown renderer, validators, and lightweight adapters for Governance Reality Reports.
- `@alignment-governance-stack/eval-suite`: deterministic cross-stack eval cases, runners, and result summaries.
- `@alignment-governance-stack/company-profile-generator`: deterministic draft PolicyProfile and AuthorityMap generation from structured company governance inputs, plus Alignment Gap Detector diagnostics.
- `@alignment-governance-stack/cli`: dependency-light terminal CLI for local evals, governance checks, and receipt verification.
- `@alignment-governance-stack/integration-adapters`: edge adapters for workflow systems, starting with n8n payload mappers and response helpers.
- `@alignment-governance-stack/governance-memory`: deterministic receipt-history pattern detection and human-reviewable governance recommendations.

## Governance Memory

Governance Memory analyzes receipts over time and recommends improvements for humans to review. It can identify repeated PGDL revisions, hard boundary blocks, missing authority approvals, rubber-stamp signals, runtime substitutions, invalid policies, repeated safe allows, and other governance patterns.

It does not silently mutate Policy Profiles, Hard Boundaries, Authority Maps, or Human Participation policies.

Core Governance Memory principle:

```text
A gate that never remembers cannot mature.
A gate that remembers without oversight can drift.
A true gate remembers under authority.
```

## Integration Adapters

Integration Adapters help external workflow tools send proposed actions into AGS and receive workflow-friendly governance results back. v0.9.0 starts with n8n helpers and example workflow templates.

Adapters do not execute actions, call networks, store data, or host an API. They normalize payloads and map AGS decisions back to integration-friendly JSON.

See `docs/INTEGRATION_ADAPTERS.md` and `examples/integrations/n8n`.

## Alignment Gap Detector

The Alignment Gap Detector analyzes company governance inputs before they become enforceable policy. It surfaces contradictions such as external sharing conflicts, missing stop authority, approval requirements without approvers, hard-boundary override claims, and ambiguous never-automate boundaries.

It does not mutate Policy Profiles, Authority Maps, or Human Participation policies. It produces human-reviewable reports.

```bash
node packages/cli/dist/cli.js gaps examples/alignment-gaps/conflicting-financial-governance.json
```

See `docs/ALIGNMENT_GAP_DETECTOR.md` and `examples/alignment-gaps`.

## Governance Reality Reports

Governance Reality Reports are the first AGS auditor layer. They convert available AGS evidence into professional report findings using careful language such as potential signal, not demonstrated, requires verification, audit question, and recommended remediation.

They do not make external accusations, legal conclusions, or compliance certifications.

Reports include audit mode, methodology, limitations, severity and confidence definitions, finding summaries, remediation summaries, evidence appendices, and optional self-audit disclosure.

```bash
node packages/cli/dist/cli.js audit-report examples/audit-report/potential-theater-signals.json
node packages/cli/dist/cli.js audit-report examples/audit-report/potential-theater-signals.json --json
node packages/cli/dist/cli.js audit-report examples/audit-report/agent-workflow-gap-review.json --out .tmp/governance-reality-report.md
node packages/cli/dist/cli.js audit-report examples/audit-report/ags-self-audit.json --out .tmp/ags-self-audit.md
```

See `docs/GOVERNANCE_REALITY_REPORT.md` and `examples/audit-report`.

## Agency Chain Mapper

The Agency Chain Mapper asks where agency was preserved, weakened, bypassed, or not demonstrated across a delegated agent workflow. It maps human authority, organizational policy, hard boundaries, agent roles, tool access, proposed actions, approval authority, human participation, runtime permits, execution boundaries, receipts, and governance memory.

It does not determine moral responsibility or legal compliance. It produces missing-link and weak-link audit questions for human verification.

```bash
node packages/cli/dist/cli.js agency-chain examples/agency-chain/strong-agent-workflow-chain.json
node packages/cli/dist/cli.js agency-chain examples/agency-chain/weak-agent-workflow-chain.json
node packages/cli/dist/cli.js agency-chain examples/agency-chain/weak-agent-workflow-chain.json --json
```

See `docs/AGENCY_CHAIN_MAPPER.md` and `examples/agency-chain`.

### Self-Auditing AGS

AGS includes an honest self-audit fixture for Alignment Governance Stack v1.5.0. It records strengths in PGDL, AAG, Runtime Binding, Receipts, red-team and dogfood evals, and the Governance Reality Report foundation, while naming watch items such as foundational adapter coverage, no third-party audit yet, package/release version alignment, public-source review workflow, and future evidence locker / agency chain mapper work.

## Developer CLI

The CLI is for local governance, eval, and receipt checks. It does not execute governed actions, make network calls, store data, or run a server.

```bash
corepack pnpm --filter @alignment-governance-stack/cli build
corepack pnpm --filter @alignment-governance-stack/cli ags help
corepack pnpm --filter @alignment-governance-stack/cli ags eval
corepack pnpm --filter @alignment-governance-stack/cli ags dogfood
corepack pnpm --filter @alignment-governance-stack/cli ags redteam
corepack pnpm --filter @alignment-governance-stack/cli ags gaps examples/alignment-gaps/conflicting-financial-governance.json
corepack pnpm --filter @alignment-governance-stack/cli ags audit-report examples/audit-report/potential-theater-signals.json
corepack pnpm --filter @alignment-governance-stack/cli ags agency-chain examples/agency-chain/strong-agent-workflow-chain.json
corepack pnpm --filter @alignment-governance-stack/cli ags govern examples/cli/safe-internal-report.json
corepack pnpm --filter @alignment-governance-stack/cli ags memory examples/demo/full-stack/receipt-history.json
```

See `docs/CLI.md` for command details and exit codes.

## Dogfood Workbench

The Dogfood Workbench turns realistic workflows into repeatable eval cases. It has three tracks:

- Internal AGS Development Dogfood: safe documentation changes, release-note drafts, package deletion, npm publishing, pushing to main, external email draft-first behavior, authority-map edits, receipt deletion, rubber-stamped release approval, and runtime substitution.
- Enterprise Financial Report Golden Path: high-sensitivity Q2 financial report draft generation, direct-send prevention, external-domain hard boundaries, financial source data mutation blocks, finance authority, meaningful participation, runtime substitution denial, receipts, and memory.
- Content Publishing Dogfood Agent: safe drafts, approved blog publishing, overclaim prevention, consciousness/compliance language blocks, review bypass, external social publishing, tone drift, provenance mutation, stale approval reuse, runtime substitution, receipts, and memory.

The content agent borrows the author's public voice. AGS ensures borrowed voice does not become stolen voice.

Run it locally after build:

```bash
node packages/cli/dist/cli.js dogfood
```

See `docs/DOGFOOD_WORKBENCH.md`, `docs/CONTENT_PUBLISHING_DOGFOOD.md`, and `examples/dogfood`.

## Red-Team Eval Pack

The Red-Team Eval Pack adds adversarial cases for compliance theater, hard-boundary bypass attempts, forged and expired approvals, out-of-scope approvals, rubber-stamping, runtime substitution, receipt tampering, invalid policies, and noisy Governance Memory histories.

Run it locally after build:

```bash
node packages/cli/dist/cli.js redteam
```

See `docs/REDTEAM_EVALS.md` and `examples/redteam`.

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
- Governance Reality Reports do not make external accusations, certify compliance, execute actions, or collect customer data.
- Agency Chain Mapper does not determine moral responsibility, legal compliance, or blame.
- Integration Adapters do not execute actions or host a service.
- Alignment Gap Detector does not mutate governance inputs or auto-fix policy.
- Policy Profiles do not replace PGDL or AAG.
- Hard Boundaries stop explicit organization-defined "never automate" actions before AAG.
- Authority Map validates scoped approval evidence; it does not store approvals or replace AAG.
- Human Participation Quality evaluates participation evidence; it does not identify people, store approvals, or replace Authority Map.
- Approval and participation cannot override hard boundaries in v0.6.
- The Company Alignment Profile Generator creates draft Policy Profiles and draft Authority Maps, not legal or compliance guarantees.
- AGS is governance infrastructure, not a guarantee of safety, correctness, legality, compliance, or successful deployment.

## Current Status

Current version: v1.6.0

The core AGS spine is working:

```text
Integration Adapters -> Company Alignment Profile Generator -> Alignment Gap Detector / Policy Conflict Analyzer -> Policy Profile with Hard Boundaries -> Authority Map / Approval Validation -> Human Participation Quality -> PGDL -> Policy Resolution -> AAG -> Runtime Binding -> Receipt -> Governance Memory / Internalization Layer -> Agency Chain Mapper -> Governance Reality Reports / Audit Core -> Evaluation Suite -> Developer CLI
```

No UI, database, auth, dashboard, LLM ingestion, SOP parser, approval storage, signatures, human identity verification, analytics dashboard, or persistent storage is included yet.
