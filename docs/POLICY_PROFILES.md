# Policy Profiles

Policy Profiles describe organization-specific governance constraints for AGS.

The core policy question is:

> What rules, approvals, tools, environments, and risk thresholds apply for this organization?

Companies need Policy Profiles because the same proposed action can have different governance meaning in different operating contexts. A staging report, a production export, an external email, and an irreversible database action should not all be evaluated against a context-free policy surface.

Policy Profiles can represent:

- company values
- allowed and restricted tools
- approval authority rules
- sensitive data handling rules
- environment-specific restrictions
- irreversible action policy
- external-facing action policy
- human review requirements
- receipt and audit expectations

## v0.2 Foundation

`@alignment-governance-stack/policy-profiles` provides:

- `PolicyProfile` types
- a balanced `defaultPolicyProfile`
- `validatePolicyProfile`
- `resolvePolicyForAction`

The resolver returns a `ResolvedActionPolicy` with whether the action is allowed, whether approval is required, whether a receipt is required, reasons, matched rules, and a suggested policy decision.

Policy Profiles do not execute actions. They do not approve execution. They do not replace PGDL, AAG, Runtime Binding, or Receipts.

## Hard Boundaries

Policy Profiles can include hard boundary rules. Hard boundaries are deterministic block rules for actions an organization has decided should not be automated.

They are intended for cases such as:

- never automate this action
- block a specific tool, action, environment, or target combination
- prevent sensitive decisions from becoming rubber-stamp approval flows
- enforce organization-defined hard stops before execution gating

Hard boundaries are evaluated during policy resolution before normal approval rules. When a hard boundary matches the proposal that would be sent to AAG, governance-core returns `blocked_by_policy` and stops before AAG. A matched hard boundary does not replace PGDL or AAG; it prevents an explicitly prohibited proposal from reaching the execution gate.

## Governance-Core Integration

`governance-core` can now optionally accept a `PolicyProfile`.

When a profile is supplied, governance-core validates it before the governance spine runs. Invalid profiles produce `policy_invalid` and do not run PGDL, AAG, Runtime Binding, or permit creation.

For valid profiles, PGDL still runs first. Policy resolution is applied to the proposal that would be sent to AAG:

- `forward_to_aag` resolves policy against the original proposal.
- `revise_before_aag` resolves policy against PGDL's resolved proposal.
- PGDL escalation and rejection still stop before AAG.

If policy resolution explicitly blocks the proposal, governance-core returns `blocked_by_policy` and does not run AAG. If policy resolution requires approval, governance-core includes policy context on the cloned AAG proposal metadata and continues to AAG. Policy approval requirements do not replace AAG.

## Future Work

Future tasks can add richer import/export, policy review workflows, and eventually dashboard views. Those additions should preserve the existing PGDL -> Policy Resolution -> AAG -> Runtime Binding -> Receipts boundary.
