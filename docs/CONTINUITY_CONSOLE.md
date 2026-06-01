# AGS Continuity Console

The AGS Continuity Console is a local-first visual operator console for the Alignment Governance Stack. It is a Phase 1 dashboard shell for inspecting governed delegation across authority, substrate, semantic context, proposal formation, PGDL, AAG, runtime admissibility, execution binding, consequence, receipts, governance memory, and Human Agency Audit.

The Console does not replace the AGS governance packages. It presents a visual control plane that can later consume live AGS outputs, plugin manifests, receipts, traces, and audit packets.

## Relationship To AGS

AGS is a modular reference architecture for governed delegation. The Console visualizes that architecture so a developer or organization can ask:

- Which required governance functions are present?
- Which functions are missing, partial, degraded, or only declared?
- Which plugins or external systems are mapped into the stack?
- Which connections are observed, enforced, evidenced, tested, or red-teamed?
- Is human authority still meaningfully connected to consequence?

## Phase 1 Scope

Phase 1 creates a local React, TypeScript, and Vite app under `apps/continuity-console`. It uses typed sample data for one deployment: `AGS Internal Agent Team`.

Current pages:

- Overview: KPI cards, 12-layer continuity graph, plugin registry summary, and critical gaps.
- Stack Map: expanded layer and edge inspection with detail panels.
- Continuity Gaps: structured placeholder for future gap workflow.
- Live Action Trace: sample governed-action timeline and risk detail.
- Approval Queue: local UI state updates for allow, revise, escalate, and block actions.
- Human Agency Audit: sample agency scorecard, questions, radar visualization, findings, and priorities.
- Governance Memory: sample receipt-history signals, recommendations, timeline, and Babel Velocity trend.
- Plugins: local plugin registry with filters, manual add form, and JSON manifest import.
- Reports: structured placeholder for future exports.
- Settings: structured placeholder for local-only console settings.

## Current Limitations

- No backend.
- No database.
- No authentication or user accounts.
- No billing, subscriptions, vendor onboarding, or marketplace payments.
- No hosted SaaS infrastructure.
- No live agent integrations.
- No production deployment infrastructure.
- Plugin registry entries do not imply safety, enforcement, testing, or production validation.
- Governance Memory recommendations do not mutate policy.

## Local Run Instructions

Install dependencies if needed:

```bash
corepack pnpm install
```

Run the Console:

```bash
corepack pnpm --filter @alignment-governance-stack/continuity-console dev
```

Build the Console:

```bash
corepack pnpm --filter @alignment-governance-stack/continuity-console build
```

Run Console tests:

```bash
corepack pnpm --filter @alignment-governance-stack/continuity-console test
```

## Typed Continuity Model

The Phase 1 model lives in `apps/continuity-console/src/types/continuity.ts`.

It includes:

- `GovernanceLayer`
- `GovernanceEdge`
- `ContinuityStatus`
- `AdapterCategory`
- `PluginManifest`
- `DeploymentManifest`
- `ContinuityFinding`
- `TraceEvent`
- `GovernedActionTrace`
- `ApprovalRequest`
- `ReceiptRecord`
- `HumanAgencyAuditResult`
- `GovernanceMemorySignal`
- `GovernanceRecommendation`

Sample data lives in `apps/continuity-console/src/data/sampleDeployment.ts`.

## Continuity Analysis

The Phase 1 analysis utility lives in `apps/continuity-console/src/lib/continuityAnalysis.ts`.

It calculates:

- layer coverage
- edge coverage
- continuity percentage
- evidenced percentage
- critical gap count
- missing layers
- partial layers
- weak edges
- recommended next steps

The Overview dashboard derives KPI values from this utility rather than hardcoding the metrics directly.

## Status Language

The Console must keep evidence-based status language precise:

- `Mapped` means a likely location or role is documented.
- `Observed` means behavior or data has been seen in a sample or environment.
- `Enforced` means a control is actively applied.
- `Evidenced` means proof is preserved and inspectable.
- `Tested` means normal tests have passed.
- `Red-Teamed` means bypass, drift, failure, or composition testing has been performed.
- `Production-Validated` means production-grade deployment evidence exists.

Do not treat mapped as enforced. Do not treat registered as safe. Do not treat sample data as live integration.

## Future Direction

Future phases may connect the Console to live AGS package outputs, runtime traces, receipt stores, audit exporters, plugin SDKs, a continuity graph, retrofit workflow, and eventually a plugin marketplace.

Those future directions remain intentionally deferred. Phase 1 is a local-first shell with realistic sample data and no production claims.
