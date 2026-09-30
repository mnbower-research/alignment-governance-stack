/** Confirmed tolerances for the opt-in execution boundary, not new action authority. */
export interface ExecutionRevalidationPolicy {
  maxEvidenceAgeMs: number;
  maxExecutionDelayMs: number;
}
export function validateExecutionRevalidationPolicy(policy: ExecutionRevalidationPolicy): void {
  if (!Number.isSafeInteger(policy.maxEvidenceAgeMs) || policy.maxEvidenceAgeMs <= 0
    || !Number.isSafeInteger(policy.maxExecutionDelayMs) || policy.maxExecutionDelayMs <= 0)
    throw new Error("Execution revalidation requires positive integer freshness and execution-delay limits");
}
