import type {
  ActionGateInput,
  GateDetector,
  GateDetectorResult,
} from "../types";
import {
  containsAny,
  getCommandText,
  getPayloadText,
  isTerminalLikeTool,
} from "./cyberHelpers";

const destructivePatterns = [
  /\brm\s+-(?:[a-z]*r[a-z]*f|[a-z]*f[a-z]*r)\b/i,
  /\b(del|erase|rmdir)\b.*\b\/[sq]\b/i,
  /\b(drop|truncate)\b.*\b(database|schema|table)\b/i,
  /\b(delete\s+from)\b.*\b(where\s+1\s*=\s*1|without\s+where|;?$)\b/i,
  /\b(kubectl|oc)\b.*\bdelete\b.*\b(namespace|clusterrole|deployment|secret|configmap)\b/i,
  /\bterraform\s+destroy\b/i,
  /\b(shred|wipefs|mkfs|format|dd\s+if=\/dev\/zero)\b/i,
  /\b(purge|wipe|destroy)\b.*\b(database|disk|volume|bucket|cluster|logs?|backups?)\b/i,
];

const cyberDestructiveToolPattern =
  /\b(shell|terminal|cli|command|cmd|powershell|bash|database|sql|postgres|mysql|kubectl|terraform|cloud)\b/i;

export const detectDestructiveCyberAction: GateDetector = (
  input: ActionGateInput,
): GateDetectorResult => {
  const actionText = [getCommandText(input), getPayloadText(input)].join(" ");
  const isCyberExecutionSurface =
    isTerminalLikeTool(input.proposedAction.tool) ||
    cyberDestructiveToolPattern.test(input.proposedAction.tool);

  if (!isCyberExecutionSurface || !containsAny(actionText, destructivePatterns)) {
    return {
      type: "destructive_cyber_action",
      triggered: false,
      confidence: 0,
      severity: "low",
      evidence: [],
      recommendedDecision: "allow",
    };
  }

  return {
    type: "destructive_cyber_action",
    triggered: true,
    confidence: 0.95,
    severity: "critical",
    evidence: [
      "Proposed command matches destructive or irreversible cyber action patterns such as recursive removal, database drop, infrastructure destroy, or disk wipe.",
    ],
    recommendedDecision: "block",
  };
};
