import type {
  BabelRiskSeverity,
  BaseSignal,
  DemonstrationStatus
} from "./types.js";

export const severityWeights: Record<BabelRiskSeverity, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4
};

export function signalWeight(signal: BaseSignal): number {
  return severityWeights[signal.severity ?? "medium"];
}

export function maxSignalWeight(signals: BaseSignal[] | undefined): number {
  if (signals === undefined || signals.length === 0) {
    return 0;
  }

  return Math.max(...signals.map(signalWeight));
}

export function sumSignalWeight(signals: BaseSignal[] | undefined): number {
  if (signals === undefined) {
    return 0;
  }

  return signals.reduce((sum, signal) => sum + signalWeight(signal), 0);
}

export function severityFromWeight(weight: number): BabelRiskSeverity {
  if (weight >= 4) {
    return "critical";
  }

  if (weight >= 3) {
    return "high";
  }

  if (weight >= 2) {
    return "medium";
  }

  return "low";
}

export function riskFromScore(score: number): BabelRiskSeverity {
  if (score >= 75) {
    return "critical";
  }

  if (score >= 50) {
    return "high";
  }

  if (score >= 25) {
    return "medium";
  }

  return "low";
}

export function demonstrationStatusFromWeakness(weight: number): DemonstrationStatus {
  if (weight >= 4) {
    return "not_demonstrated";
  }

  if (weight >= 3) {
    return "weak";
  }

  if (weight >= 2) {
    return "partial";
  }

  return "strong";
}
