# AI Media Agency Bound Constraint Migration

This guide describes how the AI media agency adapter should migrate business-specific runtime values from metadata-only review context into AGS bound execution constraints.

## Rule

Only values represented as canonical bound execution constraints are protected as domain-specific execution-authoritative values by Runtime Binding. Ordinary metadata remains non-authoritative.

Keep metadata for human readability and receipts, but do not rely on it as an execution guard. If a value must not drift between approval and execution, put it in `AgentActionProposal.executionConstraints`.

## Phase 1 Agency Fields

The agency adapter now binds these values for the simulated USD 25 sandbox paid-content proposal:

- `objectiveId`
- `propertyId`
- `businessActionType`
- `campaignId`
- `contentId`
- `platform`
- `budgetAmount`
- `budgetCurrency`
- `audience`
- `experimentWindow`

These values may still appear in `metadata` for reviewer context, but the canonical constraint set is the execution-authoritative representation.

## Mapping Pattern

Use generic constraint types instead of agency-specific AGS core fields:

```ts
executionConstraints: {
  version: "execution-constraints/v0.1",
  constraints: {
    budgetAmount: { type: "exact_number", value: 25 },
    budgetCurrency: { type: "exact_string", value: "USD" },
    propertyId: { type: "identifier", namespace: "agency.property", value: "virtual-property-b" },
    campaignId: { type: "identifier", namespace: "agency.campaign", value: "campaign-virtual-property-b-test-001" },
    platform: { type: "exact_string", value: "youtube" },
    audience: { type: "exact_string", value: "audience-segment-alpha" },
    experimentWindow: {
      type: "time_window",
      startsAt: "2026-09-10T10:00:00.000Z",
      endsAt: "2026-09-17T10:00:00.000Z"
    }
  }
}
```

## Runtime Behavior

When AAG allows a proposal, Runtime Binding stores the canonical constraint set and `executionConstraintHash` on the runtime permit. A runtime action that changes budget, currency, platform, property, campaign, content, audience, or experiment window is denied with `action_hash_mismatch` plus a specific execution-constraint failure code.

A metadata-only change remains non-authoritative by design. If the bound constraint is unchanged, mutating a metadata copy of the same value does not deny execution. Auditors should treat the bound constraint value as the source of truth.

## Receipts, Fingerprints, And Closure

Governance receipts preserve the enriched runtime permit, including `executionConstraints` and `executionConstraintHash`.

Agency fingerprints include `executionConstraintHash` when governance issued a constrained permit, so delegated action continuity covers the bound domain values.

Decision Closure artifacts can record `executionConstraintHash` on the execution boundary and summarize bound constraint keys under `conditions.executionConstraintSummary`.

## Live Execution Boundary

This migration does not add live calls, executors, credentials, hosted APIs, or platform side effects. The agency adapter remains simulation-only. Any future live executor must validate a current runtime permit against the exact runtime action immediately before side effects occur.
