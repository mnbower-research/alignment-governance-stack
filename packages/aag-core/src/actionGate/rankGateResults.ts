import type { GateDecision, GateDetectorResult, GateSeverity } from "./types";

const decisionRank: Record<GateDecision, number> = {
  block: 4,
  require_approval: 3,
  revise_action: 2,
  allow: 1,
};

const severityRank: Record<GateSeverity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

export function rankGateResults(
  detectorResults: GateDetectorResult[],
): GateDetectorResult[] {
  return detectorResults
    .filter((result) => result.triggered)
    .sort((left, right) => {
      const decisionDelta =
        decisionRank[getDetectorDecision(right)] -
        decisionRank[getDetectorDecision(left)];

      if (decisionDelta !== 0) {
        return decisionDelta;
      }

      const severityDelta =
        severityRank[right.severity] - severityRank[left.severity];

      if (severityDelta !== 0) {
        return severityDelta;
      }

      return right.confidence - left.confidence;
    });
}

export function getDetectorDecision(
  detectorResult: Pick<
    GateDetectorResult,
    "triggered" | "recommendedDecision"
  >,
): GateDecision {
  return detectorResult.triggered
    ? detectorResult.recommendedDecision
    : "allow";
}
