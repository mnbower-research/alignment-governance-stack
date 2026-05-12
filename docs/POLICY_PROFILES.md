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

## Future Work

Future tasks can wire resolved policy into `governance-core`, add a company alignment profile generator, add policy profile export/import, and eventually expose dashboard views. Those additions should preserve the existing PGDL -> AAG -> Runtime Binding -> Receipts boundary.
