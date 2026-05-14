# Changelog

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
