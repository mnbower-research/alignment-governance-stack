import type {
  ActionGateInput,
  GateDetector,
  GateDetectorResult,
} from "../types";
import {
  actionTypeIsAuthorized,
  containsAny,
  getCommandText,
  getPayloadText,
  targetIsAuthorized,
} from "./cyberHelpers";

const cyberActionPatterns = [
  /\b(nmap|masscan|zmap|nikto|sqlmap|metasploit|msfconsole|hydra|gobuster|dirbuster|ffuf|wpscan)\b/i,
  /\b(port scan|scan ports|network scan|vulnerability scan|vuln scan|recon|enumerate services|fingerprint service)\b/i,
  /\b(exploit|payload injection|brute force|password spray|credential stuffing)\b/i,
];

export const detectUnauthorizedCyberScope: GateDetector = (
  input: ActionGateInput,
): GateDetectorResult => {
  const actionText = [getCommandText(input), getPayloadText(input)].join(" ");

  if (!containsAny(actionText, cyberActionPatterns)) {
    return {
      type: "unauthorized_cyber_scope",
      triggered: false,
      confidence: 0,
      severity: "low",
      evidence: [],
      recommendedDecision: "allow",
    };
  }

  const evidence: string[] = [];

  if (!targetIsAuthorized(input)) {
    evidence.push(
      "Proposed cyber-capable action targets a system outside `context.authorizedTargets`.",
    );
  }

  if (
    input.context?.authorizedActionTypes &&
    !actionTypeIsAuthorized(input)
  ) {
    evidence.push(
      "Proposed cyber-capable action type is outside `context.authorizedActionTypes`.",
    );
  }

  const triggered = evidence.length > 0;

  return {
    type: "unauthorized_cyber_scope",
    triggered,
    confidence: triggered ? Math.min(0.98, 0.9 + evidence.length * 0.03) : 0,
    severity: triggered ? "critical" : "low",
    evidence,
    recommendedDecision: triggered ? "block" : "allow",
  };
};
