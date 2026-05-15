# Architecture

Alignment Governance Stack separates proposal maturation from execution approval and runtime authorization.

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
-> Receipt
-> Governance Memory / Internalization Layer
-> Governance Reality Reports / Audit Core
-> Evaluation Suite
-> Execution
```

## Core Runtime Spine

The core runtime spine remains:

```text
PGDL -> AAG -> Runtime Binding -> Receipt
```

PGDL matures the proposal before execution gating. AAG decides whether the proposed action should be allowed before execution. Runtime Binding verifies that the exact runtime action matches the issued permit. Receipts preserve proof of the governance path.

## Full AGS Stack

The full stack around the runtime spine is:

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

Receipts feed Governance Memory. Governance Memory analyzes receipt history over time and produces human-reviewable recommendations for Policy Profiles, Hard Boundaries, Authority Maps, Human Participation policies, Runtime Binding investigation, and eval expansion. It is a feedback loop, not inline action execution, and it does not silently mutate governance behavior.

The Eval Suite tests the stack. It is a feedback layer around the stack, not an inline execution layer, and it runs deterministic cross-stack scenarios that exercise PGDL, Policy Profiles, Hard Boundaries, Authority Map, Human Participation Quality, AAG, Runtime Binding, Receipts, and Governance Memory. The suite now includes built-in governance cases, Internal Dogfood, the Enterprise Financial Report Golden Path, the Content Publishing Dogfood Agent, and the Adversarial Red-Team Eval Pack. These tracks cover docs updates, release drafts, package deletion, publishing, pushing to main, external communication, authority-map edits, receipt deletion, sensitive financial report handling, public content claims, borrowed author voice, provenance changes, rubber-stamped approval, runtime substitution, hard-boundary bypass attempts, forged approvals, receipt tampering, and noisy memory histories.

Governance Reality Reports are the first professional audit/reporting layer. They convert AGS evidence and existing outputs into typed findings, a Governance Reality posture, an agency chain map, remediation plan items, and Markdown or JSON report output. They use careful audit language, identify potential governance theater signals and evidence gaps, and do not make external accusations, determine legal compliance, or certify systems.

The v1.5.1 report hardening adds audit mode, methodology, limitations, severity and confidence definitions, remediation summaries, evidence appendices, and optional self-audit disclosure. This remains a deterministic local reporting layer, not a dashboard, database, hosted API, model caller, or external execution layer.

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
