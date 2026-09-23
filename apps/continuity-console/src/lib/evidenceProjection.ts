import { buildImportedOperatorSummary } from "./operatorSummary";
import { hasVerifiedReceipt } from "@alignment-governance-stack/continuity-ingest/browser";
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
  category:
    | "Governed Chain"
    | "Layer Evidence"
    | "Parser Diagnostic"
    | "Import Diagnostic"
    | "Weak Correlation"
    | "Governance Decision";
  status: "Missing" | "Not Demonstrated" | "Diagnostic" | "Open";
  confidence: EvidenceConfidence;
  sourceMode: "Sample Mode" | "Local Evidence Mode";
  title: string;
  description: string;
  affectedLayerIds: string[];
  sourcePath?: string;
  parserDiagnostic?: string;
  evidenceBasis: string;
  missingRequirement: string;
  likelyRisk: string;
  recommendation: string;
  firstDetectedAt: string;
  lastDetectedAt: string;
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
  validationErrors?: boolean;
  proposalIds?: string[];
  contextAdmissions?: NormalizedAgsArtifact[];
  proposalId: string;
  workflowId: string;
  requestedAction: string;
  permitHash: string;
  target: string;
  scope: string;
  reversible?: boolean | undefined;
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
  "context-admission": ["layer-3"],
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
  return artifact.provenance.occurredAt ?? `Occurrence unknown; imported ${artifact.provenance.importedAt}`;
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
  if (count > 0) {
    return "Partial";
  }

  return "Not Demonstrated";
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
  const detectedAt = "Imported snapshot";
  if (diagnostic.code === "artifact.malformed-json" || diagnostic.code === "artifact.parser-error" || diagnostic.severity === "error") {
    return {
      id: `gap-malformed-${index}`,
      severity: "High",
      category: "Parser Diagnostic",
      status: "Diagnostic",
      confidence: "High",
      sourceMode: "Local Evidence Mode",
      title: diagnostic.code === "artifact.malformed-json" ? "Malformed local evidence artifact" : "Local evidence validation failed",
      description: diagnostic.message,
      affectedLayerIds: ["layer-10"],
      ...(diagnostic.sourcePath ? { sourcePath: diagnostic.sourcePath } : {}),
      parserDiagnostic: diagnostic.code,
      evidenceBasis: "The import diagnostic came directly from the JSON parser.",
      missingRequirement: "Valid JSON is required before the file can be treated as AGS evidence.",
      likelyRisk: "The artifact cannot support continuity claims until it is corrected.",
      recommendation: "Fix the JSON artifact before treating it as governance evidence.",
      firstDetectedAt: detectedAt,
      lastDetectedAt: detectedAt,
    };
  }

  if (diagnostic.code === "artifact.unsupported") {
    return {
      id: `gap-unsupported-${index}`,
      severity: "Medium",
      category: "Import Diagnostic",
      status: "Diagnostic",
      confidence: "High",
      sourceMode: "Local Evidence Mode",
      title: "Unsupported local evidence artifact",
      description: diagnostic.message,
      affectedLayerIds: ["layer-10"],
      ...(diagnostic.sourcePath ? { sourcePath: diagnostic.sourcePath } : {}),
      parserDiagnostic: diagnostic.code,
      evidenceBasis: "The artifact was valid JSON, but no Phase 2A parser recognized it.",
      missingRequirement: "A supported AGS artifact shape is required for it to map into the continuity view.",
      likelyRisk: "Operators may have evidence nearby that the Console cannot yet interpret.",
      recommendation: "Add a parser only after confirming this is an AGS artifact format.",
      firstDetectedAt: detectedAt,
      lastDetectedAt: detectedAt,
    };
  }

  if (diagnostic.code === "continuity-chain.missing-artifact") {
    return {
      id: `gap-chain-${index}`,
      severity: "High",
      category: "Governed Chain",
      status: "Missing",
      confidence: "High",
      sourceMode: "Local Evidence Mode",
      title: "Incomplete governed action chain",
      description: diagnostic.message,
      affectedLayerIds: ["layer-5", "layer-6", "layer-8", "layer-10"],
      ...(diagnostic.sourcePath ? { sourcePath: diagnostic.sourcePath } : {}),
      parserDiagnostic: diagnostic.code,
      evidenceBasis: "The correlated action chain contains at least one artifact, and the expected chain stage is absent.",
      missingRequirement: "A complete chain should include PGDL, AAG, runtime permit, runtime-binding result, and receipt artifacts where applicable.",
      likelyRisk: "The governed path cannot be reconstructed end to end for the correlated action.",
      recommendation: "Import the missing artifact or mark the chain as not evidenced.",
      firstDetectedAt: detectedAt,
      lastDetectedAt: detectedAt,
    };
  }

  return {
    id: `gap-diagnostic-${index}`, severity: diagnostic.severity === "info" ? "Low" : "High",
    category: "Import Diagnostic", status: "Diagnostic", confidence: "Partial", sourceMode: "Local Evidence Mode",
    title: "Imported diagnostic", description: diagnostic.message, affectedLayerIds: [],
    parserDiagnostic: diagnostic.code, evidenceBasis: "Supplied import diagnostic; preserve its stated uncertainty.",
    missingRequirement: "Review the diagnostic", likelyRisk: "Imported evidence may be incomplete or invalid.", recommendation: "Inspect the source diagnostic.",
    firstDetectedAt: detectedAt, lastDetectedAt: detectedAt,
  };
}

function deriveGaps(snapshot: ContinuitySnapshot, artifactsByLayer: Map<string, NormalizedAgsArtifact[]>): EvidenceGapFinding[] {
  const diagnosticGaps = snapshot.diagnostics
    .map((diagnostic, index) => diagnosticGap(diagnostic, index))
    .filter((gap): gap is EvidenceGapFinding => gap !== null);

  const missingLayerGaps = sampleDeployment.layers
    .filter((layer) => (artifactsByLayer.get(layer.id)?.length ?? 0) === 0)
    .map((layer): EvidenceGapFinding => ({
      id: `gap-layer-${layer.id}`,
      severity: layer.id === "layer-1" || layer.id === "layer-9" ? "High" : "Medium",
      category: "Layer Evidence",
      status: "Not Demonstrated",
      confidence: "Partial",
      sourceMode: "Local Evidence Mode",
      title: `${layer.shortName} has no imported evidence`,
      description: `Local Evidence Mode has no recognized artifact mapped to ${layer.name}. This does not prove absence; it means evidence is not present in the imported snapshot.`,
      affectedLayerIds: [layer.id],
      evidenceBasis: "No recognized imported artifact mapped to this layer in the active snapshot.",
      missingRequirement: "Layer-specific AGS evidence would be needed before claiming this layer is demonstrated.",
      likelyRisk: "Operators could overstate continuity if this layer is treated as proven.",
      recommendation: "Import a supported AGS artifact for this layer or leave the layer marked insufficient.",
      firstDetectedAt: snapshot.generatedAt,
      lastDetectedAt: snapshot.generatedAt,
    }));

  return [...diagnosticGaps, ...missingLayerGaps];
}

function evidenceConfidence(snapshot: ContinuitySnapshot, artifactsByLayer: Map<string, NormalizedAgsArtifact[]>): EvidenceConfidence {
  const evidencedLayers = sampleDeployment.layers.filter((layer) => (artifactsByLayer.get(layer.id)?.length ?? 0) > 0).length;
  const hasErrors = snapshot.diagnostics.some((diagnostic) => diagnostic.severity === "error");
  if (!hasErrors && evidencedLayers > 0) {
    return "Partial";
  }

  return "Insufficient";
}

/** Preserve embedded stages and every competing record; no imported denial is superseded by ordering. */
function expandEmbeddedArtifacts(artifacts: NormalizedAgsArtifact[]): NormalizedAgsArtifact[] {
  const expanded: NormalizedAgsArtifact[] = [];
  const visit = (artifact: NormalizedAgsArtifact): void => {
    expanded.push(artifact);
    if (!artifact.payload || typeof artifact.payload !== "object") return;
    const payload = artifact.payload as Record<string, unknown>;
    const embedded: Record<string, ArtifactKind> = { contextAdmission: "context-admission", pgdl: "pgdl-review-packet", aag: "aag-decision", permit: "runtime-permit", runtimeBinding: "runtime-binding-result" };
    for (const [field, kind] of Object.entries(embedded)) {
      const child = payload[field];
      if (!child || typeof child !== "object") continue;
      visit({ ...artifact, id: `${artifact.id}:${field}`, kind, payload: child,
        summary: `Embedded ${field} from ${artifact.provenance.sourcePath}` });
    }
  };
  artifacts.forEach(visit);
  // Nested histories and metadata may also carry material admission decisions.
  const collectContexts = (value: unknown, owner: NormalizedAgsArtifact, trail: string): void => {
    if (!value || typeof value !== "object") return;
    const record = value as Record<string, unknown>;
    if (record.version === "context-admission/v0.1") {
      expanded.push({ ...owner, id: `${owner.id}:${trail}`, kind: "context-admission", payload: value,
        summary: `Nested Context Admission from ${owner.provenance.sourcePath}` });
      return;
    }
    for (const [key, child] of Object.entries(record)) collectContexts(child, owner, `${trail}.${key}`);
  };
  artifacts.forEach(a => collectContexts(a.payload, a, "payload"));
  return [...new Map(expanded.map(a => [`${a.kind}:${a.provenance.sourcePath}:${JSON.stringify(a.warnings)}:${JSON.stringify(a.payload)}`, a])).values()];
}

function buildTrace(snapshot: ContinuitySnapshot): ImportedTrace {
  const correlatedArtifacts = expandEmbeddedArtifacts(snapshot.artifacts);
  const proposalIds = [...new Set(correlatedArtifacts.flatMap(a => a.correlation.proposalId ? [a.correlation.proposalId] : []))].sort();
  const proposalId = proposalIds.length > 1 ? "multiple-proposals" : proposalIds[0] ?? "no-correlated-proposal";
  const contextAdmissions = correlatedArtifacts.filter(item => item.kind === "context-admission");
  const events = traceKindOrder.flatMap((traceKind): ImportedTraceEvent[] => {
    const artifacts = correlatedArtifacts.filter(item => item.kind === traceKind.kind);
    if (!artifacts.length) return [{ id: `missing-${traceKind.kind}`, label: traceKind.label, kind: traceKind.kind,
      status: "Missing", timestamp: "Not imported", summary: "No matching artifact was imported for this stage.", missing: true }];
    return artifacts.map((artifact, index) => ({ id: `${artifact.id}:${index}`, label: traceKind.label, kind: artifact.kind,
      status: "Evidenced", timestamp: artifactTimestamp(artifact), summary: artifact.summary, artifact }));
  });

  events.unshift(...contextAdmissions.map((artifact): ImportedTraceEvent => ({
    id: artifact.id, label: "Context Admission / information handoff", kind: artifact.kind,
    status: "Observed", timestamp: artifactTimestamp(artifact), summary: artifact.summary, artifact
  })));

  events.push(...correlatedArtifacts.filter(a => a.kind !== "context-admission" && !traceKindOrder.some(k => k.kind === a.kind)).map((artifact): ImportedTraceEvent => ({
    id: artifact.id, label: artifact.kind, kind: artifact.kind, status: "Observed", timestamp: artifactTimestamp(artifact), summary: artifact.summary, artifact,
  })));
  const unique = (values: Array<string | undefined>): string => {
    const items = [...new Set(values.filter((v): v is string => typeof v === "string" && v.length > 0))];
    return items.length === 1 ? items[0]! : items.length ? `Multiple: ${items.sort().join(", ")}` : "not-demonstrated";
  };
  const proposals = correlatedArtifacts.flatMap(a => { const r = a.payload as Record<string, unknown>; return [r.proposal, r.originalProposal, r.allowedAction, r.runtimeAction].filter((v): v is Record<string, unknown> => !!v && typeof v === "object"); });
  const reversibilities = [...new Set(proposals.map(p => p.reversible))];

  return {
    proposalId,
    proposalIds,
    validationErrors: snapshot.diagnostics.some(d => d.severity !== "info" && d.code !== "continuity-chain.missing-artifact"),
    workflowId: unique(correlatedArtifacts.map(a => a.correlation.workflowId)),
    requestedAction: proposalIds.length > 1 ? `Multiple proposals: ${proposalIds.join(", ")}. Findings include every imported run.` : unique(proposals.map(p => typeof p.userRequest === "string" ? p.userRequest : undefined)),
    permitHash: unique(correlatedArtifacts.map(a => a.correlation.permitHash)),
    target: unique(proposals.map(p => typeof p.target === "string" ? p.target : undefined)),
    scope: "Imported evidence only",
    reversible: reversibilities.length === 1 && typeof reversibilities[0] === "boolean" ? reversibilities[0] : undefined,
    approvalSource: "Read-only imported snapshot",
    events,
    contextAdmissions,
  };
}

export function projectSnapshot(snapshot: ContinuitySnapshot): SnapshotProjection {
  const artifactsByLayer = countByLayer(snapshot);
  const gaps = deriveGaps(snapshot, artifactsByLayer);
  const trace = buildTrace(snapshot);
  for (const finding of buildImportedOperatorSummary(trace, gaps).findings) {
    if (gaps.some(g => g.id === finding.id)) continue;
    gaps.push({ id: finding.id, severity: finding.tone === "danger" ? "High" : "Medium", category: "Governance Decision", status: "Open", confidence: "Partial", sourceMode: "Local Evidence Mode",
      title: finding.title, description: finding.explanation, affectedLayerIds: [], evidenceBasis: "Material supplied governance evidence.", missingRequirement: "Review this finding.", likelyRisk: "Authorization or evidence may be unresolved.", recommendation: "Inspect the recorded decision and source evidence.", firstDetectedAt: snapshot.generatedAt, lastDetectedAt: snapshot.generatedAt });
  }
  const deployment: DeploymentManifest = {
    ...sampleDeployment,
    id: snapshot.deployment.id,
    name: snapshot.deployment.name,
    environment: snapshot.deployment.environment,
    lastScanAt: snapshot.generatedAt,
    plugins: [],
    layers: sampleDeployment.layers.map((layer) => {
      const artifacts = artifactsByLayer.get(layer.id) ?? [];
      return {
        ...layer,
        status: layerStatus(layer.id, artifactsByLayer),
        pluginIds: [],
        evidenceSources: artifacts.map((artifact) => `${artifact.kind}: ${artifact.provenance.sourcePath}`),
        lastVerifiedAt: "Not independently verified",
        knownGaps: artifacts.length > 0 ? [] : ["No supported local evidence imported for this layer."],
      };
    }),
    edges: sampleDeployment.edges.map((edge) => {
      const sourceCount = artifactsByLayer.get(edge.sourceLayerId)?.length ?? 0;
      const destinationCount = artifactsByLayer.get(edge.destinationLayerId)?.length ?? 0;
      const status: ContinuityStatus = sourceCount > 0 && destinationCount > 0 ? "Partial" : "Not Demonstrated";
      return {
        ...edge,
        status,
        enforcementStatus: "Not Demonstrated",
        evidenceStatus: status,
        knownRisks:
          status === "Not Demonstrated"
            ? ["No imported artifact demonstrates this boundary crossing."]
            : ["Boundary crossing is evidenced only by local imported artifacts."],
        recommendedRemediation: ["Import explicit proof for this boundary before claiming connection or enforcement."],
      };
    }),
    findings: gaps.map(toContinuityFinding),
  };

  return {
    deployment,
    gaps,
    trace,
    confidence: gaps.some(g => g.severity === "High" || g.category === "Import Diagnostic") ? "Insufficient" : evidenceConfidence(snapshot, artifactsByLayer),
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
    ``, `## Material Findings`, ...projectSnapshot(snapshot).gaps.map(g => `- [${g.severity}] ${g.title}: ${g.description}`),
    ``, `## Import Diagnostics`, ...snapshot.diagnostics.map(d => `- [${d.severity}] ${d.code}: ${d.message}`),
  ].join("\n");
}

/** Historical verdict from decisions, independent of artifact completeness. Never live authorization. */
export function importedTraceVerdict(trace: ImportedTrace): string {
  const summary = buildImportedOperatorSummary(trace, []);
  if (summary.answers[1].answer === "No") return "Execution denied";
  const payloads = trace.events.flatMap(event => event.artifact ? [{ kind: event.kind, data: event.artifact.payload as Record<string, unknown> }] : []);
  const decisions = payloads.flatMap(({ data }) => [data.decision, data.finalDecision]);
  if (decisions.some(d => ["reject", "block", "blocked_by_aag", "blocked_by_policy", "reject_before_aag", "rejected_before_gate", "execution_denied"].includes(String(d))) ||
      payloads.some(p => p.kind === "runtime-binding-result" && p.data.allowed === false)) return "Execution denied";
  if (decisions.some(d => ["require_approval", "approval_required_by_aag", "approval_required_by_authority"].includes(String(d)))) return "Approval required";
  if (decisions.some(d => ["escalate_to_human", "escalated_before_gate", "insufficient_human_participation"].includes(String(d)))) return "Human review required";
  if (decisions.some(d => ["revise_action", "revision_required_by_aag"].includes(String(d)))) return "Revision required";
  if ((trace.contextAdmissions ?? []).some(a => (a.payload as Record<string, unknown>).decision !== "admit")) return "Context unresolved";
  if (payloads.some(p => p.kind === "receipt" && !hasVerifiedReceipt(p.data))) return "Receipt integrity not verified";
  if (trace.validationErrors) return "Evidence validation failed";
  const requiredKinds = ["pgdl-review-packet", "aag-decision", "runtime-permit", "runtime-binding-result", "receipt"];
  if (requiredKinds.some(kind => !payloads.some(p => p.kind === kind))) return "Incomplete evidence";
  if (buildImportedOperatorSummary(trace, []).findings.some(f => f.id === "conflicting-decisions")) return "Governance records conflict";
  const aagAllowed = payloads.some(p => p.kind === "aag-decision" && p.data.decision === "allow");
  const runtimeAllowed = payloads.some(p => p.kind === "runtime-binding-result" && p.data.allowed === true);
  const receiptAllowed = payloads.some(p => p.kind === "receipt" && p.data.finalDecision === "execution_allowed");
  return aagAllowed && runtimeAllowed && receiptAllowed && summary.answers[1].answer === "Yes, at the recorded time" ? "Execution allowed (historical)" : "Authorization not demonstrated";
}
