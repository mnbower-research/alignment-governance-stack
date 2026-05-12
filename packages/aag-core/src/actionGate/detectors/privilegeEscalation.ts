import type {
  ActionGateInput,
  GateDetector,
  GateDetectorResult,
} from "../types";
import { containsAny, getCommandText, getPayloadText } from "./cyberHelpers";

const escalationPatterns = [
  /\bsudo\b/i,
  /\bsu\s+-?\b/i,
  /\b(useradd|usermod|groupadd|gpasswd)\b.*\b(sudo|wheel|admin|root)\b/i,
  /\bchmod\s+(?:\+s|[0-7]*[467][0-7]{2,3}|777)\b/i,
  /\bchown\b.*\b(root|admin)\b/i,
  /\b(setfacl|setcap)\b/i,
  /\bkubectl\b.*\b(create|patch|apply)\b.*\b(clusterrolebinding|rolebinding|cluster-admin)\b/i,
  /\bgrant\b.*\b(admin|owner|root|superuser|all privileges)\b/i,
  /\b(make|set|promote)\b.*\b(admin|owner|root|superuser)\b/i,
];

export const detectPrivilegeEscalation: GateDetector = (
  input: ActionGateInput,
): GateDetectorResult => {
  const actionText = [getCommandText(input), getPayloadText(input)].join(" ");

  if (!containsAny(actionText, escalationPatterns)) {
    return {
      type: "privilege_escalation",
      triggered: false,
      confidence: 0,
      severity: "low",
      evidence: [],
      recommendedDecision: "allow",
    };
  }

  return {
    type: "privilege_escalation",
    triggered: true,
    confidence: 0.94,
    severity: "critical",
    evidence: [
      "Proposed action matches user, role, permission, root, admin, or capability escalation patterns.",
    ],
    recommendedDecision: "block",
  };
};
