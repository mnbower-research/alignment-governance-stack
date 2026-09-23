# Risks And Open Questions

This document records risks, assumptions, and decisions needed before connecting revenue-seeking agents to AGS.

## Architectural Risks

Operational agents may be mistaken for governance layers.

Mitigation: document and enforce that CEO, Chief of Staff, Market Intelligence, Creative, Growth, Production, and Analytics are business actors. They may propose actions but do not replace PGDL, AAG, Authority Map, Human Participation, Runtime Binding, Receipts, Governance Memory, or Audit.

Agency code may bypass AGS by calling execution tools directly.

Mitigation: place all external tool calls behind an execution wrapper that requires `execution_allowed` and a successful exact runtime binding result.

Spending may be treated as low risk because the first test budget is small.

Mitigation: require approval for all spend-like actions in early phases. Add explicit budget metadata, exact target binding, and no-autonomous-live-spend hard boundaries.

Public posting may be laundered through "draft" language.

Mitigation: reuse PGDL revision behavior and content-publishing hardening patterns. A draft permit must not authorize public posting, platform posting, public claims, or live distribution.

Generated policy may be mistaken for adopted policy.

Mitigation: Company Profile Generator output remains draft and requires CEO review. Governance Memory recommendations remain human-reviewable and must not mutate policy.

Approval may become rubber-stamping.

Mitigation: use Human Participation Quality for high-risk approvals and require presented risk, objections, alternatives, budget, reversibility, target, and data sensitivity context.

Runtime Binding does not currently cover budget and platform-specific payload fields if they live only in metadata.

Mitigation: before live spend or posting, either expand the canonical action binding contract through reviewed AGS changes or encode exact budget/platform/property/content constraints into fields that Runtime Binding already checks. Add tests for budget, platform, property, campaign, content, audience, and target substitution.

Business-level runtime admissibility is not yet a separate implemented package.

Mitigation: keep Phase 1 simulated and conservative. Encode basic budget and platform restrictions in `PolicyProfile`, `AuthorityMap`, and tests. Decide later whether to add a dedicated admissibility package.

Decision Closure Artifacts are implemented but not automatically emitted by governance-core.

Mitigation: add an agency closure mapper when needed. Do not claim closure proof exists for agency runs until artifacts are generated and validated.

Continuity Console could be misunderstood as live enforcement.

Mitigation: preserve read-only Local Evidence Mode. Do not add approval write-back, policy mutation, external execution, or live connector behavior through the Console without a separate design review.

## Governance Risks

- CEO authority must remain explicit, scoped, and reviewable.
- Operational agents must not approve their own actions.
- No role should claim authority to override hard boundaries.
- Approval evidence must bind to exact action, target, budget, platform, environment, and expiration.
- Prior approval must not be reusable across different property, budget, target, platform, or campaign.
- Human refusal, revision, halt, and escalation must remain available.
- Revenue pressure may incentivize escalating from simulation to live action before audit evidence is mature.
- Governance Memory may identify repeated approval requirements, but convenience cannot justify silent policy relaxation.
- Agent-generated influencer identities may create reputational, deception, rights, consent, or platform-policy risks that need CEO policy decisions before public use.
- Analytics and market intelligence can drift into collection or processing of sensitive personal data if not bounded.

## Technical Risks

- `AgentActionProposal` has no domain-named budget, currency, platform, content, campaign, or property fields. Its canonical `executionConstraints` can bind these values; metadata alone cannot.
- `runtime-binding` hashes and field-checks tool, action type, target, environment, reversibility, external-facing status, data sensitivity, approval booleans, and canonical `executionConstraints`. It does not hash or compare `metadata`.
- Phase 1 adapter tests intentionally demonstrate that changing only metadata, such as `budgetAmount` from 25 to 250 while canonical action fields stay fixed, is not currently denied by Runtime Binding. Explicit execution-constraint tests separately deny canonical budget substitution. Metadata-only behavior is acceptable only because the adapter has no live executor and records simulation-only outcomes with zero network calls.
- AAG finance routing includes money-transfer and payment-like actions, but paid ad tests may need explicit action-type coverage.
- AAG marketing routing covers public posting and campaigns, but platform-specific content risk may need policy/profile rules and evals.
- Runtime permit expiration defaults are caller-supplied; the agency should set short TTLs for spend/post actions.
- Receipts are deterministic objects, but there is no durable append-only store yet.
- Approval storage and identity are not implemented.
- No live platform adapters exist for ad networks, social platforms, or creator tools.
- No secret-management model exists for agency credentials.
- No cross-process enforcement prevents a separate script from calling external APIs unless the agency architecture routes all execution through the wrapper.
- The runtime governance interoperability/module-manifest specification has known ambiguities and should not be assumed implemented.

## Open Questions For CEO / Design Review

1. What is the first allowed business surface: idea generation only, simulated paid tests, draft content, or simulated end-to-end campaigns?
2. Should all spend require CEO approval at first, including $1 to $25 tests?
3. What is the first maximum simulated budget, and what will be the later live budget ceiling?
4. Which actions are hard boundaries: live spend, public posting, direct messages, adult/sensitive content, political content, medical/financial claims, identity deception, scraping, or credential access?
5. What does "Virtual Property B" mean as a governed target: persona, brand, account, content library, campaign, or legal/business asset?
6. What claims can an AI influencer property make publicly, and what claims require human review?
7. Are synthetic personas allowed to imply real human experience, endorsement, embodiment, or expertise?
8. Which human roles besides CEO may approve creative, spend, platform, or monetization actions?
9. Should Chief of Staff be able to request approvals only, or also approve low-risk internal actions?
10. What evidence must be shown for approval: budget, creative, platform, audience, expected outcome, risk, alternatives, and rollback?
11. How long should approval evidence and runtime permits remain valid?
12. Should a budget approval bind to a single content item, campaign, property, audience segment, platform, and time window?
13. What metrics determine whether a test can scale, and who approves scaling?
14. What data classes will the agency handle: public trend data, platform analytics, customer data, audience comments, creator likeness references, payment data, or vendor data?
15. What is the initial receipt storage model: examples only, local JSON files, append-only local directory, or database later?
16. Should Decision Closure Artifacts be required for every simulated spend/post action or only consequential actions?
17. What agency-chain evidence should be generated for every run?
18. What audit posture should be expected before any live integrations: tested, red-teamed, or production-validated?
19. Which platform terms, content policies, and disclosure requirements must be modeled before live use?
20. Who has emergency stop authority, and how is it represented in the AuthorityMap?

## Assumptions For The Planning Docs

- Phase 1 is simulation-only.
- No payment credentials or social-platform credentials will be added.
- No public posting will be implemented.
- No autonomous spending will be implemented.
- CEO remains ultimate authority.
- Operational agents can propose but cannot bypass AGS.
- Agency-specific business fields can initially live in adapter types and proposal metadata.
- Existing AGS packages should be reused through public exports.
- Any generated governance input is draft until human-reviewed.
- Governance Memory recommendations require human review and do not mutate policy.

## Review Gates Before Implementation

Phase 1 implementation note:

- Milestones 1-4 are implemented for simulation only.
- Existing expired-approval behavior was preserved, and time-dependent authority tests use explicit review clocks and bounded approvals. Unbound legacy approvals no longer establish current approval.
- No autonomous spending, public posting, external direct messaging, payment credentials, social-platform credentials, or live network execution was added.
- Phase 1 does not solve the metadata-binding limitation and must not be treated as live-spend ready.

Before Phase 1:

- CEO approves the agency adapter boundary.
- CEO approves initial agency policy and authority assumptions.
- CEO confirms simulation-only constraints.

Before live spending:

- Spend hard boundaries, approval rules, budget caps, permit TTLs, credential boundaries, receipt storage, and audit requirements are reviewed.
- Red-team evals pass for spend bypass, approval reuse, target substitution, platform substitution, budget escalation, and credential access.

Before public posting:

- Public content policy, identity disclosure rules, provenance rules, platform target binding, claim review, and approval quality rules are reviewed.
- Red-team evals pass for draft-to-post laundering, unsupported claims, target mismatch, stale approval, and runtime substitution.

Before policy automation:

- No policy automation should proceed until there is a separate design review.
- LLMs and operational agents must not modify governance policy at runtime.
- Governance Memory may recommend, but humans decide and apply policy changes.
