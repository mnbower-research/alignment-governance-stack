# Risk-scaled assurance

Terminology: Agent Action Gate (AAG). See the [canonical architectural concepts](../../docs/MODULAR_ARCHITECTURE.md#core-architectural-concepts).

Deterministic evaluation of declared risk, host-owned assurance policy, validator attestations, independence slots, freshness, and refusal history. Assurance evidence does not grant action authority.

Public functions: `createDefaultAssurancePolicy`, `evaluateRisk`, `createAssuranceBinding`, `createValidatorAttestation`, `verifyValidatorAttestation`, `evaluateAssurance`, and `verifyAssuranceEvidence`. The browser entry point verifies imported evidence only.

See [Risk-Scaled Assurance](../../docs/RISK_SCALED_ASSURANCE.md) for host trust boundaries, AAG/Runtime Binding integration, examples, and limitations.
