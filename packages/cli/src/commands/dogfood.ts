import {
  builtInContentPublishingDogfoodEvalCases,
  builtInContentPublishingDepthHardeningEvalCases,
  builtInContentPublishingHardeningEvalCases,
  builtInDecisionClosureHardeningEvalCases,
  builtInDogfoodEvalCases,
  builtInEnterpriseDogfoodEvalCases,
  runContentPublishingDogfoodEvalSuite,
  runContentPublishingDepthHardeningEvalSuite,
  runContentPublishingHardeningEvalSuite,
  runDecisionClosureHardeningEvalSuite,
  runDogfoodEvalSuite,
  runEnterpriseDogfoodEvalSuite,
  runEvalSuite
} from "@alignment-governance-stack/eval-suite";
import type { CliResult } from "../cli.js";

export function runDogfoodCommand(_args: string[] = []): CliResult {
  const internal = runEvalSuite(builtInDogfoodEvalCases);
  const enterprise = runEnterpriseDogfoodEvalSuite(builtInEnterpriseDogfoodEvalCases);
  const contentPublishing = runContentPublishingDogfoodEvalSuite(builtInContentPublishingDogfoodEvalCases);
  const contentPublishingHardening = runContentPublishingHardeningEvalSuite(
    builtInContentPublishingHardeningEvalCases
  );
  const contentPublishingDepthHardening = runContentPublishingDepthHardeningEvalSuite(
    builtInContentPublishingDepthHardeningEvalCases
  );
  const decisionClosureHardening = runDecisionClosureHardeningEvalSuite(
    builtInDecisionClosureHardeningEvalCases
  );
  const total = aggregateDogfood([
    internal,
    enterprise,
    contentPublishing,
    contentPublishingHardening,
    contentPublishingDepthHardening,
    decisionClosureHardening
  ]);
  const lines = [
    "AGS Dogfood Workbench",
    `Internal Dogfood: ${internal.passedCount}/${internal.total} passed`,
    `Enterprise Golden Path: ${enterprise.passedCount}/${enterprise.total} passed`,
    `Content Publishing Dogfood: ${contentPublishing.passedCount}/${contentPublishing.total} passed`,
    `Content Publishing Hardening: ${contentPublishingHardening.passedCount}/${contentPublishingHardening.total} passed`,
    `Content Publishing Depth Hardening: ${contentPublishingDepthHardening.passedCount}/${contentPublishingDepthHardening.total} passed`,
    `Decision Closure Hardening: ${decisionClosureHardening.passedCount}/${decisionClosureHardening.total} passed`,
    `Total: ${total.passedCount}/${total.total} passed`
  ];

  for (const failed of total.results.filter((entry) => !entry.passed)) {
    lines.push(`- ${failed.id}: ${failed.failures.join(" ")}`);
  }

  return {
    exitCode: total.passed ? 0 : 1,
    stdout: `${lines.join("\n")}\n`
  };
}

interface DogfoodSectionResult {
  passed: boolean;
  total: number;
  passedCount: number;
  failedCount: number;
  results: Array<{
    id: string;
    passed: boolean;
    failures: string[];
  }>;
}

function aggregateDogfood(results: DogfoodSectionResult[]) {
  const total = results.reduce((sum, result) => sum + result.total, 0);
  const passedCount = results.reduce((sum, result) => sum + result.passedCount, 0);
  const failedCount = total - passedCount;

  return {
    passed: failedCount === 0,
    total,
    passedCount,
    failedCount,
    results: results.flatMap((result) => result.results)
  };
}
