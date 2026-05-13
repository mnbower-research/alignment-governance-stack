# Architecture

Alignment Governance Stack separates proposal maturation from execution approval and runtime authorization.

```text
User goal
-> Company Alignment Profile Generator
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
-> Execution
```

## First End-to-End Spine

`governance-core` connects the first real AGS flow.

Company Alignment Profile Generator sits above Policy Profiles. It translates structured company context into a draft `PolicyProfile` for human review.

Policy Profiles are the configuration layer above the governance spine. They describe organization-specific rules, approvals, tools, environments, risk thresholds, and audit expectations. In v0.2, `governance-core` can validate a supplied profile, run PGDL, then resolve policy against the proposal that would be sent to AAG.

Hard boundaries are deterministic block rules inside Policy Profiles. They are used for organization-defined "never automate" cases and other hard stops. Explicit policy blocks, including hard boundary matches, stop before AAG. Policy approval requirements are carried as context into AAG; they do not replace AAG decisions.

Authority Map validates whether approval evidence comes from a role with scope for the proposal that would reach AAG. Missing, expired, unknown, or out-of-scope approval can stop before AAG when authority validation is supplied. Approval cannot override hard boundaries in v0.6.

Human Participation Quality evaluates whether human approval looked like meaningful participation or likely rubber-stamping. It considers context, review time, reason-giving, objections, alternatives, and active engagement. It does not replace Authority Map or AAG, and it cannot approve around hard boundaries.

PGDL evaluates proposal maturity. Only proposals that PGDL forwards or resolves are sent to AAG.

AAG evaluates execution permission for the proposal it receives. It does not mature proposals and does not execute actions.

Runtime Binding verifies the exact permitted action. Receipts preserve proof for the full governance path after the governance decision has been reached.

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
```

Receipts do not execute actions and do not approve execution. They answer the audit question: what proof remains?
