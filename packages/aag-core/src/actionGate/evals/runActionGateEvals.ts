import { evaluateAction } from "../evaluateAction";
import { actionGateEvalCases } from "./actionGateEvalCases";

declare const process: {
  exitCode?: number;
};

let passed = 0;
let failed = 0;

actionGateEvalCases.forEach((evalCase, index) => {
  const result = evaluateAction(evalCase.input);
  const decisionMatches = result.decision === evalCase.expectedDecision;
  const primaryIssueMatches =
    result.primaryIssue === evalCase.expectedPrimaryIssue;
  const didPass = decisionMatches && primaryIssueMatches;
  const caseId = `case-${String(index + 1).padStart(2, "0")}`;

  if (didPass) {
    passed += 1;
  } else {
    failed += 1;
  }

  console.log(
    [
      didPass ? "PASS" : "FAIL",
      caseId,
      evalCase.name,
      `expectedDecision=${evalCase.expectedDecision}`,
      `actualDecision=${result.decision}`,
      `expectedPrimaryIssue=${formatPrimaryIssue(
        evalCase.expectedPrimaryIssue,
      )}`,
      `actualPrimaryIssue=${formatPrimaryIssue(result.primaryIssue)}`,
    ].join(" | "),
  );
});

console.log(
  `Totals: passed=${passed} failed=${failed} total=${actionGateEvalCases.length}`,
);

if (failed > 0) {
  process.exitCode = 1;
}

function formatPrimaryIssue(issue: string | null): string {
  return issue ?? "null";
}
