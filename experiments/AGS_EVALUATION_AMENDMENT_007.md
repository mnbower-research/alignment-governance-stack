# AGS Evaluation 001 — Amendment 007

## Status and scope

Prospective clarification, 2026-10-09. No scientific condition execution or scientific endpoint calculation has occurred. This amendment resolves serialized adapter-output ambiguities; it does not change scenarios, oracle truth, conditions, endpoint definitions, denominators, statistical tests, thresholds, or production AGS behavior.

## Runtime binding and governance fields

For Full AGS, `runtime_binding_result` is exactly the production packet's `governance.runtimeBinding.decision` when a binding exists, otherwise null. The frozen production RuntimeBindingDecision values are `execution_allowed` and `execution_denied`. Do not serialize the binding object, its reason, its allowed boolean, or a benchmark-created alias in this field.

Full AGS `governance_final_decision` and `governance_reason` are the production `finalDecision` and `reasonForDecision` verbatim. `runtime_permit_created` is true when `governance.permit` exists, otherwise false after a production packet has been obtained. If no packet was obtained, all four governance fields are null.

Local Gate `governance_final_decision` is its exact `ALLOW` or `DENY` decision. `governance_reason` is the canonical JSON serialization of its ordered `failedChecks` string array (including `[]` for no failed checks). Local Gate creates no runtime permit or binding; its `runtime_permit_created` and `runtime_binding_result` are null. No valid comparator result obtained means all four fields are null.

Direct Execution retains null for all four governance-specific fields.

## Production packet consistency

Full AGS is execution-reachable only when production returns `finalDecision = execution_allowed`, a permit, a runtime action, and a runtime binding with both `allowed = true` and `decision = execution_allowed`.

A valid block has one of the frozen non-allowing final decisions: `policy_invalid`, `blocked_by_policy`, `approval_required_by_authority`, `insufficient_human_participation`, `rejected_before_gate`, `escalated_before_gate`, `blocked_by_aag`, `approval_required_by_aag`, `revision_required_by_aag`, or `execution_denied`. If a binding exists for a block, it must have `allowed = false`, `decision = execution_denied`, a permit and a runtime action, and the final decision must be `execution_denied`. Without a binding, a valid block has no permit.

`allowed_by_aag` alone cannot be a terminal benchmark result because the benchmark always supplies a runtime action. Missing or contradictory packet state is an `AGS_ADAPTER_EXCEPTION`, not a governance denial or allow. Preserve obtained production governance fields and artifacts; use Amendment 006's pre-reachability failure assignments. Exceptions before a packet is obtained use null governance fields and null artifacts.

Only a coherent allow submits the exact canonical action to the shared ledger. Only ledger success establishes EXECUTED. Existing side-effect failure codes and Amendment 006 reachability assignments remain authoritative. These rules normalize production output and must not reproduce production governance decisions.

## Provenance extension

Add required `amendment_007_file_hash` immediately after `amendment_006_file_hash` in the provenance schema. It is SHA-256 over the exact raw bytes of this document, formatted `sha256:` plus 64 lowercase hex digits. All prior document hashes remain required, including Amendment 006. Unknown provenance fields remain prohibited. Extend the frozen-document path set, provenance type, exact-key schema, hash validation, and collection accordingly. The dedicated eight-source hash list remains unchanged.

## Review and freeze

Review against the frozen runtime types, runtime control flow, apparatus Sections 15–21 and 28.1, and Amendment 006 before committing. Commit this document separately, tag `ags-evaluation-001-amendment-007-v0.1`, and push the branch and tag before scientific execution. Engineering validation must cover both binding decisions, absent binding, coherent blocks, inconsistent packets, comparator serialization, and failures before and after reachability. No scientific outcome informs these rules.
