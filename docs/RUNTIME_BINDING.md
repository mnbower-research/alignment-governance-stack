# Runtime Binding

Runtime Binding validates that the actual action being executed matches a valid permit.

It must prevent approved proposal drift, tool substitution, target substitution, scope expansion, stale approvals, and execution without a valid permit.

Runtime Binding does not mature proposals or decide policy. It validates that execution matches the permit.

## Runtime Binding v0.1

Runtime Binding v0.1 validates exact permitted execution. It prevents proposal or action drift after AAG by binding a runtime action to a permit for a specific action shape.

The permit hash uses deterministic SHA-256 over enforcement-relevant fields: tool, action type, target, environment, reversibility, external impact, data sensitivity, approval requirement, and known approval.

Runtime Binding denies missing permits, expired permits, hash mismatches, tool or action substitution, target or environment substitution, external-facing escalation, sensitive-data escalation, and approval-state changes.

Runtime Binding does not execute actions and does not replace AAG. Receipts come next.
