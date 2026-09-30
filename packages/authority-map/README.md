# Authority Map

Terminology: Agent Action Gate (AAG). See the [canonical architectural concepts](../../docs/MODULAR_ARCHITECTURE.md#core-architectural-concepts).

Deterministic authority mapping and approval validation for Alignment Governance Stack.

This package answers who is allowed to approve what. It does not execute actions, store approvals, sign approvals, or replace AAG.

Delegation Formation adds provisional intent, explicit exact-envelope confirmation, bounded established delegations, current-authority checks and revocation. See [Delegation Formation](../../docs/DELEGATION_FORMATION.md) for the host trust boundary and additive integration path. Inference may clarify intent; it may not manufacture permission.


Current Standing optionally checks confirmed conditions against current supplied evidence before runtime permission. See [Current Standing](../../docs/CURRENT_STANDING.md).

Confirmed execution-revalidation tolerances support the opt-in governance execution boundary. See [Execution-Time Revalidation](../../docs/EXECUTION_TIME_REVALIDATION.md).
