import type { GovernanceReceipt } from "@alignment-governance-stack/receipts";
import { createGovernanceRecommendations } from "./createGovernanceRecommendations.js";
import { detectGovernancePatterns } from "./detectGovernancePatterns.js";
import { summarizeGovernanceMemory } from "./summarizeGovernanceMemory.js";
import type { GovernanceMemoryInput, GovernanceMemoryReport } from "./types.js";

export function analyzeReceiptHistory(input: GovernanceMemoryInput): GovernanceMemoryReport {
  if (!Array.isArray(input.receipts)) {
    throw new TypeError("Governance memory input receipts must be an array.");
  }

  const patterns = detectGovernancePatterns(input.receipts, {
    ...(input.minOccurrences !== undefined ? { minOccurrences: input.minOccurrences } : {})
  });
  const recommendations = createGovernanceRecommendations(patterns);
  const reportWithoutSummary = {
    id: `governance-memory-${Date.now()}`,
    version: "ags.governance-memory.v1.0" as const,
    createdAt: new Date().toISOString(),
    receiptCount: input.receipts.length,
    patterns,
    recommendations,
    ...(input.metadata !== undefined ? { metadata: input.metadata } : {})
  };
  const report: GovernanceMemoryReport = {
    ...reportWithoutSummary,
    summary: ""
  };

  return {
    ...report,
    summary: summarizeGovernanceMemory(report)
  };
}
