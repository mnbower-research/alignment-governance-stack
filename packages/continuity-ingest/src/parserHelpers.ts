import { basename } from "node:path";
import { correlateArtifact } from "./correlation.js";
import type {
  ArtifactKind,
  ArtifactParser,
  ArtifactParserContext,
  NormalizedAgsArtifact,
} from "./types.js";

export function isRecord(input: unknown): input is Record<string, unknown> {
  return Boolean(input) && typeof input === "object" && !Array.isArray(input);
}

export function isString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

export function hasAgentActionShape(input: unknown): boolean {
  if (!isRecord(input)) {
    return false;
  }

  return ["id", "userRequest", "tool", "actionType", "target", "environment"].every((key) => isString(input[key]));
}

export function createArtifact(
  parser: ArtifactParser,
  context: ArtifactParserContext,
  kind: ArtifactKind,
  artifactId: string,
  payload: unknown,
  summary: string,
  occurredAt?: string,
  warnings: string[] = [],
): NormalizedAgsArtifact {
  return {
    id: `${kind}:${artifactId}`,
    kind,
    provenance: {
      sourcePath: context.sourcePath,
      fileName: context.fileName || basename(context.sourcePath),
      sha256: context.sha256,
      importedAt: context.importedAt,
      ...(occurredAt ? { occurredAt } : {}),
      parserId: parser.id,
      parserVersion: parser.version,
    },
    correlation: correlateArtifact(payload),
    summary,
    payload,
    warnings,
  };
}
