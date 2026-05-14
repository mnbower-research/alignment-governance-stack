# Governance Memory / Internalization Layer

Governance Memory is the deterministic continuity layer for AGS.

It answers:

```text
What patterns do receipts reveal over time, and what governance improvements should humans review?
```

Core posture:

```text
A gate that never remembers cannot mature.
A gate that remembers without oversight can drift.
A true gate remembers under authority.
```

## What It Does

Governance Memory analyzes governance receipts over time and produces structured recommendations for human review.

It can detect repeated patterns such as:

- PGDL revisions
- policy blocks
- hard boundary blocks
- missing authority approvals
- out-of-scope approvals
- likely rubber-stamp approvals
- runtime substitutions
- execution denials
- invalid policy profiles
- repeated safe allows
- high-sensitivity external attempts
- ambiguous or repeatedly approval-required actions

Recommendations can point humans toward:

- reviewing Policy Profiles
- reviewing Hard Boundary candidates
- reviewing Authority Maps
- reviewing Human Participation policy
- adding eval cases
- investigating Runtime Binding failures
- reducing review friction for repeated safe allows
- clarifying company decision boundaries

## What It Does Not Do

Governance Memory does not:

- silently mutate Policy Profiles
- silently mutate Hard Boundaries
- silently mutate Authority Maps
- silently mutate Human Participation policies
- execute actions
- approve actions
- replace PGDL, AAG, Runtime Binding, or Receipts
- host a server
- store receipts persistently
- call LLMs or providers
- send telemetry
- learn in an uncontrolled way

Every recommendation has `humanReviewRequired: true`.

## Feedback Loop

The runtime governance path remains:

```text
Proposal -> PGDL -> Policy Resolution -> AAG -> Runtime Binding -> Receipt
```

Governance Memory runs after receipts exist:

```text
Receipt history -> Pattern detection -> Human-reviewable recommendations
```

This is safe internalization: the system can notice repeated patterns, but authority remains with human review.

## CLI

The Developer CLI can summarize receipt history:

```bash
corepack pnpm --filter @alignment-governance-stack/cli ags memory path/to/receipts.json
```

The input file must be a JSON array of governance receipt objects.

## Future Work

- dashboard trend view
- persistent receipt store
- recommendation approval workflow
- policy update pull requests
- eval generation from repeated patterns
- v1.1 eval-suite coverage for Governance Memory
