import type { AuditResult } from "./auditReceipts";

export function formatAuditReport(result: AuditResult): string {
  const lines = [
    "AAG Audit",
    "",
    `Receipts scanned: ${result.scanned}`,
    `Passed: ${result.passed}`,
    `Failed: ${result.failed}`,
  ];

  if (result.failures.length > 0) {
    lines.push("", "Failures:");

    result.failures.forEach((failure) => {
      lines.push(`- ${failure.file}`);
      failure.issues.forEach((issue) => {
        lines.push(`  - ${issue}`);
      });
    });
  }

  lines.push("", result.failed === 0 ? "AUDIT PASS" : "AUDIT FAIL");

  return lines.join("\n");
}
