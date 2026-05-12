export type DataSensitivity = "public" | "internal" | "confidential" | "restricted";

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
  knownApproval: string | null;
  metadata: Record<string, unknown>;
}
