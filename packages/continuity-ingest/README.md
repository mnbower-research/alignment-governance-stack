# Continuity Ingest

Local, deterministic ingestion for AGS Continuity Console evidence snapshots.

This package reads local JSON artifacts, normalizes supported AGS shapes into a versioned read-only snapshot, preserves source hashes and parser provenance, and records diagnostics for malformed or unsupported files.

It does not call networks, execute actions, mutate approvals, or write back to AGS governance packages.

The `ags.context-admission` parser imports content-free admission evidence, standalone or embedded in receipts. It checks shape and digest, correlates the receiving proposal, and preserves historical provenance. This is not issuer authentication or current authorization. The additive artifact kind uses the existing v0.1 snapshot envelope.
