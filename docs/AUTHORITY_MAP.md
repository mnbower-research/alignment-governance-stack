# Authority Map

Authority Map is the AGS layer that answers:

> Who is allowed to approve what?

`knownApproval: true` is not enough for real governance. An approval should identify the approving role, the scope of authority, the kind of approval, and the time window in which the approval is valid.

## v0.5.0 Foundation

`@alignment-governance-stack/authority-map` provides:

- `AuthorityMap` types
- `AuthorityRole` and `AuthorityScope` definitions
- `ApprovalEvidence`
- `defaultAuthorityMap`
- `validateAuthorityMap`
- `resolveRequiredAuthority`
- `validateApproval`

Approval validation checks whether an action requires authority, whether approval evidence was supplied, whether the approver role exists, whether the approval has expired, and whether at least one role scope matches the action.

Scopes can match action tool, action type, environment, data sensitivity, external-facing status, reversibility, target substring, approval kind, and maximum data sensitivity.

## Boundaries

Authority Map does not execute actions. It does not store approvals, sign approvals, or replace AAG. It provides deterministic approval validation before AAG when governance-core receives an authority map.

Hard boundaries cannot be overridden by approval in v0.5. If policy resolution blocks an action through a hard boundary, governance-core stops before approval validation and before AAG.

## Governance-Core Integration

When supplied to governance-core, authority validation runs after PGDL and policy resolution have determined the proposal that would be sent to AAG.

If approval is required but missing, expired, unknown, or out of scope, governance-core returns `approval_required_by_authority` and stops before AAG.

If approval is valid, or authority is not required, the proposal continues to AAG.

## Future Work

Future versions can add approval workflow UI, durable approval storage, signatures, human participation quality checks, and rubber-stamp detection.

