import {
  evaluateGovernedRuntimeActionWithReceipt,
  type EvaluateGovernedRuntimeActionWithReceiptInput
} from "@alignment-governance-stack/governance-core";
import { verifyGovernanceReceipt } from "@alignment-governance-stack/receipts";
import type {
  AgsEvalActual,
  AgsEvalCase,
  AgsEvalExpected,
  AgsEvalResult
} from "./types.js";

export function runEvalCase(evalCase: AgsEvalCase): AgsEvalResult {
  validateEvalCase(evalCase);

  const { governance, receipt } = evaluateGovernedRuntimeActionWithReceipt(
    toGovernanceInput(evalCase)
  );
  const receiptVerification = verifyGovernanceReceipt(receipt);
  const actual: AgsEvalActual = {
    finalDecision: governance.finalDecision,
    policyBlocked:
      governance.finalDecision === "blocked_by_policy" ||
      governance.resolvedPolicy?.allowed === false,
    receiptValid: receiptVerification.valid,
    blockedBeforeAag: governance.aag === undefined,
    ...(governance.pgdl?.decision !== undefined ? { pgdlDecision: governance.pgdl.decision } : {}),
    ...(governance.aag?.decision !== undefined ? { aagDecision: governance.aag.decision } : {}),
    ...(governance.approvalValidation?.decision !== undefined
      ? { authorityDecision: governance.approvalValidation.decision }
      : {}),
    ...(governance.participationQuality?.decision !== undefined
      ? { participationDecision: governance.participationQuality.decision }
      : {}),
    ...(governance.runtimeBinding?.allowed !== undefined
      ? { runtimeAllowed: governance.runtimeBinding.allowed }
      : {}),
    ...(governance.proposalSentToAag?.tool !== undefined
      ? { proposalSentTool: governance.proposalSentToAag.tool }
      : {}),
    ...(governance.proposalSentToAag?.actionType !== undefined
      ? { proposalSentActionType: governance.proposalSentToAag.actionType }
      : {}),
    ...(governance.resolvedPolicy?.hardBoundaryTriggered !== undefined
      ? { hardBoundaryTriggered: governance.resolvedPolicy.hardBoundaryTriggered }
      : {}),
    ...(governance.runtimeBinding?.failures !== undefined
      ? { runtimeFailureCodes: governance.runtimeBinding.failures.map((failure) => failure.code).sort() }
      : {})
  };
  const failures = compareExpected(evalCase.expected, actual);

  for (const field of evalCase.expected.requiredReceiptFields ?? []) {
    if (!hasPath(receipt, field)) {
      failures.push(`Expected receipt field ${field} to be present.`);
    }
  }

  return {
    id: evalCase.id,
    title: evalCase.title,
    passed: failures.length === 0,
    failures,
    actual,
    receiptHash: receipt.receiptHash
  };
}

function toGovernanceInput(
  evalCase: AgsEvalCase
): EvaluateGovernedRuntimeActionWithReceiptInput {
  const input = evalCase.input;

  return {
    proposal: input.proposal,
    ...(input.runtimeAction !== undefined ? { runtimeAction: input.runtimeAction } : {}),
    ...(input.policyProfile !== undefined ? { policyProfile: input.policyProfile } : {}),
    ...(input.authorityMap !== undefined ? { authorityMap: input.authorityMap } : {}),
    ...(input.approvalEvidence !== undefined ? { approvalEvidence: input.approvalEvidence } : {}),
    ...(input.humanParticipation !== undefined ? { humanParticipation: input.humanParticipation } : {}),
    ...(input.permitOptions !== undefined ? { permitOptions: input.permitOptions } : {}),
    ...(input.validationOptions !== undefined ? { validationOptions: input.validationOptions } : {}),
    ...(input.receiptOptions !== undefined ? { receiptOptions: input.receiptOptions } : {})
  };
}

function validateEvalCase(evalCase: AgsEvalCase): void {
  if (evalCase.id.trim() === "") {
    throw new Error("Eval case id is required.");
  }

  if (evalCase.title.trim() === "") {
    throw new Error(`Eval case ${evalCase.id} is missing title.`);
  }

  if (evalCase.input.proposal === undefined) {
    throw new Error(`Eval case ${evalCase.id} is missing proposal.`);
  }
}

function compareExpected(
  expected: AgsEvalExpected,
  actual: AgsEvalActual
): string[] {
  const failures: string[] = [];

  compareField(failures, "finalDecision", expected.finalDecision, actual.finalDecision);
  compareField(failures, "pgdlDecision", expected.pgdlDecision, actual.pgdlDecision);
  compareField(failures, "aagDecision", expected.aagDecision, actual.aagDecision);
  compareField(failures, "policyBlocked", expected.policyBlocked, actual.policyBlocked);
  compareField(failures, "authorityDecision", expected.authorityDecision, actual.authorityDecision);
  compareField(failures, "participationDecision", expected.participationDecision, actual.participationDecision);
  compareField(failures, "runtimeAllowed", expected.runtimeAllowed, actual.runtimeAllowed);
  compareField(failures, "receiptValid", expected.receiptValid, actual.receiptValid);
  compareField(failures, "blockedBeforeAag", expected.blockedBeforeAag, actual.blockedBeforeAag);
  compareField(failures, "proposalSentTool", expected.proposalSentTool, actual.proposalSentTool);
  compareField(
    failures,
    "proposalSentActionType",
    expected.proposalSentActionType,
    actual.proposalSentActionType
  );
  compareField(failures, "hardBoundaryTriggered", expected.hardBoundaryTriggered, actual.hardBoundaryTriggered);

  if (expected.runtimeFailureCodes !== undefined) {
    const actualCodes = actual.runtimeFailureCodes ?? [];
    for (const expectedCode of expected.runtimeFailureCodes) {
      if (!actualCodes.includes(expectedCode)) {
        failures.push(`Expected runtimeFailureCodes to include ${expectedCode}.`);
      }
    }
  }

  return failures;
}

function compareField<T>(
  failures: string[],
  label: string,
  expected: T | undefined,
  actual: T | undefined
): void {
  if (expected === undefined) {
    return;
  }

  if (actual !== expected) {
    failures.push(`Expected ${label} to be ${String(expected)}, received ${String(actual)}.`);
  }
}

function hasPath(value: unknown, path: string): boolean {
  let current: unknown = value;

  for (const segment of path.split(".")) {
    if (current === null || typeof current !== "object" || !(segment in current)) {
      return false;
    }

    current = (current as Record<string, unknown>)[segment];
  }

  return current !== undefined;
}
