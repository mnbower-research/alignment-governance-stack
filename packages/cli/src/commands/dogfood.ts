import {
  builtInContentPublishingDogfoodEvalCases,
  builtInContentPublishingHardeningEvalCases,
  builtInDogfoodEvalCases,
  builtInEnterpriseDogfoodEvalCases,
  runContentPublishingDogfoodEvalSuite,
  runContentPublishingHardeningEvalSuite,
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
  const total = runDogfoodEvalSuite();
  const lines = [
    "AGS Dogfood Workbench",
    `Internal Dogfood: ${internal.passedCount}/${internal.total} passed`,
    `Enterprise Golden Path: ${enterprise.passedCount}/${enterprise.total} passed`,
    `Content Publishing Dogfood: ${contentPublishing.passedCount}/${contentPublishing.total} passed`,
    `Content Publishing Hardening: ${contentPublishingHardening.passedCount}/${contentPublishingHardening.total} passed`,
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
