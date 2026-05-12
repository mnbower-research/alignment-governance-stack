import type {
  AagDetectorResult,
  AagPacket,
  AgentActionProposal
} from "@agent-action-governance/shared-types";
import { detectIrreversibleAction } from "./detectors/irreversibleAction.js";
import { detectMissingApproval } from "./detectors/missingApproval.js";
import { detectObjectiveDrift } from "./detectors/objectiveDrift.js";
import { detectSensitiveDataExposure } from "./detectors/sensitiveDataExposure.js";
import { detectToolMismatch } from "./detectors/toolMismatch.js";
import { detectUnauthorizedScope } from "./detectors/unauthorizedScope.js";
import { detectWrongTarget } from "./detectors/wrongTarget.js";

export function evaluateAag(proposal: AgentActionProposal): AagPacket {
  const detectorResults: AagDetectorResult[] = [
    detectWrongTarget(proposal),
    detectUnauthorizedScope(proposal),
    detectMissingApproval(proposal),
    detectIrreversibleAction(proposal),
    detectSensitiveDataExposure(proposal),
    detectToolMismatch(proposal),
    detectObjectiveDrift(proposal)
  ];

  const hasFailure = detectorResults.some((result) => !result.passed);

  return {
    proposal,
    detectorResults,
    decision: hasFailure ? "require_approval" : "allow",
    reasonForDecision: "Placeholder AAG decision. TODO: implement execution gate policy logic.",
    receiptRequired: true
  };
}
