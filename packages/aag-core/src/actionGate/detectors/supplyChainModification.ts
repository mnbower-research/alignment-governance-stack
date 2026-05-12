import type {
  ActionGateInput,
  GateDetector,
  GateDetectorResult,
} from "../types";
import { containsAny, getCommandText, getPayloadText } from "./cyberHelpers";

const modificationPatterns = [
  /\b(write|modify|update|edit|patch|create|delete|remove|install|upgrade|publish|release)\b/i,
  /\b(add|change)\b.*\b(dependency|package|workflow|pipeline|deploy|build)\b/i,
];

const supplyChainPatterns = [
  /(?:^|[\s"'([\\/])\.github[\\/]workflows[\\/][\w.-]+\.ya?ml\b/i,
  /(?:^|[\s"'([\\/])\.gitlab-ci\.ya?ml\b/i,
  /(?:^|[\s"'([\\/])(package|package-lock|pnpm-lock|yarn|composer|poetry|pyproject|requirements|gemfile|go\.mod|cargo)\b/i,
  /\b(npm|pnpm|yarn|pip|poetry|gem|cargo|go get|composer)\b.*\b(install|add|update|publish|release)\b/i,
  /\b(ci\/cd|workflow|pipeline|build chain|dependency|package registry|deployment config|deploy key)\b/i,
  /\b(Dockerfile|docker-compose|terraform|helm|kustomize|cloudbuild)\b/i,
];

export const detectSupplyChainModification: GateDetector = (
  input: ActionGateInput,
): GateDetectorResult => {
  const actionText = [getCommandText(input), getPayloadText(input)].join(" ");

  if (
    !containsAny(actionText, modificationPatterns) ||
    !containsAny(actionText, supplyChainPatterns)
  ) {
    return {
      type: "supply_chain_modification",
      triggered: false,
      confidence: 0,
      severity: "low",
      evidence: [],
      recommendedDecision: "allow",
    };
  }

  return {
    type: "supply_chain_modification",
    triggered: true,
    confidence: 0.9,
    severity: "critical",
    evidence: [
      "Proposed action modifies CI/CD, dependency, package, deployment, or build-chain configuration.",
    ],
    recommendedDecision: "require_approval",
  };
};
