# Release Notes v1.8.0

## Governance Continuity Findings

## Why This Release Exists

v1.8.0 corrects the release shape of the former maintenance-audit work. The useful temporal checks are real, but they belong inside the existing Governance Reality Report instead of becoming a standalone governance layer.

This keeps the architecture focused:

```text
Governance Substrate -> PGDL -> AAG -> Runtime Binding -> Receipts
```

Continuity findings ask whether governance remained coherent over time. They do not create a second maintenance report, second gap detector, second receipt system, or second governance reality report.

## What Changed

- Added optional `continuity` input to the Governance Reality Report flow.
- Preserved temporal checks as ordinary `AuditFinding`s.
- Added findings for stale authority, receipt continuity, human review continuity, scope drift, policy reality mismatch, and governance maturity.
- Removed the standalone `audit-maintenance` CLI command.
- Removed the standalone Alignment Maintenance Audit documentation and examples.
- Updated README, CLI docs, architecture docs, roadmap, and release history for v1.8.0.

## Files Added

- `packages/audit-core/src/continuityFindings.ts`
- `packages/audit-core/src/__tests__/continuity-findings.test.ts`
- `docs/releases/RELEASE_NOTES_v1.8.0.md`

## Files Removed

- `docs/ALIGNMENT_MAINTENANCE_AUDIT.md`
- `examples/alignment-maintenance/*`
- `packages/audit-core/src/alignmentMaintenance/*`
- `packages/cli/src/commands/auditMaintenance.ts`

## Validation Commands

```bash
corepack pnpm test
corepack pnpm typecheck
corepack pnpm build
```

## Upgrade Note

There is no standalone `audit-maintenance` command. Use the existing Governance Reality Report flow with optional continuity input.
