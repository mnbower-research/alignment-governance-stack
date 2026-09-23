# Architecture

Alignment Governance Stack separates proposal maturation from execution approval and runtime authorization.

For the vendor-neutral reference architecture and implementation-slot vocabulary, see [Modular Architecture](MODULAR_ARCHITECTURE.md).

```text
User goal
-> Integration Adapters
-> Company Alignment Profile Generator
-> Alignment Gap Detector / Policy Conflict Analyzer
-> Draft Policy Profile
-> Agent proposal
-> Policy Profile with Hard Boundaries
-> Authority Map / Approval Validation
-> Human Participation Quality
-> PGDL
-> Policy resolution on proposal sent to AAG
-> Resolved proposal or escalation
-> AAG
-> Permit decision
-> Runtime Binding
-> Decision Closure Artifact
-> Receipt
-> Governance Memory / Internalization Layer
-> Agency Chain Mapper
-> Governance Reality Reports / Audit Core
-> Evaluation Suite
-> Execution
```

## Core Runtime Spine

The core runtime spine remains:

```text
PGDL -> AAG -> Runtime Binding -> Receipt
```

PGDL matures the proposal before execution gating. AAG decides whether the proposed action should be allowed before execution. Runtime Binding verifies that the exact runtime action matches the issued permit. Receipts preserve proof of the governance path. Decision Closure Artifact is an additive audit artifact at the execution boundary; it does not redesign the runtime spine.

## Current Repository Stack Around The Spine

The current repository stack around the runtime spine is:

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
-> Governance Memory / Internalization Layer
-> Agency Chain Mapper
-> Governance Reality Reports / Audit Core
-> Evaluation Suite
-> Developer CLI
```

## First End-to-End Spine

`governance-core` connects the first real AGS flow.

Integration Adapters sit at the edge of the stack. They translate workflow and tool payloads into AGS governance inputs, then map AGS governance results back into workflow-friendly responses. They do not execute external actions, store state, host APIs, or weaken any downstream gate.

Company Alignment Profile Generator sits above Policy Profiles. It translates structured company context into a draft `PolicyProfile` and draft `AuthorityMap` for human review.

Alignment Gap Detector sits between company profile generation and enforceable policy. It analyzes company governance inputs, generated or supplied Policy Profiles, Authority Maps, and Human Participation policies for contradictions, missing authority, ambiguous boundaries, and performative oversight. It produces a human-reviewable report and does not mutate policy, authority, or participation settings.

Policy Profiles are the configuration layer above the governance spine. They describe organization-specific rules, approvals, tools, environments, risk thresholds, and audit expectations. In v0.2, `governance-core` can validate a supplied profile, run PGDL, then resolve policy against the proposal that would be sent to AAG.

Hard boundaries are deterministic block rules inside Policy Profiles. They are used for organization-defined "never automate" cases and other hard stops. Explicit policy blocks, including hard boundary matches, stop before AAG. Policy approval requirements are carried as context into AAG; they do not replace AAG decisions.

Authority Map validates whether approval evidence comes from a role with scope for the proposal that would reach AAG. Missing, expired, unknown, or out-of-scope approval can stop before AAG when authority validation is supplied. Approval cannot override hard boundaries in v0.6.

Human Participation Quality evaluates whether human approval looked like meaningful participation or likely rubber-stamping. It considers context, review time, reason-giving, objections, alternatives, and active engagement. It does not replace Authority Map or AAG, and it cannot approve around hard boundaries.

PGDL evaluates proposal maturity. Only proposals that PGDL forwards or resolves are sent to AAG.

AAG evaluates execution permission for the proposal it receives. It does not mature proposals and does not execute actions.

Runtime Binding verifies the exact permitted action. Receipts preserve proof for the full governance path after the governance decision has been reached.

Decision Closure Artifact is the execution-boundary proof object. It does not replace logs, receipts, runtime binding, or audit reports. It binds their most important facts into one third-party-readable artifact. Authority before execution. Evidence after execution.

Receipts feed Governance Memory. Governance Memory analyzes receipt history over time and produces human-reviewable recommendations for Policy Profiles, Hard Boundaries, Authority Maps, Human Participation policies, Runtime Binding investigation, and eval expansion. It is a feedback loop, not inline action execution, and it does not silently mutate governance behavior.

The Eval Suite tests the stack. It is a feedback layer around the stack, not an inline execution layer, and it runs deterministic cross-stack scenarios that exercise PGDL, Policy Profiles, Hard Boundaries, Authority Map, Human Participation Quality, AAG, Runtime Binding, Receipts, Governance Memory, and Decision Closure Artifacts. The suite now includes built-in governance cases, Internal Dogfood, the Enterprise Financial Report Golden Path, the Content Publishing Dogfood Agent, Content Publishing Governance Hardening, Content Publishing Depth Hardening, Decision Closure Hardening, and the Adversarial Red-Team Eval Pack. These tracks cover docs updates, release drafts, package deletion, publishing, pushing to main, external communication, authority-map edits, receipt deletion, sensitive financial report handling, public content claims, borrowed author voice, provenance changes, rubber-stamped approval, runtime substitution, approval target mismatch, draft/publish boundary checks, incomplete execution-boundary proof, false-positive and false-negative calibration, hard-boundary bypass attempts, forged approvals, receipt tampering, and noisy memory histories.

Governance Reality Reports are the first professional audit/reporting layer. They convert AGS evidence and existing outputs into typed findings, a Governance Reality posture, an agency chain map, remediation plan items, and Markdown or JSON report output. They use careful audit language, identify potential governance theater signals and evidence gaps, and do not make external accusations, determine legal compliance, or certify systems.

The v1.5.1 report hardening adds audit mode, methodology, limitations, severity and confidence definitions, remediation summaries, evidence appendices, and optional self-audit disclosure. This remains a deterministic local reporting layer, not a dashboard, database, hosted API, model caller, or external execution layer.

Agency Chain Mapper is the v1.6.0 auditor layer that maps where human or organizational agency enters the workflow, where it is delegated to agents, where authority is validated, where execution is bound, where consequence occurs, and where proof remains. It detects missing or weak links and can adapt agency-chain issues into Governance Reality Report findings. It does not change PGDL, AAG, Runtime Binding, receipts, policy profiles, authority maps, or governance-core runtime behavior.

v1.6.1 adds focused content-publishing hardening for public claims about AGS itself. It verifies that local drafts, reviewed public releases, unsupported public claims, direct external publication, approval reuse, runtime substitution, and tone/claim drift remain distinguishable across dogfood, Runtime Binding, Governance Memory, Agency Chain Mapper, and Governance Reality Reports.

v1.7.0 adds Decision Closure Artifacts for proving what was allowed, refused, escalated, revised, approval-gated, or blocked at the moment of consequence. A true gate does not merely log what happened. It proves what was allowed, refused, or escalated at the moment of consequence.

v1.7.1 adds Decision Closure Red-Team Hardening for adversarial execution-boundary proof failures. Policy is not proof. Logs are not enough. AGA must detect when closure proof is incomplete, contradictory, or not third-party-readable, especially when an internal draft is laundered toward public execution with unsupported claims, weak participation, target mismatch, and runtime substitution.

v1.7.2 adds Content Publishing Depth Hardening. This release does not add a new governance layer. It deepens an existing high-value workflow so AGA can produce more calibrated, useful, and professional auditor findings across messy content publishing variants.

v1.8.0 adds Governance Continuity Findings to the Governance Reality Report. Continuity findings are not a new layer; they are an optional extension of the existing report flow that turns stale authority, receipt continuity, human review continuity, scope drift, policy reality mismatch, and governance maturity signals into ordinary audit findings.

The Developer CLI exposes local developer access to the same deterministic packages. It can run evals, evaluate a supplied governance input, verify or hash receipts, and summarize receipt-history memory. It does not execute actions, host a server, store state, or call providers.

## Runtime-Bound Governance Flow

PGDL matures the proposal.

AAG decides whether the proposal may proceed.

If AAG allows, `governance-core` can issue a runtime permit for the exact proposal AAG allowed.

Runtime Binding verifies the exact runtime action against that permit. It prevents the original dangerous action from running when PGDL revised it into a safer proposal.

## Receipt Proof Chain

The v0.1 proof chain is:

```text
Original proposal
-> PGDL packet
-> Proposal sent to AAG
-> AAG decision
-> Runtime permit, if issued
-> Runtime Binding result, if a runtime action is supplied
-> Final governance decision
-> Governance receipt
-> Receipt hash
-> Governance Memory analysis, if receipts are reviewed over time
```

Receipts do not execute actions and do not approve execution. They answer the audit question: what proof remains?

## Context Admission

The Semantic Context and Admissibility function now evaluates material inherited information before PGDL. Context must not outrun provenance. Optional context requests preserve existing callers; Context Admission never approves execution. See [Governed Information Inheritance](GOVERNED_INFORMATION_INHERITANCE.md).
