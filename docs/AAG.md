# Agent Action Gate (AAG)

AAG is the consequential authorization boundary within the Alignment Governance Stack (AGS). It determines whether a proposed action may proceed, must be revised, must be escalated, or must be blocked under current authority, scope, context, policy, assurance, and risk conditions. Approval is evidence considered by the gate, not the whole authorization function. See the [canonical architectural concepts](MODULAR_ARCHITECTURE.md#core-architectural-concepts).

AAG asks: "Should this action be allowed before execution?"

AAG remains the hard execution gate for authority, scope, reversibility, approval, sensitive data exposure, wrong target risk, tool mismatch, objective drift, runtime safety, and receipt requirements.

AAG receives proposals forwarded by the Pre-Gate Deliberation Layer (PGDL), including resolved revisions. Proposals rejected or escalated by PGDL stop before AAG. PGDL challenges the proposal; AAG governs passage.

## Imported Agent Action Gate

AAG core is imported from the existing Agent Action Gate implementation and adapted into `@alignment-governance-stack/aag-core`.

AAG remains the hard pre-execution gate. PGDL prepares better proposals before AAG; AAG evaluates execution permission.

The imported detector set includes wrong target, unauthorized scope, missing approval, irreversible action, sensitive data exposure, tool mismatch, objective drift, and additional specialized gate detectors from the original AAG source.

AAG returns `allow`, `require_approval`, `revise_action`, or `block`. It does not execute actions and does not mature proposals like PGDL.

Escalation describes the need for human resolution, not an additional AAG return value. Coverage of context and assurance requirements depends on the supplied host integration and must be demonstrated separately. The architectural definition does not imply universal enforcement of every condition by every caller.

Runtime Binding and receipts continue the enforcement and proof chain. Existing AAG receipt, hash-chain, and signed-receipt source is preserved in `aag-core`; a later AGS pass can decide what should move into a dedicated receipts package.
