# Modular Architecture

The Alignment Governance Stack (AGS) is a modular, vendor-neutral reference architecture for governed delegation. It defines required governance functions and optional implementation slots. It does not require one closed platform to own identity, policy, semantic context, agent orchestration, runtime control, observability, evidence, and audit. It defines the governed path those systems must preserve when delegated AI actions move from human intent toward real-world consequence.

The names matter because they describe distinct governance functions: the Alignment Governance Stack is the overall architecture, the Pre-Gate Deliberation Layer challenges a proposed trajectory before authorization, and the Agent Action Gate determines whether that trajectory has legitimate permission to proceed.

## Core architectural concepts

- **Alignment Governance Stack (AGS)** is the overall governance architecture for preserving legitimate human agency across delegated artificial action, from authority and context through deliberation, authorization, execution, evidence, memory, and operator visibility.
- **Pre-Gate Deliberation Layer (PGDL)** is the structured pre-authorization challenge layer that examines a proposed interpretation or trajectory before it reaches authorization. It should challenge semantic drift, scope expansion, weak or disputed evidence, uncertainty, proposal laundering, conflicts, and other reasons a proposal may require revision. It matures proposals; it does not grant permission or execute actions.
- **Agent Action Gate (AAG)** is the consequential authorization boundary that determines whether a proposed action may proceed, must be revised, must be escalated, or must be blocked under current authority, scope, context, policy, assurance, and risk conditions. Human approval is evidence considered within that boundary, not a substitute for it.

PGDL challenges the proposal. AAG governs passage. Runtime Binding constrains the authorized execution. Receipts preserve evidence of what occurred.

Runtime Binding is not another approval step: it enforces fidelity between authorization and execution at the host's execution boundary. Receipts preserve supplied evidence, including refusals and decisions where nothing executed; they are evidence, not authority or independent proof of external execution.

These definitions describe architectural responsibilities, not universal implemented detection coverage. The current PGDL uses deterministic rules over supplied proposals and evidence. AAG's public outcomes remain `allow`, `require_approval`, `revise_action`, and `block`; escalation describes the need for human resolution, not a new API outcome. Architectural assurance requirements do not by themselves establish implemented assurance coverage.

The core question for any implementation is not "Does one product do everything?" The better questions are:

- Where does this system belong?
- Which governance boundary does it cover?
- What does it assume exists upstream?
- What does it enforce downstream?
- What remains uncovered?
- Can it connect through an adapter without weakening human authority, runtime constraint, or accountable proof?

This repository implements some functions more fully than others. This document describes the intended architecture and vocabulary for the stack. It is not a claim that every function is already production-ready in this codebase.

## Canonical scope and operator-facing spine

This document is the canonical AGS architecture reference. Its purpose is to preserve legitimate human agency across delegation by keeping intent, information, proposals, authority, execution, and evidence connected. It defines architectural responsibilities and invariants, not a certification protocol or evidence that every deployment is safe or compliant. See [Origin and Stewardship](../ORIGIN_AND_STEWARDSHIP.md) for lineage and open stewardship, and [Current AGS Architecture](CURRENT_ARCHITECTURE.md) for implementation detail.

The ten-layer operator-facing spine is a navigation and explanation view of the architecture. The five planes/surfaces below group responsibilities; they do not add packages or replace the twelve required governance functions defined later in this document.

| Position | Canonical operator-facing name | Plane or surface | Relationship to required governance functions |
| --- | --- | --- | --- |
| 01 | Human Agency | Human-authority plane | Human and Organizational Authority; meaningful participation and refusal power evaluated by Human Agency Audit |
| 02 | Governance Substrate | Human-authority plane | Governance Substrate: policy, identity, permissions, and authority context |
| 03 | Context Admission | Deliberative plane | Implements Semantic Context and Admissibility for supplied material information; never approves execution |
| 04 | Agent Reasoning | Deliberative plane | Agent Reasoning and Proposal Formation; forms candidate trajectories and is not itself a governance control |
| 05 | Pre-Gate Deliberation Layer (PGDL) | Deliberative plane | Pre-Gate Deliberation Layer; matures, objects to, revises, escalates, rejects, or forwards proposals without approving or executing them |
| 06 | Agent Action Gate (AAG) | Enforcement plane | Agent Action Gate; the hard execution decision gate |
| 07 | Runtime Binding | Enforcement plane | Machine-Level Execution Binding; checks the exact action against a valid permit |
| 08 | Receipts | Evidence/maturation plane | Receipts and Evidence; preserves supplied decision and execution evidence |
| 09 | Governance Memory | Evidence/maturation plane | Governance Memory and Internalization; recommendations under human review, never automatic authority or policy changes |
| 10 | Continuity Console | Operator surface | Read-only operator/evidence surface across the functions, not an enforcement layer |

Business-Level Runtime Admissibility remains a distinct required function at commitment, not a separately implemented general-purpose package or a synonym for Runtime Binding. Execution Environments and Consequence remains the place where side effects occur. Human Agency Audit remains the capstone evaluation function across the entire path. None of these functions disappears because the operator view uses ten entries. The Console's advanced twelve-function map remains valid; this operator vocabulary does not assert that every UI view already uses the ten-entry layout.

The core action-control sequence remains **PGDL -> AAG -> Runtime Binding -> Receipts**. A host executes an allowed, bound action at the actual consequence boundary and supplies execution evidence for receipts. A denial also produces decision evidence; a receipt does not imply that execution occurred.

## Handoff Integrity

**Handoff Integrity** is a cross-cutting invariant, not another layer. Across people, agents, tools, artifacts, and time, a handoff should preserve relevant meaning, provenance, restrictions, refusal history, and the connection between authority and consequence. Information transfer does not transfer authority; each receiving use and consequential action needs applicable current evidence.

- **Semantic continuity:** preserve provenance and admissible meaning across inherited artifacts, summaries, transformations, and receiving purposes. Context Admission checks supplied evidence, including ancestor restrictions and transformation lineage. Missing provenance is an evidence gap, not proof of maliciousness. Stored history is not automatically admissible operational context.
- **Runtime continuity:** preserve the relationship between the authorized proposal, exact runtime action, final mutation-capable boundary, and recorded outcome. Runtime Binding checks canonical action fields and supplied execution constraints; arbitrary metadata is not execution-authoritative. The host must enforce the check where side effects occur and supply evidence of what actually ran.

Source, validator, and authority recognition and the evaluation clock remain host-controlled, separate from retrieved content. Prior admission, approval, or validation does not automatically apply to another receiver, purpose, target, or time. Neither continuity claim implies universal inspection of model tokens, hidden dependencies, source identities, live revocations, or semantic transformations. See [Governed Information Inheritance](GOVERNED_INFORMATION_INHERITANCE.md) and [Runtime Binding](RUNTIME_BINDING.md).

## Core invariants

These are architectural requirements and stewardship principles, not claims that the library alone enforces every condition in a deployment.

- Capability does not create authority.
- Persistence does not preserve authority.
- Information transfer does not transfer authority.
- Authorization is not proof of execution.
- Integrity is not authentication.
- Consensus does not create authority.
- Approval does not establish truth.
- Denial does not establish falsehood.
- Governance should constrain consequence without constraining truth-seeking.
- Authority may stop an action, but should not rewrite the epistemic record.
- A valid refusal must remain visible to the trajectory.
- The governor must also be governed.
- High stakes require stronger assurance, not merely more validators.
- Context must not outrun provenance.
- Availability is not admissibility.
- Assurance should be plural, but plurality must not be mistaken for independence.
- Authorization must remain valid until the final mutation-capable boundary.
- Preserve legitimate human agency across delegation.

The existing thesis remains: proposal must not outrun objection; action must not outrun discernment; execution must not outrun authorization; memory must not outrun human review; context must not outrun provenance.

### Keep knowledge, permission, and outcomes distinct

| Status | Question | Boundary |
| --- | --- | --- |
| Epistemic status | What does the evidence support, dispute, or leave unknown? | Approval, denial, or validator agreement does not determine truth. Preserve objections, uncertainty, and the grounds for refusal. |
| Authorization status | May this actor perform this action for this purpose, target, scope, and time? | Authority and current conditions govern consequence; historical permission is not current authorization. |
| Execution evidence | What action actually ran, and what supports that account? | A permit or successful binding check does not prove external execution. Receipts preserve supplied evidence; hash integrity alone does not authenticate its source. |

## Implementation and research status

The [release history](RELEASE_HISTORY.md) records v1.13.0 as the current documented project milestone, separately from package versions. The implemented local stack includes Context Admission, PGDL, AAG, Runtime Binding with bound execution constraints, Receipts, and human-reviewed Governance Memory, together with policy, authority, participation, audit, and evaluation support. The [Continuity Console](CONTINUITY_CONSOLE.md) keeps Sample Mode distinct from read-only Local Evidence Mode. Imported decisions are historical evidence, not new approvals or live enforcement.

Assurance is an architectural requirement whose implementation and validation must be established separately for each deployment. It does not confer authority, establish objective truth, or prove validator independence.

The [Runtime Governance Interoperability Specification](RUNTIME_GOVERNANCE_INTEROPERABILITY_SPEC.md) remains a proposed protocol; static fixtures and reference resolvers do not establish full implementation or conformance. Live external adapters, durable evidence storage, issuer authentication, current revocation services, comprehensive business-state checks, and integration at every final mutation boundary remain host responsibilities or future integration work. The media-agency adapter is simulation-only. Architectural fit, mapped integration, tested behavior, and production validation must remain distinct claims.

## Required Governance Functions

Required governance functions are the load-bearing spine of a complete deployment. They may be implemented by AGS packages, compatible external systems, adapters, or organization-specific infrastructure, but the functions should remain present when the deployment risk profile calls for them.

1. Human and Organizational Authority

   The source of intent, responsibility, refusal power, and rightful delegation. This function answers who may initiate, approve, refuse, revise, halt, or escalate consequential action.

2. Governance Substrate

   The substrate for identity, policy, permissions, jurisdiction, authority maps, and governance state. It supplies the context that lets the rest of the stack distinguish authorized delegation from unsupported action.

3. Semantic Context and Admissibility

   The shared meaning and governed-context function. It covers object boundaries, lineage, admissible interpretation, and the context needed to prevent agents or workflows from acting on distorted or invalid representations.

   Implemented in v1.13.0 by `context-admission` for supplied artifacts and evidence. A persistent artifact is a handoff across time; admission checks receiving use, provenance, authority, validity and transformation lineage. It does not grant execution approval or claim universal model-token enforcement. See [Governed Information Inheritance](GOVERNED_INFORMATION_INHERITANCE.md).

4. Agent Reasoning and Proposal Formation

   The planning and proposal function. It covers drafting, orchestration, tool selection, workflow planning, and proposed next actions before those proposals are challenged or gated.

5. PGDL: Pre-Gate Deliberation Layer

   The proposal maturation layer. PGDL challenges distorted framing, unsafe proposals, proposal laundering, fake compliance language, and premature action before a proposal reaches the execution gate.

6. AAG: Agent Action Gate

   The execution decision gate. AAG authorizes, revises, escalates, or blocks proposed actions based on authority, scope, reversibility, approval, sensitive data exposure, runtime safety, and audit expectations.

   The v1.14.0 adds [Risk-Scaled Assurance](RISK_SCALED_ASSURANCE.md) as an AAG supporting package for host-designated actions. It checks declared risk, required validator roles and independence, freshness, and refusal resolution. Assurance is distinct from context admissibility and action authority; it is not a thirteenth architectural function. Runtime Binding reevaluates current assurance at the execution boundary.

7. Business-Level Runtime Admissibility

   The commit-boundary decision function. It validates whether an enterprise decision should still proceed under current policy, live business state, authority, approval validity, and risk conditions.

8. Machine-Level Execution Binding

   The binding function that ensures the exact approved mutation executes faithfully under narrow runtime constraints. It prevents approved-proposal drift, tool substitution, target substitution, scope expansion, stale approval use, and execution without a valid permit.

9. Execution Environments and Consequence

   The tools, workflows, services, systems, APIs, and operating environments where delegated decisions create real-world state changes or other consequential effects.

10. Receipts and Evidence

   The proof layer. Receipts and evidence preserve proposal-to-consequence traceability, audit continuity, decision context, approval evidence, runtime validation, and post-decision accountability.

11. Governance Memory and Internalization

   The controlled learning function. Governance Memory learns from approvals, refusals, outcomes, incidents, and receipts under human review. It may recommend improvements, but it should not silently mutate policy, authority, or runtime constraints.

12. Human Agency Audit

   The capstone evaluation layer. It evaluates whether the complete system preserves meaningful human judgment, refusal power, participation, accountability, and authority across the path from delegation to consequence.

## Optional Implementation Slots

Optional implementation slots are replaceable or selectable categories where compatible systems can fit. A product, service, internal platform, or open-source component can occupy one or more slots, but no single product should automatically be treated as the entire stack.

- Authority and identity systems
- Policy engines
- Semantic substrates
- Context and lineage systems
- Agent frameworks
- Workflow orchestrators
- Deliberation and review tools
- Business-level runtime-admissibility engines
- Machine-level execution-control systems
- Enterprise tools and APIs
- Observability systems
- Receipt stores
- Audit exporters
- Governance-memory systems
- Human-interface adapters

An external system can provide an implementation slot, connect through adapters, or be architecturally mappable without being integrated, tested, red-teamed, or production-validated. Status language should track the evidence that exists.

## Decision Layer vs Execution Layer

Runtime governance has at least two related but distinct layers. They should connect, but they are not interchangeable.

### Business-Level Runtime Admissibility

Question:

> Should this enterprise decision still happen now?

Business-level runtime admissibility evaluates whether the decision is still acceptable at the point of commitment. It can consider:

- current policy
- live business state
- authority
- risk thresholds
- approval validity
- commit-boundary conditions

This layer is concerned with whether the organization should still allow the decision given its present business, policy, authority, and risk context.

### Machine-Level Execution Binding

Question:

> Can this exact approved mutation execute faithfully now?

Machine-level execution binding evaluates whether the concrete mutation matches the narrow permit. It can consider:

- exact payload
- narrow permit
- host-local state
- mutation scope
- tool permissions
- replay protection
- execution fidelity

This layer is concerned with faithful execution. It prevents a permitted action from becoming a different action at the machine boundary.

Business-level runtime admissibility can decide whether a consequential enterprise decision remains allowed. Machine-level execution binding can enforce that the exact approved mutation is the one that runs. A governed deployment may need both.
