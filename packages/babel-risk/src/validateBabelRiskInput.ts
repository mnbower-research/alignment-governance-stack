import type { BabelRiskInput, BabelRiskValidationResult } from "./types.js";

const signalCollections = [
  "capabilitySignals",
  "coordinationSignals",
  "authoritySignals",
  "participationSignals",
  "proofSignals",
  "memorySignals",
  "agencyChainSignals",
  "fingerprintSignals",
  "governanceReportSignals"
] as const;

const severities = new Set(["low", "medium", "high", "critical"]);

export function validateBabelRiskInput(input: BabelRiskInput): BabelRiskValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!isRecord(input)) {
    return {
      valid: false,
      errors: ["input must be an object."],
      warnings
    };
  }

  let signalCount = 0;
  for (const collectionName of signalCollections) {
    const value = input[collectionName];
    if (value === undefined) {
      continue;
    }

    if (!Array.isArray(value)) {
      errors.push(`${collectionName} must be an array when provided.`);
      continue;
    }

    signalCount += value.length;
    value.forEach((signal, index) => {
      if (!isRecord(signal)) {
        errors.push(`${collectionName}[${index}] must be an object.`);
        return;
      }

      if (typeof signal.id !== "string" || signal.id.trim() === "") {
        errors.push(`${collectionName}[${index}].id is required.`);
      }

      if (typeof signal.kind !== "string" || signal.kind.trim() === "") {
        errors.push(`${collectionName}[${index}].kind is required.`);
      }

      if (signal.severity !== undefined && !severities.has(String(signal.severity))) {
        errors.push(`${collectionName}[${index}].severity must be low, medium, high, or critical.`);
      }

      if (signal.evidenceRefs !== undefined && !Array.isArray(signal.evidenceRefs)) {
        errors.push(`${collectionName}[${index}].evidenceRefs must be an array when provided.`);
      }
    });
  }

  if (signalCount === 0) {
    warnings.push("No Babel risk signals were supplied; report should be read as insufficient evidence, not certification.");
  }

  if (input.assessmentWindow !== undefined && !isRecord(input.assessmentWindow)) {
    errors.push("assessmentWindow must be an object when provided.");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
