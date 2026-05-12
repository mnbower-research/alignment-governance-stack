import type { ActionGateInput, GateDecision, GateDetectorResult } from "./types";
import { getDetectorDecision, rankGateResults } from "./rankGateResults";

export function decideGateAction(
  _input: ActionGateInput,
  detectorResults: GateDetectorResult[],
): GateDecision {
  const primaryResult = rankGateResults(detectorResults)[0];
  return primaryResult ? getDetectorDecision(primaryResult) : "allow";
}
