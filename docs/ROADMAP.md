# Roadmap

Alignment Governance Stack reached its first complete stack snapshot in v1.0.0. The roadmap below separates completed milestones, the current hardening pass, and likely future work without adding those future systems before they are requested.

## Scaffold

- TypeScript pnpm monorepo
- Shared types
- PGDL package
- AAG package
- Governance core package
- Runtime binding package
- Policy profiles package
- Company alignment profile generator package
- Authority map package
- Human participation package
- Integration adapters package
- Governance memory package
- Audit core package
- Eval suite package
- Developer CLI package
- Examples, docs, and eval fixtures

## Completed

### v0.1.0-scaffold

- Initial TypeScript pnpm monorepo scaffold
- Package layout, shared build conventions, and first docs

### v0.1.0

- Core spine foundation
- PGDL, AAG, Runtime Binding, Receipts, and shared types

### v0.2.0

- Policy Profiles
- Deterministic policy resolution before AAG

### v0.3.0

- Company Alignment Profile Generator
- Draft PolicyProfile and AuthorityMap generation from structured company inputs

### v0.4.0

- Hard Boundary Policy Compiler
- Explicit "never automate" policy support

### v0.5.0

- Authority Map foundation
- Deterministic approval validation
- Role and scope based approval evidence checks
- Optional governance-core approval validation before AAG

### v0.6.0

- Human Participation Quality foundation
- Deterministic rubber-stamp detection signals
- Optional governance-core participation quality checks before AAG
- Receipt preservation for participation quality results

### v0.7.0

- Evaluation Suite Expansion
- Built-in deterministic cross-stack eval cases
- Eval result summarization
- Full-stack fixture artifacts under `evals/fixtures/full-stack`

### v0.8.0

- Developer CLI foundation
- Local `ags eval` command for built-in eval suite runs
- Local `ags govern <input.json>` command for governed runtime checks with receipts
- Local receipt verification and hashing commands
- Example CLI inputs under `examples/cli`

### v0.9.0

- Integration Adapters foundation
- n8n action input normalization into AGS proposals
- n8n governance response mapping with workflow-friendly `nextStep`
- n8n webhook helper for local library use
- Example n8n workflow templates and input payloads under `examples/integrations/n8n`

### v1.0.0

- Governance Memory / Internalization Layer foundation
- Deterministic receipt-history pattern detection
- Human-reviewable recommendations for policy, hard boundaries, authority, participation, runtime binding, and evals
- `ags memory <receipts.json>` CLI summary command
- Documentation for safe internalization without automatic policy mutation

## Current

### v1.5.1

- Agentic Governance Auditor report hardening
- Professional report sections for methodology, limitations, severity/confidence definitions, remediation summary, evidence appendix, and self-audit disclosure
- Default remediation mapping for every TG taxonomy item
- AGS self-audit example under `examples/audit-report`
- Stronger deterministic rendering and example validation tests

## Recently Completed

### v1.5.0

- Governance Reality Report foundation
- Theater signal taxonomy TG-001 through TG-012
- Audit finding and report schemas
- Markdown report renderer
- Local `ags audit-report <input.json>` command
- Example audit inputs and fixture summaries

### v1.4.0

- Content Publishing Dogfood Agent hardening/demo milestone
- Public voice, claims, provenance, publishing approval, and runtime substitution evals
- Content publishing examples and Governance Memory fixture

### v1.3.0

- Alignment Gap Detector / Policy Conflict Analyzer hardening milestone
- Deterministic company governance diagnostics before enforceable policy
- Local `ags gaps <input.json>` command

### v1.2.0

- Adversarial Red-Team Eval Pack hardening milestone
- Deterministic bypass, authority, participation, runtime, receipt, and memory attack cases
- Local `ags redteam` command

### v1.1.0

- Dogfood Workbench Eval Pack hardening milestone
- Realistic AGS development workflow scenarios
- Enterprise Financial Report Golden Path demo track
- Repeatable dogfood eval suite and CLI command
- Examples and receipt-history fixture for Governance Memory

## Next

### v1.6.0

- Dashboard MVP

### v1.7.0

- Persistent Receipt Store

### v1.8.0

- Approval Workflow UI / Human Review Console

## Later

- Real PGDL modules
- Real AAG detector policies
- Persistent eval history
- Policy compiler
- Human review workflow for generated company profiles
- Durable approval storage and signatures
- Richer participation analytics
- Dashboard
- Additional integration adapters
- SOP and policy import for company alignment profiles
- Governance Memory trend and recommendation eval expansion
