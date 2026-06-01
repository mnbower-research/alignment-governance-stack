# Continuity Ingest

Local, deterministic ingestion for AGS Continuity Console evidence snapshots.

This package reads local JSON artifacts, normalizes supported AGS shapes into a versioned read-only snapshot, preserves source hashes and parser provenance, and records diagnostics for malformed or unsupported files.

It does not call networks, execute actions, mutate approvals, or write back to AGS governance packages.
