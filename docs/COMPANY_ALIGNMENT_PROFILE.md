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

## Hard Boundary Compilation

`CompanyDecisionBoundary.neverAutomate` can compile into `PolicyProfile.hardBoundaries` when the boundary includes explicit match fields, such as a tool, action type, environment, sensitivity level, external-facing flag, reversibility flag, or target substring.

Compiled hard boundaries are deterministic block rules. They allow company profile inputs to express actions that should not proceed to AAG at all, even if the action is technically possible.

Generic `neverAutomate` statements without match fields are preserved in generated policy metadata but are not compiled into global hard boundaries. This avoids accidentally blocking every action from a broad statement that still needs human policy design.

## Future Work

Future versions can add SOP and policy imports, questionnaires, dashboard review views, a richer policy compiler, and explicit human review workflows.
