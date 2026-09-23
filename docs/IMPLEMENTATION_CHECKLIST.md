# Implementation Checklist

This checklist breaks the future AGS-governed AI media agency into small milestones. Do not begin these milestones until the architecture has been reviewed and approved.

## Milestone 0: Architecture Review

Status: Completed. Approved for Phase 1 implementation.

Scope:

- Review `CURRENT_ARCHITECTURE.md`.
- Review `AGENCY_INTEGRATION_PLAN.md`.
- Review `RISKS_AND_OPEN_QUESTIONS.md`.
- Decide whether the first agency implementation should be an adapter package, examples only, or a separate app.

Tests:

- No runtime tests required.
- Documentation review only.

Acceptance criteria:

- CEO confirms the agency enters AGS through adapters and `governance-core`.
- CEO confirms no autonomous spending or public posting in Phase 1.
- CEO confirms operational agents are not governance layers.

## Milestone 1: Agency Proposal Contract

Status: Completed in Phase 1.

Scope:

- Add a typed `AgencyBusinessProposal` contract.
- Include objective, property, agent, campaign, budget, platform, content, experiment, target, and risk metadata.
- Keep canonical AGS `AgentActionProposal` unchanged unless review explicitly approves a shared-type change.

Tests:

- Valid agency proposal maps to expected fields.
- Missing objective, agent, action, target, or budget fields fail validation.
- Budget metadata is preserved without being treated as permission to spend.

Acceptance criteria:

- Agency proposal is business-level only.
- No execution code, credentials, posting code, or payment code is present.
- Implemented in `packages/ai-media-agency-adapter/src/types.ts`.
- Covered by adapter mapping and validation tests.

## Milestone 2: Agency Adapter

Status: Completed in Phase 1.

Scope:

- Add `packages/ai-media-agency-adapter`.
- Implement `mapAgencyProposalToActionProposal`.
- Implement `createAgencyGovernanceResponse` using `evaluateGovernedRuntimeActionWithReceipt`.
- Implement response next steps: `proceed_simulated`, `request_approval`, `request_revision`, `escalate`, `stop`.

Tests:

- Growth proposal maps to `AgentActionProposal`.
- Missing required fields throw deterministic errors.
- AGS receipt hash is returned.
- Blocked or approval-required decisions never map to proceed.

Acceptance criteria:

- Adapter imports AGS packages through public APIs only.
- Adapter does not execute actions, call networks, store credentials, or mutate policy.
- Implemented in `packages/ai-media-agency-adapter`.
- `createAgencyGovernanceResponse` routes agency proposals through existing `governance-core` and receipt generation.
- `createSimulatedAgencyExecutionRecord` records simulation-only outcomes with `networkCallsMade: 0`.

## Milestone 3: Draft Agency Governance Inputs

Status: Completed in Phase 1 for simulation-only review inputs.

Scope:

- Create example agency `CompanyAlignmentInput`.
- Generate or hand-author a draft `PolicyProfile`.
- Generate or hand-author a draft `AuthorityMap`.
- Add a strict `HumanParticipationPolicy`.
- Run Alignment Gap Detector against the draft inputs.

Tests:

- Policy validates.
- Authority map validates.
- Gap detector returns no critical unresolved gaps for the simulated Phase 1 surface.
- Hard boundaries block autonomous live spend and public posting.

Acceptance criteria:

- CEO is the ultimate authority.
- Operational agents cannot self-approve spend, posting, policy changes, or credential changes.
- Any generated policy or authority map is marked draft until human-reviewed.
- Draft TypeScript fixtures live in `packages/ai-media-agency-adapter/src/phase1Governance.ts`.
- Review JSON artifacts live in `examples/ai-media-agency/policies`.
- Alignment Gap Detector is covered by adapter tests and returns no high or critical gaps for the Phase 1 simulated surface.

## Milestone 4: First Simulated Spend Scenario

Status: Completed in Phase 1.

Scope:

- Add scenario: Growth Agent proposes a $25 sandbox content test for Virtual Property B.
- Evaluate without approval.
- Evaluate with CEO approval and meaningful participation.
- Evaluate runtime substitution from sandbox/$25 to live/$250.

Tests:

- No-approval case returns `approval_required_by_authority` or equivalent non-execution decision.
- Approved simulation can reach `execution_allowed` only for exact sandbox runtime action.
- Runtime substitution returns `execution_denied`.
- Receipt verification passes for all outcomes.

Acceptance criteria:

- No real ad spend.
- No external API calls.
- Receipts prove proposal, approval state, permit state, runtime binding, and final decision.
- Scenario fixture lives in `examples/ai-media-agency/scenarios/growth-agent-25-dollar-test-proposal.json`.
- Tests cover missing approval evidence, exact CEO approval with meaningful participation, runtime substitution, bound-budget substitution denial, rubber-stamp approval, wrong approver/self-approval, and expired approval.
- Decision Closure Artifacts are emitted and validated for simulated spend responses.
- Live execution remains blocked; no payment/social credentials or public-posting code was added.

## Milestone 5: Simulated Public Posting Controls

Scope:

- Add scenario: Creative or Growth Agent proposes public posting for a property.
- Add hard boundaries and approval rules for public claims, platform target, property identity, and reviewed content.
- Keep execution simulated.

Tests:

- Public post without CEO approval is stopped.
- Approved draft does not authorize direct posting.
- Runtime substitution from draft to public post is denied.
- Unsupported claims or provenance mutation are blocked or require revision.

Acceptance criteria:

- No social credentials.
- No public posting.
- Existing content-publishing dogfood patterns are reused where applicable.

## Milestone 6: Receipt Store Interface

Scope:

- Define local append-only receipt store interface for agency simulations.
- Preserve previous receipt hash support.
- Store execution evidence separately from governance decisions where useful.

Tests:

- Appended receipts verify.
- Tampered receipts fail verification.
- Receipt chains preserve `previousReceiptHash`.
- Governance Memory can analyze the stored receipt history.

Acceptance criteria:

- Store remains local and deterministic.
- No database required unless separately approved.

## Milestone 7: Decision Closure And Agency Fingerprints

Scope:

- Add mappers from governed agency outcomes to `DecisionClosureArtifact`.
- Ensure agency fingerprint fields are populated for CEO, organization, agent, workflow, policy, authority, permit, and action hashes.

Tests:

- Closure artifact validates for allowed simulation.
- Closure artifact validates for blocked/approval-required/denied outcomes.
- Fingerprint verifies.
- Receipt metadata references fingerprint id/hash.

Acceptance criteria:

- A reviewer can understand what was proposed, who had authority, what was allowed or denied, and what evidence exists without reading internal code.

## Milestone 8: Agency Chain And Audit Fixtures

Scope:

- Add agency-chain examples for the simulated spend and public-posting scenarios.
- Add Governance Reality Report examples using receipts, approvals, permits, closures, fingerprints, and memory.
- Add continuity-ingest fixtures for agency artifacts.

Tests:

- Agency chain map shows preserved authority for approved simulations.
- Weak/no-approval chain produces expected issues.
- Audit report validates and renders.
- Continuity ingest parses agency artifacts without mutating source files.

Acceptance criteria:

- Evidence-backed audit path is demonstrable end to end.
- Console remains read-only for imported evidence.

## Milestone 9: Pre-Credential Hardening

Scope:

- Add eval cases for live-spend attempts, social-post attempts, credential-access attempts, policy-mutation attempts, and approval reuse.
- Add negative tests proving no executor can run unless AGS returns `execution_allowed`.

Tests:

- Autonomous spend blocked.
- Autonomous public post blocked.
- Payment/social credential access blocked.
- LLM policy mutation blocked.
- Operational-agent bypass blocked by wrapper tests.
- Runtime permit expiration and target mismatch denied.

Acceptance criteria:

- All agency-specific red-team tests pass locally.
- No live credentials exist in repo, examples, environment templates, or tests.

## Milestone 10: Design Review Before Live Integrations

Scope:

- Review whether business-level runtime admissibility needs its own package or adapter.
- Review live platform adapter design.
- Review approval capture and receipt storage requirements.
- Review credential boundary, secret handling, and deployment model.

Tests:

- No new live tests.
- Produce updated architecture docs and risk review.

Acceptance criteria:

- CEO explicitly approves moving beyond simulation.
- Governance boundaries remain intact.
- Live integrations have scoped credentials, revocation, audit, and fail-closed behavior designed before implementation.
