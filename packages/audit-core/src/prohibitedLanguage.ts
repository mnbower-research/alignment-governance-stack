import type { AuditValidationIssue } from "./types.js";

const prohibitedTerms = ["fake", "fraud", "illegal", "negligent", "lying"] as const;

export const PROHIBITED_ACCUSATORY_TERMS: readonly string[] = [...prohibitedTerms, "unsafe"];

export function findProhibitedAccusatoryLanguage(value: unknown, path = "$"): AuditValidationIssue[] {
  const issues: AuditValidationIssue[] = [];
  collectLanguageIssues(value, path, issues);
  return issues;
}

function collectLanguageIssues(value: unknown, path: string, issues: AuditValidationIssue[]): void {
  if (typeof value === "string") {
    const lower = value.toLowerCase();

    for (const term of prohibitedTerms) {
      if (containsWord(lower, term)) {
        issues.push({ path, message: `Avoid accusatory wording: "${term}".` });
      }
    }

    if (containsWord(lower, "unsafe") && !isAllowedUnsafeDisclaimer(lower)) {
      issues.push({ path, message: 'Avoid accusatory wording: "unsafe".' });
    }

    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => collectLanguageIssues(item, `${path}[${index}]`, issues));
    return;
  }

  if (isRecord(value)) {
    for (const [key, nestedValue] of Object.entries(value)) {
      collectLanguageIssues(nestedValue, `${path}.${key}`, issues);
    }
  }
}

function containsWord(value: string, word: string): boolean {
  return new RegExp(`\\b${word}\\b`, "i").test(value);
}

function isAllowedUnsafeDisclaimer(value: string): boolean {
  return value.includes("not a legal conclusion") && value.includes("finding of unsafe operation");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
