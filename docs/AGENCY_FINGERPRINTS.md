# Agency Fingerprints

Agency Fingerprints are not biometric identity. They are accountability fingerprints for delegated AI action. They bind an agent's action to the human or organizational authority chain under which it acted.

Agents borrow authority. Fingerprints preserve the chain.

The purpose is accountability continuity, not surveillance. The AI did it is not an accountability model.

## Definition

An Agency Fingerprint is a deterministic record that links a governed agent action to the authority chain that allowed it:

```text
human or organization intent
-> authority map
-> policy profile
-> agent identity
-> workflow scope
-> proposed action
-> PGDL packet
-> AAG decision
-> approval record if required
-> runtime permit
-> execution result
-> receipt hash chain
```

Agency Fingerprints make delegated action traceable without treating the agent as a moral person. A fingerprint does not prove the action was good. It proves the authority chain and action identity were preserved.

## Why It Exists

Agents operate under borrowed authority. When an agent proposes, receives approval for, and executes an action, the governance stack needs continuity across the proposal, policy, approval, permit, execution, and receipt layers.

Agency Fingerprints answer:

- Who or what authorized this action?
- What human or organizational authority was the agent acting under?
- Was the action inside scope?
- Was the action approved by the correct authority?
- Was the runtime execution the same action that was authorized?
- What receipt proves the chain?
- Has the fingerprint chain been tampered with?

## What It Is Not

Agency Fingerprints are not biometric identity, workforce surveillance, behavioral profiling, or a claim that AI systems are conscious. They are deterministic accountability records for delegated operational agency.

They do not replace approval workflows, authority maps, runtime binding, receipts, or audits. They bind those artifacts together.

## Relationship To Delegated Agency

An AI agent can perform operational work, but it does not own the moral or organizational authority behind that work. The fingerprint records whose authority the agent acted under, what scope applied, what policy profile governed the action, and which runtime permit authorized execution.

This preserves accountability without treating the agent as a moral person.

## Relationship To The Stack

- PGDL: contributes the proposal maturation packet hash.
- AAG: contributes the gate decision hash.
- Runtime Binding: contributes the runtime permit hash, execution constraint hash when present, and verifies execution identity.
- Receipts: store `agencyFingerprintId` and `agencyFingerprintHash` in receipt metadata when the integration path is used.
- Authority Maps: contribute the authority map hash and approval-chain context.
- Policy Profiles: contribute the policy profile hash used for action governance.
- Governance Memory: can later analyze fingerprint and receipt chains for recurring accountability gaps.

## Threat Model

Agency Fingerprints are designed to detect or expose:

- action identity drift between proposal and execution
- permit substitution
- target or workflow scope substitution
- missing authority-chain evidence
- approval records without authority-map context
- runtime permits without AAG decision context
- tampering with prior fingerprint links
- receipt records that do not preserve the fingerprint id and hash

## Limitations

Agency Fingerprints are deterministic hashes, not signatures. Version `v0.1` does not prove who physically typed an approval, does not integrate with external identity providers, and does not provide cryptographic non-repudiation.

The fingerprint also does not prove the action was wise, ethical, compliant, or successful. It proves that the authority chain and action identity were preserved according to the fields supplied.

## Example JSON

```json
{
  "version": "agency-fingerprint/v0.1",
  "fingerprintId": "agency-fingerprint-0f4f4ed94a6a7b3d",
  "subjectHumanId": "human-founder-001",
  "subjectOrganizationId": "org-human-agency-labs",
  "delegatedBy": "human-founder-001",
  "agentId": "research-agent-001",
  "agentRole": "market-research",
  "workflowId": "workflow-competitive-brief",
  "workflowScopeHash": "sha256:mock-workflow-scope",
  "authorityMapHash": "sha256:mock-authority-map",
  "policyProfileHash": "sha256:mock-policy-profile",
  "pgdlPacketHash": "sha256:mock-pgdl-packet",
  "aagDecisionHash": "sha256:mock-aag-decision",
  "approvalRecordHash": "sha256:mock-founder-approval",
  "runtimePermitHash": "sha256:mock-runtime-permit",
  "executionConstraintHash": "sha256:mock-execution-constraints",
  "actionHash": "sha256:mock-research-action",
  "targetHash": "sha256:mock-competitor-dataset",
  "environment": "staging",
  "timestamp": "2026-05-26T12:00:00.000Z",
  "fingerprintHash": "0f4f4ed94a6a7b3d..."
}
```

## Example TypeScript

```ts
import {
  createAgencyFingerprint,
  linkAgencyFingerprint,
  validateAgencyFingerprintChain
} from "@alignment-governance-stack/agency-fingerprint";

const first = createAgencyFingerprint({
  subjectHumanId: "human-founder-001",
  subjectOrganizationId: "org-human-agency-labs",
  delegatedBy: "human-founder-001",
  agentId: "research-agent-001",
  agentRole: "market-research",
  workflowId: "workflow-competitive-brief",
  workflowScopeHash: "sha256:mock-workflow-scope",
  authorityMapHash: "sha256:mock-authority-map",
  policyProfileHash: "sha256:mock-policy-profile",
  pgdlPacketHash: "sha256:mock-pgdl-packet",
  aagDecisionHash: "sha256:mock-aag-decision",
  runtimePermitHash: "sha256:mock-runtime-permit",
  executionConstraintHash: "sha256:mock-execution-constraints",
  actionHash: "sha256:mock-action",
  timestamp: "2026-05-26T12:00:00.000Z"
});

const second = linkAgencyFingerprint(first, {
  subjectHumanId: "human-founder-001",
  subjectOrganizationId: "org-human-agency-labs",
  delegatedBy: "human-founder-001",
  agentId: "research-agent-001",
  workflowId: "workflow-competitive-brief",
  workflowScopeHash: "sha256:mock-workflow-scope",
  actionHash: "sha256:mock-next-action",
  timestamp: "2026-05-26T12:05:00.000Z"
});

const result = validateAgencyFingerprintChain([first, second]);
```

