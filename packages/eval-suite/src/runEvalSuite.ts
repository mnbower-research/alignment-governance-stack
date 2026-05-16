import { builtInEvalCases } from "./evalCases.js";
import { builtInContentPublishingDogfoodEvalCases } from "./contentPublishingDogfoodEvalCases.js";
import {
  builtInContentPublishingDepthHardeningEvalCases,
  runContentPublishingDepthHardeningEvalSuite
} from "./contentPublishingDepthHardeningEvalCases.js";
import { builtInContentPublishingHardeningEvalCases } from "./contentPublishingHardeningEvalCases.js";
import {
  builtInDecisionClosureHardeningEvalCases,
  runDecisionClosureHardeningEvalSuite
} from "./decisionClosureHardeningEvalCases.js";
import { builtInDogfoodEvalCases } from "./dogfoodEvalCases.js";
import { builtInEnterpriseDogfoodEvalCases } from "./enterpriseDogfoodEvalCases.js";
import { builtInRedTeamEvalCases } from "./redTeamEvalCases.js";
import { runEvalCase } from "./runEvalCase.js";
import type { AgsEvalCase, AgsEvalSuiteResult } from "./types.js";

export function runEvalSuite(cases: AgsEvalCase[] = builtInEvalCases): AgsEvalSuiteResult {
  const results = cases.map(runEvalCase);
  const passedCount = results.filter((result) => result.passed).length;
  const failedCount = results.length - passedCount;

  return {
    passed: failedCount === 0,
    total: results.length,
    passedCount,
    failedCount,
    results
  };
}

export function runDogfoodEvalSuite(
  cases: AgsEvalCase[] = [
    ...builtInDogfoodEvalCases,
    ...builtInEnterpriseDogfoodEvalCases,
    ...builtInContentPublishingDogfoodEvalCases,
    ...builtInContentPublishingHardeningEvalCases
  ]
): AgsEvalSuiteResult {
  return runEvalSuite(cases);
}

export function runContentPublishingDogfoodEvalSuite(
  cases: AgsEvalCase[] = builtInContentPublishingDogfoodEvalCases
): AgsEvalSuiteResult {
  return runEvalSuite(cases);
}

export function runContentPublishingHardeningEvalSuite(
  cases: AgsEvalCase[] = builtInContentPublishingHardeningEvalCases
): AgsEvalSuiteResult {
  return runEvalSuite(cases);
}

export { runContentPublishingDepthHardeningEvalSuite, builtInContentPublishingDepthHardeningEvalCases };
export { runDecisionClosureHardeningEvalSuite, builtInDecisionClosureHardeningEvalCases };

export function runEnterpriseDogfoodEvalSuite(
  cases: AgsEvalCase[] = builtInEnterpriseDogfoodEvalCases
): AgsEvalSuiteResult {
  return runEvalSuite(cases);
}

export function runRedTeamEvalSuite(
  cases: AgsEvalCase[] = builtInRedTeamEvalCases
): AgsEvalSuiteResult {
  return runEvalSuite(cases);
}
