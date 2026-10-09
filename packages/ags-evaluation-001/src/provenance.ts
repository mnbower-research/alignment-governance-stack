import {
  createHash
} from "node:crypto";
import {
  readFileSync, readdirSync, existsSync
} from "node:fs";
import {
  execFileSync
} from "node:child_process";
import path from "node:path";
import {
  F7_DIAGNOSTIC_MANIFEST_PATH,
  FROZEN_DOCUMENT_PATHS,
  MANIFEST_METADATA_PATH,
  SCENARIO_MANIFEST_PATH,
  TARGET_SOURCE_PATHS,
  VALIDATION_PATHS,
  type RunPaths
} from "./paths.js";
import {
  hashRecordOmitting,
  validateManifestMetadataRecord,
  validateProvenanceRecord
} from "./schemas.js";
import {
  AGS_BASE_COMMIT,
  APPARATUS_VERSION,
  BENCHMARK_VERSION,
  MASTER_SEED,
  type AgsConfiguration,
  type ComparatorConfiguration,
  type ManifestMetadataRecord,
  type ProvenanceRecord,
  type RawArtifactHashes,
  type RunStatus
} from "./types.js";

export const AGS_CONFIGURATION: AgsConfiguration = {
  condition: "FULL_AGS",
  workspace_package:
    "@alignment-governance-stack/governance-core",
  runtime_entrypoint:
    "evaluateGovernedRuntimeActionWithReceipt",
  ags_base_commit: AGS_BASE_COMMIT,
  production_runtime_required: true,
  benchmark_reimplementation_allowed: false,
  shared_side_effect_adapter: "SECTION_27_1"
};

export const COMPARATOR_CONFIGURATION:
  ComparatorConfiguration = {
    local_gate_condition: "LOCAL_GATE",
    local_gate_specification: "SECTION_20_1",
    local_gate_uses_ags_decision_logic: false,
    direct_execution_condition: "DIRECT_EXECUTION",
    direct_execution_specification: "SECTION_21_1",
    direct_execution_governance_logic: false,
    shared_side_effect_adapter: "SECTION_27_1",
    condition_order: [
      "FULL_AGS",
      "LOCAL_GATE",
      "DIRECT_EXECUTION"
    ]
  };

export interface FrozenDocumentHashes {
  preregistration_file_hash: string;
  amendment_001_file_hash: string;
  amendment_002_file_hash: string;
  amendment_003_file_hash: string;
  amendment_004_file_hash: string;
  amendment_005_file_hash: string;
  amendment_006_file_hash: string;
  amendment_007_file_hash: string;
  apparatus_file_hash: string;
}

export interface FrozenManifestHashes {
  scenario_manifest_file_hash: string;
  f7_diagnostic_manifest_file_hash: string;
  manifest_metadata_file_hash: string;
  manifest_hash: string;
}

export interface FrozenSourceHashes {
  generator_source_hash: string;
  oracle_source_hash: string;
  full_ags_adapter_source_hash: string;
  local_gate_source_hash: string;
  direct_execution_source_hash: string;
  side_effect_adapter_source_hash: string;
  statistics_source_hash: string;
  schema_source_hash: string;
}

export interface CreateProvenanceInput {
  repo_root?: string;
  benchmark_commit: string;
  condition_run_count: number;
  f7_diagnostic_count: number;
  execution_event_count: number;
  failure_record_count: number;
  exact_raw_jsonl_row_count: number;
  completion_status: RunStatus;
  raw_artifact_hashes: RawArtifactHashes;
}

function resolveFromRoot(
  repoRoot: string,
  relativePath: string
): string {
  return path.resolve(
    repoRoot,
    relativePath
  );
}

export function sha256RawBytes(
  bytes: Uint8Array
): string {
  return (
    "sha256:" +
    createHash("sha256")
      .update(bytes)
      .digest("hex")
  );
}

export function sha256File(
  filePath: string
): string {
  return sha256RawBytes(
    readFileSync(filePath)
  );
}

export function readCurrentGitCommit(
  repoRoot = process.cwd()
): string {
  const commit =
    execFileSync(
      "git",
      ["rev-parse", "HEAD"],
      {
        cwd: repoRoot,
        encoding: "utf8"
      }
    ).trim();

  if (!/^[0-9a-f]{40}$/.test(commit)) {
    throw new Error(
      `Current Git commit is invalid: ${commit}`
    );
  }

  return commit;
}

export function assertBenchmarkCommitMatchesHead(
  expectedCommit: string,
  repoRoot = process.cwd()
): void {
  const actualCommit =
    readCurrentGitCommit(repoRoot);

  if (actualCommit !== expectedCommit) {
    throw new Error(
      `Benchmark commit mismatch: expected ${expectedCommit}, found ${actualCommit}.`
    );
  }
}

export function readFrozenManifestMetadata(
  repoRoot = process.cwd()
): ManifestMetadataRecord {
  const fullPath =
    resolveFromRoot(
      repoRoot,
      MANIFEST_METADATA_PATH
    );

  const parsed: unknown =
    JSON.parse(
      readFileSync(
        fullPath,
        "utf8"
      )
    );

  validateManifestMetadataRecord(parsed);

  return parsed;
}

export function collectFrozenDocumentHashes(
  repoRoot = process.cwd()
): FrozenDocumentHashes {
  return {
    preregistration_file_hash:
      sha256File(
        resolveFromRoot(
          repoRoot,
          FROZEN_DOCUMENT_PATHS.preregistration
        )
      ),
    amendment_001_file_hash:
      sha256File(
        resolveFromRoot(
          repoRoot,
          FROZEN_DOCUMENT_PATHS.amendment001
        )
      ),
    amendment_002_file_hash:
      sha256File(
        resolveFromRoot(
          repoRoot,
          FROZEN_DOCUMENT_PATHS.amendment002
        )
      ),
    amendment_003_file_hash:
      sha256File(
        resolveFromRoot(
          repoRoot,
          FROZEN_DOCUMENT_PATHS.amendment003
        )
      ),
    amendment_004_file_hash:
      sha256File(
        resolveFromRoot(
          repoRoot,
          FROZEN_DOCUMENT_PATHS.amendment004
        )
      ),
    amendment_005_file_hash:
      sha256File(
        resolveFromRoot(
          repoRoot,
          FROZEN_DOCUMENT_PATHS.amendment005
        )
      ),
    amendment_006_file_hash:
      sha256File(
        resolveFromRoot(
          repoRoot,
          FROZEN_DOCUMENT_PATHS.amendment006
        )
      ),
    amendment_007_file_hash: sha256File(resolveFromRoot(repoRoot, FROZEN_DOCUMENT_PATHS.amendment007)),
    apparatus_file_hash:
      sha256File(
        resolveFromRoot(
          repoRoot,
          FROZEN_DOCUMENT_PATHS.apparatus
        )
      )
  };
}

export function collectFrozenManifestHashes(
  repoRoot = process.cwd()
): FrozenManifestHashes {
  const metadata =
    readFrozenManifestMetadata(repoRoot);

  const scenarioManifestHash =
    sha256File(
      resolveFromRoot(
        repoRoot,
        SCENARIO_MANIFEST_PATH
      )
    );

  const f7ManifestHash =
    sha256File(
      resolveFromRoot(
        repoRoot,
        F7_DIAGNOSTIC_MANIFEST_PATH
      )
    );

  if (
    scenarioManifestHash !==
    metadata.scenario_manifest_file_hash
  ) {
    throw new Error(
      "Frozen scenario manifest raw-file hash mismatch."
    );
  }

  if (
    f7ManifestHash !==
    metadata.f7_diagnostic_manifest_file_hash
  ) {
    throw new Error(
      "Frozen F7 diagnostic manifest raw-file hash mismatch."
    );
  }

  return {
    scenario_manifest_file_hash:
      scenarioManifestHash,
    f7_diagnostic_manifest_file_hash:
      f7ManifestHash,
    manifest_metadata_file_hash:
      sha256File(
        resolveFromRoot(
          repoRoot,
          MANIFEST_METADATA_PATH
        )
      ),
    manifest_hash:
      metadata.manifest_hash
  };
}

export function collectFrozenSourceHashes(
  repoRoot = process.cwd()
): FrozenSourceHashes {
  return {
    generator_source_hash:
      sha256File(
        resolveFromRoot(
          repoRoot,
          TARGET_SOURCE_PATHS.scenarioGenerator
        )
      ),
    oracle_source_hash:
      sha256File(
        resolveFromRoot(
          repoRoot,
          TARGET_SOURCE_PATHS.oracle
        )
      ),
    full_ags_adapter_source_hash:
      sha256File(
        resolveFromRoot(
          repoRoot,
          TARGET_SOURCE_PATHS.fullAgsAdapter
        )
      ),
    local_gate_source_hash:
      sha256File(
        resolveFromRoot(
          repoRoot,
          TARGET_SOURCE_PATHS.localGate
        )
      ),
    direct_execution_source_hash:
      sha256File(
        resolveFromRoot(
          repoRoot,
          TARGET_SOURCE_PATHS.directExecution
        )
      ),
    side_effect_adapter_source_hash:
      sha256File(
        resolveFromRoot(
          repoRoot,
          TARGET_SOURCE_PATHS.sideEffectAdapter
        )
      ),
    statistics_source_hash:
      sha256File(
        resolveFromRoot(
          repoRoot,
          TARGET_SOURCE_PATHS.statistics
        )
      ),
    schema_source_hash:
      sha256File(
        resolveFromRoot(
          repoRoot,
          TARGET_SOURCE_PATHS.schemas
        )
      )
  };
}

export function hashFinalizedRawArtifacts(
  runPaths: RunPaths,
  repoRoot = process.cwd()
): RawArtifactHashes {
  return {
    condition_results_file_hash:
      sha256File(
        resolveFromRoot(
          repoRoot,
          runPaths.conditionResults
        )
      ),
    f7_diagnostics_file_hash:
      sha256File(
        resolveFromRoot(
          repoRoot,
          runPaths.f7Diagnostics
        )
      ),
    execution_events_file_hash:
      sha256File(
        resolveFromRoot(
          repoRoot,
          runPaths.executionEvents
        )
      ),
    run_metadata_file_hash:
      sha256File(
        resolveFromRoot(
          repoRoot,
          runPaths.runMetadata
        )
      ),
    failures_file_hash:
      sha256File(
        resolveFromRoot(
          repoRoot,
          runPaths.failures
        )
      )
  };
}

export function createProvenanceRecord(
  input: CreateProvenanceInput
): ProvenanceRecord {
  const repoRoot =
    input.repo_root ??
    process.cwd();

  const documentHashes =
    collectFrozenDocumentHashes(
      repoRoot
    );

  assertBenchmarkCommitMatchesHead(input.benchmark_commit, repoRoot);

  const manifestHashes =
    collectFrozenManifestHashes(
      repoRoot
    );

  const sourceHashes =
    collectFrozenSourceHashes(
      repoRoot
    );

  const recordWithoutHash = {
    benchmark_version:
      BENCHMARK_VERSION,
    apparatus_version:
      APPARATUS_VERSION,
    ags_base_commit:
      AGS_BASE_COMMIT,
    benchmark_commit:
      input.benchmark_commit,
    ...documentHashes,
    master_seed:
      MASTER_SEED,
    ...manifestHashes,
    ...sourceHashes,
    ags_configuration:
      AGS_CONFIGURATION,
    comparator_configuration:
      COMPARATOR_CONFIGURATION,
    episode_count:
      3500 as const,
    condition_run_count:
      input.condition_run_count,
    f7_diagnostic_count:
      input.f7_diagnostic_count,
    execution_event_count:
      input.execution_event_count,
    failure_record_count:
      input.failure_record_count,
    exact_raw_jsonl_row_count:
      input.exact_raw_jsonl_row_count,
    completion_status:
      input.completion_status,
    raw_artifact_hashes:
      input.raw_artifact_hashes
  };

  const record: ProvenanceRecord = {
    ...recordWithoutHash,
    provenance_hash:
      hashRecordOmitting(
        {
          ...recordWithoutHash,
          provenance_hash: ""
        },
        "provenance_hash"
      )
  };

  validateProvenanceRecord(record);

  return record;
}

export const IMPLEMENTATION_TAG = "ags-evaluation-001-implementation-v0.1";

/** Engineering evidence binding; does not add a scientific source-hash field. */
export function benchmarkImplementationHash(repoRoot: string): string {
  const directory = path.join(repoRoot, "packages/ags-evaluation-001");
  const files = ["package.json", "tsconfig.json", "tsconfig.build.json",
    ...readdirSync(path.join(directory, "src")).filter((name) => name.endsWith(".ts")).map((name) => `src/${name}`)];
  return hashRecordOmitting(Object.fromEntries(files.map((file) => [file, sha256File(path.join(directory, file))])), "");
}

function gitText(repoRoot: string, args: string[]): string {
  return execFileSync("git", args, { cwd: repoRoot, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }).trim();
}

export function verifyFrozenRepository(repoRoot: string, benchmarkCommit: string): void {
  assertBenchmarkCommitMatchesHead(benchmarkCommit, repoRoot);
  if (gitText(repoRoot, ["branch", "--show-current"]) !== "experiment/ags-evaluation-001") throw new Error("Wrong benchmark branch.");
  if (gitText(repoRoot, ["status", "--porcelain", "--untracked-files=all"]) !== "") throw new Error("Scientific execution requires a clean tree.");
  if (gitText(repoRoot, ["rev-parse", `${IMPLEMENTATION_TAG}^{commit}`]) !== benchmarkCommit) throw new Error("Implementation tag mismatch.");
  const changed = gitText(repoRoot, ["diff", "--name-only", AGS_BASE_COMMIT, "HEAD", "--", "packages", "apps"])
    .split("\n").filter(Boolean);
  if (changed.some((file) => !file.startsWith("packages/ags-evaluation-001/"))) throw new Error("Production SUT differs from frozen base.");
  const files = gitText(repoRoot, ["ls-files", "packages/ags-evaluation-001", "experiments/ags-evaluation-001/manifests"])
    .split("\n").filter(Boolean);
  for (const file of files) {
    const blob = execFileSync("git", ["show", `${benchmarkCommit}:${file}`], { cwd: repoRoot, maxBuffer: 128 * 1024 * 1024 });
    if (!readFileSync(path.join(repoRoot, file)).equals(blob)) throw new Error(`Frozen source/input byte mismatch: ${file}`);
  }
  const tags: [string, string][] = [
    [FROZEN_DOCUMENT_PATHS.preregistration, "ags-evaluation-001-prereg-v0.1"],
    [FROZEN_DOCUMENT_PATHS.apparatus, "ags-evaluation-001-apparatus-v0.1"],
    ...Array.from({ length: 7 }, (_, index): [string, string] => {
      const id = String(index + 1).padStart(3, "0");
      return [`experiments/AGS_EVALUATION_AMENDMENT_${id}.md`, `ags-evaluation-001-amendment-${id}-v0.1`];
    })
  ];
  for (const [file, tag] of tags) {
    const gitPath = file.replaceAll("\\", "/");
    if (gitText(repoRoot, ["rev-parse", `${tag}:${gitPath}`]) !== gitText(repoRoot, ["rev-parse", `HEAD:${gitPath}`])) {
      throw new Error(`Governing document changed after freeze: ${file}`);
    }
  }
  const summary = JSON.parse(readFileSync(path.join(repoRoot, VALIDATION_PATHS.summary), "utf8")) as {
    status: string; checks: { status: string }[]; source_hashes: FrozenSourceHashes;
    implementation_hash: string; document_hashes: FrozenDocumentHashes;
    scientific_condition_execution_invoked: boolean; scientific_endpoint_calculation_invoked: boolean;
  };
  if (summary.status !== "PASS" || summary.checks.length !== 24 || summary.checks.some((c) => c.status !== "PASS") ||
    summary.scientific_condition_execution_invoked || summary.scientific_endpoint_calculation_invoked ||
    hashRecordOmitting({ ...summary.source_hashes }, "") !== hashRecordOmitting({ ...collectFrozenSourceHashes(repoRoot) }, "")) {
    throw new Error("Engineering validation is missing, failed, or stale.");
  }
  if (summary.implementation_hash !== benchmarkImplementationHash(repoRoot) ||
    hashRecordOmitting({ ...summary.document_hashes }, "") !== hashRecordOmitting({ ...collectFrozenDocumentHashes(repoRoot) }, "")) {
    throw new Error("Validation does not cover current implementation/governing documents.");
  }
  collectFrozenManifestHashes(repoRoot);
  collectFrozenDocumentHashes(repoRoot);
  const remote = gitText(repoRoot, ["ls-remote", "origin", "refs/heads/experiment/ags-evaluation-001",
    `refs/tags/${IMPLEMENTATION_TAG}`, ...tags.map(([, tag]) => `refs/tags/${tag}`),
    ...tags.map(([, tag]) => `refs/tags/${tag}^{}`), `refs/tags/${IMPLEMENTATION_TAG}^{}`]);
  const refs = new Map(remote.split("\n").map((line) => { const [hash, ref] = line.split(/\s+/); return [ref, hash]; }));
  if (refs.get("refs/heads/experiment/ags-evaluation-001") !== benchmarkCommit) throw new Error("Remote benchmark branch mismatch.");
  for (const tag of [IMPLEMENTATION_TAG, ...tags.map(([, tag]) => tag)]) {
    const commit = refs.get(`refs/tags/${tag}^{}`) ?? refs.get(`refs/tags/${tag}`);
    if (commit !== gitText(repoRoot, ["rev-parse", `${tag}^{commit}`])) throw new Error(`Unpushed/mismatched freeze tag: ${tag}`);
  }
  // Rebuild before started_at and reject stale loaded modules. A retry must use
  // a fresh process; a rebuild never upgrades already-loaded code silently.
  const distHashes = (): string => {
    const hashes: Record<string, string> = {};
    for (const pkg of readdirSync(path.join(repoRoot, "packages"))) {
      const dist = path.join(repoRoot, "packages", pkg, "dist");
      if (!existsSync(dist)) continue;
      for (const entry of readdirSync(dist, { recursive: true, withFileTypes: true })) {
        if (entry.isFile() && entry.name.endsWith(".js")) {
          const file = path.join(entry.parentPath, entry.name);
          hashes[path.relative(repoRoot, file)] = sha256File(file);
        }
      }
    }
    return hashRecordOmitting(hashes, "");
  };
  const before = distHashes();
  execFileSync(process.platform === "win32" ? "cmd.exe" : "sh",
    process.platform === "win32" ? ["/d", "/s", "/c", "corepack pnpm build"] : ["-c", "corepack pnpm build"],
    { cwd: repoRoot, stdio: "pipe", maxBuffer: 32 * 1024 * 1024 });
  if (before !== distHashes()) throw new Error("Stale build detected. Start a fresh process after reviewing rebuilt code.");
  if (gitText(repoRoot, ["status", "--porcelain", "--untracked-files=all"]) !== "") throw new Error("Tree changed during preflight.");
}
