\# ICTF Adaptive Gate Search — Trace Benchmark Raw Provenance 001



\*\*Status:\*\* Raw run complete; pre-analysis provenance record  

\*\*Benchmark:\*\* ICTF Trace Benchmark 001  

\*\*Run date:\*\* 2026-10-05 local / 2026-10-06 UTC



\## Frozen apparatus



The scientific run was executed from the pre-run frozen apparatus:



\- Git tag: `ictf-adaptive-gate-search-trace-apparatus-v0.1`

\- Git commit: `5ae32fbac8e028134482fdda5b74437978c73388`



The run metadata independently recorded the same Git commit.



\## Frozen run configuration



\- Master seed: `20261006`

\- Geometries: `structured`, `unstructured`

\- Proposers: `random`, `nonadaptive`, `binary`, `score`

\- Conditions: 8

\- Episodes per condition: 10,000

\- Total episodes: 80,000

\- Fixed horizon: 256 interactions

\- Total completed trace rows: 20,480,000

\- Derived prefix budgets: 1, 2, 4, 8, 16, 32, 64, 128, 256



The benchmark continued every episode through interaction 256. First-escape indices remained immutable after the first false admission. Post-first-escape rows are retained only as counterfactual continuation for mechanism analysis.



\## Governing documents



The run metadata recorded and hashed:



\- `TRACE\_BENCHMARK\_PLAN\_001.md`

\- `TRACE\_BENCHMARK\_AMENDMENT\_001.md`

\- `TRACE\_BENCHMARK\_AMENDMENT\_002.md`



\## Raw artifact



File:



`results/trace\_benchmark\_001/raw/ictf\_adaptive\_gate\_search\_trace\_001.csv.gz`



Exact byte size:



`1,038,373,858 bytes`



Metadata reported:



\- `status`: `complete`

\- `rows\_written`: `20480000`



SHA-256:



`5A8FD465588C9A2A15F4BBCFD3931AFC96C576CEBAB6CB738DCDA5C070E27D17`



\## Independent backup



Before analysis, an independent copy of the raw trace and metadata was created at:



`I:\\ICTF-Trace-Backup-001\\`



The backup raw trace was independently hashed and produced the same SHA-256:



`5A8FD465588C9A2A15F4BBCFD3931AFC96C576CEBAB6CB738DCDA5C070E27D17`



Therefore the working raw artifact and backup were byte-identical at the time of this provenance record.



\## Analysis boundary



No Trace Benchmark 001 scientific analysis had been executed when this provenance record was created.



The raw artifact is frozen by cryptographic hash before prospective analysis.



The approximately 1 GB raw trace is intentionally not intended for normal Git storage. Small provenance, metadata, and analysis artifacts may be version-controlled separately.

