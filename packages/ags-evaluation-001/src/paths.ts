import path from "node:path";

export const EVALUATION_ROOT = path.join("experiments", "ags-evaluation-001");

export const MANIFEST_DIRECTORY = path.join(EVALUATION_ROOT, "manifests");
export const RESULTS_DIRECTORY = path.join(EVALUATION_ROOT, "results");
export const VALIDATION_DIRECTORY = path.join(EVALUATION_ROOT, "validation");

export const SCENARIO_MANIFEST_PATH = path.join(
  MANIFEST_DIRECTORY,
  "scenario_manifest_001.jsonl"
);

export const F7_DIAGNOSTIC_MANIFEST_PATH = path.join(
  MANIFEST_DIRECTORY,
  "f7_diagnostic_manifest_001.jsonl"
);

export const MANIFEST_METADATA_PATH = path.join(
  MANIFEST_DIRECTORY,
  "manifest_metadata_001.json"
);

export const VALIDATION_PATHS = {
  configuration: path.join(VALIDATION_DIRECTORY, "configuration_validation.json"),
  determinism: path.join(VALIDATION_DIRECTORY, "determinism_validation.json"),
  knownCases: path.join(VALIDATION_DIRECTORY, "known_case_validation.json"),
  statistics: path.join(VALIDATION_DIRECTORY, "statistics_validation.json"),
  schema: path.join(VALIDATION_DIRECTORY, "schema_validation.json"),
  summary: path.join(VALIDATION_DIRECTORY, "validation_summary.json")
} as const;

export interface RunPaths {
  runDirectory: string;
  conditionResults: string;
  f7Diagnostics: string;
  executionEvents: string;
  runMetadata: string;
  provenance: string;
  failures: string;
  endpointSummary: string;
  hAgs1McNemar: string;
  hAgs2Binomial: string;
  familySummary: string;
  f7DiagnosticSummary: string;
}

export function formatRunDirectoryName(runNumber: number): string {
  if (!Number.isInteger(runNumber) || runNumber < 1 || runNumber > 999) {
    throw new Error("Run number must be an integer from 1 through 999.");
  }
  return `run-${String(runNumber).padStart(3, "0")}`;
}

export function getRunPaths(runNumber: number): RunPaths {
  const runDirectory = path.join(RESULTS_DIRECTORY, formatRunDirectoryName(runNumber));

  return {
    runDirectory,
    conditionResults: path.join(runDirectory, "raw", "condition_results.jsonl"),
    f7Diagnostics: path.join(runDirectory, "raw", "f7_diagnostics.jsonl"),
    executionEvents: path.join(runDirectory, "raw", "execution_events.jsonl"),
    runMetadata: path.join(runDirectory, "raw", "run_metadata.json"),
    provenance: path.join(runDirectory, "raw", "provenance.json"),
    failures: path.join(runDirectory, "raw", "failures.jsonl"),
    endpointSummary: path.join(runDirectory, "analysis", "endpoint_summary.json"),
    hAgs1McNemar: path.join(runDirectory, "analysis", "h_ags1_mcnemar.json"),
    hAgs2Binomial: path.join(runDirectory, "analysis", "h_ags2_binomial.json"),
    familySummary: path.join(runDirectory, "analysis", "family_summary.json"),
    f7DiagnosticSummary: path.join(runDirectory, "analysis", "f7_diagnostic_summary.json")
  };
}

export const TARGET_SOURCE_PATHS = {
  scenarioGenerator: path.join("packages", "ags-evaluation-001", "src", "scenarioGenerator.ts"),
  oracle: path.join("packages", "ags-evaluation-001", "src", "oracle.ts"),
  fullAgsAdapter: path.join("packages", "ags-evaluation-001", "src", "fullAgsAdapter.ts"),
  localGate: path.join("packages", "ags-evaluation-001", "src", "localGate.ts"),
  directExecution: path.join("packages", "ags-evaluation-001", "src", "directExecution.ts"),
  sideEffectAdapter: path.join("packages", "ags-evaluation-001", "src", "sideEffectAdapter.ts"),
  statistics: path.join("packages", "ags-evaluation-001", "src", "statistics.ts"),
  schemas: path.join("packages", "ags-evaluation-001", "src", "schemas.ts")
} as const;

export const FROZEN_DOCUMENT_PATHS = {
  preregistration: path.join("experiments", "AGS_EVALUATION_PLAN_001.md"),
  amendment001: path.join("experiments", "AGS_EVALUATION_AMENDMENT_001.md"),
  amendment002: path.join("experiments", "AGS_EVALUATION_AMENDMENT_002.md"),
  amendment003: path.join("experiments", "AGS_EVALUATION_AMENDMENT_003.md"),
  amendment004: path.join("experiments", "AGS_EVALUATION_AMENDMENT_004.md"),
  amendment005: path.join("experiments", "AGS_EVALUATION_AMENDMENT_005.md"),
  amendment006: path.join("experiments", "AGS_EVALUATION_AMENDMENT_006.md"),
  amendment007: path.join("experiments", "AGS_EVALUATION_AMENDMENT_007.md"),
  apparatus: path.join("experiments", "AGS_EVALUATION_APPARATUS_001.md")
} as const;
