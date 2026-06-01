import { readdir, readFile, stat, writeFile, mkdir } from "node:fs/promises";
import { basename, dirname, extname, relative, resolve } from "node:path";
import { sha256Hex } from "./hash.js";
import { findParser } from "./parserRegistry.js";
import { stableStringify } from "./stableJson.js";
import type {
  ArtifactParser,
  ContinuitySnapshot,
  ImportDiagnostic,
  NormalizedAgsArtifact,
  SnapshotGenerationOptions,
  SnapshotGenerationResult,
} from "./types.js";

const SNAPSHOT_SCHEMA_VERSION = "ags.continuity-snapshot.v0.1";

async function discoverJsonFiles(sourcePaths: string[]): Promise<string[]> {
  const discovered: string[] = [];

  async function walk(path: string): Promise<void> {
    const pathStat = await stat(path);
    if (pathStat.isDirectory()) {
      const entries = await readdir(path);
      for (const entry of entries.sort()) {
        await walk(resolve(path, entry));
      }
      return;
    }

    if (pathStat.isFile() && extname(path).toLowerCase() === ".json") {
      discovered.push(resolve(path));
    }
  }

  for (const sourcePath of sourcePaths) {
    await walk(resolve(sourcePath));
  }

  return discovered.sort();
}

function sortArtifacts(artifacts: NormalizedAgsArtifact[]): NormalizedAgsArtifact[] {
  return [...artifacts].sort((left, right) =>
    [left.kind, left.correlation.proposalId ?? "", left.provenance.sourcePath, left.id].join("|").localeCompare(
      [right.kind, right.correlation.proposalId ?? "", right.provenance.sourcePath, right.id].join("|"),
    ),
  );
}

function sortDiagnostics(diagnostics: ImportDiagnostic[]): ImportDiagnostic[] {
  return [...diagnostics].sort((left, right) =>
    [left.severity, left.sourcePath ?? "", left.code, left.message].join("|").localeCompare(
      [right.severity, right.sourcePath ?? "", right.code, right.message].join("|"),
    ),
  );
}

function chainDiagnostics(artifacts: NormalizedAgsArtifact[]): ImportDiagnostic[] {
  const diagnostics: ImportDiagnostic[] = [];
  const artifactsByProposal = new Map<string, NormalizedAgsArtifact[]>();

  for (const artifact of artifacts) {
    const proposalId = artifact.correlation.proposalId;
    if (!proposalId) {
      continue;
    }

    const existing = artifactsByProposal.get(proposalId) ?? [];
    existing.push(artifact);
    artifactsByProposal.set(proposalId, existing);
  }

  for (const [proposalId, proposalArtifacts] of artifactsByProposal) {
    const kinds = new Set(proposalArtifacts.map((artifact) => artifact.kind));
    const sourcePath = proposalArtifacts[0]?.provenance.sourcePath;
    const expectedKinds = [
      "pgdl-review-packet",
      "aag-decision",
      "runtime-permit",
      "runtime-binding-result",
      "receipt",
    ] as const;

    for (const expectedKind of expectedKinds) {
      if (!kinds.has(expectedKind)) {
        diagnostics.push({
          severity: "warning",
          code: "continuity-chain.missing-artifact",
          message: `Proposal ${proposalId} has no imported ${expectedKind} artifact.`,
          ...(sourcePath ? { sourcePath } : {}),
        });
      }
    }
  }

  return diagnostics;
}

export async function generateContinuitySnapshot(
  options: SnapshotGenerationOptions,
  parsers?: ArtifactParser[],
): Promise<SnapshotGenerationResult> {
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const importedAt = options.importedAt ?? generatedAt;
  const sourceFiles = await discoverJsonFiles(options.sourcePaths);
  const artifacts: NormalizedAgsArtifact[] = [];
  const diagnostics: ImportDiagnostic[] = [];

  for (const absolutePath of sourceFiles) {
    const raw = await readFile(absolutePath, "utf8");
    const sha256 = sha256Hex(raw);
    const sourcePath = relative(process.cwd(), absolutePath).replaceAll("\\", "/");
    let parsed: unknown;

    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      diagnostics.push({
        severity: "error",
        code: "artifact.malformed-json",
        message: error instanceof Error ? error.message : "Malformed JSON.",
        sourcePath,
      });
      continue;
    }

    const parser = findParser(parsed, sourcePath, parsers);
    if (!parser) {
      diagnostics.push({
        severity: "warning",
        code: "artifact.unsupported",
        message: "No Phase 2A parser recognized this JSON artifact.",
        sourcePath,
      });
      continue;
    }

    try {
      const parsedArtifacts = parser.parse(parsed, {
        sourcePath,
        fileName: basename(sourcePath),
        sha256,
        importedAt,
      });
      artifacts.push(...parsedArtifacts);
    } catch (error) {
      diagnostics.push({
        severity: "error",
        code: "artifact.parser-error",
        message: error instanceof Error ? error.message : "Parser failed.",
        sourcePath,
      });
    }
  }

  diagnostics.push(...chainDiagnostics(artifacts));

  const snapshot: ContinuitySnapshot = {
    schemaVersion: SNAPSHOT_SCHEMA_VERSION,
    generatedAt,
    deployment: options.deployment ?? {
      id: "local-ags-evidence",
      name: "Local AGS Evidence",
      environment: "local",
    },
    artifacts: sortArtifacts(artifacts),
    diagnostics: sortDiagnostics(diagnostics),
  };

  if (options.outPath) {
    await mkdir(dirname(options.outPath), { recursive: true });
    await writeFile(options.outPath, stableStringify(snapshot), "utf8");
  }

  return {
    snapshot,
    discoveredFileCount: sourceFiles.length,
    parsedArtifactCount: snapshot.artifacts.length,
  };
}

