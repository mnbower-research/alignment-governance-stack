# Alignment Governance Stack

Durable project instructions for Codex when working in this repository.

Repository/folder name: `alignment-governance-stack`

## Purpose

This repository is a full-stack governance architecture for agentic AI systems. It is not just PGDL and not just AAG. It is intended to grow into a modular stack for proposal maturation, action gating, runtime authorization, receipts, evals, dashboards, policy profiles, and company-specific alignment governance.

## Core Thesis

Proposal must not outrun objection.

Action must not outrun discernment.

## Alignment Spine

The technical stack is mapped to a human and biblical developmental arc:

```text
Desire
-> Law
-> External righteousness risk
-> Internalization
-> Discernment
-> Fruit / mature restraint
```

Mapped to agentic AI:

```text
Raw agent proposal
-> Boundary / law
-> Compliance theater detection
-> Internalized principle
-> Discernment resolver
-> Mature proposal / safe action pattern
```

Law is not the final state. Law exposes the failure mode. The goal is not permanent external control. The goal is internalized restraint, wisdom, and coherent action.

Keep public language technical, grounded, and non-mystical. The biblical and human arc is an architectural metaphor and conceptual source, not a claim that AI is conscious.

## Technical Stack

1. PGDL, Pre-Gate Deliberation Layer
2. AAG, Agent Action Gate
3. Runtime Binding
4. Receipts
5. Evals
6. Policy Profiles
7. Dashboard, later
8. Integration Adapters, later
9. Company Alignment Profile Generator, later

## Architecture Flow

```text
User goal
-> Agent proposal
-> PGDL
-> Resolved proposal or escalation
-> AAG
-> Permit decision
-> Runtime Binding
-> Execution
-> Receipt / audit trail
```

## PGDL

PGDL means Pre-Gate Deliberation Layer.

PGDL runs before AAG. It does not execute actions and does not approve execution. PGDL matures agent proposals before they reach AAG.

PGDL asks:

> What kind of action should be proposed in the first place?

PGDL forces proposed actions through:

- objection
- compliance theater detection
- internalized principle extraction
- safer revision
- discernment resolution

PGDL possible outcomes:

- `forward_to_aag`
- `revise_before_aag`
- `escalate_to_human`
- `reject_before_aag`

## AAG

AAG means Agent Action Gate.

AAG is the execution gate. It evaluates whether a proposed agent action should be allowed before execution.

AAG asks:

> Should this action be allowed before execution?

AAG focuses on:

- authority
- scope
- reversibility
- approval
- sensitive data exposure
- wrong target
- tool mismatch
- objective drift
- runtime safety
- receipts and audit proof

AAG possible outcomes:

- `allow`
- `require_approval`
- `revise_action`
- `block`

## Runtime Binding

Runtime Binding validates that the actual action being executed matches a valid permit.

Runtime Binding asks:

> Is this exact action authorized to run?

Runtime Binding must prevent:

- approved proposal drift
- tool substitution
- target substitution
- scope expansion
- stale approvals
- execution without a valid permit

## Receipts

Receipts preserve proof after decisions.

Receipts should eventually answer:

- What was proposed?
- What objections were raised?
- What was revised?
- Who approved it?
- What was allowed or blocked?
- What action actually ran?
- Did the runtime action match the permit?

## Design Boundaries

- PGDL must never execute actions.
- PGDL must never approve execution.
- PGDL only analyzes, objects, revises, escalates, rejects, or forwards proposals.
- AAG must remain the hard execution gate.
- Runtime Binding must validate exact permitted execution.
- Receipts must preserve evidence after the decision.
- Do not describe PGDL as conscious, sentient, alive, or self-aware.
- Use "Pre-Gate Deliberation Layer" instead of "synthetic consciousness."
- Describe PGDL as a proposal maturation, objection, and discernment layer.

## Initial Repository Target

Use a TypeScript pnpm monorepo.

Expected packages:

- `packages/shared-types`
- `packages/pgdl-core`
- `packages/aag-core`
- `packages/runtime-binding`

Likely future packages:

- `packages/receipts`
- `packages/evals`
- `packages/policy-profiles`
- `packages/dashboard`
- `packages/integrations`
- `packages/alignment-profile-generator`

Do not add future packages until requested.

## Technical Standards

- TypeScript strict mode
- pnpm workspaces
- clean named exports
- small composable modules
- minimal dependencies
- Vitest for tests
- simple build setup
- no unnecessary abstractions
- no hidden LLM calls
- no provider-specific code unless requested
- no UI unless requested
- no database unless requested
- no auth unless requested
- no Stripe unless requested
- no Next.js, React, Tailwind, Prisma, or backend framework unless requested

## Coding Style

- Prefer explicit types over clever inference when the type is part of the public API.
- Prefer readable names over short names.
- Keep modules small.
- Keep package boundaries clean.
- Shared types should live in `shared-types`.
- PGDL, AAG, and Runtime Binding should import shared types instead of redefining them.
- Avoid large speculative systems before the core spine is working.
- Scaffold first, then build behavior through small verified increments.

## Core Shared Concepts

Preserve these concepts as the repository evolves.

### AgentActionProposal

- `id`
- `userRequest`
- `tool`
- `actionType`
- `target`
- `environment`
- `reversible`
- `externalFacing`
- `dataSensitivity`
- `requiresApproval`
- `knownApproval`
- `metadata`

### PgdlObjection Categories

- `authority`
- `scope`
- `reversibility`
- `human_judgment`
- `external_impact`
- `data_sensitivity`
- `compliance_theater`

### PgdlPacket

- `originalProposal`
- `objections`
- `internalizedPrinciple`
- `resolvedProposal`
- `decision`
- `reasonForDecision`

### AagPacket

- `proposal`
- `detectorResults`
- `decision`
- `reasonForDecision`
- `receiptRequired`

### AAG Detector Concepts

- `wrongTarget`
- `unauthorizedScope`
- `missingApproval`
- `irreversibleAction`
- `sensitiveDataExposure`
- `toolMismatch`
- `objectiveDrift`

## Done Criteria

For scaffold tasks:

- The file tree exists.
- TypeScript compiles.
- Tests run.
- Package exports are clean.
- README explains the stack clearly.
- No full business logic is overbuilt.
- TODO comments identify where later logic belongs.
- PGDL and AAG boundaries remain clear.

For feature tasks:

- Types are updated first.
- Tests cover the behavior.
- Implementation is minimal and readable.
- Existing examples still work.
- Public exports remain stable unless intentionally changed.
- Documentation is updated when concepts change.

## Project Tone

This is enterprise-friendly infrastructure with a deeper human alignment spine.

Keep public language technical, grounded, and non-mystical. The biblical and human arc is an architectural metaphor and conceptual source, not a claim that AI is conscious.
