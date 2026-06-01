import type {
  ArtifactKind,
  ContinuitySnapshot,
  ImportDiagnostic,
  NormalizedAgsArtifact,
} from "@alignment-governance-stack/continuity-ingest";
import { sampleDeployment } from "../data/sampleDeployment";
import type {
  ContinuityFinding,
  ContinuityStatus,
  DeploymentManifest,
} from "../types/continuity";

export type ConsoleDataMode = "sample" | "local-evidence";
export type EvidenceConfidence = "High" | "Partial" | "Insufficient";

export interface EvidenceGapFinding {
  id: string;
  severity: "Low" | "Medium" | "High" | "Critical";
  category: "Missing Evidence" | "Malformed Evidence" | "Unsupported Evidence" | "Weak Correlation";
  title: string;
  description: string;
  affectedLayerIds: string[];
  sourcePath?: string;
  recommendation: string;
}

export interface ImportedTraceEvent {
  id: string;
  label: string;
  kind: ArtifactKind;
  status: ContinuityStatus;
  timestamp: string;
  summary: string;
  artifact?: NormalizedAgsArtifact;
  missing?: boolean;
}

export interface ImportedTrace {
  proposalId: string;
  workflowId: string;
  requestedAction: string;
  permitHash: string;
  target: string;
  scope: string;
  reversible: boolean;
  approvalSource: string;
  events: ImportedTraceEvent[];
}

export interface SnapshotProjection {
  deployment: DeploymentManifest;
  gaps: EvidenceGapFinding[];
  trace: ImportedTrace;
  confidence: EvidenceConfidence;
  artifactsByLayer: Map<string, NormalizedAgsArtifact[]>;
}

const kindLayerMap: Record<ArtifactKind, string[]> = {
  "pgdl-review-packet": ["layer-5"],
  "aag-decision": ["layer-6"],
  "runtime-permit": ["layer-8"],
  "runtime-binding-result": ["layer-8"],
  receipt: ["layer-10"],
  "decision-closure-artifact": ["layer-9", "layer-10"],
  "agency-fingerprint": ["layer-10", "layer-12"],
  "governance-memory-summary": ["layer-11"],
  "agency-chain-report": ["layer-12"],
  "alignment-gap-report": ["layer-3"],
  "babel-risk-report": ["layer-12"],
  "babel-velocity-report": ["layer-12"],
  "policy-profile": ["layer-2", "layer-3"],
  "hard-boundary-profile": ["layer-2", "layer-3"],
  "authority-map": ["layer-1", "layer-2"],
  "human-participation-quality": ["layer-1", "layer-12"],
  unknown: [],
};

const traceKindOrder: Array<{ kind: ArtifactKind; label: string }> = [
  { kind: "pgdl-review-packet", label: "PGDL review" },
  { kind: "aag-decision", label: "AAG decision" },
  { kind: "runtime-permit", label: "Runtime permit" },
  { kind: "runtime-binding-result", label: "Runtime binding result" },
  { kind: "decision-closure-artifact", label: "Decision closure" },
  { kind: "receipt", label: "Receipt" },
  { kind: "agency-fingerprint", label: "Agency fingerprint" },
  { kind: "governance-memory-summary", label: "Governance Memory summary" },
];

function artifactTimestamp(artifact: NormalizedAgsArtifact): string {
  return artifact.provenance.occurredAt ?? artifact.provenance.importedAt;
}

function countByLayer(snapshot: ContinuitySnapshot): Map<string, NormalizedAgsArtifact[]> {
  const artifactsByLayer = new Map<string, NormalizedAgsArtifact[]>();

  for (const artifact of snapshot.artifacts) {
    for (const layerId of kindLayerMap[artifact.kind] ?? []) {
      const existing = artifactsByLayer.get(layerId) ?? [];
      existing.push(artifact);
      artifactsByLayer.set(layerId, existing);
    }
  }

  return artifactsByLayer;
}

function layerStatus(layerId: string, artifactsByLayer: Map<string, NormalizedAgsArtifact[]>): ContinuityStatus {
  const count = artifactsByLayer.get(layerId)?.length ?? 0;
  if (count >= 2) {
    return "Evidenced";
  }

  if (count === 1) {
    return "Partial";
  }

  return "Missing";
}

function toContinuityFinding(gap: EvidenceGapFinding): ContinuityFinding {
  return {
    id: gap.id,
    title: gap.title,
    severity: gap.severity,
    affectedLayerIds: gap.affectedLayerIds,
    description: gap.description,
    recommendation: gap.recommendation,
  };
}

function diagnosticGap(diagnostic: ImportDiagnostic, index: number): EvidenceGapFinding | null {
  if (diagnostic.code === "artifact.malformed-json") {
    return {
      id: `gap-malformed-${index}`,
      severity: "High",
      category: "Malformed Evidence",
      title: "Malformed local evidence artifact",
      description: diagnostic.message,
      affectedLayerIds: ["layer-10"],
      ...(diagnostic.sourcePath ? { sourcePath: diagnostic.sourcePath } : {}),
      recommendation: "Fix the JSON artifact before treating it as governance evidence.",
    };
  }

  if (diagnostic.code === "artifact.unsupported") {
    return {
      id: `gap-unsupported-${index}`,
      severity: "Medium",
      category: "Unsupported Evidence",
      title: "Unsupported local evidence artifact",
      description: diagnostic.message,
      affectedLayerIds: ["layer-10"],
      ...(diagnostic.sourcePath ? { sourcePath: diagnostic.sourcePath } : {}),
      recommendation: "Add a parser only after confirming this is an AGS artifact format.",
    };
  }

  if (diagnostic.code === "continuity-chain.missing-artifact") {
    return {
      id: `gap-chain-${index}`,
      severity: "High",
      category: "Missing Evidence",
      title: "Incomplete governed action chain",
      description: diagnostic.message,
      affectedLayerIds: ["layer-5", "layer-6", "layer-8", "layer-10"],
      ...(diagnostic.sourcePath ? { sourcePath: diagnostic.sourcePath } : {}),
      recommendation: "Import the missing artifact or mark the chain as not evidenced.",
    };
  }

  return null;
}

function deriveGaps(snapshot: ContinuitySnapshot, artifactsByLayer: Map<string, NormalizedAgsArtifact[]>): EvidenceGapFinding[] {
  const diagnosticGaps = snapshot.diagnostics
    .map((diagnostic, index) => diagnosticGap(diagnostic, index))
    .filter((gap): gap is EvidenceGapFinding => gap !== null);

  const missingLayerGaps = sampleDeployment.layers
    .filter((layer) => (artifactsByLayer.get(layer.id)?.length ?? 0) === 0)
    .slice(0, 6)
    .map((layer): EvidenceGapFinding => ({
      id: `gap-layer-${layer.id}`,
      severity: layer.id === "layer-1" || layer.id === "layer-9" ? "High" : "Medium",
      category: "Missing Evidence",
      title: `${layer.shortName} has no imported evidence`,
      description: `Local Evidence Mode has no recognized artifact mapped to ${layer.name}. This does not prove absence; it means evidence is not present in the imported snapshot.`,
      affectedLayerIds: [layer.id],
      recommendation: "Import a supported AGS artifact for this layer or leave the layer marked insufficient.",
    }));

  return [...diagnosticGaps, ...missingLayerGaps];
}

function evidenceConfidence(snapshot: ContinuitySnapshot, artifactsByLayer: Map<string, NormalizedAgsArtifact[]>): EvidenceConfidence {
  const evidencedLayers = sampleDeployment.layers.filter((layer) => (artifactsByLayer.get(layer.id)?.length ?? 0) > 0).length;
  const hasErrors = snapshot.diagnostics.some((diagnostic) => diagnostic.severity === "error");
  if (!hasErrors && evidencedLayers >= 7) {
    return "High";
  }

  if (evidencedLayers >= 3) {
    return "Partial";
  }

  return "Insufficient";
}

function buildTrace(snapshot: ContinuitySnapshot): ImportedTrace {
  const proposalId =
    snapshot.artifacts.find((artifact) => artifact.correlation.proposalId)?.correlation.proposalId ?? "no-correlated-proposal";
  const correlatedArtifacts = snapshot.artifacts.filter((artifact) => artifact.correlation.proposalId === proposalId || proposalId === "no-correlated-proposal");
  const firstPayload = correlatedArtifacts[0]?.payload as { target?: string; reversible?: boolean; metadata?: { workflowId?: string } } | undefined;
  const events = traceKindOrder.map((traceKind): ImportedTraceEvent => {
    const artifact = correlatedArtifacts.find((item) => item.kind === traceKind.kind);
    if (!artifact) {
      return {
        id: `missing-${traceKind.kind}`,
        label: traceKind.label,
        kind: traceKind.kind,
        status: "Missing",
        timestamp: "Not imported",
        summary: "No matching artifact was imported for this stage.",
        missing: true,
      };
    }

    return {
      id: artifact.id,
      label: traceKind.label,
      kind: artifact.kind,
      status: "Evidenced",
      timestamp: artifactTimestamp(artifact),
      summary: artifact.summary,
      artifact,
    };
  });

  return {
    proposalId,
    workflowId:
      correlatedArtifacts.find((artifact) => artifact.correlation.workflowId)?.correlation.workflowId ??
      firstPayload?.metadata?.workflowId ??
      "not-demonstrated",
    requestedAction: correlatedArtifacts[0]?.summary ?? "No correlated action summary",
    permitHash: correlatedArtifacts.find((artifact) => artifact.correlation.permitHash)?.correlation.permitHash ?? "not-demonstrated",
    target: firstPayload?.target ?? "not-demonstrated",
    scope: "Imported evidence only",
    reversible: firstPayload?.reversible ?? false,
    approvalSource: "Read-only imported snapshot",
    events,
  };
}

export function projectSnapshot(snapshot: ContinuitySnapshot): SnapshotProjection {
  const artifactsByLayer = countByLayer(snapshot);
  const gaps = deriveGaps(snapshot, artifactsByLayer);
  const deployment: DeploymentManifest = {
    ...sampleDeployment,
    id: snapshot.deployment.id,
    name: snapshot.deployment.name,
    environment: snapshot.deployment.environment,
    lastScanAt: snapshot.generatedAt,
    plugins: [],
    layers: sampleDeployment.layers.map((layer) => {
      const artifacts = artifactsByLayer.get(layer.id) ?? [];
      const latest = artifacts.map(artifactTimestamp).sort().at(-1);
      return {
        ...layer,
        status: layerStatus(layer.id, artifactsByLayer),
        pluginIds: [],
        evidenceSources: artifacts.map((artifact) => `${artifact.kind}: ${artifact.provenance.sourcePath}`),
        lastVerifiedAt: latest ?? "Not imported",
        knownGaps: artifacts.length > 0 ? [] : ["No supported local evidence imported for this layer."],
      };
    }),
    edges: sampleDeployment.edges.map((edge) => {
      const sourceCount = artifactsByLayer.get(edge.sourceLayerId)?.length ?? 0;
      const destinationCount = artifactsByLayer.get(edge.destinationLayerId)?.length ?? 0;
      const status: ContinuityStatus = sourceCount > 0 && destinationCount > 0 ? "Partial" : "Missing";
      return {
        ...edge,
        status,
        enforcementStatus: "Missing",
        evidenceStatus: status,
        knownRisks:
          status === "Missing"
            ? ["No imported artifact demonstrates this boundary crossing."]
            : ["Boundary crossing is evidenced only by local imported artifacts."],
        recommendedRemediation: ["Import explicit proof for this boundary before claiming connection or enforcement."],
      };
    }),
    findings: gaps.slice(0, 8).map(toContinuityFinding),
  };

  return {
    deployment,
    gaps,
    trace: buildTrace(snapshot),
    confidence: evidenceConfidence(snapshot, artifactsByLayer),
    artifactsByLayer,
  };
}

export function summarizeSnapshot(snapshot: ContinuitySnapshot): string {
  const counts = snapshot.artifacts.reduce<Record<string, number>>((accumulator, artifact) => {
    accumulator[artifact.kind] = (accumulator[artifact.kind] ?? 0) + 1;
    return accumulator;
  }, {});

  return [
    `# AGS Continuity Snapshot Summary`,
    ``,
    `- Schema: ${snapshot.schemaVersion}`,
    `- Generated: ${snapshot.generatedAt}`,
    `- Deployment: ${snapshot.deployment.name} (${snapshot.deployment.environment})`,
    `- Artifacts: ${snapshot.artifacts.length}`,
    `- Diagnostics: ${snapshot.diagnostics.length}`,
    ``,
    `## Artifact Counts`,
    ...Object.entries(counts).map(([kind, count]) => `- ${kind}: ${count}`),
  ].join("\n");
}
