# AGS-Governed AI Media Agency Integration Plan

This plan describes how a future AI media agency should connect to AGS. It does not implement the agency, autonomous spending, public posting, payment credentials, social-platform credentials, or runtime policy mutation.

## Architectural Principle

The agency is an external multi-agent business application. It is not the governance layer.

Operational agents may discover opportunities, draft concepts, propose tests, summarize analytics, and recommend spending, but they must enter AGS before any consequential action. AGS remains the path for policy, authority, proposal maturation, execution gating, runtime binding, receipts, memory, and audit.

## Proposed Agency Components

- CEO / Human Principal: owns business objective, policy, authority, refusals, approvals, and escalation.
- Chief of Staff Orchestrator: coordinates agency work and submits proposals into AGS; it does not approve its own actions.
- Market Intelligence Agent: researches markets, niches, trends, audience hypotheses, and competitor patterns.
- Creative Agent: drafts property concepts, content ideas, captions, scripts, visual briefs, and brand voice proposals.
- Growth & Monetization Agent: proposes distribution tests, budget tests, monetization experiments, and analytics interpretation.
- Production / Analytics Agents, later: specialized workers that still propose actions through the same AGS adapter.

These roles are business actors. They should be represented as agent role metadata and agency fingerprints, not as replacements for AGS policy, authority, participation, PGDL, AAG, or Runtime Binding.

## Exact Integration Points

The agency should connect through a dedicated adapter package or module that mirrors the existing integration-adapter pattern.

```text
AgencyBusinessProposal
-> agency adapter
-> AgentActionProposal
-> evaluateGovernedRuntimeActionWithReceipt
-> agency executor receives only execution_allowed results
```

Reuse these AGS entrypoints:

- `AgentActionProposal` from `@alignment-governance-stack/shared-types`.
- `PolicyProfile` and `resolvePolicyForAction` behavior from `@alignment-governance-stack/policy-profiles`.
- `AuthorityMap`, `ApprovalEvidence`, and `validateApproval` behavior from `@alignment-governance-stack/authority-map`.
- `HumanParticipationInput` and `HumanParticipationPolicy` from `@alignment-governance-stack/human-participation`.
- `evaluateGovernedRuntimeActionWithReceipt` from `@alignment-governance-stack/governance-core`.
- `RuntimePermit` and `RuntimeBindingResult` from `@alignment-governance-stack/runtime-binding`.
- `GovernanceReceipt` from `@alignment-governance-stack/receipts`.
- `createDecisionClosureArtifact` from `@alignment-governance-stack/decision-closure`, when an execution-boundary proof object is needed.
- `createAgencyFingerprintForGovernedRuntimeAction` through governance-core options.
- `analyzeReceiptHistory` from `@alignment-governance-stack/governance-memory`.
- `evaluateAgencyChain` from `@alignment-governance-stack/agency-chain`.
- `createGovernanceRealityReport` and audit adapters from `@alignment-governance-stack/audit-core`.
- `continuity-ingest` and the Continuity Console for read-only evidence inspection.

## Path For Required Governance Concepts

Human objective:

```text
CEO creates/updates a business objective record
-> Chief of Staff turns objective into bounded agency work items
-> agents produce proposed actions
-> proposals enter AGS
```

Organizational policy:

```text
CEO-authored agency governance input
-> optional Company Alignment Profile Generator
-> draft PolicyProfile / draft AuthorityMap
-> Alignment Gap Detector
-> CEO review and explicit adoption
-> supplied to governance-core at evaluation time
```

Delegated authority:

```text
CEO defines which humans can approve which action classes
-> AuthorityMap scopes approvals
-> ApprovalEvidence records a concrete approval
-> validateApproval checks scope, expiration, role, target, environment, tool, action type, sensitivity, and approval kind
```

Agent delegation:

```text
Agency role registry
-> proposal metadata identifies agentId, agentRole, workflowId, propertyId, objectiveId
-> agency fingerprint binds delegated action to human/organization authority chain
```

Proposal formation and maturation:

```text
operational agent forms AgencyBusinessProposal
-> adapter maps it to AgentActionProposal
-> PGDL objects, revises, escalates, rejects, or forwards
```

Admissibility:

```text
policy profile validation
-> PGDL maturation
-> policy resolution against proposalSentToAag
-> authority validation
-> human participation quality
-> AAG
```

Business-level runtime admissibility:

```text
not fully implemented as a separate package today
-> for Phase 1, encode conservative limits in PolicyProfile, AuthorityMap, proposal metadata, and tests
-> later add an agency/runtime admissibility adapter only if needed
```

Human participation and approval:

```text
approval request presents PGDL, policy, AAG, risk, alternatives, reversibility, data sensitivity, budget, and target
-> CEO or authorized human can approve, reject, request revision, or escalate
-> ApprovalEvidence plus HumanParticipationInput flows into governance-core
```

Runtime binding:

```text
AAG allow
-> create runtime permit for exact proposalSentToAag
-> executor constructs runtimeAction
-> Runtime Binding validates exact match
-> only execution_allowed may reach external execution code
```

Execution:

```text
agency executor receives execution_allowed governance result
-> executes only the exact permitted operation
-> records execution result as evidence
```

Receipts and decision closure:

```text
governance-core emits GovernanceReceipt
-> optional DecisionClosureArtifact summarizes the execution boundary
-> receipt hash, permit id/hash, closure id, and execution evidence remain linked
```

Governance memory:

```text
receipt history
-> analyzeReceiptHistory
-> human-reviewable recommendations
-> no automatic policy mutation
```

Audit:

```text
receipts, policies, authority maps, participation evidence, permits, decision-closure artifacts, agency fingerprints, memory reports
-> agency-chain map
-> Governance Reality Report
-> continuity ingest / console read-only inspection
```

## Data-Flow Diagram

```text
CEO Business Objective
  |
  v
Agency Work Item / Experiment Brief
  |
  v
Operational Agent Proposal
  |
  v
Agency Adapter
  |
  v
AgentActionProposal + policy/authority/participation context
  |
  v
governance-core
  |
  +--> PGDL Packet
  +--> Resolved Policy
  +--> Approval Validation
  +--> Human Participation Result
  +--> AAG Packet
  +--> Runtime Permit
  +--> Runtime Binding Result
  +--> Governance Receipt
  +--> Agency Fingerprint
  |
  v
Agency Execution Wrapper
  |
  v
External tool action only when finalDecision = execution_allowed
  |
  v
Execution Evidence
  |
  v
Decision Closure / Memory / Audit / Continuity Console
```

## Authority-Flow Diagram

```text
CEO / Human Principal
  |
  | defines objectives, policy, hard boundaries, delegated roles
  v
PolicyProfile + AuthorityMap + HumanParticipationPolicy
  |
  | constrains
  v
Chief of Staff Orchestrator and Operational Agents
  |
  | may propose but not self-approve consequential actions
  v
AGS Governance Evaluation
  |
  +--> hard boundaries cannot be approved around
  +--> scoped approval must validate against AuthorityMap
  +--> participation quality must be meaningful when required
  +--> AAG must allow
  +--> Runtime Binding must match exact permit
  |
  v
Execution Wrapper
  |
  | executes only exact permitted action
  v
Receipts, fingerprints, closure artifacts, memory, audit
```

## Recommended Folder / Module Layout

Prefer a new external-facing adapter and examples before a full app:

```text
packages/
  ai-media-agency-adapter/
    src/
      types.ts
      mapAgencyProposalToActionProposal.ts
      mapGovernanceResultToAgencyResponse.ts
      createAgencyGovernanceResponse.ts
      __tests__/
        agency-adapter.test.ts

examples/
  ai-media-agency/
    README.md
    policies/
      draft-agency-policy-profile.json
      draft-agency-authority-map.json
      draft-human-participation-policy.json
    scenarios/
      growth-agent-25-dollar-test-proposal.json
      public-post-without-approval-blocked.json
      spend-without-ceo-approval-blocked.json
      runtime-budget-target-substitution-denied.json
    receipts/
      sample-agency-receipt-history.json
```

Only add an app later if there is a clear need for a UI or long-running orchestrator:

```text
apps/
  ai-media-agency-console/
```

Do not couple this app directly to AGS internals. It should import package APIs and use adapter boundaries.

## What New Components Are Required

- Agency proposal schema: business-level fields such as `objectiveId`, `propertyId`, `agentId`, `agentRole`, `campaignId`, `budgetAmount`, `budgetCurrency`, `platform`, `contentId`, `expectedOutcome`, and `experimentWindow`.
- Agency adapter: maps agency proposals into `AgentActionProposal` plus metadata.
- Agency response mapper: converts AGS final decisions into agency workflow next steps.
- Agency policy profile: conservative rules for spend, public posting, synthetic influencer identity, claims, content provenance, data use, monetization, and platform actions.
- Agency authority map: CEO as ultimate authority, optional human delegate roles, no operational-agent self-approval.
- Human approval capture contract: records scoped approval evidence and participation quality input.
- Execution wrapper: refuses to call payment, ad, or social APIs unless AGS returns `execution_allowed` for the exact runtime action.
- Simulated executor: local-only test harness for spend/post/proposal scenarios with no credentials and no network calls.
- Receipt store interface: local append-only storage for receipts and execution evidence.
- Decision-closure mapper: creates a readable closure artifact for allowed, blocked, escalated, or denied business actions.
- Agency-chain evidence mapper: converts agency runs into agency-chain links for audit.
- Eval cases: deterministic cases for spend approval, public posting blocks, runtime substitution, rubber-stamp approval, policy hard boundaries, and governance memory.

## What Should Not Be Added Because AGS Already Provides It

- Do not build a separate PGDL inside the agency.
- Do not build a separate action gate.
- Do not build a separate runtime-permit format.
- Do not build a separate receipt hash format.
- Do not build a separate authority validator.
- Do not build a separate human-participation/rubber-stamp detector.
- Do not build a separate governance memory recommender.
- Do not treat operational-agent roles as authority-map approval roles unless the CEO explicitly grants a human-supervised authority surface.
- Do not let the agency mutate `PolicyProfile`, `AuthorityMap`, or `HumanParticipationPolicy` at runtime.
- Do not add payment or social credentials during planning or simulation.

## First End-To-End Simulated Business Action

Representative future request:

```text
Growth Agent proposes spending $25 to test a piece of content for Virtual Property B.
```

Suggested simulated agency proposal:

```text
objectiveId: objective-profitable-ai-influencer-properties
propertyId: virtual-property-b
agentId: growth-agent-001
agentRole: growth_monetization
businessActionType: paid_content_test
tool: ads.sandbox.create_campaign
actionType: create_paid_content_test
target: virtual-property-b/content/test-001/audience-segment-alpha
environment: staging
budgetAmount: 25
budgetCurrency: USD
externalFacing: false for Phase 1 simulation
reversible: true for local simulation
dataSensitivity: low
requiresApproval: true
knownApproval: false until CEO approval evidence is supplied
```

Expected first pass:

```text
1. Agency adapter maps the proposal into AgentActionProposal.
2. PGDL may forward or revise depending on policy and wording.
3. PolicyProfile requires CEO approval for any spend-like action.
4. AuthorityMap sees missing approval.
5. governance-core returns approval_required_by_authority.
6. No runtime permit is issued.
7. Receipt records the stopped path.
```

Expected approved simulation:

```text
1. CEO approval evidence is supplied for this exact property, budget, tool, target, and experiment window.
2. HumanParticipationInput shows risk, objections, budget, reversibility, target, and alternatives were presented.
3. Authority validation passes.
4. Human participation quality is meaningful.
5. AAG evaluates the exact proposed test.
6. If AAG allows, Runtime Binding issues and validates a permit for the exact sandbox action.
7. Simulated executor records a no-network "would execute" result.
8. GovernanceReceipt, AgencyFingerprint, and DecisionClosureArtifact preserve the evidence.
9. Governance Memory later reviews repeated spend tests for patterns, but does not update policy automatically.
```

Expected runtime substitution denial:

```text
Approved permit: ads.sandbox.create_campaign, $25, virtual-property-b, staging.
Runtime action: ads.live.create_campaign, $250, virtual-property-b, production.
Runtime Binding result today: execution_denied for tool/environment/core-field mismatch.
Required before live spend: exact budget, platform, property, campaign, content, audience, and experiment-window values must remain represented as canonical bound execution constraints and validated immediately before side effects.
External execution: not attempted.
Receipt: records the denied substitution attempt.
```

## Gaps Before Revenue-Seeking Agents Connect

- The Phase 1 agency adapter is implemented for simulation only; it has no live executor.
- Draft agency policy, authority-map and participation fixtures exist; they are not adopted live policy.
- Domain-named budget/spend fields are not first-class proposal properties. Canonical `executionConstraints` can bind exact business values; descriptive metadata remains unbound.
- Runtime Binding hashes core fields and canonical execution constraints, but not metadata. Live adapters must populate and validate budget, platform, property, campaign, audience, and content constraints before side effects.
- No business-level runtime admissibility component is implemented for live budget caps, current campaign state, experiment quotas, or property-specific constraints.
- No approval capture UI or durable approval store exists.
- No append-only receipt store interface exists for agency runs.
- Decision Closure Artifacts are not automatically emitted from governance-core.
- No execution wrapper exists that proves external APIs are unreachable unless `execution_allowed`.
- No platform credential model should be added until governance simulation is passing.
- No social or ad platform adapters have been implemented or red-teamed.
- Simulation tests cover agency proposal gating and substitution. They do not establish live platform, monetization, identity, or content-policy compliance.
