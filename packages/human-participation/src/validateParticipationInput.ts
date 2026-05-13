import type {
  HumanParticipationInput,
  HumanParticipationInputValidationResult
} from "./types.js";

export function validateParticipationInput(
  input: HumanParticipationInput
): HumanParticipationInputValidationResult {
  if (!isRecord(input)) {
    return {
      valid: false,
      errors: ["Human participation input must be an object."]
    };
  }

  const errors: string[] = [];

  if (!isRecord(input.action)) {
    errors.push("Human participation input is missing required action.");
  }

  if (
    input.humanResponse !== undefined &&
    (!isRecord(input.humanResponse) || typeof input.humanResponse.decision !== "string")
  ) {
    errors.push("Human response is missing required decision.");
  }

  if (
    input.approvalEvidence !== undefined &&
    (!isRecord(input.approvalEvidence) || typeof input.approvalEvidence.approvedAt !== "string")
  ) {
    errors.push("Approval evidence is missing required approvedAt.");
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

