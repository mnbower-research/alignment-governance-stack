# Core correctness hardening

Date: 2026-09-29. Starting revision: `0d430827d89843ed79da9a41cabe2447fa280245`.

This pass addresses six reviewed correctness defects in public Core. It adds no Enterprise functionality. Authorization, runtime permission, supplied execution evidence, and actual consequence remain distinct. No changes were made to `ags-enterprise/`.

## Reproduction and corrections

Each defect was reproduced with a failing Vitest regression before its implementation was changed. The focused tests initially demonstrated ten failing assertions/cases across the six defects (including five permission/denial labels misclassified as execution). Additional positive and adversarial cases were added after reproduction.

| Issue | Smallest reproduction | Precise root cause | Correction and resulting behavior |
| --- | --- | --- | --- |
| 1. Policy-only approval lost | Low-risk `report.generate`, no approval, policy rule requiring approval: AAG returned `allow` and a permit could issue | Governance Core added `policyRequiresApproval` to proposal metadata, but the AAG adapter did not convey it to the missing-approval detector. The adapter also omitted the proposal's explicit approval flag | Governance Core passes an explicit host policy requirement to AAG. The detector receives the logical OR of policy and proposal requirements. No approval now means `require_approval`, without a permit. Existing authority, context, assurance and stronger gate decisions remain in force |
| 2. Empty report implies support | Simplified input with `findings: []` returned `strongly_supported` / `medium` | Default inference treated an empty findings collection as affirmative evidence | Default becomes `insufficient_evidence` / `low`. Explicit caller/analyst posture remains explicit input, not a newly inferred conclusion |
| 3. Permission/denial implies execution | Consequential receipt with `execution_denied`, `execution_allowed`, `allowed_by_aag`, `allowed`, or `not_executed` triggered executed-action findings | `isExecuted` used substring matches for `execut` and `allowed` | Only a parseable supplied `executedAt` or exact `executed` decision/outcome is an execution claim. A denied event with separate execution evidence can still describe execution after denial. Such supplied claims are not independent proof |
| 4. Future-issued permit accepted | Permit issued in 2099, no expiry, evaluated in 2026 returned `execution_allowed` | Validator checked expiry and clock but not issuance or window ordering | Validate `issuedAt <= now` and, when expiry exists, `now < expiresAt`. Missing/invalid issuance, malformed expiry and empty/reversed windows fail closed. One host clock is used for assurance and temporal validation |
| 5. n8n proceeds without binding | Safe proposal with no runtime action returned `allowed: true`, `nextStep: proceed` | Response mapper equated `allowed_by_aag` with runtime permission; normalization also discarded assurance requirements and supplied context/assurance | Proceed requires `execution_allowed`, a runtime action, a linked permit, and successful runtime-binding evidence with no failures. Authorization alone stops. Supplied context and assurance are forwarded; no missing controls are synthesized |
| 6. Metadata payload substitution | Change only `metadata.payload.recipient` / `amount` after permit issuance; validation allowed | Runtime hash excluded all proposal metadata even though detectors and hosts can consume it; assurance review also excluded it | Nonempty JSON proposal metadata participates in runtime hashing and assurance binding. Approval and operational Context Admission bindings inherit the runtime hash change. Metadata insertion/removal/mutation requires renewed authorization. Permit snapshots deep-copy metadata |

## Intentional compatibility changes

### Approval requirements

The optional final `policyRequiresApproval` argument to `evaluateAag` defaults to false. `toActionGateInput` also accepts this optional host requirement. Existing calls remain valid, but omitted enforcement is no longer preserved: explicit proposal/policy requirements reach the gate even for innocuously named operations.

Governance Core no longer injects `policyRequiresApproval`, `policyReasons`, or `policyMatchedRules` into the action metadata. Consumers should read `resolvedPolicy` in the governance packet/receipt. Avoiding action mutation also prevents a policy annotation from silently changing an already-reviewed action hash.

Several medium-sensitivity publishing draft fixtures previously passed despite a policy requiring review. Their expected outcomes now require approval. The separate runtime-substitution scenarios explicitly use low-sensitivity drafts so they reach Runtime Binding; this does not weaken the publishing policy. The rubber-stamp fixture now binds the actual PGDL-resolved proposal instead of a hand-reconstructed subset that omitted revision metadata.

### Reports and execution claims

No new report posture or execution outcome enum was invented. Existing explicit full reports and analyst-supplied postures are preserved. The correction concerns the default inference from empty findings, not a new coverage certification engine. Consumers remain responsible for substantiating an explicitly supplied positive posture.

Execution labels other than exact `executed` are not guessed from substrings. Adapters with another execution vocabulary must supply an explicit mapping or execution timestamp. Permission-only records can still support other audit findings; they no longer support a claim that execution occurred solely because permission was granted.

### Permit windows

Ordinary permits without expiry remain supported after their issuance time; this pass does not invent a universal TTL. Low-level construction remains a trusted-host API, not authenticated authority issuance. Validation returns new `permit_not_yet_valid` and `invalid_permit_window` failure codes. Existing expiry and invalid-clock codes remain supported. Construction of a malformed window does not make it usable: validation rejects it.

### Metadata binding migration

This is an intentional strengthening of the former unbound-metadata contract. Core cannot infer which arbitrary key a downstream executor treats as consequential, so selective heuristics or a small list of reserved keys would leave the defect open. All nonempty proposal metadata is conservatively frozen. This does **not** make metadata an authority source, a policy engine, or proof of truth.

- Keep typed domain execution parameters in `executionConstraints`; continue mapping the final tool payload faithfully to reviewed values.
- Move mutable observation annotations to receipt-level or permit-level metadata. Changing those annotations does not change the action hash.
- Proposal metadata must be a plain JSON object containing finite, acyclic JSON values. Functions, `undefined`, non-finite numbers, sparse arrays, class instances, accessors and symbol/non-enumerable properties are rejected rather than silently dropped or coerced by hashing. Invalid runtime hash inputs fail closed as `invalid_action`; invalid permit construction throws.
- Empty metadata retains the previous runtime/assurance hash projection. Nonempty metadata changes the hash domain. Old metadata-bearing permits, approval bindings, receiving-use attestations and assurance attestations cannot be treated as current authorization under the strengthened contract: review and reissue them.
- Historical receipt and attestation integrity verification remains based on stored artifact bytes/digests. Do not rewrite or rehash historical evidence to disguise the migration. Pin the Core revision when replaying historical cases.
- Proposal ID and user-request text retain their existing runtime-hash treatment; approval/assurance bind those separately. No generic action hash replaces these distinct contracts.
- This check covers supplied proposal data. It cannot detect a host executing an omitted parameter, ignoring denial, or substituting a tool payload after validation. Final-boundary integration remains necessary.

## Regression coverage

Five new `correctness-hardening.test.ts` files cover 32 cases across Governance Core, audit, runtime, n8n and assurance. They include missing policy approval, a valid exact approval, direct AAG approval requirements, low-risk allowance, empty reports, permission/denial versus execution claims, future/invalid permit windows and boundary equality, metadata insertion/removal/nested changes/key ordering, immutable snapshots, non-JSON rejection, stale assurance for changed payloads, n8n missing/unsupported binding and context/assurance propagation.

Existing execution-constraint tests now assert denial for changed proposal metadata. The exclusive-expiry test uses an explicit issuance time before its fixed evaluation clock. One existing continuity-ingest test now uses `fileURLToPath` instead of manually extracting a URL pathname, fixing spaces in Windows fixture paths without changing production ingestion.

## Verification

The installed pnpm dependency junctions referenced an old checkout. Local junctions were repaired inside Core using the already-present dependency store; no dependency versions or lockfiles were changed. Corepack could not fetch pnpm in this environment, so checks invoked the installed TypeScript, Vitest and Vite entry points directly.

- All 23 package production TypeScript compilations passed in dependency order.
- All 23 package semantic typechecks passed, including tests.
- Package Vitest suites: 599 tests across 58 files passed. `shared-types` uses its existing `--passWithNoTests` behavior.
- Console Vitest: 136 tests across 13 files passed with its own jsdom/Vite configuration. Total: **735 tests across 71 files**.
- Console semantic typecheck and Vite production build passed.
- In-memory source-level evaluation: 20 base, 37 combined dogfood, 30 depth, 1 closure-hardening, 15 red-team, and 12 Context Admission cases passed: **115 unique cases**.
- Built CLI evaluation: base 20/20; dogfood 68/68; red-team 15/15 and Context Admission 12/12.
- All 27 public package root/browser export entries resolved and loaded under Node 24.13.0.

The first root-wide Vitest invocation was unsuitable for this workspace: it discovered an ignored historical `.tmp` test and missed the Console's package-local environment/cwd. Final totals use package-local runs, as the recursive workspace test scripts intend. These tests establish local regressions, not live customer control effectiveness or independent security certification.

## Deliberate limits and assessment prerequisites

None of the six defects is intentionally left unfixed. This pass does not add signed canonical permits, issuer authentication, durable replay prevention, a universal permit TTL, a general coverage model, a transitive grant verifier, or live execution. These require separate architectural work rather than being silently folded into correctness fixes.

Before the assessment milestone, review the metadata migration and stricter fixture outcomes, select/pin the hardened Core revision, define the first workflow and evidence requirements, and establish a faithful customer-to-Core mapping plus analyst coverage/review rules. Historical inputs with nonempty metadata may require fresh authorization artifacts for current replay. Live enforcement prerequisites remain outside the first offline assessment scope.

## Changed file inventory

- [CHANGELOG.md](../CHANGELOG.md)
- [docs/AGENCY_INTEGRATION_PLAN.md](../docs/AGENCY_INTEGRATION_PLAN.md)
- [docs/AI_MEDIA_AGENCY_BOUND_CONSTRAINT_MIGRATION.md](../docs/AI_MEDIA_AGENCY_BOUND_CONSTRAINT_MIGRATION.md)
- [docs/AUTHORITY_MAP.md](../docs/AUTHORITY_MAP.md)
- [docs/CORE_CORRECTNESS_HARDENING.md](../docs/CORE_CORRECTNESS_HARDENING.md)
- [docs/CURRENT_ARCHITECTURE.md](../docs/CURRENT_ARCHITECTURE.md)
- [docs/GOVERNED_INFORMATION_INHERITANCE.md](../docs/GOVERNED_INFORMATION_INHERITANCE.md)
- [docs/INTEGRATION_ADAPTERS.md](../docs/INTEGRATION_ADAPTERS.md)
- [docs/POLICY_PROFILES.md](../docs/POLICY_PROFILES.md)
- [docs/RECEIPTS.md](../docs/RECEIPTS.md)
- [docs/RISK_SCALED_ASSURANCE.md](../docs/RISK_SCALED_ASSURANCE.md)
- [docs/RUNTIME_BINDING.md](../docs/RUNTIME_BINDING.md)
- [docs/RUNTIME_EXECUTION_CONSTRAINT_BINDING_DESIGN.md](../docs/RUNTIME_EXECUTION_CONSTRAINT_BINDING_DESIGN.md)
- [packages/aag-core/src/actionGate/detectors/missingApproval.ts](../packages/aag-core/src/actionGate/detectors/missingApproval.ts)
- [packages/aag-core/src/actionGate/types.ts](../packages/aag-core/src/actionGate/types.ts)
- [packages/aag-core/src/evaluateAag.ts](../packages/aag-core/src/evaluateAag.ts)
- [packages/ai-media-agency-adapter/README.md](../packages/ai-media-agency-adapter/README.md)
- [packages/assurance/src/__tests__/correctness-hardening.test.ts](../packages/assurance/src/__tests__/correctness-hardening.test.ts)
- [packages/assurance/src/model.ts](../packages/assurance/src/model.ts)
- [packages/audit-core/src/__tests__/correctness-hardening.test.ts](../packages/audit-core/src/__tests__/correctness-hardening.test.ts)
- [packages/audit-core/src/continuityFindings.ts](../packages/audit-core/src/continuityFindings.ts)
- [packages/audit-core/src/createGovernanceRealityReport.ts](../packages/audit-core/src/createGovernanceRealityReport.ts)
- [packages/continuity-ingest/src/__tests__/nested-evidence.test.ts](../packages/continuity-ingest/src/__tests__/nested-evidence.test.ts)
- [packages/eval-suite/src/__tests__/content-publishing-dogfood.test.ts](../packages/eval-suite/src/__tests__/content-publishing-dogfood.test.ts)
- [packages/eval-suite/src/contentPublishingDogfoodEvalCases.ts](../packages/eval-suite/src/contentPublishingDogfoodEvalCases.ts)
- [packages/eval-suite/src/contentPublishingHardeningEvalCases.ts](../packages/eval-suite/src/contentPublishingHardeningEvalCases.ts)
- [packages/eval-suite/src/dogfoodEvalCases.ts](../packages/eval-suite/src/dogfoodEvalCases.ts)
- [packages/governance-core/src/__tests__/correctness-hardening.test.ts](../packages/governance-core/src/__tests__/correctness-hardening.test.ts)
- [packages/governance-core/src/__tests__/release-blockers.test.ts](../packages/governance-core/src/__tests__/release-blockers.test.ts)
- [packages/governance-core/src/evaluateGovernedAction.ts](../packages/governance-core/src/evaluateGovernedAction.ts)
- [packages/integration-adapters/src/__tests__/correctness-hardening.test.ts](../packages/integration-adapters/src/__tests__/correctness-hardening.test.ts)
- [packages/integration-adapters/src/n8n/mapGovernanceResultToN8nResponse.ts](../packages/integration-adapters/src/n8n/mapGovernanceResultToN8nResponse.ts)
- [packages/integration-adapters/src/n8n/mapN8nActionToProposal.ts](../packages/integration-adapters/src/n8n/mapN8nActionToProposal.ts)
- [packages/integration-adapters/src/n8n/types.ts](../packages/integration-adapters/src/n8n/types.ts)
- [packages/integration-adapters/src/types.ts](../packages/integration-adapters/src/types.ts)
- [packages/runtime-binding/src/__tests__/correctness-hardening.test.ts](../packages/runtime-binding/src/__tests__/correctness-hardening.test.ts)
- [packages/runtime-binding/src/__tests__/execution-constraints.test.ts](../packages/runtime-binding/src/__tests__/execution-constraints.test.ts)
- [packages/runtime-binding/src/createPermit.ts](../packages/runtime-binding/src/createPermit.ts)
- [packages/runtime-binding/src/hashAction.ts](../packages/runtime-binding/src/hashAction.ts)
- [packages/runtime-binding/src/types.ts](../packages/runtime-binding/src/types.ts)
- [packages/runtime-binding/src/validatePermit.ts](../packages/runtime-binding/src/validatePermit.ts)
- [packages/shared-types/src/actionMetadata.ts](../packages/shared-types/src/actionMetadata.ts)
- [packages/shared-types/src/actionProposal.ts](../packages/shared-types/src/actionProposal.ts)
- [packages/shared-types/src/index.ts](../packages/shared-types/src/index.ts)
- [packages/context-admission/README.md](../packages/context-admission/README.md)
