# AGS Continuity Console

## Context Admission evidence (v1.13.0)

Local Evidence Mode recognizes `context-admission/v0.1` records, including context evidence embedded in receipts. Runs shows a Semantic continuity panel with producer -> persistent artifact -> receiving agent, creation/review times, permitted purpose, transformations, parent lineage, recorded findings and dependent action. A persistent artifact can be a handoff across time. Semantic continuity concerns provenance and admissible meaning; runtime continuity concerns the authorized action matching the executed action.

The ingest parser checks shape and digest; it does not authenticate the issuer or revalidate current authority. Imported records remain read-only historical evidence. No approval write-back, source edits, policy mutation, execution or live enforcement is added. Sample Mode remains separate. Import `examples/continuity-console-artifacts/context-inheritance` to inspect the fixtures without altering the bundled snapshot. See [Governed Information Inheritance](GOVERNED_INFORMATION_INHERITANCE.md).

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

## Phase 2A.2 Operator Shell

Phase 2A.2 reorganizes the Console around operator questions instead of exposing the full AGS ontology first:

- What needs attention?
- Where is the weak point?
- What should the operator inspect next?

The default Simple Operator Mode shows Home, Runs, Findings, and Settings. "Show technical details" reveals the full navigation:

- Home: plain-language status, priority actions, compact governance coverage, and recent activity.
- Flows: lightweight governed-workflow summaries and a simple sequence view.
- Runs: reconstructed or sample action traces with an operator verdict.
- Findings: compact triage for required controls, incomplete proof, not-verified evidence, and import diagnostics.
- Approvals: sample review queue and read-only evidence-mode boundary.
- Plugins: local registry for manually declared compatible components.
- Workbench: explicitly labeled sample governed actions and reference evaluation evidence.
- Audits: hub for Human Agency Audit, Governance Memory, and the Advanced Architecture Map.
- Reports: local JSON and Markdown exports.
- Settings: local snapshot loading, upload, diagnostics, and schema metadata.

## Simple Operator Mode

Simple Operator Mode is the default Console presentation. Home and Runs begin with four plain-language questions:

1. What did the agent want to do?
2. Was it allowed?
3. Did it do only what was allowed?
4. Can we prove what happened?

The view translates Context Admission, PGDL, AAG, Runtime Binding, and Receipt records into explanations for an operator. Translation changes presentation only; it does not recompute or weaken governance decisions. A passing Context Admission means inherited information was usable for the recorded receiving use, never that execution was approved.

Material findings remain visible in Simple Operator Mode. This includes blocks, revision requirements, human escalation, runtime mismatch, missing or incomplete receipts, missing core trace stages, expired or revoked context, unknown provenance, stale authority, integrity failures, and critical/high continuity findings. Absence of a finding is explicitly not a safety certification.

`Show technical details` restores the full navigation and existing KPI, timeline, architecture, hash, parser, provenance, and raw JSON views. Hiding technical details while viewing a technical-only page returns the operator to Home. Local Evidence Mode remains read-only in either presentation.

The previous 12-layer Stack Map remains available as the Advanced Architecture Map from Home, Flows, and Audits. It is now treated as an advanced drill-down for architecture, evidence provenance, parser IDs, SHA-256 hashes, source paths, and raw JSON.

Phase 2A.2 does not add live agents, external integrations, approval write-back, backend services, hosted infrastructure, billing, marketplace behavior, or policy mutation.

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

## Progressive Disclosure

The Console uses this hierarchy:

```text
Default operator view
-> plain-language status
-> priority actions
-> simple continuity summary

Advanced drill-down
-> 12-layer architecture
-> evidence provenance
-> parser diagnostics
-> hashes
-> raw JSON
```

Operator-facing labels translate internal statuses without changing the internal status model. For example, `Not Demonstrated` appears as `Not verified`, `Missing` appears as `Required control missing`, and `Partial` appears as `Needs attention`.

Parser diagnostics remain distinct from governance-chain findings. They are visible in Findings, Settings, and technical details; Home shows only a calm diagnostic summary when imported artifacts affect evidence confidence.

## Future Flow Canvas

Flows is currently a lightweight landing page and flow summary. It introduces the product center for governed workflows but does not provide drag-and-drop editing, node execution, live agent orchestration, or external integration behavior. A future governed-flow canvas can build on this page after the read-only evidence and operator-shell foundations remain stable.

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

## Release-candidate evidence boundaries

In Simple Operator Mode, Home provides an overview of the active evidence source, imported record and diagnostic counts, and all material findings, with links to Runs and Settings. Runs provides the four operator questions and the plain-language decision path. Both pages display the same complete material findings collection; changing pages does not filter out a denial, uncertainty, or import error. Technical details remain available through the shared toggle.

Workbench displays explicitly labeled sample governed actions and static reference modules; it does not execute governance. Reference resolvers remain isolated test utilities, not Console enforcement. Imported Runs distinguish actual historical gate/runtime decisions from evidence completeness: a complete denied chain never becomes an allowed verdict. Local Evidence Mode shows no sample approval queue, sample memory recommendations, or browser-registry installation/health claims. Imported memory remains read-only and human-reviewable.

Manual visual verification is still required at desktop and narrow widths for navigation, tables and focus; Settings import/reload/clear; Runs lineage and denied/incomplete states; Flows/Findings filters and drilldowns; sample/local boundaries in Approvals, Memory, Plugins and Workbench; and Audits/Reports links and active-snapshot exports. Automated DOM tests do not establish browser rendering quality.

### Release-candidate evidence corrections

Imported receipts are verified against their canonical hashes using native browser cryptography. Admission envelopes are validated recursively, including embedded stage records, before they are retained. Uploaded and persisted snapshots are revalidated; serialized verification flags are not trusted. Invalid artifacts become visible import diagnostics.

Simple Mode preserves all competing decisions and treats unresolved conflicts conservatively. A receipt denial takes precedence over earlier passing stages. Runtime Binding authorizes a proposed execution; it does not prove execution occurred. Complete evidence of a denial is reported as complete decision evidence without implying execution. Resolved PGDL revisions are recognized only when the resolved action matches the AAG-reviewed action. Historical admission expiration is shown explicitly.

Sample Mode illustrates the workflow but does not establish real permission or execution proof. Its simple answers remain unproven even when a sample runtime-match event is present.

Multiple proposals are displayed as an aggregate with every material finding preserved; the Console does not infer superseding approval from record order. Missing local activity and provenance remain unknown, with no sample fallback. The browser verification entry points do not authenticate issuers or reauthorize actions.

Normalized browser uploads and raw parsers share structural validation for recognized artifacts. Receipts, fingerprints, and Context Admission evidence receive digest checks; nested admission and stage envelopes are checked recursively. A hash-valid receipt can still contain contradictory facts. Failed approval validation, runtime denials, target mismatches, impossible permit chronology, blocking detector evidence, and closure or participation denials remain material findings rather than permission.

Runs, Simple Mode, Findings, and findings/Markdown exports use the same material findings collection. Unknown diagnostics and artifact warnings remain visible. An AAG allow followed by a correctly recorded Runtime Binding denial is a valid enforcement sequence; a complete denial does not require execution-only stages. Competing decisions at the same stage remain conflicts.

Imported evidence confidence is capped at Partial because source identity and external execution are not independently authenticated. Material errors, denials, and provenance gaps lower confidence; artifact counts do not establish High confidence. Import time is labeled separately from occurrence time and never called a verification time. Governance Memory integrity remains independently unverified.

Import ordering starts before fetching or reading files. Clearing evidence invalidates pending reads and verification, and older imports cannot overwrite a newer request. Corrupt saved evidence opens a Local Evidence recovery diagnostic. Workbench sample assignments are shown only in Sample Mode. Unknown or conflicting trace identities and reversibility are not silently replaced by the first record.
