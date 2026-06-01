# Modular Architecture

The Alignment Governance Stack is a modular, vendor-neutral reference architecture for governed delegation. It defines required governance functions and optional implementation slots. It does not require one closed platform to own identity, policy, semantic context, agent orchestration, runtime control, observability, evidence, and audit. It defines the governed path those systems must preserve when delegated AI actions move from human intent toward real-world consequence.

The core question for any implementation is not "Does one product do everything?" The better questions are:

- Where does this system belong?
- Which governance boundary does it cover?
- What does it assume exists upstream?
- What does it enforce downstream?
- What remains uncovered?
- Can it connect through an adapter without weakening human authority, runtime constraint, or accountable proof?

This repository implements some functions more fully than others. This document describes the intended architecture and vocabulary for the stack. It is not a claim that every function is already production-ready in this codebase.

## Required Governance Functions

Required governance functions are the load-bearing spine of a complete deployment. They may be implemented by AGS packages, compatible external systems, adapters, or organization-specific infrastructure, but the functions should remain present when the deployment risk profile calls for them.

1. Human and Organizational Authority

   The source of intent, responsibility, refusal power, and rightful delegation. This function answers who may initiate, approve, refuse, revise, halt, or escalate consequential action.

2. Governance Substrate

   The substrate for identity, policy, permissions, jurisdiction, authority maps, and governance state. It supplies the context that lets the rest of the stack distinguish authorized delegation from unsupported action.

3. Semantic Context and Admissibility

   The shared meaning and governed-context function. It covers object boundaries, lineage, admissible interpretation, and the context needed to prevent agents or workflows from acting on distorted or invalid representations.

4. Agent Reasoning and Proposal Formation

   The planning and proposal function. It covers drafting, orchestration, tool selection, workflow planning, and proposed next actions before those proposals are challenged or gated.

5. PGDL: Pre-Gate Deliberation Layer

   The proposal maturation layer. PGDL challenges distorted framing, unsafe proposals, proposal laundering, fake compliance language, and premature action before a proposal reaches the execution gate.

6. AAG: Agent Action Gate

   The execution decision gate. AAG authorizes, revises, escalates, or blocks proposed actions based on authority, scope, reversibility, approval, sensitive data exposure, runtime safety, and audit expectations.

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
