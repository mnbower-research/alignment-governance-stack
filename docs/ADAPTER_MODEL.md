# Adapter Model

Adapters are connectors between external systems and the modular governance stack. They let compatible systems supply context, receive decisions, route approvals, enforce runtime constraints, preserve evidence, or export audit records without requiring the Alignment Governance Stack to own every component.

An adapter should make its boundary explicit: what it receives, what it returns, what it is allowed to do, what it must never do, what authority it relies on, and what proof it creates.

Adapters should make composition explicit rather than silently inheriting permissions or authority from the external systems they connect.

For inherited information, a substrate or orchestration adapter should construct a `ContextAdmissionRequest` using trusted host policy and current evidence, call admission before supplying material context to reasoning, and pass the request to Governance Core for dependent proposals. Artifact text must not populate authority, validator trust, policy or approval fields. Prior decisions are historical references. See [Governed Information Inheritance](GOVERNED_INFORMATION_INHERITANCE.md) for exact-use and temporal handoff boundaries. Existing adapters are not automatically upgraded to enforce this optional contract.

| Adapter Category | Purpose |
| --- | --- |
| Substrate Adapter | Supplies identity, policy, semantic context, lineage, or authority information |
| Policy Adapter | Connects organization-specific rules, constraints, and compliance logic |
| Orchestration Adapter | Connects agent frameworks and workflow engines |
| Deliberation Adapter | Adds review, objection, challenge, or proposal-quality tooling |
| Runtime Decision Adapter | Connects business-level admissibility or commit-boundary validation |
| Execution-Control Adapter | Connects machine-level mutation controls or permit-bound execution |
| Execution Adapter | Connects tools, APIs, services, databases, and operating environments |
| Human Interface Adapter | Routes approvals, refusals, revisions, escalations, and review packets |
| Observability Adapter | Connects telemetry, dashboards, monitoring, and incident analysis |
| Receipt / Audit Adapter | Stores, signs, exports, or verifies accountability records |
| Governance Memory Adapter | Supports structured learning from prior decisions and receipts |

## Adapter Contract Template

Use this template when documenting a planned integration, candidate adapter, prototype, or tested adapter.

| Field | Description |
| --- | --- |
| Adapter name | Human-readable adapter name |
| Adapter category | One or more categories from the adapter table |
| External system | Product, service, internal platform, protocol, or tool being connected |
| Purpose | Why this adapter exists and which governance boundary it supports |
| Inputs received | Data, events, packets, permits, evidence, or context accepted by the adapter |
| Outputs returned | Decisions, normalized proposals, receipts, permits, audit records, or workflow responses returned |
| Permissions required | Minimum permissions the adapter needs |
| Actions allowed | Actions the adapter may perform |
| Actions explicitly prohibited | Actions the adapter must never perform |
| Authority source | Human, organizational, policy, identity, or approval source relied on |
| Failure modes | Known ways the adapter can fail, degrade, drift, or be bypassed |
| Fail-open or fail-closed behavior | What happens when the adapter cannot complete its function |
| Receipt fields created | Evidence fields the adapter creates or updates |
| Reversibility | Whether adapter-mediated actions are reversible, and by whom |
| Revocation path | How permissions, approvals, tokens, permits, or access can be revoked |
| Upstream assumptions | What the adapter assumes has already been validated |
| Downstream guarantees | What later layers can rely on after the adapter runs |
| Integration status | Conceptual fit, mapped, candidate adapter, prototype, integrated, tested, red-teamed, or production-validated |
| Test status | Unit, integration, fixture, scenario, red-team, manual, or untested |
| Red-team status | Bypass, drift, failure, composition, and abuse testing completed or still needed |
