# Governance Reality Report Fixture Summary

Fixture: `examples/audit-report/ags-self-audit.json`

Expected audit mode: internal self-audit.

Expected posture: partially supported.

Expected findings: TG-003, TG-005, TG-006, and TG-012.

Expected behavior: `ags audit-report examples/audit-report/ags-self-audit.json` exits `0` because the self-audit uses medium and low findings. `--out .tmp/ags-self-audit.md` writes a professional report with limitations, severity/confidence definitions, remediation summary, evidence appendix, and self-audit disclosure.
