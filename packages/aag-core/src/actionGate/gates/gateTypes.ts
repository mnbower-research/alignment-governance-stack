export type GateId =
  | "email_gate"
  | "data_export_gate"
  | "deployment_gate"
  | "cyber_gate"
  | "marketing_gate"
  | "finance_gate"
  | "legal_gate"
  | "hr_gate"
  | "metagate"
  | "default_action_gate";

export type GateCategory =
  | "communication"
  | "data"
  | "deployment"
  | "cyber"
  | "marketing"
  | "finance"
  | "legal"
  | "hr"
  | "governance"
  | "general";

export type GateRoute = {
  gateId: GateId;
  category: GateCategory;
  reason: string;
  matchedSignals: string[];
  confidence: number;
};

export type GateDefinition = {
  gateId: GateId;
  name: string;
  category: GateCategory;
  description: string;
  actionTypes: string[];
  tools: string[];
  riskNotes: string[];
  sixGateQuestionFocus: string[];
};
