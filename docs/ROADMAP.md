# Roadmap

Alignment Governance Stack is currently scaffold-only. The roadmap below names likely growth areas without adding them before they are requested.

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
- Eval suite package
- Developer CLI package
- Examples, docs, and eval fixtures

## v0.5.0

- Authority Map foundation
- Deterministic approval validation
- Role and scope based approval evidence checks
- Optional governance-core approval validation before AAG

## v0.6.0

- Human Participation Quality foundation
- Deterministic rubber-stamp detection signals
- Optional governance-core participation quality checks before AAG
- Receipt preservation for participation quality results

## v0.7.0

- Evaluation Suite Expansion
- Built-in deterministic cross-stack eval cases
- Eval result summarization
- Full-stack fixture artifacts under `evals/fixtures/full-stack`

## v0.8.0

- Developer CLI foundation
- Local `ags eval` command for built-in eval suite runs
- Local `ags govern <input.json>` command for governed runtime checks with receipts
- Local receipt verification and hashing commands
- Example CLI inputs under `examples/cli`

## Later

- Real PGDL modules
- Real AAG detector policies
- Durable receipts
- Runtime Binding integration
- Persistent eval history
- Policy compiler
- Human review workflow for generated company profiles
- Durable approval storage and signatures
- Richer participation analytics
- Dashboard
- Integration adapters
- SOP and policy import for company alignment profiles
