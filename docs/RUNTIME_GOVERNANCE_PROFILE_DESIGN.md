# Runtime Governance Profile Design

## 1. Status and Scope

This is an early internal documentation-only profile design.

Static governance-module manifests now exist in the Continuity Console sample data, but runtime profile selection is not implemented. The current manifests are static conformance-reference artifacts. They describe evaluator capabilities and boundaries; they do not register plugins, connect external systems, load adapters, execute actions, or issue permits.

This document defines the missing selection layer between static governance-module manifests and future governed-action evaluation. It does not add a runtime registry, adapter SDK, dynamic module loading, orchestration service, backend service, approval write-back, external execution, production cryptography, generic policy language, detailed regulatory mappings, or permit issuance.

## 2. Why Profiles Are Needed

A module manifest declares what a governance module can evaluate. A governance profile selects which declared modules apply to a workflow or action context. Fixed AGS stages remain part of the architecture regardless of profile selection.

Without profiles, a module could appear applicable merely because its manifest claims broad capability. That would blur declaration with authorization. Profiles make selection explicit and prevent modules from silently granting themselves broader authority.

Restrained examples:

- Secret scanning is required for software deployment, but it is irrelevant to a finance-summary action.
- Destination authority is required for sensitive finance workspace actions.
- Recipient classification becomes relevant when an internal email gains an external recipient.
- Wording review may be optional and advisory for public-facing language.

## 3. Architectural Boundary

PGDL remains a fixed proposal-scrutiny stage. It may consume evaluator input, but it is not selected as an external governance module by a profile.

AAG remains the fixed final authorization stage before runtime-permit eligibility. AAG resolves the action path from module verdicts, PGDL recommendations, human-review state, receipt readiness, and runtime constraints.

Runtime Binding remains the fixed permit-enforcement role. It validates that an attempted runtime action matches the exact permit. Profiles may select evaluators whose results inform permit eligibility, but they do not replace Runtime Binding.

Receipt continuity remains a cross-cutting prerequisite and evidence lifecycle requirement. Profiles may require selected modules to contribute receipt evidence, but receipt continuity itself is not a third-party evaluator manifest.

Profiles select external or replaceable governance modules. Profiles do not replace fixed internal roles. Modules cannot silently select themselves, silently elevate their own authority, or assign themselves broader scope than their manifest supports. Profiles also cannot silently weaken non-overridable constraints.

## 4. Manifest Versus Profile Responsibilities

| Area | Manifest responsibility | Profile responsibility |
| --- | --- | --- |
| Identity | Module ID, name, version, provider | Profile ID, name, version, integrity reference |
| Purpose | What the module can evaluate | Why the module is selected for this workflow or action context |
| Applicability | Supported action types and governed domains | Applicable workflow, domain context, action types, sensitivity, and consequence class |
| Inputs | Required inputs the module can evaluate | Whether the action context must supply those inputs before evaluation |
| Verdicts | Supported verdict vocabulary | How selected verdicts affect this profile's action path |
| Authority | Supported authority class such as advisory or binding | Configured authority no broader than the manifest supports |
| Requirement | Conservative default or capability boundary | Whether the selected module is mandatory or optional in this profile |
| Failure behavior | Supported failure behavior capability | Configured failure behavior within the module's allowed capability |
| Degraded mode | Whether degraded operation can be declared | Whether degraded mode is permitted for this profile |
| Overrideability | Overrideability boundary | No weakening of non-overridable constraints |
| Evidence | Receipt contributions the module can provide | Which contributions the selected action path expects to preserve |
| Configuration | Static local configuration reference | Profile version and profile integrity reference |
| Operator explanation | General module purpose | Profile-specific operator explanation and inclusion rationale |

## 5. Tightening and Weakening Rules

Profile configuration should be conservative.

A profile may select an optional-capable module as mandatory for a specific workflow. A profile may require fail-closed behavior where a module supports it. A profile may disable degraded operation even when the manifest allows visible degraded behavior.

A profile must not weaken a mandatory module into optional behavior when the action context requires it. A profile must not convert a binding module into advisory merely to bypass a block. A profile must not treat a non-overridable constraint as overrideable. A profile must not assign authority beyond what the manifest supports.

Profile changes must be versioned and integrity-referenced. Material profile changes should invalidate prior evaluation freshness where the selected module set, configured authority, failure behavior, degraded-mode setting, or overrideability boundary changed.

Open edge cases remain around baseline composition, partial action-envelope revisions, and whether some advisory modules can become mandatory only for a subset of fields inside one envelope.

## 6. Proposed Governance Profile Shape

A future governance-profile artifact should remain small and static at first.

### Profile identity

- profile ID
- profile name
- version
- purpose
- integrity reference

### Applicability

- governed domain
- workflow context
- applicable action types
- sensitivity range
- consequence class

### Module bindings

Each selected module binding should include:

- module ID
- inclusion class: mandatory or optional
- configured failure behavior
- degraded mode allowed
- rationale
- operator-facing explanation

The configured values must stay within manifest boundaries. For example, a module that supports only binding authority cannot be selected as advisory merely to allow continuation. A module whose manifest marks a constraint non-overridable cannot become overrideable through profile configuration.

### Fixed internal roles

Each profile assumes the fixed AGS path:

- PGDL
- AAG
- Runtime Binding
- receipt continuity

Those roles should not be modeled as external manifests. Profiles may describe how selected module evaluations feed PGDL or AAG, but profiles do not register or replace those fixed roles.

## 7. Proposed Static Reference Profiles

Static TypeScript reference profiles and consistency tests exist in the Console sample data. They do not implement runtime profile selection, plugin registration, or execution.

### Profile A: Internal documentation draft

Purpose: Support approved internal draft writes with minimal required governance.

Likely modules:

- identity verification where configured
- policy boundary

Notes: This profile should keep the action draft-only, internal, and target-bound. Optional wording review may be added only when public-facing wording or release claims are present.

### Profile B: Sensitive finance workspace action

Purpose: Govern placement of sensitive financial summaries into internal workspaces.

Likely modules:

- identity verification
- policy boundary
- destination authority

Notes: Destination authority should be mandatory when target-bound approval for a sensitive workspace is incomplete. A binding human-review verdict prevents automatic continuation until satisfied.

### Profile C: Software deployment

Purpose: Govern deployment actions.

Likely modules:

- identity verification where configured
- CI test evidence
- secret scanner

Notes: Secret scanning should remain mandatory and fail closed for deployment artifacts. A binding scanner block should prevent permit eligibility until remediation and fresh evaluation.

### Profile D: External-recipient email or publishing action

Purpose: Govern actions that cross an internal-to-external boundary.

Likely modules:

- identity verification
- policy boundary
- recipient classification
- optional domain wording review where applicable

Notes: Recipient classification should become relevant when a target, recipient, or scope changes from internal to external. Optional wording review can remain advisory and visible, unless a future profile explicitly elevates it within manifest limits.

### Profile E: Consequential action baseline

Purpose: Represent the shared receipt-continuity prerequisite for consequential actions.

Likely behavior:

- require receipt reservation before permit eligibility
- fail closed when receipt reservation fails for consequential actions
- require system-level audit visibility when no unified receipt can be reserved

Open design question: this may become a composable baseline profile, a shared profile rule, or remain part of the fixed receipt-continuity prerequisite outside profile selection. The first TypeScript profile pass should keep this conservative and avoid implying that receipt continuity is an external module.

## 8. Mapping to Existing Fixtures

| Fixture | Proposed profile | External evaluator modules | Fixed internal roles or prerequisites |
| --- | --- | --- | --- |
| Fixture 01: valid low-risk internal draft | Profile A | `identity-verification`, `policy-boundary` | PGDL, AAG, Runtime Binding, receipt continuity |
| Fixture 03: binding human-review requirement | Profile B | `identity-verification`, `destination-authority`; `policy-boundary` is conceptually part of the finance profile even if not represented in the minimal fixture record | PGDL, AAG, receipt continuity |
| Fixture 04: binding block | Profile C | `ci-test-evidence`, `secret-scanner`; identity may be configured by profile even if not represented in the minimal fixture record | PGDL, AAG, receipt continuity |
| Fixture 06: mandatory module outage | Profile A or an internal maintenance variant of Profile A | `identity-verification`, `policy-boundary` | PGDL, AAG, receipt continuity |
| Fixture 08: material envelope revision invalidates evaluations | Profile D | `identity-verification`, `recipient-classification`; `policy-boundary` may be selected by the external-boundary profile even if not represented in the minimal fixture record | PGDL, AAG, Runtime Binding, receipt continuity |
| Fixture 11: receipt reservation failure | Profile E or fixed receipt-continuity baseline | `identity-verification`; `policy-boundary` is conceptually part of the consequential profile but not represented in the minimal fixture record | PGDL, AAG, receipt continuity failure, system-level audit event |
| Fixture 14: runtime mismatch before side effect | Profile D for the attempted external publishing context, after a prior internal-draft permit path | No external evaluator module is primary in the mismatch fixture | Runtime Binding, AAG scope boundary, receipt continuity |

Fixtures 11 and 14 primarily exercise fixed internal roles rather than external evaluator selection. Fixture 11 tests receipt continuity as a prerequisite. Fixture 14 tests Runtime Binding as an enforcement role after permit issuance. Neither role should be forced into the external-module manifest model.

## 9. Future TypeScript Artifact Shape

A future static profile artifact pass may add:

- typed governance-profile artifacts
- profile-to-module linkage tests
- fixture-to-profile linkage tests
- rules preventing profiles from weakening manifest boundaries
- rules keeping fixed internal roles separate
- static profile integrity references

Resolvers should not depend on dynamic profile loading yet. A first pass should remain static and local, similar to the module-manifest artifacts. It should not add runtime plugin resolution, adapter calls, orchestration services, external execution, or permit issuance.

## 10. Open Questions

- Should profiles compose from reusable baselines or remain flat initially?
- Should requirement class live only in profiles, or should manifests retain a conservative default?
- How should profile changes invalidate existing evaluations and permits?
- How should optional advisory modules be enabled for specific action envelopes?
- Should profile selection occur from workflow configuration, action-envelope classification, or both?
- When should domain-specific profiles be added beyond the generic first set?
- How should receipt contributions from selected modules map into unified-receipt fixtures?

## 11. Recommended Next Step

The project appears ready for a restrained static TypeScript governance-profile artifact pass.

That pass should implement only the small reference profile set and linkage tests. It should keep profiles static, local, versioned, and integrity-referenced. It should prove that selected modules resolve to manifests, that profile bindings cannot exceed manifest boundaries, that fixed internal AGS roles remain separate, and that fixture-to-profile mappings are explicit.

It should not add runtime registry behavior, adapter SDK behavior, dynamic module loading, live agents, external execution, approval write-back, UI behavior, orchestration services, backend services, production cryptography, or permit issuance.
