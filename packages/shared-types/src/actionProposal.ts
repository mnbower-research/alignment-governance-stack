export type DataSensitivity = "low" | "medium" | "high";

export interface AgentActionProposal {
  id: string;
  userRequest: string;
  tool: string;
  actionType: string;
  target: string;
  environment: string;
  reversible: boolean;
  externalFacing: boolean;
  dataSensitivity: DataSensitivity;
  requiresApproval: boolean;
  knownApproval: boolean;
  metadata: Record<string, unknown>;
}
