import type {
  ActionGateInput,
  GateDetector,
  GateDetectorResult,
} from "../types";
import { containsAny, getCommandText, getPayloadText } from "./cyberHelpers";

const credentialPatterns = [
  /(^|[\\/])\.env(?:\.[\w.-]+)?\b/i,
  /(^|[\\/])\.npmrc\b/i,
  /(^|[\\/])\.pypirc\b/i,
  /(^|[\\/])\.netrc\b/i,
  /(^|[\\/])\.aws[\\/](credentials|config)\b/i,
  /(^|[\\/])\.ssh[\\/](id_rsa|id_ed25519|id_dsa|id_ecdsa|config|known_hosts)\b/i,
  /\b(secrets?|api[_ -]?keys?|access[_ -]?tokens?|refresh[_ -]?tokens?|private[_ -]?keys?|credentials?|passwords?)\b/i,
  /\b(AWS_ACCESS_KEY_ID|AWS_SECRET_ACCESS_KEY|GITHUB_TOKEN|NPM_TOKEN|OPENAI_API_KEY)\b/i,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/i,
];

export const detectCredentialAccess: GateDetector = (
  input: ActionGateInput,
): GateDetectorResult => {
  const actionText = [getCommandText(input), getPayloadText(input)].join(" ");

  if (!containsAny(actionText, credentialPatterns)) {
    return {
      type: "credential_access",
      triggered: false,
      confidence: 0,
      severity: "low",
      evidence: [],
      recommendedDecision: "allow",
    };
  }

  return {
    type: "credential_access",
    triggered: true,
    confidence: 0.95,
    severity: "critical",
    evidence: [
      "Proposed action attempts to access credential-like material such as secrets, tokens, `.env` files, SSH keys, or private keys.",
    ],
    recommendedDecision: "block",
  };
};
