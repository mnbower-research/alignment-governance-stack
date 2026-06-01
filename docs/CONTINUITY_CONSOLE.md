# AGS Continuity Console

The AGS Continuity Console is a local-first visual operator console for the Alignment Governance Stack. It inspects governed delegation across authority, substrate, semantic context, proposal formation, PGDL, AAG, runtime admissibility, execution binding, consequence, receipts, governance memory, and Human Agency Audit.

The Console does not replace the AGS governance packages. It presents a visual control plane for local sample data and local imported evidence without claiming live integration, production validation, or enforcement.

## Relationship To AGS

AGS is a modular reference architecture for governed delegation. The Console helps a developer or organization ask:

- Which required governance functions are present?
- Which functions are missing, partial, degraded, or only declared?
- Which local artifacts support a layer, edge, trace event, or finding?
- Which parser recognized an artifact, and what source hash proves the imported bytes?
- Is human authority still meaningfully connected to consequence?

## Phase 1 Scope

Phase 1 created a local React, TypeScript, and Vite app under `apps/continuity-console`. It uses typed sample data for one deployment: `AGS Internal Agent Team`.

Sample Mode remains available and demonstrates the UI without implying live integrations.

## Phase 2A Scope

Phase 2A adds a deterministic local evidence pipeline:

```text
local AGS artifacts
-> ingestion CLI
-> normalized continuity snapshot JSON
-> Console import
-> evidence-backed graph
-> evidence-backed gaps
```

The ingest package lives at `packages/continuity-ingest`. It reads local JSON files or directories, computes SHA-256 source hashes, runs supported parsers, correlates artifacts by proposal, permit, receipt, workflow, closure, fingerprint, and agent identifiers, and emits diagnostics for malformed or unsupported files.

The normalized snapshot schema is versioned as:

```text
ags.continuity-snapshot.v0.1
```

The Console has two visible modes:

- Sample Mode: typed demo data for the local UI.
- Local Evidence Mode: read-only imported snapshots from AGS artifacts.

## Supported Phase 2A Parsers

Phase 2A includes parsers for AGS artifact shapes that exist in this repository or are represented by package types:

- PGDL review packets
- AAG decision packets
- Runtime Binding permits
- Runtime Binding results
- Governance receipts
- Decision Closure Artifacts
- Agency Fingerprints
- Governance Memory reports
- Agency Chain maps
- Babel Risk reports
- Babel Velocity reports
- Policy Profiles and Hard Boundary profiles
- Authority Maps
- Human Participation Quality results
- Alignment gap report-like JSON when it has a report identifier and findings or gaps

Babel Risk and Babel Velocity input fixtures are not treated as generated reports unless they use the report schema markers. Unsupported JSON receives an import diagnostic.

## Local Sync

Generate the bundled local snapshot from the demo fixtures:

```bash
corepack pnpm console:sync -- --source examples/continuity-console-artifacts --out apps/continuity-console/public/data/current-snapshot.json
```

Run the Console:

```bash
corepack pnpm console:dev
```

In Settings, choose Load bundled snapshot to enter Local Evidence Mode. You can also upload a normalized snapshot JSON file in the browser. Uploaded snapshots are stored only in `localStorage`.

## Current Pages

- Overview: KPI cards, 12-layer graph, source-mode badge, evidence confidence, and critical gaps.
- Stack Map: layer and edge inspection with imported provenance, hashes, parser details, and raw JSON hidden behind expansion controls.
- Continuity Gaps: deterministic evidence-backed findings with filters.
- Live Action Trace: sample trace in Sample Mode; imported correlated trace with missing events visible in Local Evidence Mode.
- Approval Queue: sample UI controls in Sample Mode; read-only in Local Evidence Mode.
- Human Agency Audit: sample scorecard in Sample Mode; conservative insufficient-evidence posture unless direct imported evidence exists.
- Governance Memory: sample signals in Sample Mode; imported summaries and human-review-only recommendations in Local Evidence Mode.
- Plugins: local plugin registry for Sample Mode work.
- Reports: local exports for snapshot JSON, continuity findings JSON, summary Markdown, and import diagnostics JSON.
- Settings: bundled snapshot load, upload, clear, counts, and diagnostics.

## Current Limitations

- No backend.
- No database.
- No authentication or user accounts.
- No billing, subscriptions, vendor onboarding, or marketplace payments.
- No hosted SaaS infrastructure.
- No live agent integrations.
- No production deployment infrastructure.
- No filesystem watcher in the browser.
- No approval write-back.
- No external action execution.
- No automatic policy, authority, or participation-policy mutation.
- Plugin registry entries do not imply safety, enforcement, testing, or production validation.
- Governance Memory recommendations require human review.

## Status Language

The Console must keep evidence-based status language precise:

- `Mapped` means a likely location or role is documented.
- `Observed` means behavior or data has been seen in a sample or environment.
- `Enforced` means a control is actively applied.
- `Evidenced` means proof is preserved and inspectable.
- `Tested` means normal tests have passed.
- `Red-Teamed` means bypass, drift, failure, or composition testing has been performed.
- `Production-Validated` means production-grade deployment evidence exists.

Do not treat mapped as enforced. Do not treat local imported evidence as live connection. Do not treat sample data as production evidence.

## Local Validation

Useful commands:

```bash
corepack pnpm install
corepack pnpm --filter @alignment-governance-stack/continuity-ingest build
corepack pnpm console:sync -- --source examples/continuity-console-artifacts --out apps/continuity-console/public/data/current-snapshot.json
corepack pnpm --filter @alignment-governance-stack/continuity-console test
corepack pnpm -r build
corepack pnpm -r typecheck
corepack pnpm -r test
```
