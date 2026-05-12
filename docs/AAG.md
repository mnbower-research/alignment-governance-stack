# AAG

AAG means Agent Action Gate.

AAG asks: "Should this action be allowed before execution?"

AAG remains the hard execution gate for authority, scope, reversibility, approval, sensitive data exposure, wrong target risk, tool mismatch, objective drift, runtime safety, and receipt requirements.

AAG receives proposals after PGDL has matured, revised, escalated, rejected, or forwarded them.

## Imported Agent Action Gate

AAG core is imported from the existing Agent Action Gate implementation and adapted into `@alignment-governance-stack/aag-core`.

AAG remains the hard pre-execution gate. PGDL prepares better proposals before AAG; AAG evaluates execution permission.

The imported detector set includes wrong target, unauthorized scope, missing approval, irreversible action, sensitive data exposure, tool mismatch, objective drift, and additional specialized gate detectors from the original AAG source.

AAG returns `allow`, `require_approval`, `revise_action`, or `block`. It does not execute actions and does not mature proposals like PGDL.

Runtime Binding and receipts continue the enforcement and proof chain. Existing AAG receipt, hash-chain, and signed-receipt source is preserved in `aag-core`; a later AGS pass can decide what should move into a dedicated receipts package.
