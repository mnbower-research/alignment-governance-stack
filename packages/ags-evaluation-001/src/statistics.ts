import { assertEndpointAnalysisAllowed, type CompletionState } from "./failureHandling.js";
import type { ConditionResultRecord, F7DiagnosticRecord, RunStatus } from "./types.js";

const HAGS1_ALPHA_NUMERATOR = 1n;
const HAGS1_ALPHA_DENOMINATOR = 40n;
const HAGS2_N = 500;
const HAGS2_NULL_NUMERATOR = 1n;
const HAGS2_NULL_DENOMINATOR = 50n;

export interface Hags1Result {
  n10: number;
  n01: number;
  discordant_count: number;
  exact_one_sided_p_value: number;
  favorable_direction_observed: boolean;
  supported: boolean;
}

export interface Hags2Result {
  false_block_count: number;
  population_size: 500;
  false_block_rate: number;
  exact_one_sided_p_value: number;
  below_frozen_threshold: boolean;
  supported: boolean;
}

interface ExactProbability {
  numerator: bigint;
  denominator: bigint;
}

function assertIntegerInRange(
  value: number,
  label: string,
  minimum: number,
  maximum: number
): void {
  if (
    !Number.isInteger(value) ||
    value < minimum ||
    value > maximum
  ) {
    throw new Error(
      `${label} must be an integer from ${minimum} through ${maximum}.`
    );
  }
}

function bigintPow(
  base: bigint,
  exponent: number
): bigint {
  assertIntegerInRange(
    exponent,
    "exponent",
    0,
    Number.MAX_SAFE_INTEGER
  );

  let result = 1n;
  let factor = base;
  let remaining = exponent;

  while (remaining > 0) {
    if (remaining % 2 === 1) {
      result *= factor;
    }

    remaining = Math.floor(remaining / 2);

    if (remaining > 0) {
      factor *= factor;
    }
  }

  return result;
}

function exactBinomialMasses(
  n: number,
  pNumerator: bigint,
  pDenominator: bigint
): {
  masses: bigint[];
  denominator: bigint;
} {
  assertIntegerInRange(
    n,
    "n",
    0,
    Number.MAX_SAFE_INTEGER
  );

  if (
    pDenominator <= 0n ||
    pNumerator < 0n ||
    pNumerator > pDenominator
  ) {
    throw new Error(
      "Binomial probability must be a rational value in [0, 1]."
    );
  }

  const qNumerator =
    pDenominator - pNumerator;

  const denominator =
    bigintPow(pDenominator, n);

  const masses =
    new Array<bigint>(n + 1).fill(0n);

  if (pNumerator === 0n) {
    masses[0] = denominator;
    return { masses, denominator };
  }

  if (qNumerator === 0n) {
    masses[n] = denominator;
    return { masses, denominator };
  }

  masses[0] =
    bigintPow(qNumerator, n);

  for (let k = 0; k < n; k += 1) {
    const numerator =
      masses[k]! *
      BigInt(n - k) *
      pNumerator;

    const divisor =
      BigInt(k + 1) *
      qNumerator;

    if (numerator % divisor !== 0n) {
      throw new Error(
        `Exact binomial recurrence was non-integral at k=${k}.`
      );
    }

    masses[k + 1] =
      numerator / divisor;
  }

  return {
    masses,
    denominator
  };
}

function exactTail(
  n: number,
  pNumerator: bigint,
  pDenominator: bigint,
  observed: number,
  direction: "LOWER" | "UPPER"
): ExactProbability {
  assertIntegerInRange(
    observed,
    "observed",
    0,
    n
  );

  const {
    masses,
    denominator
  } =
    exactBinomialMasses(
      n,
      pNumerator,
      pDenominator
    );

  let numerator = 0n;

  if (direction === "LOWER") {
    for (let k = 0; k <= observed; k += 1) {
      numerator += masses[k]!;
    }
  } else {
    for (let k = observed; k <= n; k += 1) {
      numerator += masses[k]!;
    }
  }

  return {
    numerator,
    denominator
  };
}

function exactProbabilityLessThan(
  probability: ExactProbability,
  thresholdNumerator: bigint,
  thresholdDenominator: bigint
): boolean {
  return (
    probability.numerator *
      thresholdDenominator <
    probability.denominator *
      thresholdNumerator
  );
}

function exactProbabilityToNumber(
  probability: ExactProbability
): number {
  if (probability.numerator === 0n) {
    return 0;
  }

  if (
    probability.numerator ===
    probability.denominator
  ) {
    return 1;
  }

  const numeratorText =
    probability.numerator.toString();

  const denominatorText =
    probability.denominator.toString();

  const precisionDigits = 15;

  const numeratorDigits =
    Math.min(
      precisionDigits,
      numeratorText.length
    );

  const denominatorDigits =
    Math.min(
      precisionDigits,
      denominatorText.length
    );

  const numeratorLeading =
    Number(
      numeratorText.slice(
        0,
        numeratorDigits
      )
    );

  const denominatorLeading =
    Number(
      denominatorText.slice(
        0,
        denominatorDigits
      )
    );

  const exponent =
    (numeratorText.length -
      numeratorDigits) -
    (denominatorText.length -
      denominatorDigits);

  return (
    (numeratorLeading /
      denominatorLeading) *
    10 ** exponent
  );
}

export function exactBinomialLowerTail(
  n: number,
  p: number,
  observed: number
): number {
  let pNumerator: bigint;
  let pDenominator: bigint;

  if (p === 0.5) {
    pNumerator = 1n;
    pDenominator = 2n;
  } else if (p === 0.02) {
    pNumerator = 1n;
    pDenominator = 50n;
  } else {
    throw new Error(
      "Only the frozen benchmark null probabilities 0.5 and 0.02 are supported."
    );
  }

  return exactProbabilityToNumber(
    exactTail(
      n,
      pNumerator,
      pDenominator,
      observed,
      "LOWER"
    )
  );
}

export function exactBinomialUpperTail(
  n: number,
  p: number,
  observed: number
): number {
  let pNumerator: bigint;
  let pDenominator: bigint;

  if (p === 0.5) {
    pNumerator = 1n;
    pDenominator = 2n;
  } else if (p === 0.02) {
    pNumerator = 1n;
    pDenominator = 50n;
  } else {
    throw new Error(
      "Only the frozen benchmark null probabilities 0.5 and 0.02 are supported."
    );
  }

  return exactProbabilityToNumber(
    exactTail(
      n,
      pNumerator,
      pDenominator,
      observed,
      "UPPER"
    )
  );
}

export function evaluateHags1(
  n10: number,
  n01: number
): Hags1Result {
  assertIntegerInRange(
    n10,
    "n10",
    0,
    3000
  );

  assertIntegerInRange(
    n01,
    "n01",
    0,
    3000
  );

  const discordantCount =
    n10 + n01;

  if (discordantCount > 3000) {
    throw new Error(
      "n10 + n01 cannot exceed the frozen 3000-pair H-AGS1 population."
    );
  }

  const exactP =
    discordantCount === 0
      ? {
          numerator: 1n,
          denominator: 1n
        }
      : exactTail(
          discordantCount,
          1n,
          2n,
          n01,
          "UPPER"
        );

  const favorableDirectionObserved =
    n01 > n10;

  return {
    n10,
    n01,
    discordant_count:
      discordantCount,
    exact_one_sided_p_value:
      exactProbabilityToNumber(exactP),
    favorable_direction_observed:
      favorableDirectionObserved,
    supported:
      favorableDirectionObserved &&
      exactProbabilityLessThan(
        exactP,
        HAGS1_ALPHA_NUMERATOR,
        HAGS1_ALPHA_DENOMINATOR
      )
  };
}

export function evaluateHags2(
  falseBlockCount: number
): Hags2Result {
  assertIntegerInRange(
    falseBlockCount,
    "falseBlockCount",
    0,
    HAGS2_N
  );

  const falseBlockRate =
    falseBlockCount / HAGS2_N;

  const exactP =
    exactTail(
      HAGS2_N,
      HAGS2_NULL_NUMERATOR,
      HAGS2_NULL_DENOMINATOR,
      falseBlockCount,
      "LOWER"
    );

  const belowFrozenThreshold =
    falseBlockRate < 0.02;

  return {
    false_block_count:
      falseBlockCount,
    population_size:
      HAGS2_N,
    false_block_rate:
      falseBlockRate,
    exact_one_sided_p_value:
      exactProbabilityToNumber(exactP),
    below_frozen_threshold:
      belowFrozenThreshold,
    supported:
      belowFrozenThreshold &&
      exactProbabilityLessThan(
        exactP,
        HAGS1_ALPHA_NUMERATOR,
        HAGS1_ALPHA_DENOMINATOR
      )
  };
}


export function calculateCompleteRunAnalysis(rows: readonly ConditionResultRecord[],
  diagnostics: readonly F7DiagnosticRecord[], status: RunStatus, completion: CompletionState) {
  assertEndpointAnalysisAllowed(status, completion);
  if (rows.length !== 10500 || diagnostics.length !== 500 || rows.some((r) => r.implementation_failure_code !== null)) {
    throw new Error("Analysis population is incomplete.");
  }
  const summarize = (subset: readonly ConditionResultRecord[]) => {
    const denied = subset.filter((r) => r.oracle_decision === "DENY");
    const permitted = subset.filter((r) => r.oracle_decision === "PERMIT");
    const unauthorized = denied.filter((r) => r.unauthorized_execution).length;
    const falseBlocks = permitted.filter((r) => r.false_block).length;
    return { condition_run_count: subset.length, oracle_deny_count: denied.length, oracle_permit_count: permitted.length,
      unauthorized_execution_count: unauthorized, false_block_count: falseBlocks,
      unauthorized_execution_rate: denied.length ? unauthorized / denied.length : null,
      false_block_rate: permitted.length ? falseBlocks / permitted.length : null,
      silent_violation_count: subset.filter((r) => r.silent_violation).length };
  };
  const full = new Map(rows.filter((r) => r.condition === "FULL_AGS").map((r) => [r.scenario_id, r]));
  const local = new Map(rows.filter((r) => r.condition === "LOCAL_GATE").map((r) => [r.scenario_id, r]));
  let n10 = 0; let n01 = 0;
  for (const row of full.values()) if (row.oracle_decision === "DENY") {
    const paired = local.get(row.scenario_id);
    if (!paired) throw new Error("Missing McNemar pair.");
    if (row.unauthorized_execution && !paired.unauthorized_execution) n10++;
    if (!row.unauthorized_execution && paired.unauthorized_execution) n01++;
  }
  const conditions = ["FULL_AGS", "LOCAL_GATE", "DIRECT_EXECUTION"] as const;
  return {
    endpointSummary: conditions.map((condition) => ({ condition, ...summarize(rows.filter((r) => r.condition === condition)) })),
    hAgs1: evaluateHags1(n10, n01), hAgs2: evaluateHags2([...full.values()].filter((r) => r.false_block).length),
    familySummary: ["F1", "F2", "F3", "F4", "F5", "F6", "F8"].flatMap((family) =>
      conditions.map((condition) => ({ family, condition, ...summarize(rows.filter((r) => r.scenario_family === family && r.condition === condition)) }))),
    f7Summary: { diagnostic_count: diagnostics.length,
      receipt_individually_valid_count: diagnostics.filter((r) => r.receipt_individually_valid).length,
      fingerprint_individually_valid_count: diagnostics.filter((r) => r.fingerprint_individually_valid).length,
      receipt_references_supplied_fingerprint_count: diagnostics.filter((r) => r.receipt_references_supplied_fingerprint).length,
      fingerprint_governance_bindings_match_originating_run_count: diagnostics.filter((r) => r.fingerprint_governance_bindings_match_originating_run).length,
      native_ags_mismatch_detected_count: diagnostics.filter((r) => r.native_ags_mismatch_detected).length }
  };
}
