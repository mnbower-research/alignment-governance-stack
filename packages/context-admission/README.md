# Context Admission

Deterministic implementation of AGS Semantic Context and Admissibility. Evaluates supplied material artifacts, provenance, transformation lineage and current receiving-use evidence without executing actions or reading artifact text as instructions.

```ts
import { evaluateContextAdmission } from "@alignment-governance-stack/context-admission";
const evidence = evaluateContextAdmission(request);
// Only an admission for this exact use; PGDL, AAG and Runtime Binding still apply.
```

Public functions: `evaluateContextAdmission`, `hashContextContent`, `validateContextAdmissionRequest`, `validateContextAdmissionEvidence`, `verifyContextAdmissionEvidence`. Public contracts are re-exported from `shared-types`. Evidence verification is digest/shape checking, not issuer authentication or live authorization.

See [Governed Information Inheritance](../../docs/GOVERNED_INFORMATION_INHERITANCE.md) for policy, trust assumptions, outcomes and integration. Context must not outrun provenance.

Operational defaults require validation, explicit sensitivity and supplied revocation state. An explicit receiving-policy `requireValidation: false` may waive validation, never operational authority or integrity. Bind operational `requestedUse.action.actionHash` using Runtime Binding's `createActionHash`; metadata is not bound. Reports alone do not authorize AAG: use Governance Core with a fresh request, or its documented trusted-host validation boundary. Runtime checks default to the current clock; imported timestamps and approvals remain historical. See [boundary details](../../docs/GOVERNED_INFORMATION_INHERITANCE.md#release-candidate-boundary-clarifications).
