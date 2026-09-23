import type {
  ContinuityStatus,
  DeploymentManifest,
  GovernanceEdge,
  GovernanceLayer,
} from "../types/continuity";

export interface ContinuityAnalysis {
  layerCoverage: number;
  edgeCoverage: number;
  continuityPercentage: number;
  evidencedPercentage: number;
  criticalGapCount: number;
  coveredLayerCount: number;
  evidencedLayerCount: number;
  missingLayers: GovernanceLayer[];
  partialLayers: GovernanceLayer[];
  weakEdges: GovernanceEdge[];
  recommendedNextSteps: string[];
}

const coveredStatuses: ContinuityStatus[] = [
  "Connected",
  "Observed",
  "Enforced",
  "Evidenced",
  "Tested",
  "Red-Teamed",
  "Production-Validated",
];

const evidencedStatuses: ContinuityStatus[] = [
  "Evidenced",
  "Tested",
  "Red-Teamed",
  "Production-Validated",
];

const weakStatuses: ContinuityStatus[] = ["Not Demonstrated", "Missing", "Partial", "Degraded", "Declared", "Mapped"];

function percent(part: number, whole: number): number {
  if (whole === 0) {
    return 0;
  }

  return Math.round((part / whole) * 100);
}

export function analyzeContinuity(deployment: DeploymentManifest): ContinuityAnalysis {
  const coveredLayers = deployment.layers.filter((layer) => coveredStatuses.includes(layer.status));
  const evidencedLayers = deployment.layers.filter((layer) => evidencedStatuses.includes(layer.status));
  const coveredEdges = deployment.edges.filter((edge) => coveredStatuses.includes(edge.status));
  const evidencedEdges = deployment.edges.filter((edge) => evidencedStatuses.includes(edge.evidenceStatus));
  const missingLayers = deployment.layers.filter((layer) => layer.status === "Missing" || layer.status === "Not Demonstrated");
  const partialLayers = deployment.layers.filter((layer) =>
    ["Partial", "Degraded", "Declared", "Mapped"].includes(layer.status),
  );
  const weakEdges = deployment.edges.filter((edge) => weakStatuses.includes(edge.status));
  const criticalGapCount = deployment.findings.filter((finding) => finding.severity === "Critical").length;
  const continuityPercentage = percent(coveredLayers.length + coveredEdges.length, deployment.layers.length + deployment.edges.length);
  const evidencedPercentage = percent(evidencedLayers.length + evidencedEdges.length, deployment.layers.length + deployment.edges.length);

  const recommendedNextSteps = [
    ...deployment.findings.slice(0, 4).map((finding) => finding.recommendation),
    ...weakEdges.slice(0, 3).flatMap((edge) => edge.recommendedRemediation),
  ].filter((step, index, allSteps) => step.length > 0 && allSteps.indexOf(step) === index);

  return {
    layerCoverage: percent(coveredLayers.length, deployment.layers.length),
    edgeCoverage: percent(coveredEdges.length, deployment.edges.length),
    continuityPercentage,
    evidencedPercentage,
    criticalGapCount,
    coveredLayerCount: coveredLayers.length,
    evidencedLayerCount: evidencedLayers.length,
    missingLayers,
    partialLayers,
    weakEdges,
    recommendedNextSteps,
  };
}
