#!/usr/bin/env node
import { generateContinuitySnapshot } from "./generateSnapshot.js";
import { stableStringify } from "./stableJson.js";

interface CliArgs {
  sourcePaths: string[];
  outPath?: string;
  deploymentId?: string;
  deploymentName?: string;
  environment?: string;
}

function readValue(args: string[], index: number, flag: string): string {
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`Missing value for ${flag}.`);
  }

  return value;
}

function parseArgs(argv: string[]): CliArgs {
  const parsed: CliArgs = { sourcePaths: [] };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    switch (arg) {
      case "--":
        break;
      case "--source":
        parsed.sourcePaths.push(readValue(argv, index, arg));
        index += 1;
        break;
      case "--out":
        parsed.outPath = readValue(argv, index, arg);
        index += 1;
        break;
      case "--deployment-id":
        parsed.deploymentId = readValue(argv, index, arg);
        index += 1;
        break;
      case "--deployment-name":
        parsed.deploymentName = readValue(argv, index, arg);
        index += 1;
        break;
      case "--environment":
        parsed.environment = readValue(argv, index, arg);
        index += 1;
        break;
      case "--help":
        printHelp();
        process.exit(0);
      default:
        throw new Error(`Unknown argument: ${String(arg)}`);
    }
  }

  if (parsed.sourcePaths.length === 0) {
    throw new Error("At least one --source path is required.");
  }

  return parsed;
}

function printHelp(): void {
  console.log(`AGS Continuity Ingest

Usage:
  ags-continuity-ingest --source <file-or-dir> --out <snapshot.json>

Options:
  --source <path>            Local JSON file or directory. Can be repeated.
  --out <path>               Snapshot JSON output path.
  --deployment-id <id>       Deployment identifier for the snapshot.
  --deployment-name <name>   Deployment display name for the snapshot.
  --environment <name>       Deployment environment label.
`);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const result = await generateContinuitySnapshot({
    sourcePaths: args.sourcePaths,
    ...(args.outPath ? { outPath: args.outPath } : {}),
    deployment: {
      id: args.deploymentId ?? "local-ags-evidence",
      name: args.deploymentName ?? "Local AGS Evidence",
      environment: args.environment ?? "local",
    },
  });

  if (!args.outPath) {
    process.stdout.write(stableStringify(result.snapshot));
  }

  const errorCount = result.snapshot.diagnostics.filter((diagnostic) => diagnostic.severity === "error").length;
  const warningCount = result.snapshot.diagnostics.filter((diagnostic) => diagnostic.severity === "warning").length;
  console.error(
    `Continuity snapshot: ${result.parsedArtifactCount} artifacts from ${result.discoveredFileCount} JSON files; ${warningCount} warnings, ${errorCount} errors.`,
  );
  if (args.outPath) {
    console.error(`Wrote ${args.outPath}`);
  }

  if (errorCount > 0) {
    console.error("Import diagnostics include errors; the snapshot was still written for operator review.");
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
