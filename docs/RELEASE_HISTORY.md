# Release History

Alignment Governance Stack grew from a compact runtime spine into a full governance stack around that spine.

## Current Full Stack

```text
Integration Adapters
-> Company Alignment Profile Generator
-> Alignment Gap Detector / Policy Conflict Analyzer
-> Policy Profile with Hard Boundaries
-> Authority Map / Approval Validation
-> Human Participation Quality
-> PGDL
-> Policy Resolution
-> AAG
-> Runtime Binding
-> Receipt
-> Governance Memory / Internalization Layer
-> Governance Reality Reports / Audit Core
-> Evaluation Suite
-> Developer CLI
```

## Release Ladder

| Version | Milestone | Layer Added | Status |
| --- | --- | --- | --- |
| v1.5.0 | Governance Reality Report Foundation | Professional audit reports, theater signal taxonomy, and local report CLI | Current |
| v1.4.0 | Content Publishing Dogfood Agent | Public voice, claims, provenance, and publishing eval proof | Complete |
| v1.3.0 | Alignment Gap Detector / Policy Conflict Analyzer | Pre-runtime company governance diagnostics | Complete |
| v1.2.0 | Adversarial Red-Team Eval Pack | Deterministic bypass and exploit regression cases | Complete |
| v1.1.0 | Dogfood Workbench Eval Pack | Internal AGS development evals plus Enterprise Financial Report Golden Path | Complete |
| v1.0.1 | Stabilization and Release Cleanup | Release history, docs, demo cleanup | Complete |
| v1.0.0 | First Complete Alignment Governance Stack | Governance Memory / Internalization Layer | Complete |
| v0.9.0 | Integration Adapters | n8n adapter foundation | Complete |
| v0.8.0 | Developer CLI | Local terminal access | Complete |
| v0.7.0 | Evaluation Suite | Deterministic cross-stack evals | Complete |
| v0.6.0 | Human Participation Quality | Meaningful participation checks | Complete |
| v0.5.0 | Authority Map and Approval Validation | Scoped approval validation | Complete |
| v0.4.0 | Hard Boundary Policy Compiler | Explicit hard stops | Complete |
| v0.3.0 | Company Alignment Profile Generator | Draft policy and authority generation | Complete |
| v0.2.0 | Policy Profiles | Organization policy resolution | Complete |
| v0.1.0 | Core Spine | PGDL, AAG, Runtime Binding, Receipts | Complete |
| v0.1.0-scaffold | Initial Scaffold | Monorepo foundation | Complete |

## Shared v0.9.0 / v1.0.0 Commit

The Dogfood Workbench includes an Enterprise Financial Report Golden Path demo track. The v1.2.0 red-team pack builds on that by testing adversarial attempts against the same governance stack.

v0.9.0 and v1.0.0 currently point to the same commit because Integration Adapters and Governance Memory were committed together. This is acceptable for the project history, but the milestones should be read separately:

- v0.9.0 is the Integration Adapters milestone.
- v1.0.0 is the first complete stack snapshot, including Governance Memory.

Future releases should avoid bundling multiple milestones into one commit or tag when possible, so the release ladder remains easy to audit.
