# Changelog

## v1.10.0 - Structural Babel Detection

Adds Structural Babel Detection v0.1, a deterministic audit layer for identifying whether a delegated AI system is becoming Babel-shaped even when individual actions appear governed.

Highlights:
- New `@alignment-governance-stack/babel-risk` package.
- Deterministic Babel Risk Reports with transparent scoring, findings, summaries, remediation, and Markdown rendering.
- New signal model for capability, coordination, authority, participation, proof, memory, agency-chain, fingerprint, and governance-report evidence.
- Detects structural risk patterns where capability and coordination scale faster than agency, discernment, authority clarity, accountability, and proof.
- Covers capability outrunning discernment, coordination outrunning authority, language outrunning meaning, automation outrunning participation, memory outrunning review, proof outrunning reality, governance theater, dependency capture, self-audit circularity, and centralized control without accountability.
- Added CLI command: `ags babel-risk <input.json> [--out report.md] [--json]`.
- Added example inputs for healthy, mixed, and high-risk structures.
- Added documentation for Structural Babel Detection and its relationship to AGS anti-Babel infrastructure.

Principle:
Babel risk is structural, not merely behavioral.

Boundary:
Structural Babel Detection does not approve, block, or execute actions. It does not make religious claims as software output, legal conclusions, moral accusations, compliance certifications, or production-readiness guarantees. It produces human-reviewable audit findings.

## v1.9.0 - Agency Fingerprints

Release date: 2026-05-26

Adds Agency Fingerprints v0.1, a deterministic accountability-continuity primitive for delegated AI actions.

Highlights:
- New `@alignment-governance-stack/agency-fingerprint` package.
- Deterministic fingerprint creation, verification, linking, and chain validation.
- Fingerprints bind delegated action to human or organizational authority, agent identity, workflow scope, policy profile, authority map, PGDL/AAG artifacts, runtime permits, and receipts.
- Governance-core can optionally create fingerprints during governed runtime evaluation and write `agencyFingerprintId` / `agencyFingerprintHash` into receipt metadata.
- Added advisory validation for incomplete authority chains, including permit-without-AAG, approval-without-authority-map, and workflow-without-scope.
- Added documentation and example usage.

Principle:
Agents borrow authority. Fingerprints preserve the chain.

Boundary:
Agency Fingerprints are not biometric identity, surveillance, legal certification, or proof that an action was good. They preserve the delegated authority chain and action identity for review.

## v1.7.2 - Content Publishing Depth Hardening

- Adds `contentPublishingDepthHardeningEvalCases` with 30 deterministic content-publishing variants.
- Adds severity calibration across safe drafts, public overclaims, boundary laundering, authority/review quality, runtime substitution, proof gaps, and tone/target drift.
- Adds Decision Closure completeness matrix support for outcome-specific proof requirements.
- Updates `ags dogfood` to include `Content Publishing Depth Hardening: 30/30 passed`.
- Adds false-positive and false-negative calibration manifests under `examples/calibration/content-publishing`.
- Improves Governance Reality Report readability with what-was-tested, demonstrated/not-demonstrated, highest-risk finding, evidence summary, finding table, remediation priority, known limitations, and machine-readable summary sections.
- Keeps the release deterministic and additive with no dashboard, hosted API, database, or runtime spine redesign.

## v1.7.1 - Decision Closure Red-Team Hardening

- Adds `examples/decision-closure/v170-announcement-ultimate-bypass.json`, an advanced deterministic public-announcement closure scenario.
- Adds validation findings for public claim support requiring verification, internal-draft boundary mismatch, approval reuse target mismatch, target-bound approval gaps, and receipt integrity not demonstrated.
- Adds `decisionClosureHardeningEvalCases` and `runDecisionClosureHardeningEvalSuite`.
- Updates `ags dogfood` to include `Decision Closure Hardening: 1/1 passed`.
- Adds deterministic fixture summary under `evals/fixtures/decision-closure/v170-announcement-ultimate-bypass.md`.
- Documents the v1.7.1 framing: Policy is not proof. Logs are not enough. A true gate produces execution-boundary proof.
- Keeps PGDL, AAG, Runtime Binding, receipts, policy profiles, authority map, audit-core, governance-core, and decision-closure runtime behavior additive and deterministic.

## v1.7.0 - Decision Closure Artifact

- Adds `@alignment-governance-stack/decision-closure` with typed Decision Closure Artifact models, deterministic generation, validation, canonicalization, hashing, summaries, and Markdown rendering.
- Adds `ags closure <input.json> [--out closure.md] [--json]`.
- Adds closure examples for allowed reviewed publish, missing runtime permit, hard-boundary inconsistency, weak review, refused public overclaim, and escalated sensitive action.
- Adds deterministic fixture summaries under `evals/fixtures/decision-closure`.
- Adds validation findings for missing runtime permits, missing runtime binding hashes, weak or missing human review, invalid authority, missing receipt hashes for allowed actions, hard-boundary inconsistency, target scope mismatch, expiration, third-party readability, and unsigned artifacts.
- Documents Decision Closure Artifact as the execution-boundary proof object: Authority before execution. Evidence after execution.
- Keeps PGDL, AAG, Runtime Binding, receipts, policy profiles, authority map, audit-core, and governance-core runtime behavior unchanged.

## v1.6.1 - Content Publishing Governance Hardening

- Adds `contentPublishingHardeningEvalCases` and `runContentPublishingHardeningEvalSuite` for AGS v1.6.0 public-claim workflows.
- Updates `ags dogfood` to include `Content Publishing Hardening: 8/8 passed`.
- Adds a public-claim policy fixture for unsupported claims, review requirements, target/channel approval scope, draft/publish boundaries, and non-accusatory language.
- Adds strong and weak content-publishing agency-chain examples.
- Adds a Governance Reality Report example and fixture for content publishing hardening findings.
- Tests runtime substitution, unsupported public claims, direct external publish without review, internal-draft laundering, approval reuse across targets, and tone/claim drift.
- Keeps PGDL, AAG, Runtime Binding, receipts, policy profiles, authority map, agency-chain, audit-core, and governance-core runtime behavior unchanged except focused agency-chain detection coverage for execution boundaries without runtime permits.

## v1.6.0 - Agency Chain Mapper

- Adds `@alignment-governance-stack/agency-chain` with typed agency-chain links, deterministic broken-link detection, status calculation, summaries, and audit finding adaptation.
- Adds `ags agency-chain <input.json> [--json]`.
- Adds agency-chain examples for AGS self-audit, strong internal workflow, and weak customer-impacting workflow.
- Adds Governance Reality Report support for detailed Agency Chain Map sections with link table, broken / weak links, audit questions, and conclusion.
- Adds `examples/audit-report/ags-self-audit-with-agency-chain.json`.
- Documents the Agency Chain Mapper as an auditor layer that identifies missing or weak links without determining moral responsibility or legal compliance.
- Keeps PGDL, AAG, Runtime Binding, receipts, policy profiles, authority map, and governance-core runtime behavior unchanged.

## v1.5.1 - Agentic Governance Auditor Report Hardening

- Hardens `@alignment-governance-stack/audit-core` reports with audit mode, methodology, limitations, severity and confidence definitions, remediation summary, evidence appendix, and optional self-audit disclosure.
- Adds standard non-accusatory audit language and deterministic default limitations.
- Adds default remediation mapping and AGS control mapping for every `TG-001` through `TG-012` taxonomy item.
- Adds `examples/audit-report/ags-self-audit.json` and fixture summary.
- Strengthens audit-core and CLI tests for rendering determinism, examples, self-audit output, and JSON normalization.
- Keeps the release local and deterministic with no runtime spine changes.

## v1.5.0 - Governance Reality Report Foundation

- Adds `@alignment-governance-stack/audit-core` with a deterministic theater signal taxonomy, typed audit findings, Governance Reality Report model, validation, Markdown rendering, and lightweight adapters.
- Adds `ags audit-report <input.json> [--out report.md] [--json]`.
- Adds local examples under `examples/audit-report`.
- Adds fixture summaries under `evals/fixtures/audit-report`.
- Documents professional non-accusatory audit posture and Gateblade / Agentic Governance Auditor positioning.
- Keeps the release local and deterministic: no dashboards, databases, hosted APIs, network calls, auth, scraping, real execution, customer data handling, or model calls.

## v1.4.0 - Content Publishing Dogfood Agent

- Adds Content Publishing Dogfood eval cases for public AGS / AlignmentTheory.org materials.
- Adds `builtInContentPublishingDogfoodEvalCases` and `runContentPublishingDogfoodEvalSuite`.
- Updates `ags dogfood` to include Internal Dogfood, Enterprise Golden Path, and Content Publishing Dogfood counts.
- Adds examples under `examples/dogfood/content-publishing`.
- Adds docs for governing borrowed public voice, claims, provenance, publishing approval, and runtime publishing substitution.
- Includes narrow PGDL/AAG hardening so reviewed external releases can proceed after approval, while drafts are not treated as live public posts.

## v1.3.0 - Alignment Gap Detector / Policy Conflict Analyzer

- Adds deterministic alignment gap detection to `@alignment-governance-stack/company-profile-generator`.
- Exposes `detectAlignmentGaps`, `summarizeAlignmentGapReport`, and Alignment Gap report/types.
- Adds `ags gaps <input.json> [--json]` CLI command.
- Adds CLI-ready examples under `examples/alignment-gaps`.
- Documents the detector as a human-review diagnostic that does not mutate policies, authority maps, or participation policies.

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
