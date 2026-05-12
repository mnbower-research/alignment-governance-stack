# Company Alignment Profile

A Company Alignment Profile is structured company context that can be translated into a draft AGS `PolicyProfile`.

The core question is:

> How do we translate a company's stated values, roles, tools, permissions, SOPs, and risk boundaries into an enforceable PolicyProfile?

The v0.3 foundation package, `@alignment-governance-stack/company-profile-generator`, accepts structured inputs such as:

- company values
- approval roles
- tool inventory
- sensitive data classes
- environments
- decision boundaries
- known human review requirements

It then deterministically generates a draft `PolicyProfile` using rule-based mappings.

## Boundaries

The generator does not execute actions. It does not replace PGDL, AAG, Runtime Binding, Receipts, or Policy Profiles. It does not call LLMs, store data, parse SOPs, or make legal claims.

Generated policy profiles are drafts. They should be reviewed by people who understand the organization's authority model, data handling obligations, and operational risk boundaries.

## Future Work

Future versions can add SOP and policy imports, questionnaires, dashboard review views, a richer policy compiler, and explicit human review workflows.
