import type { BabelVelocityInput, BabelVelocityValidationResult } from "./velocityTypes.js";

const consequenceLevels = new Set(["low", "medium", "high", "critical"]);
const participationQualities = new Set(["meaningful", "partial", "weak", "rubber_stamp", "not_demonstrated"]);
const closureStatuses = new Set(["closed", "partially_closed", "not_closed", "invalid"]);
const capacityLevels = new Set(["strong", "partial", "weak", "not_demonstrated"]);
const remediationStatuses = new Set(["open", "closed", "stale", "not_demonstrated"]);
const completenessValues = new Set(["complete", "partial", "weak", "not_demonstrated"]);
const coverageValues = new Set(["covered", "partial", "weak", "not_demonstrated"]);

export function validateBabelVelocityInput(input: BabelVelocityInput): BabelVelocityValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!isRecord(input)) {
    return {
      valid: false,
      errors: ["input must be an object."],
      warnings
    };
  }

  if (!Array.isArray(input.windows)) {
    errors.push("windows must be an array.");
    return {
      valid: false,
      errors,
      warnings
    };
  }

  if (input.windows.length === 0) {
    warnings.push("No temporal windows were supplied; trend analysis will report not_enough_data.");
  }

  if (input.windows.length === 1) {
    warnings.push("Only one temporal window was supplied; trend analysis will report not_enough_data.");
  }

  input.windows.forEach((window, index) => {
    if (!isRecord(window)) {
      errors.push(`windows[${index}] must be an object.`);
      return;
    }

    requireString(window.id, `windows[${index}].id`, errors);
    requireString(window.from, `windows[${index}].from`, errors);
    requireString(window.to, `windows[${index}].to`, errors);

    if (typeof window.from === "string" && typeof window.to === "string") {
      const fromMs = Date.parse(window.from);
      const toMs = Date.parse(window.to);
      if (!Number.isFinite(fromMs) || !Number.isFinite(toMs)) {
        errors.push(`windows[${index}] from/to must be valid date strings.`);
      } else if (toMs <= fromMs) {
        errors.push(`windows[${index}].to must be after from.`);
      }
    }

    validateArray(window.decisionEvents, `windows[${index}].decisionEvents`, errors);
    validateArray(window.closureEvents, `windows[${index}].closureEvents`, errors);

    if (Array.isArray(window.decisionEvents)) {
      window.decisionEvents.forEach((event, eventIndex) => {
        if (!isRecord(event)) {
          errors.push(`windows[${index}].decisionEvents[${eventIndex}] must be an object.`);
          return;
        }
        requireString(event.id, `windows[${index}].decisionEvents[${eventIndex}].id`, errors);
        requireString(event.timestamp, `windows[${index}].decisionEvents[${eventIndex}].timestamp`, errors);
        requireString(event.kind, `windows[${index}].decisionEvents[${eventIndex}].kind`, errors);
        if (!consequenceLevels.has(String(event.consequenceLevel))) {
          errors.push(`windows[${index}].decisionEvents[${eventIndex}].consequenceLevel must be low, medium, high, or critical.`);
        }
      });
    }

    if (Array.isArray(window.closureEvents)) {
      window.closureEvents.forEach((event, eventIndex) => {
        if (!isRecord(event)) {
          errors.push(`windows[${index}].closureEvents[${eventIndex}] must be an object.`);
          return;
        }
        requireString(event.id, `windows[${index}].closureEvents[${eventIndex}].id`, errors);
        requireString(event.timestamp, `windows[${index}].closureEvents[${eventIndex}].timestamp`, errors);
        requireString(event.kind, `windows[${index}].closureEvents[${eventIndex}].kind`, errors);
        if (!participationQualities.has(String(event.participationQuality))) {
          errors.push(`windows[${index}].closureEvents[${eventIndex}].participationQuality is invalid.`);
        }
        if (!closureStatuses.has(String(event.closureStatus))) {
          errors.push(`windows[${index}].closureEvents[${eventIndex}].closureStatus is invalid.`);
        }
      });
    }

    validateCapacitySignals(window.capacitySignals, `windows[${index}].capacitySignals`, errors);
    validateRemediationEvents(window.remediationEvents, `windows[${index}].remediationEvents`, errors);
    validateProofEvents(window.proofEvents, `windows[${index}].proofEvents`, errors);
    validateAuthorityEvents(window.authorityCoverageEvents, `windows[${index}].authorityCoverageEvents`, errors);
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

function validateCapacitySignals(value: unknown, path: string, errors: string[]): void {
  if (value === undefined) {
    return;
  }

  if (!Array.isArray(value)) {
    errors.push(`${path} must be an array when provided.`);
    return;
  }

  value.forEach((event, index) => {
    if (!isRecord(event)) {
      errors.push(`${path}[${index}] must be an object.`);
      return;
    }
    requireString(event.id, `${path}[${index}].id`, errors);
    requireString(event.kind, `${path}[${index}].kind`, errors);
    if (!capacityLevels.has(String(event.capacityLevel))) {
      errors.push(`${path}[${index}].capacityLevel is invalid.`);
    }
  });
}

function validateRemediationEvents(value: unknown, path: string, errors: string[]): void {
  if (value === undefined) {
    return;
  }

  if (!Array.isArray(value)) {
    errors.push(`${path} must be an array when provided.`);
    return;
  }

  value.forEach((event, index) => {
    if (!isRecord(event)) {
      errors.push(`${path}[${index}] must be an object.`);
      return;
    }
    requireString(event.id, `${path}[${index}].id`, errors);
    requireString(event.openedAt, `${path}[${index}].openedAt`, errors);
    if (!consequenceLevels.has(String(event.severity))) {
      errors.push(`${path}[${index}].severity is invalid.`);
    }
    if (!remediationStatuses.has(String(event.status))) {
      errors.push(`${path}[${index}].status is invalid.`);
    }
  });
}

function validateProofEvents(value: unknown, path: string, errors: string[]): void {
  if (value === undefined) {
    return;
  }

  if (!Array.isArray(value)) {
    errors.push(`${path} must be an array when provided.`);
    return;
  }

  value.forEach((event, index) => {
    if (!isRecord(event)) {
      errors.push(`${path}[${index}] must be an object.`);
      return;
    }
    requireString(event.id, `${path}[${index}].id`, errors);
    requireString(event.timestamp, `${path}[${index}].timestamp`, errors);
    if (!completenessValues.has(String(event.completeness))) {
      errors.push(`${path}[${index}].completeness is invalid.`);
    }
  });
}

function validateAuthorityEvents(value: unknown, path: string, errors: string[]): void {
  if (value === undefined) {
    return;
  }

  if (!Array.isArray(value)) {
    errors.push(`${path} must be an array when provided.`);
    return;
  }

  value.forEach((event, index) => {
    if (!isRecord(event)) {
      errors.push(`${path}[${index}] must be an object.`);
      return;
    }
    requireString(event.id, `${path}[${index}].id`, errors);
    requireString(event.timestamp, `${path}[${index}].timestamp`, errors);
    if (!coverageValues.has(String(event.coverage))) {
      errors.push(`${path}[${index}].coverage is invalid.`);
    }
  });
}

function validateArray(value: unknown, path: string, errors: string[]): void {
  if (!Array.isArray(value)) {
    errors.push(`${path} must be an array.`);
  }
}

function requireString(value: unknown, path: string, errors: string[]): void {
  if (typeof value !== "string" || value.trim() === "") {
    errors.push(`${path} is required.`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
