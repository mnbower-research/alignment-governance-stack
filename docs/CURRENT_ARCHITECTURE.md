# Current AGS Architecture

This document maps the Alignment Governance Stack as implemented in this repository at the time of review. It is descriptive, not a proposal for new behavior.

## Repository Shape

AGS is a TypeScript pnpm monorepo. The implemented stack is centered on small packages with named exports and deterministic tests.

- `packages/shared-types`: canonical proposal, PGDL, AAG, risk, and simple receipt types.
- `packages/context-admission`: receiving-use admission of inherited material artifacts; implements Semantic Context and Admissibility.
- `packages/ai-media-agency-adapter`: simulation-only agency proposal mapping and governed runs; no live executor.
- `packages/pgdl-core`: deterministic Pre-Gate Deliberation Layer.
- `packages/aag-core`: Agent Action Gate detectors, gate routing, review packets, policy-aware gate result helpers, and canonical `evaluateAag`.
- `packages/governance-core`: orchestration across PGDL, policy, authority, participation, AAG, Runtime Binding, receipts, and agency fingerprints.
- `packages/runtime-binding`: exact-action runtime permits and validation.
- `packages/receipts`: tamper-evident governance receipts.
- `packages/policy-profiles`: organization policy, approval rules, data sensitivity rules, environment rules, and hard boundaries.
- `packages/authority-map`: scoped approval authority and approval evidence validation.
- `packages/human-participation`: participation-quality checks for meaningful review versus rubber-stamping.
- `packages/company-profile-generator`: draft company profile, draft policy profile, draft authority map, and alignment-gap detection.
- `packages/integration-adapters`: edge mappers for external workflow systems, currently n8n.
- `packages/decision-closure`: third-party-readable decision-closure artifacts.
- `packages/agency-fingerprint`: accountability continuity hashes for delegated agent actions.
- `packages/governance-memory`: receipt-history pattern detection and human-reviewable recommendations.
- `packages/agency-chain`: agency-chain mapping and missing/weak link detection.
- `packages/audit-core`: Governance Reality Report schemas, finding taxonomy, validation, rendering, and adapters.
- `packages/babel-risk`: structural Babel risk and Babel velocity analysis.
- `packages/eval-suite`: deterministic cross-stack eval cases.
- `packages/continuity-ingest`: read-only local AGS artifact ingestion into continuity snapshots.
- `packages/cli`: local developer commands for governance, evals, receipts, memory, gaps, reports, and related checks.
- `apps/continuity-console`: local-first visual console for sample and imported evidence inspection.

## Implemented Governance Path

The implemented runtime spine is:

```text
AgentActionProposal + optional material Context Admission request
-> Context Admission when supplied
-> PGDL
-> proposalSentToAag
-> optional Policy Profile resolution
-> optional Authority Map approval validation
-> optional Human Participation Quality
-> AAG
-> Runtime Permit
-> Runtime Binding
-> Governance Receipt
-> optional Agency Fingerprint
```

The broader implemented evidence and audit path is:

```text
CompanyAlignmentInput
-> Company Alignment Profile
-> draft Policy Profile / draft Authority Map
-> Alignment Gap Report
-> governed runtime result
-> Governance Receipt
-> Decision Closure Artifact, when created separately
-> Governance Memory report
-> Agency Chain Map
-> Governance Reality Report
-> Continuity ingest / Continuity Console inspection
```

## Core Schemas And Interfaces

`AgentActionProposal` is the canonical action-envelope shape shared across the stack:

```text
id
userRequest
tool
actionType
target
environment
reversible
externalFacing
dataSensitivity
requiresApproval
knownApproval
executionConstraints (optional canonical binding)
metadata
```

`PgdlPacket` records:

```text
originalProposal
objections
internalizedPrinciple
resolvedProposal
decision
reasonForDecision
```

PGDL decisions are:

```text
forward_to_aag
revise_before_aag
escalate_to_human
reject_before_aag
```

`AagPacket` records:

```text
proposal
detectorResults
decision
reasonForDecision
receiptRequired
```

AAG decisions are:

```text
allow
require_approval
revise_action
block
```

`PolicyProfile` includes:

```text
defaultMode
tools
environments
approvalRules
dataSensitivity
hardBoundaries
receiptRequired
metadata
```

`ResolvedActionPolicy` records whether the policy allows the proposal, whether approval or receipts are required, matched rules, reasons, suggested decision, and hard-boundary matches.

`AuthorityMap` defines approval roles and deterministic scopes. `ApprovalEvidence` is checked against role scope, expiration, approval kind, target, tool, action type, environment, sensitivity, reversibility, and external-facing status.

`HumanParticipationInput` records the presented context and human response. `HumanParticipationResult` classifies the review as meaningful, insufficient, likely rubber-stamped, not required, or invalid.

`RuntimePermit` binds an AAG allow decision to one exact `AgentActionProposal` hash. `RuntimeBindingResult` denies missing permits, expired permits, hash mismatch, tool substitution, target substitution, environment substitution, external-impact escalation, sensitivity escalation, and approval requirement drift.

`GovernanceReceipt` preserves the governed packet fields plus receipt metadata and a stable receipt hash. Receipts can link through `previousReceiptHash`.

`DecisionClosureArtifact` is a separate proof object for the execution boundary. It records action, authority, decision, conditions, proof, and an audit-readable summary.

`AgencyFingerprint` binds delegated action identity and accountability context, including human or organization subject, delegator, agent, workflow, policy hash, authority hash, PGDL hash, AAG hash, permit hash, action hash, target hash, environment, timestamp, and previous fingerprint hash.

## Major Runtime Components

`governance-core` is the highest-level implemented runtime orchestrator.

- `evaluateGovernedAction` validates an optional policy profile, runs PGDL, resolves policy, validates authority, evaluates human participation quality, then runs AAG.
- `evaluateGovernedRuntimeAction` runs the governed action flow, issues a runtime permit only after `allowed_by_aag`, and validates a supplied runtime action against that permit.
- `evaluateGovernedRuntimeActionWithReceipt` adds receipt creation and optional agency fingerprint creation.

`pgdl-core` matures proposals before execution gating. It generates objections, detects compliance theater, extracts an internalized principle, and may rewrite dangerous actions into safer proposals. It does not execute actions and does not approve execution.

`aag-core` evaluates proposed execution. It includes detectors for wrong target, unauthorized scope, missing approval, irreversible action, sensitive data exposure, tool mismatch, objective drift, cyber risk, credential access, data exfiltration, privilege escalation, supply-chain modification, destructive cyber action, unapproved command execution, and high-impact recommendations. It routes actions to gates such as communication, data export, deployment, cyber, marketing, finance, legal, HR, governance, or default.

`runtime-binding` is the machine-level exactness layer. It does not decide wisdom, policy, or authority. It checks whether the runtime action exactly matches the permit.

`receipts` is the proof layer. It does not execute actions or approve actions.

`governance-memory` analyzes receipt history and produces recommendations for human review. It does not mutate policy, authority maps, or runtime constraints.

## Existing Execution Path

For an allowed runtime-bound action:

```text
1. Caller supplies an AgentActionProposal.
2. PGDL evaluates the proposal.
3. If PGDL rejects or escalates, the flow stops before AAG.
4. If PGDL revises, the resolved proposal becomes proposalSentToAag.
5. If a PolicyProfile is supplied, policy resolves against proposalSentToAag.
6. Hard-boundary or policy blocks stop before AAG.
7. If an AuthorityMap is supplied and approval is required, ApprovalEvidence must validate in scope.
8. If HumanParticipation input is supplied or required by context, participation quality can stop likely rubber-stamped or insufficient review.
9. AAG evaluates proposalSentToAag.
10. If AAG does not allow, no runtime permit is issued.
11. If AAG allows, Runtime Binding creates a permit for the exact allowed action.
12. If runtimeAction is supplied, Runtime Binding validates exact action/permit match.
13. A GovernanceReceipt records the path and final decision.
14. Optional AgencyFingerprint metadata can be attached to the receipt.
```

## Implemented Tests And Evidence

The repository includes tests for:

- PGDL forwarding, revision, compliance theater detection, and escalation.
- Governance-core PGDL-to-AAG flow.
- Policy profile validation, policy blocks, hard boundaries, and policy resolution after PGDL revision.
- Authority validation, missing approval, out-of-scope approval, and receipt preservation.
- Human participation quality, meaningful review, and rubber-stamp stops.
- Runtime Binding exact match, permit absence, expiration, substitution, and PGDL-revision bypass denial.
- Receipt hash stability, verification, tamper detection, and hash-chain linking.
- n8n adapter mapping and response next steps.
- Company profile generation, authority-map generation, alignment-gap detection.
- Agency fingerprints, decision closure artifacts, governance memory, agency chain maps, audit reports, Babel risk, eval suite, continuity ingest, and Continuity Console data/projection logic.

## Boundaries Already Present

- PGDL matures proposals but does not approve execution.
- AAG gates execution proposals but does not execute actions.
- Runtime Binding validates exact permitted execution but does not decide policy.
- Receipts preserve proof but do not permit actions.
- Governance Memory recommends human-reviewable improvements but does not mutate policy.
- Integration Adapters normalize and map payloads but do not execute, store, host, or call networks.
- Company Profile Generator produces drafts requiring human review.
- Alignment Gap Detector reports governance gaps but does not mutate governance inputs.
- Continuity Console and continuity ingest are read-only evidence views, not live enforcement or approval write-back.

## Important Implementation Nuances

- The canonical proposal schema is intentionally compact. Descriptive business context may travel through typed adapter inputs and metadata. Consequential budget, platform, property and content values must use canonical `executionConstraints` for exact runtime binding.
- Runtime Binding currently hashes and compares canonical action fields only: tool, action type, target, environment, reversibility, external-facing status, data sensitivity, approval booleans, and canonical `executionConstraints`. Proposal `metadata` is preserved in permits and receipts but is not part of the runtime action hash or field-mismatch checks.
- `governance-core` currently resolves policy after PGDL revision, against the proposal that would reach AAG.
- Hard boundaries stop before authority and participation checks.
- Authority validation only runs when an authority map is supplied.
- Participation quality only runs when human participation input is supplied through governance-core.
- AAG always marks receipts as required in the canonical `evaluateAag` output.
- `evaluateGovernedRuntimeAction` can issue a permit without validating execution if no `runtimeAction` is supplied. Execution should require a subsequent exact runtime binding result before any external tool call.
- Decision Closure Artifacts are implemented as a separate package but are not automatically emitted by `governance-core`.
- The newer Runtime Governance Interoperability specification and module-manifest concepts are currently design work and console/sample work, not a fully implemented runtime resolver.

## Context and historical evidence

Context Admission is an optional integration within layer 3, not a thirteenth governance layer. Operational attestations bind the canonical action hash and receiver. Governance Core evaluates a fresh receiving request before PGDL/AAG and uses the current runtime clock by default. Historical reports cannot independently authorize AAG or renew prior approval. Hosts remain responsible for discovering and admitting all material inherited dependencies. See [Governed Information Inheritance](GOVERNED_INFORMATION_INHERITANCE.md).
