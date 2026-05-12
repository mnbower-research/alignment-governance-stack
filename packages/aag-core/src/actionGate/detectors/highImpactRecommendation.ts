import type {
  ActionGateInput,
  GateDetector,
  GateDetectorResult,
} from "../types";
import { containsAny, getPayloadText } from "./cyberHelpers";

const riskyRecommendationPatterns = [
  /\brm\s+-(?:[a-z]*r[a-z]*f|[a-z]*f[a-z]*r)\b/i,
  /\brm\s+(?:recursive\s+force|rf)\b/i,
  /\bdisable\b.*\b(auth|authentication|authorization|auth middleware|security)\b/i,
  /\bship\b.*\bwithout\b.*\b(tests?|ci|security checks?)\b/i,
  /\bskip\b.*\b(tests?|ci|security review|security checks?|qa)\b/i,
  /\bchmod\s+777\b/i,
  /\bbypass\b.*\b(approval|review|queue|policy)\b/i,
  /\bmerge\b.*\bbefore\b.*\b(ci|security checks?|review)\b/i,
  /\b(admin|root)\s+token\b.*\b(\.env|env|environment)\b/i,
  /\b(senior engineer|ciso)\b.*\b(skip|ignore|bypass)\b.*\b(qa|policy|approval|review)\b/i,
  /\beveryone does this\b.*\b(prod|production|database|db)\b/i,
  /\bdirect\b.*\b(prod|production)\b.*\b(db|database)\b/i,
  /\bi'?ll take responsibility\b.*\b(disable|turn off)\b.*\b(rate limits?|guardrails?|controls?)\b/i,
  /\b(disable|turn off|shut off)\b.*\b(aag|agent action gate|oversight|metagate)\b/i,
  /\bweaken\b.*\b(policy|approval|governance|sensitive action)\b/i,
];

export const detectHighImpactRecommendation: GateDetector = (
  input: ActionGateInput,
): GateDetectorResult => {
  if (input.proposedAction.actionType !== "publish_technical_advice") {
    return noMatch();
  }

  const recommendationText = [
    input.userRequest,
    input.agentPlan,
    input.proposedAction.target,
    getPayloadText(input),
  ]
    .filter(Boolean)
    .join(" ");

  if (!containsAny(recommendationText, riskyRecommendationPatterns)) {
    return noMatch();
  }

  return {
    type: "high_impact_recommendation",
    triggered: true,
    confidence: 0.9,
    severity: "high",
    evidence: [
      "Technical recommendation could influence risky downstream human action, such as bypassing approvals, disabling controls, exposing credentials, or weakening governance.",
    ],
    recommendedDecision: "require_approval",
  };
};

function noMatch(): GateDetectorResult {
  return {
    type: "high_impact_recommendation",
    triggered: false,
    confidence: 0,
    severity: "low",
    evidence: [],
    recommendedDecision: "allow",
  };
}
