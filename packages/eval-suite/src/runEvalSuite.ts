import { builtInEvalCases } from "./evalCases.js";
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

