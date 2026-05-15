# Governance Reality Report

AGS now includes the foundation for Governance Reality Reports: professional audit outputs that identify potential governance theater signals, evidence gaps, and remediation paths without making external accusations.

## Purpose

Governance Reality Reports turn existing AGS outputs into auditor-ready findings. They help a reviewer ask whether agentic AI governance is real, incomplete, unclear, unverifiable, or vulnerable to theater based on available evidence.

The report is deterministic, local, typed, and file-based. It does not call networks, execute actions, store customer data, run model calls, or host an API.

## Professional Posture

The report uses careful audit language:

- potential signal
- not demonstrated
- unclear from available evidence
- requires verification
- audit question
- recommended remediation
- no conclusion of failure

Every report includes this disclaimer:

```text
This report identifies potential governance theater signals and evidence gaps based on available inputs. It is not a legal conclusion, compliance certification, accusation of wrongdoing, or finding of unsafe operation. All findings require human review and verification before external use.
```

## What It Is

- A professional Markdown or JSON report for local review.
- A typed finding model connected to the AGS governance spine.
- A taxonomy of governance theater signals.
- A remediation map back to PGDL, AAG, Runtime Binding, Receipts, Authority Map, Human Participation, Governance Memory, and Alignment Gap Detector controls.

## What It Is Not

- A legal conclusion.
- A compliance certification.
- A hosted service.
- A dashboard.
- A database-backed audit store.
- A customer data handling system.
- A model-based judgment system.

## Taxonomy

The v1.5.0 taxonomy includes:

- `TG-001`: Missing Stop Authority
- `TG-002`: Rubber-Stamp Approval Risk
- `TG-003`: Runtime Binding Not Demonstrated
- `TG-004`: Hard Boundary Override Risk
- `TG-005`: Receipt Integrity Gap
- `TG-006`: Policy / Authority Conflict
- `TG-007`: Proposal Laundering Risk
- `TG-008`: Target Creep Risk
- `TG-009`: Reversibility Misclassification
- `TG-010`: Governance Memory Drift
- `TG-011`: Human-in-the-Loop Theater
- `TG-012`: Dashboard Without Enforcement

Each entry includes an ID, category, default severity, description, why-it-matters text, default audit questions, and recommended remediations.

## CLI Usage

Build first:

```bash
corepack pnpm -r build
```

Render Markdown to stdout:

```bash
node packages/cli/dist/cli.js audit-report examples/audit-report/potential-theater-signals.json
```

Emit JSON:

```bash
node packages/cli/dist/cli.js audit-report examples/audit-report/potential-theater-signals.json --json
```

Write Markdown to a file:

```bash
node packages/cli/dist/cli.js audit-report examples/audit-report/agent-workflow-gap-review.json --out .tmp/governance-reality-report.md
```

Exit codes:

- `0`: report generated with no high or critical findings
- `1`: report generated and high or critical findings are present
- `2`: invalid input or validation failure

## Example Inputs

Examples live in `examples/audit-report`:

- `strongly-supported-governance.json`
- `potential-theater-signals.json`
- `agent-workflow-gap-review.json`

Fixture summaries live in `evals/fixtures/audit-report`.

## Example Output

The Markdown renderer includes:

- Professional Disclaimer
- Executive Summary
- Audit Scope
- Governance Reality Posture
- Agency Chain Map
- Key Findings
- Remediation Plan
- Evidence Appendix

Each finding renders finding ID, taxonomy ID, severity, confidence, status, observation, why it matters, audit questions, recommended remediation, and evidence references.

## Gateblade / Agentic Governance Auditor Positioning

This foundation supports Gateblade / Agentic Governance Auditor as a professional audit layer on top of AGS. The product direction is to evaluate whether governance evidence demonstrates real controls, where evidence is incomplete, and what remediation path maps back to the governance stack.

The first version is intentionally local and deterministic. Future work can add richer ingestion and presentation only after the audit model, taxonomy, validation, and renderer remain stable.
