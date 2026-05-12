export interface DecisionReceipt {
  id: string;
  createdAt: string;
  proposalId: string;
  component: "pgdl" | "aag" | "runtime-binding";
  decision: string;
  reason: string;
  metadata: Record<string, unknown>;
}
