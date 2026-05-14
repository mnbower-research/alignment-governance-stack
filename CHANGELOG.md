# Changelog

## v1.2.0 - Adversarial Red-Team Eval Pack

- Adds `builtInRedTeamEvalCases` and `runRedTeamEvalSuite`.
- Adds `ags redteam` CLI command.
- Adds adversarial examples under `examples/redteam`.
- Adds red-team fixture artifacts under `evals/fixtures/redteam`.
- Extends eval assertions for must-not decisions, PGDL objection categories, receipt tamper detection, runtime failure inclusion, and Governance Memory recommendation checks.
- Keeps red-team evals deterministic and local; no real actions execute.

## Unreleased - Enterprise Financial Report Golden Path

- Adds Enterprise Financial Report Golden Path under `examples/dogfood/enterprise-golden-path`.
- Adds `builtInEnterpriseDogfoodEvalCases` and `runEnterpriseDogfoodEvalSuite`.
- Updates `ags dogfood` to report Internal Dogfood and Enterprise Golden Path counts.
- Adds enterprise dogfood fixtures under `evals/fixtures/dogfood/enterprise`.
- Includes a narrow PGDL fix so approved internal reversible high-sensitivity drafts can reach policy, authority, participation, AAG, and runtime binding.

## v1.1.0 - Dogfood Workbench Eval Pack

- Adds realistic AGS development workflow scenarios under `examples/dogfood`.
- Adds `builtInDogfoodEvalCases` and `runDogfoodEvalSuite`.
- Adds `ags dogfood` CLI command.
- Adds dogfood fixture artifacts under `evals/fixtures/dogfood`.
- Documents dogfood as repeatable proof that the stack handles realistic internal workflows without executing real actions.

## v1.0.1 - Stabilization and Release Cleanup

- Clarifies release history after the first complete stack milestone.
- Adds full-stack demo examples and release documentation.
- Aligns README, architecture, roadmap, CLI, and thesis documentation.
- No runtime behavior changes.

## v1.0.0 - First Complete Alignment Governance Stack

- Adds Governance Memory / Internalization Layer for deterministic receipt-history analysis.
- Produces human-reviewable recommendations for policy, hard boundaries, authority, participation, runtime binding, and eval expansion.
- Adds `ags memory <receipts.json>` for local receipt-history summaries.
- Marks the first complete AGS snapshot.

Note: v0.9.0 and v1.0.0 currently point to the same commit because Integration Adapters and Governance Memory were committed together. v0.9.0 should be read as the Integration Adapters milestone. v1.0.0 should be read as the first complete stack snapshot.

## v0.9.0 - Integration Adapters

- Adds `@alignment-governance-stack/integration-adapters`.
- Starts with n8n payload mappers, workflow-friendly governance responses, and example templates.
- Keeps adapters as edge translation helpers only.

Note: v0.9.0 and v1.0.0 currently point to the same commit because Integration Adapters and Governance Memory were committed together.

## v0.8.0 - Developer CLI

- Adds `@alignment-governance-stack/cli`.
- Provides local commands for evals, governance checks, receipt hashing, and receipt verification.

## v0.7.0 - Evaluation Suite

- Adds deterministic cross-stack eval cases and result summaries.

## v0.6.0 - Human Participation Quality

- Adds deterministic participation-quality checks and rubber-stamp detection signals.

## v0.5.0 - Authority Map and Approval Validation

- Adds scoped authority maps and approval evidence validation.

## v0.4.0 - Hard Boundary Policy Compiler

- Adds explicit hard boundary support for organization-defined "never automate" rules.

## v0.3.0 - Company Alignment Profile Generator

- Adds draft PolicyProfile and AuthorityMap generation from structured company inputs.

## v0.2.0 - Policy Profiles

- Adds deterministic Policy Profiles and policy resolution before AAG.

## v0.1.0 - Core Spine

- Establishes the PGDL, AAG, Runtime Binding, Receipts, and shared types spine.

## v0.1.0-scaffold - Initial Scaffold

- Creates the TypeScript pnpm monorepo scaffold and initial documentation.
