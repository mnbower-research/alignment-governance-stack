# Agency Chain Mapper

The Agency Chain Mapper is a deterministic auditor layer for delegated agentic workflows.

It answers:

```text
Where was agency preserved, weakened, bypassed, or lost?
```

The Agency Chain Mapper does not determine moral responsibility or legal compliance. It identifies where a delegated-action workflow does or does not demonstrate human authority, policy constraint, runtime binding, and proof.

## What An Agency Chain Is

An agency chain is the path from human or organizational intent into delegated agent action:

```text
Human authority
-> Organizational policy / hard boundary
-> Agent role
-> Tool access
-> Proposed action
-> Approval authority / human participation
-> Runtime permit
-> Execution boundary
-> Receipt
-> Governance memory
```

Agentic systems delegate operational agency. A governance audit needs to show where that delegated agency remains constrained by human authority, scoped policy, runtime authorization, and durable evidence.

Decision Closure Artifacts complement the Agency Chain Mapper by binding execution-boundary facts into a single proof object. The mapper asks where agency is preserved or weakened; the closure artifact records what decision was made when an action reached the boundary.

## Link Types

- `human_authority`
- `organizational_policy`
- `hard_boundary`
- `agent_role`
- `tool_access`
- `proposed_action`
- `approval_authority`
- `human_participation`
- `runtime_permit`
- `execution_boundary`
- `receipt`
- `governance_memory`

## Status Meanings

- `present`: the link is demonstrated by available evidence.
- `weak`: the link exists but appears incomplete or underspecified.
- `missing`: the link is not demonstrated.
- `not_applicable`: the link is not relevant to this workflow.
- `requires_verification`: the link may exist but needs human review or better evidence.

## Broken-Link Detection

The mapper detects deterministic agency-chain issues:

- `AC-001`: Missing Human Authority
- `AC-002`: Missing Stop Authority, maps to `TG-001`
- `AC-003`: Tool Access Without Policy Scope, maps to `TG-006`
- `AC-004`: Proposed Action Without Agent Role, maps to `TG-006`
- `AC-005`: Approval Without Participation Quality, maps to `TG-002`
- `AC-006`: Approval Without Runtime Binding, maps to `TG-003`
- `AC-007`: Execution Without Receipt, maps to `TG-005`
- `AC-008`: Runtime Permit Without Receipt, maps to `TG-005`
- `AC-009`: Hard Boundary Missing For Consequential Action, maps to `TG-004`
- `AC-010`: Governance Memory Not Demonstrated, maps to `TG-010`
- `AC-011`: Human Review Cannot Change Outcome, maps to `TG-011`
- `AC-012`: Chain Evidence Insufficient, maps to `TG-012`

Issues use non-accusatory language such as missing link, weak link, not demonstrated, requires verification, potential agency-chain gap, and audit question.

## Overall Status

Overall status is calculated deterministically:

- `broken`: one or more critical issues, or missing human authority plus an execution boundary.
- `weak`: one or more high-severity issues.
- `partially_preserved`: medium issues or multiple links requiring verification.
- `preserved`: required links are present with no medium, high, or critical issues.
- `insufficient_evidence`: too many required links are missing or require verification and no execution boundary is provided.

## CLI Usage

Build first:

```bash
corepack pnpm -r build
```

Run a strong chain:

```bash
node packages/cli/dist/cli.js agency-chain examples/agency-chain/strong-agent-workflow-chain.json
```

Run a weak chain:

```bash
node packages/cli/dist/cli.js agency-chain examples/agency-chain/weak-agent-workflow-chain.json
```

Emit JSON:

```bash
node packages/cli/dist/cli.js agency-chain examples/agency-chain/weak-agent-workflow-chain.json --json
```

Exit codes:

- `0`: chain is preserved or partially preserved without high/critical issues
- `1`: chain is weak, broken, or has high/critical issues
- `2`: invalid input

## Examples

Agency-chain examples live under `examples/agency-chain`:

- `ags-self-audit-chain.json`
- `strong-agent-workflow-chain.json`
- `weak-agent-workflow-chain.json`
- `content-publishing-strong-chain.json`
- `content-publishing-weak-chain.json`

Governance Reality Report integration example:

- `examples/audit-report/ags-self-audit-with-agency-chain.json`
- `examples/audit-report/content-publishing-hardening-report.json`

## Limitations

- The mapper is deterministic and local.
- It does not execute actions.
- It does not collect customer data.
- It does not determine legal compliance.
- It does not assign blame.
- It identifies evidence gaps and audit questions requiring human verification.

## Information handoffs

Optional `contextAdmissions` inputs map recorded Context Admission evidence to `information_handoff` links and existing audit findings. Links preserve producer -> artifact -> receiver, creation/review times, transformations and context-lineage digests. Missing provenance, non-transferred authority, transformation gaps and stale/revoked context remain explicit findings. Digest/shape validation is not authentication or a new admission. See [Governed Information Inheritance](GOVERNED_INFORMATION_INHERITANCE.md).
