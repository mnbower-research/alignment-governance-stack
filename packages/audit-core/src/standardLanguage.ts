import type { ConfidenceDefinitions, SeverityDefinitions } from "./types.js";

export const DEFAULT_GOVERNANCE_REALITY_REPORT_DISCLAIMER =
  "This report identifies potential governance theater signals and evidence gaps based on available inputs. It is not a legal conclusion, compliance certification, accusation of wrongdoing, or finding of unsafe operation. All findings require human review and verification before external use.";

export const STANDARD_AUDIT_LIMITATIONS: readonly string[] = [
  "This report is based only on the materials provided or publicly available evidence. It does not determine legal compliance, security failure, negligence, or wrongdoing.",
  "Findings identify potential governance theater signals, unsupported claims, or areas requiring verification. They are not accusations.",
  "The purpose of this report is to help strengthen agentic AI governance before consequential execution occurs."
];

export const STANDARD_AUDIT_METHODOLOGY: readonly string[] = [
  "Review available governance evidence against the AGS theater signal taxonomy.",
  "Map findings to audit questions, evidence references, and remediation paths.",
  "Use deterministic local rendering without network calls, hosted services, model calls, or external execution."
];

export const STANDARD_SEVERITY_DEFINITIONS: SeverityDefinitions = {
  critical:
    "A likely break in governance that could allow consequential action without meaningful authorization, proof, or runtime constraint.",
  high:
    "A serious governance weakness that could enable bypass, rubber-stamping, runtime drift, hard-boundary erosion, or weak accountability.",
  medium: "A material governance ambiguity or missing proof point that should be verified or remediated.",
  low: "A minor documentation, clarity, or evidence-strength issue."
};

export const STANDARD_CONFIDENCE_DEFINITIONS: ConfidenceDefinitions = {
  high: "Supported by direct evidence in the provided/public materials.",
  medium: "Reasonable inference from available evidence, but requires verification.",
  low: "Weak or incomplete evidence; included as an audit question, not a conclusion."
};

export const NON_ACCUSATORY_CLOSING_NOTE =
  "This report is intended to support governance improvement. It identifies potential signals, evidence gaps, audit questions, and remediation paths; it does not accuse any organization or certify any system.";
