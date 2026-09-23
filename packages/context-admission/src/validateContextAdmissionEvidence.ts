import type { ContextAdmissionEvidence } from "@alignment-governance-stack/shared-types";
import { validateContextAdmissionEvidenceShape } from "./evidenceShape.js";
import { verifyContextAdmissionEvidence } from "./evaluateContextAdmission.js";
/** Validates content-free shape and digest, never current authority. */
export function validateContextAdmissionEvidence(input: unknown): input is ContextAdmissionEvidence {
  return validateContextAdmissionEvidenceShape(input) && verifyContextAdmissionEvidence(input);
}
