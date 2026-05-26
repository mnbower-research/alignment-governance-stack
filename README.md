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
-> Decision Closure Artifact
-> Receipt
-> Agency Fingerprint
-> Governance Memory
-> Agency Chain Mapper
-> Governance Reality Reports / Audit Core
-> Structural Babel Detection
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
- Decision Closure Artifact binds the action, authority, decision, conditions, and proof at the execution boundary.
- Agency Fingerprints bind delegated agent actions to the human or organizational authority chain under which they acted.
- Receipts preserve tamper-evident proof of the governance path.
- Governance Memory analyzes receipt history and produces human-reviewable improvement recommendations.
- Agency Chain Mapper identifies where human or organizational agency is preserved, weakened, bypassed, or not demonstrated across delegated workflows.
- Governance Reality Reports turn AGS outputs into professional audit findings, evidence-gap summaries, and remediation plans.
- Structural Babel Detection audits whether capability and coordination are scaling faster than agency, discernment, authority clarity, accountability, and proof.
- Governance Absorption Capacity / Babel Velocity analyzes whether meaningful governance closure is keeping pace with risk-weighted agent decision throughput over time.
- Evaluation Suite runs deterministic cross-stack scenarios.
- Developer CLI runs local eval, governance, and receipt checks.

## Current Features

- Deterministic PGDL proposal maturation
- Canonical Agent Action Gate integration
- Governance Core orchestration
- Runtime Binding exact-action permit validation
- Decision Closure Artifact execution-boundary proof objects
- Agency Fingerprints for deterministic accountability continuity across delegated AI actions
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
- Structural Babel Detection for auditing whether capability and coordination are scaling faster than agency, discernment, authority clarity, accountability, and proof
- Governance Absorption Capacity / Babel Velocity analysis for detecting whether meaningful human governance closure is keeping pace with risk-weighted agent decision throughput across time windows
- Optional continuity checks inside Governance Reality Reports for asking whether governance remained coherent over time across receipts, decisions, approvals, authority, policy, and scope evidence
- Dogfood Workbench Eval Pack for realistic AGS development and enterprise financial-report workflows
- Content Publishing Dogfood Agent for public voice, claims, provenance, approval, and runtime publishing checks
- Content Publishing Governance Hardening for AGS public-claim agents, draft/publish boundaries, target-specific approvals, runtime substitution, and tone drift
- Content Publishing Depth Hardening for calibrated public-claim findings, false-positive / false-negative handling, Decision Closure completeness, and remediation quality
- Decision Closure Red-Team Hardening for adversarial public-announcement closure proof failures, including overclaim laundering, weak review, target mismatch, runtime substitution, and incomplete third-party-readable proof
- Adversarial Red-Team Eval Pack for bypass, authority, runtime, receipt, and memory attacks

## Package Map

- `@alignment-governance-stack/shared-types`: shared TypeScript types for proposals, decisions, risk, packets, and receipts.
- `@alignment-governance-stack/pgdl-core`: deterministic Pre-Gate Deliberation Layer proposal maturation.
- `@alignment-governance-stack/aag-core`: canonical Agent Action Gate integration.
- `@alignment-governance-stack/runtime-binding`: exact-action permit creation and runtime validation.
- `@alignment-governance-stack/decision-closure`: deterministic Decision Closure Artifact generation, validation, hashing, summaries, and Markdown rendering.
- `@alignment-governance-stack/agency-fingerprint`: deterministic accountability fingerprints that bind delegated actions to authority chains, workflow scope, runtime permits, and receipt metadata.
- `@alignment-governance-stack/governance-core`: orchestration for PGDL, optional policy resolution, optional authority validation, optional participation quality, AAG, Runtime Binding, and receipts.
- `@alignment-governance-stack/receipts`: tamper-evident governance receipts and stable receipt hashing.
- `@alignment-governance-stack/policy-profiles`: organization-specific governance rules, hard boundaries, and deterministic policy resolution.
- `@alignment-governance-stack/authority-map`: role, scope, and approval evidence validation for governed actions.
- `@alignment-governance-stack/human-participation`: deterministic evaluation of meaningful participation and likely rubber-stamping.
- `@alignment-governance-stack/agency-chain`: deterministic agency-chain mapping, broken-link detection, summaries, and audit finding adaptation.
- `@alignment-governance-stack/audit-core`: deterministic taxonomy, finding schemas, report model, Markdown renderer, validators, lightweight adapters for Governance Reality Reports, and optional continuity findings.
- `@alignment-governance-stack/babel-risk`: deterministic Structural Babel Detection, Babel Risk Reports, Governance Absorption Capacity, Babel Velocity reports, quality-weighted governance closure ratios, risk-weighted decision throughput, Markdown rendering, and signal-based structural ascent findings.
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

Continuity checks extend governance auditing by asking whether governance remained coherent over time. They are optional Governance Reality Report inputs, not a separate governance layer or second receipt system. When supplied, receipt history, AAG decisions, PGDL reviews, runtime permits, authority maps, policies, and workflow records are converted into ordinary audit findings.

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

## Structural Babel Detection

Structural Babel Detection asks whether capability and coordination are scaling faster than agency, discernment, authority clarity, accountability, and proof. It does not block actions; it produces human-reviewable Babel Risk Reports.

```bash
node packages/cli/dist/cli.js babel-risk examples/babel-risk/high-babel-risk.json
node packages/cli/dist/cli.js babel-risk examples/babel-risk/high-babel-risk.json --json
node packages/cli/dist/cli.js babel-risk examples/babel-risk/high-babel-risk.json --out .tmp/babel-risk-report.md
```

See `docs/STRUCTURAL_BABEL_DETECTION.md` and `examples/babel-risk`.

## Governance Absorption Capacity

Governance Absorption Capacity / Babel Velocity is a temporal hardening layer for Structural Babel Detection. It asks whether meaningful human governance closure can keep pace with consequence-weighted agent decision throughput.

```bash
node packages/cli/dist/cli.js babel-velocity examples/babel-velocity/declining-closure-ratio.json
node packages/cli/dist/cli.js babel-velocity examples/babel-velocity/declining-closure-ratio.json --json
node packages/cli/dist/cli.js babel-velocity examples/babel-velocity/declining-closure-ratio.json --out .tmp/babel-velocity-report.md
```

See `docs/GOVERNANCE_ABSORPTION_CAPACITY.md` and `examples/babel-velocity`.

## Decision Closure Artifact

Decision Closure Artifact is the execution-boundary proof object. It does not replace logs, receipts, runtime binding, or audit reports. It binds their most important facts into one third-party-readable artifact.

Authority before execution. Evidence after execution.

```bash
node packages/cli/dist/cli.js closure examples/decision-closure/allowed-reviewed-publish.json
node packages/cli/dist/cli.js closure examples/decision-closure/missing-runtime-permit.json --json
node packages/cli/dist/cli.js closure examples/decision-closure/allowed-reviewed-publish.json --out .tmp/allowed-reviewed-publish-closure.md
node packages/cli/dist/cli.js closure examples/decision-closure/v170-announcement-ultimate-bypass.json
```

v1.7.1 adds a deterministic Decision Closure hardening scenario for an AGS v1.7.0 announcement. It verifies that an apparent allow decision is not accepted as safe when public claims require verification, internal-draft framing does not match external execution, approval is reused across targets, runtime binding is not demonstrated, receipt proof is incomplete, and the artifact is not third-party-readable.

v1.7.2 deepens the content-publishing path with 30 messy deterministic variants. This release does not add a new governance layer. It improves severity calibration, false-positive and false-negative handling, remediation wording, Decision Closure completeness, and auditor-readable reports.

See `docs/DECISION_CLOSURE_ARTIFACT.md` and `examples/decision-closure`.

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
corepack pnpm --filter @alignment-governance-stack/cli ags babel-risk examples/babel-risk/high-babel-risk.json
corepack pnpm --filter @alignment-governance-stack/cli ags babel-risk examples/babel-risk/high-babel-risk.json --json
corepack pnpm --filter @alignment-governance-stack/cli ags babel-risk examples/babel-risk/high-babel-risk.json --out .tmp/babel-risk-report.md
corepack pnpm --filter @alignment-governance-stack/cli ags babel-velocity examples/babel-velocity/declining-closure-ratio.json
corepack pnpm --filter @alignment-governance-stack/cli ags babel-velocity examples/babel-velocity/declining-closure-ratio.json --json
corepack pnpm --filter @alignment-governance-stack/cli ags babel-velocity examples/babel-velocity/declining-closure-ratio.json --out .tmp/babel-velocity-report.md
corepack pnpm --filter @alignment-governance-stack/cli ags closure examples/decision-closure/allowed-reviewed-publish.json
corepack pnpm --filter @alignment-governance-stack/cli ags govern examples/cli/safe-internal-report.json
corepack pnpm --filter @alignment-governance-stack/cli ags memory examples/demo/full-stack/receipt-history.json
```

See `docs/CLI.md` for command details and exit codes.

## Dogfood Workbench

The Dogfood Workbench turns realistic workflows into repeatable eval cases. It has six tracks:

- Internal AGS Development Dogfood: safe documentation changes, release-note drafts, package deletion, npm publishing, pushing to main, external email draft-first behavior, authority-map edits, receipt deletion, rubber-stamped release approval, and runtime substitution.
- Enterprise Financial Report Golden Path: high-sensitivity Q2 financial report draft generation, direct-send prevention, external-domain hard boundaries, financial source data mutation blocks, finance authority, meaningful participation, runtime substitution denial, receipts, and memory.
- Content Publishing Dogfood Agent: safe drafts, approved blog publishing, overclaim prevention, consciousness/compliance language blocks, review bypass, external social publishing, tone drift, provenance mutation, stale approval reuse, runtime substitution, receipts, and memory.
- Content Publishing Governance Hardening: AGS v1.6.0 public-claim cases for safe draft creation, unsupported public claims, external publish review, draft/publish boundary checks, runtime substitution, approval target mismatch, and tone/claim drift.
- Content Publishing Depth Hardening: 30 calibrated public-claim cases covering safe drafts, overclaim variants, draft/publish boundary laundering, authority/review quality, runtime substitution, proof gaps, and tone/target drift.
- Decision Closure Hardening: AGS v1.7.0 public-announcement closure case for public overclaim laundering, weak participation, target-bound approval mismatch, runtime substitution, and incomplete proof.

The content agent borrows the author's public voice. AGS ensures borrowed voice does not become stolen voice.

Run it locally after build:

```bash
node packages/cli/dist/cli.js dogfood
```

See `docs/DOGFOOD_WORKBENCH.md`, `docs/CONTENT_PUBLISHING_DOGFOOD.md`, `docs/CONTENT_PUBLISHING_HARDENING.md`, and `examples/dogfood`.

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
- Agency Fingerprints do not perform biometric identity, surveillance, persistence, or moral-person attribution to agents.
- Receipts do not execute or approve actions.
- Governance Memory does not auto-update governance policy.
- Governance Reality Reports do not make external accusations, certify compliance, execute actions, or collect customer data.
- Structural Babel Detection does not approve, block, execute actions, make religious claims as software output, certify compliance, assign moral blame, or mutate governance inputs.
- Governance Absorption Capacity does not approve, block, execute actions, make religious claims as software output, certify compliance, assign moral blame, mutate governance inputs, or replace human review.
- Agency Chain Mapper does not determine moral responsibility, legal compliance, or blame.
- Decision Closure Artifact does not replace receipts, verify signatures by default, or claim legal compliance.
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

Current version: v1.11.0

v1.11.0 adds Governance Absorption Capacity / Babel Velocity v0.1, a temporal hardening layer that detects whether meaningful human governance closure is keeping pace with risk-weighted agent decision throughput across time windows.

The core AGS spine is working:

```text
Integration Adapters -> Company Alignment Profile Generator -> Alignment Gap Detector / Policy Conflict Analyzer -> Policy Profile with Hard Boundaries -> Authority Map / Approval Validation -> Human Participation Quality -> PGDL -> Policy Resolution -> AAG -> Runtime Binding -> Decision Closure Artifact -> Receipt -> Agency Fingerprint -> Governance Memory -> Agency Chain Mapper -> Governance Reality Reports / Audit Core -> Structural Babel Detection -> Evaluation Suite -> Developer CLI
```

No UI, database, auth, dashboard, LLM ingestion, SOP parser, approval storage, signatures, human identity verification, analytics dashboard, or persistent storage is included yet.
