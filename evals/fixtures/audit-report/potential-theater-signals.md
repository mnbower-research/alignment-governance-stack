# Governance Reality Report Fixture Summary

Fixture: `examples/audit-report/potential-theater-signals.json`

Expected posture: needs attention.

Expected findings: TG-001, TG-003, and TG-005.

Expected behavior: `ags audit-report` exits `1` because high-severity findings are present, and `--json` emits a parseable report.
