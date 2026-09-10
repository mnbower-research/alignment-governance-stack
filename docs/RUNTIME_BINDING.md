# Runtime Binding

Runtime Binding validates that the actual action being executed matches a valid permit.

It must prevent approved proposal drift, tool substitution, target substitution, scope expansion, stale approvals, and execution without a valid permit.

Runtime Binding does not mature proposals or decide policy. It validates that execution matches the permit.

## Runtime Binding v0.1

Runtime Binding v0.1 validates exact permitted execution. It prevents proposal or action drift after AAG by binding a runtime action to a permit for a specific action shape.

The action hash uses deterministic SHA-256 over enforcement-relevant fields: tool, action type, target, environment, reversibility, external impact, data sensitivity, approval requirement, known approval, and canonical execution constraints when supplied.

Runtime Binding denies missing permits, expired permits, hash mismatches, tool or action substitution, target or environment substitution, external-facing escalation, sensitive-data escalation, approval-state changes, missing constraints, unexpected constraints, constraint type substitution, constraint value substitution, numeric range expansion, string-set expansion, and time-window expansion.

`governance-core` can issue a runtime permit only after AAG returns `allow`, then validate a supplied runtime action against that permit.

Runtime Binding does not execute actions and does not replace AAG.

## Bound Execution Constraints

`AgentActionProposal.executionConstraints` is the general-purpose place for domain-specific values that must be execution-authoritative but should not become first-class AGS action fields. The constraint set is canonicalized before hashing, stored on the runtime permit, and represented by `executionConstraintHash` for receipts, fingerprints, and decision-closure artifacts.

Supported constraint types include exact strings, exact numbers, exact booleans, enums, identifiers, timestamps, numeric ranges, time windows, string sets, and structured JSON objects. They are intentionally domain-neutral: an adapter may bind ad budget, campaign id, deployment service id, model id, region, publish channel, or any other execution-relevant value without changing the core `AgentActionProposal` schema.

Only values represented as canonical bound execution constraints are protected as domain-specific execution-authoritative values by Runtime Binding. Ordinary metadata remains non-authoritative.

Metadata is still useful for review, receipt readability, dashboards, and adapter-specific context. It must not be treated as a runtime guard unless the same value is promoted into `executionConstraints`.

## Example

```ts
const proposal = {
  id: "deploy-checkout-api",
  userRequest: "Deploy checkout API during the approved release window.",
  tool: "deploy.service",
  actionType: "deploy_release",
  target: "checkout-api",
  environment: "production",
  reversible: true,
  externalFacing: false,
  dataSensitivity: "medium",
  requiresApproval: true,
  knownApproval: true,
  executionConstraints: {
    version: "execution-constraints/v0.1",
    constraints: {
      serviceId: { type: "identifier", namespace: "deployment.service", value: "checkout-api" },
      region: { type: "enum", value: "us-west-2", allowedValues: ["us-west-2", "us-east-1"] },
      releaseWindow: {
        type: "time_window",
        startsAt: "2026-04-01T10:00:00.000Z",
        endsAt: "2026-04-01T11:00:00.000Z"
      }
    }
  },
  metadata: {
    ticket: "REL-123"
  }
};
```

Changing `metadata.ticket` does not deny execution. Changing `executionConstraints.constraints.region.value`, widening `releaseWindow`, or adding an unexpected constraint changes the action hash and produces a constraint-specific denial.
