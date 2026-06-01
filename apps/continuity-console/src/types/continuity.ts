export type ContinuityStatus =
  | "Missing"
  | "Declared"
  | "Mapped"
  | "Connected"
  | "Observed"
  | "Enforced"
  | "Evidenced"
  | "Tested"
  | "Red-Teamed"
  | "Production-Validated"
  | "Partial"
  | "Degraded";

export type AdapterCategory =
  | "Substrate Adapter"
  | "Policy Adapter"
  | "Orchestration Adapter"
  | "Deliberation Adapter"
  | "Runtime Decision Adapter"
  | "Execution-Control Adapter"
  | "Execution Adapter"
  | "Human Interface Adapter"
  | "Observability Adapter"
  | "Receipt / Audit Adapter"
  | "Governance Memory Adapter";

export type RiskLevel = "Low" | "Medium" | "High" | "Critical";
export type HealthStatus = "Healthy" | "Warning" | "Degraded" | "Offline";

export interface GovernanceLayer {
  id: string;
  order: number;
  name: string;
  shortName: string;
  purpose: string;
  status: ContinuityStatus;
  pluginIds: string[];
  evidenceSources: string[];
  lastVerifiedAt: string;
  upstreamDependencies: string[];
  downstreamGuarantees: string[];
  knownGaps: string[];
}

export interface GovernanceEdge {
  id: string;
  sourceLayerId: string;
  destinationLayerId: string;
  status: ContinuityStatus;
  dataCrossing: string;
  authorityCrossing: string;
  proofCrossing: string;
  enforcementStatus: ContinuityStatus;
  evidenceStatus: ContinuityStatus;
  knownRisks: string[];
  recommendedRemediation: string[];
}

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  vendor: string;
  description: string;
  adapterCategory: AdapterCategory;
  layersCovered: string[];
  inputsReceived: string[];
  outputsReturned: string[];
  permissionsRequired: string[];
  actionsAllowed: string[];
  actionsProhibited: string[];
  authoritySource: string;
  failureBehavior: string;
  evidenceGenerated: string[];
  reversibility: string;
  revocationPath: string;
  upstreamAssumptions: string[];
  downstreamGuarantees: string[];
  healthStatus: HealthStatus;
  integrationStatus: ContinuityStatus;
  testStatus: string;
  redTeamStatus: string;
  lastVerifiedAt: string;
}

export interface ContinuityFinding {
  id: string;
  title: string;
  severity: RiskLevel;
  affectedLayerIds: string[];
  description: string;
  recommendation: string;
}

export interface DeploymentManifest {
  id: string;
  name: string;
  environment: string;
  lastScanAt: string;
  layers: GovernanceLayer[];
  edges: GovernanceEdge[];
  plugins: PluginManifest[];
  findings: ContinuityFinding[];
}

export interface TraceEvent {
  id: string;
  label: string;
  status: ContinuityStatus;
  decision: string;
  timestamp: string;
  payloadSummary: string;
}

export interface GovernedActionTrace {
  proposalId: string;
  workflowId: string;
  requestedAction: string;
  permitHash: string;
  target: string;
  scope: string;
  reversible: boolean;
  approvalSource: string;
  events: TraceEvent[];
}

export interface ApprovalRequest {
  id: string;
  proposalId: string;
  requestingAgent: string;
  workflow: string;
  action: string;
  target: string;
  riskLevel: RiskLevel;
  reversible: boolean;
  pgdlSummary: string;
  authoritySource: string;
  timestamp: string;
  state: "Pending" | "Allowed" | "Revision Requested" | "Escalated" | "Blocked";
}

export interface ReceiptRecord {
  id: string;
  proposalId: string;
  action: string;
  decision: string;
  createdAt: string;
  summary: string;
}

export interface HumanAgencyAuditResult {
  score: number;
  meaningfulReview: number;
  rubberStampRisk: number;
  refusalPower: number;
  accountabilityClarity: number;
  dimensions: Array<{ name: string; score: number }>;
  findings: string[];
  restorationPriorities: string[];
}

export interface GovernanceMemorySignal {
  id: string;
  label: string;
  count: number;
  trend: "Rising" | "Stable" | "Falling";
  description: string;
}

export interface GovernanceRecommendation {
  id: string;
  title: string;
  rationale: string;
  affectedLayerIds: string[];
  reviewStatus: "Requires Human Review";
}
