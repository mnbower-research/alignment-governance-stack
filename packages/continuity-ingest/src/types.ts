export type ArtifactKind =
  | "context-admission"
  | "pgdl-review-packet"
  | "aag-decision"
  | "runtime-permit"
  | "runtime-binding-result"
  | "receipt"
  | "decision-closure-artifact"
  | "agency-fingerprint"
  | "governance-memory-summary"
  | "agency-chain-report"
  | "alignment-gap-report"
  | "babel-risk-report"
  | "babel-velocity-report"
  | "policy-profile"
  | "hard-boundary-profile"
  | "authority-map"
  | "human-participation-quality"
  | "unknown";

export interface ArtifactProvenance {
  sourcePath: string;
  fileName: string;
  sha256: string;
  importedAt: string;
  occurredAt?: string;
  parserId: string;
  parserVersion: string;
}

export interface ArtifactCorrelation {
  proposalId?: string;
  workflowId?: string;
  decisionId?: string;
  approvalId?: string;
  permitId?: string;
  permitHash?: string;
  receiptId?: string;
  closureId?: string;
  fingerprintId?: string;
  agentId?: string;
}

export interface NormalizedAgsArtifact {
  id: string;
  kind: ArtifactKind;
  provenance: ArtifactProvenance;
  correlation: ArtifactCorrelation;
  summary: string;
  payload: unknown;
  warnings: string[];
}

export interface ImportDiagnostic {
  severity: "info" | "warning" | "error";
  code: string;
  message: string;
  sourcePath?: string;
}

export interface ContinuitySnapshot {
  schemaVersion: string;
  generatedAt: string;
  deployment: {
    id: string;
    name: string;
    environment: string;
  };
  artifacts: NormalizedAgsArtifact[];
  diagnostics: ImportDiagnostic[];
}

export interface ArtifactParserContext {
  sourcePath: string;
  fileName: string;
  sha256: string;
  importedAt: string;
}

export interface ArtifactParser {
  id: string;
  version: string;
  canParse(input: unknown, sourcePath: string): boolean;
  parse(input: unknown, context: ArtifactParserContext): NormalizedAgsArtifact[];
}

export interface SnapshotGenerationOptions {
  sourcePaths: string[];
  outPath?: string;
  generatedAt?: string;
  importedAt?: string;
  deployment?: {
    id: string;
    name: string;
    environment: string;
  };
}

export interface SnapshotGenerationResult {
  snapshot: ContinuitySnapshot;
  discoveredFileCount: number;
  parsedArtifactCount: number;
}
