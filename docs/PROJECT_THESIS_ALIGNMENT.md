# Project Thesis Alignment

The original AGS thesis centered on a four-layer runtime spine:

```text
PGDL -> AAG -> Runtime Binding -> Receipts
```

That remains the core runtime spine. PGDL matures proposals before the gate. AAG decides whether the proposed action should be allowed. Runtime Binding verifies that the exact action is authorized. Receipts preserve proof.

The repository has expanded into the full Alignment Governance Stack around that spine:

```text
Integration Adapters
-> Company Alignment Profile Generator
-> Policy Profile with Hard Boundaries
-> Authority Map / Approval Validation
-> Human Participation Quality
-> PGDL
-> Policy Resolution
-> AAG
-> Runtime Binding
-> Receipt
-> Governance Memory / Internalization Layer
-> Evaluation Suite
-> Developer CLI
```

## Thesis To Infrastructure

Theory:

```text
human agency, true gates, delegated authority, anti-Babel architecture
```

Infrastructure:

```text
policy -> authority -> participation -> proposal maturity -> action gate -> runtime binding -> proof -> memory -> evals -> integrations
```

## True Gate Principle

A true gate restores agency.

A false gate captures agency.

AGS should preserve meaningful human authority, participation, accountability, and proof.

## Governance Memory

Receipts become evidence for human-reviewed improvement. Governance Memory can identify repeated patterns in past decisions and recommend review, but it must not silently rewrite its own governance.

This keeps internalization accountable: memory is useful only when it remains under authority.

## Boundaries

The thesis is implemented as technical infrastructure. It does not claim AI consciousness, legal compliance, or a guarantee of safe outcomes.
