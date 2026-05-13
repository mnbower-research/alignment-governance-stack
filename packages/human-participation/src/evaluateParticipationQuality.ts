import type {
  HumanParticipationInput,
  HumanParticipationPolicy,
  HumanParticipationResult,
  HumanParticipationSignal,
  ParticipationRisk
} from "./types.js";
import { defaultParticipationPolicy } from "./defaultParticipationPolicy.js";
import { validateParticipationInput } from "./validateParticipationInput.js";

export function evaluateParticipationQuality(
  input: HumanParticipationInput,
  policy: HumanParticipationPolicy = defaultParticipationPolicy
): HumanParticipationResult {
  const validation = validateParticipationInput(input);

  if (!validation.valid) {
    return {
      decision: "participation_input_invalid",
      risk: "high",
      meaningful: false,
      signals: [
        {
          id: "participation_input_invalid",
          label: "Participation input invalid",
          severity: "high",
          reason: validation.errors.join(" ")
        }
      ],
      reasons: validation.errors,
      recommendedAction: "escalate"
    };
  }

  const riskContext = deriveRiskContext(input);
  const participationRequired = isParticipationRequired(input, riskContext);

  if (!participationRequired && input.humanResponse === undefined) {
    return {
      decision: "participation_not_required",
      risk: "low",
      meaningful: true,
      signals: [],
      reasons: ["Human participation is not required for this action."],
      recommendedAction: "continue"
    };
  }

  if (input.context?.authorityValid === false) {
    return {
      decision: "insufficient_participation",
      risk: "high",
      meaningful: false,
      signals: [
        {
          id: "invalid_authority",
          label: "Invalid authority",
          severity: "high",
          reason: "The supplied approval was not validated against the required authority scope."
        }
      ],
      reasons: ["Meaningful participation requires valid approval authority."],
      recommendedAction: "escalate"
    };
  }

  if (participationRequired && input.humanResponse === undefined) {
    return {
      decision: "insufficient_participation",
      risk: "high",
      meaningful: false,
      signals: [
        {
          id: "missing_human_response",
          label: "Missing human response",
          severity: "high",
          reason: "Participation is required, but no human response was supplied."
        }
      ],
      reasons: ["Required human participation is missing."],
      recommendedAction: "request_review"
    };
  }

  const humanResponse = input.humanResponse;

  if (humanResponse === undefined) {
    return {
      decision: "participation_not_required",
      risk: "low",
      meaningful: true,
      signals: [],
      reasons: ["Human participation is not required for this action."],
      recommendedAction: "continue"
    };
  }

  const signals = buildSignals(input, policy, riskContext);
  const positiveSignals = countPositiveSignals(input, policy, riskContext);
  const highSeverityCount = signals.filter((signal) => signal.severity === "high").length;
  const mediumSeverityCount = signals.filter((signal) => signal.severity === "medium").length;
  const nonApprovalDecision = humanResponse.decision !== "approve";

  if (nonApprovalDecision && (hasReason(input) || hasActiveEngagement(input))) {
    return {
      decision: "meaningful_participation",
      risk: "low",
      meaningful: true,
      signals,
      reasons: ["The human response contested or redirected the action with a reason."],
      recommendedAction: humanResponse.decision === "request_revision" ? "request_revision" : "continue"
    };
  }

  if (highSeverityCount >= 2) {
    return {
      decision: "likely_rubber_stamp",
      risk: "high",
      meaningful: false,
      signals,
      reasons: ["Multiple high-severity participation failures indicate likely rubber-stamping."],
      recommendedAction: "block_until_meaningful_review"
    };
  }

  if (highSeverityCount > 0 || mediumSeverityCount > 0) {
    return {
      decision: "insufficient_participation",
      risk: highSeverityCount > 0 ? "high" : "medium",
      meaningful: false,
      signals,
      reasons: ["Participation was supplied, but required review quality signals are missing."],
      recommendedAction: hasReason(input) ? "request_review" : "request_reason"
    };
  }

  if (positiveSignals > 0 || !participationRequired) {
    return {
      decision: "meaningful_participation",
      risk: "low",
      meaningful: true,
      signals,
      reasons: ["Human participation includes sufficient reason, context, time, or active engagement."],
      recommendedAction: "continue"
    };
  }

  return {
    decision: "insufficient_participation",
    risk: "medium",
    meaningful: false,
    signals,
    reasons: ["Participation did not include enough evidence of active review."],
    recommendedAction: "request_review"
  };
}

interface RiskContext {
  production: boolean;
  irreversible: boolean;
  externalFacing: boolean;
  highSensitivity: boolean;
  highRisk: boolean;
}

function deriveRiskContext(input: HumanParticipationInput): RiskContext {
  const production = input.context?.production ?? input.action.environment === "production";
  const irreversible = input.context?.irreversible ?? !input.action.reversible;
  const externalFacing = input.context?.externalFacing ?? input.action.externalFacing;
  const highSensitivity = input.context?.highSensitivity ?? input.action.dataSensitivity === "high";
  const highRisk =
    input.context?.highRisk ??
    ((production && irreversible) ||
      externalFacing ||
      highSensitivity ||
      input.action.requiresApproval);

  return {
    production,
    irreversible,
    externalFacing,
    highSensitivity,
    highRisk
  };
}

function isParticipationRequired(
  input: HumanParticipationInput,
  riskContext: RiskContext
): boolean {
  return (
    input.context?.requiredApproval === true ||
    input.action.requiresApproval ||
    riskContext.highRisk ||
    (riskContext.production && riskContext.irreversible) ||
    riskContext.externalFacing ||
    riskContext.highSensitivity
  );
}

function buildSignals(
  input: HumanParticipationInput,
  policy: HumanParticipationPolicy,
  riskContext: RiskContext
): HumanParticipationSignal[] {
  const signals: HumanParticipationSignal[] = [];
  const highRisk = riskContext.highRisk;
  const response = input.humanResponse;

  if (response === undefined) {
    return signals;
  }

  const reason = response.reason?.trim() ?? "";
  const minReviewSeconds = highRisk
    ? policy.minReviewSecondsForHighRisk ?? 30
    : policy.minReviewSecondsDefault ?? 5;

  if (highRisk && response.decision === "approve" && (policy.requireReasonForHighRisk ?? true) && reason === "") {
    signals.push({
      id: "high_risk_approval_without_reason",
      label: "High-risk approval without reason",
      severity: "high",
      reason: "High-risk approval requires a stated reason."
    });
  }

  if (
    highRisk &&
    response.decision === "approve" &&
    reason !== "" &&
    reason.length < (policy.minReasonLengthForHighRisk ?? 20)
  ) {
    signals.push({
      id: "high_risk_approval_reason_too_short",
      label: "High-risk approval reason too short",
      severity: "medium",
      reason: "The approval reason is too short for a high-risk action."
    });
  }

  if (response.responseTimeSeconds !== undefined && response.responseTimeSeconds < minReviewSeconds) {
    signals.push({
      id: "review_time_too_short",
      label: "Review time too short",
      severity: highRisk ? "high" : "medium",
      reason: `Review time was below the required ${minReviewSeconds} seconds.`
    });
  }

  if (highRisk && (policy.requireContextForHighRisk ?? true) && input.presentedContext?.riskSummary === undefined) {
    signals.push({
      id: "risk_summary_missing",
      label: "Risk summary missing",
      severity: "high",
      reason: "High-risk review did not include a risk summary."
    });
  }

  if (highRisk && (policy.requireObjectionsForHighRisk ?? true) && input.presentedContext?.objectionsPresented !== true) {
    signals.push({
      id: "objections_not_presented",
      label: "Objections not presented",
      severity: "high",
      reason: "High-risk review did not present objections."
    });
  }

  if (
    highRisk &&
    (policy.requireAlternativesForHighRisk ?? false) &&
    input.presentedContext?.alternativesPresented !== true
  ) {
    signals.push({
      id: "alternatives_not_presented",
      label: "Alternatives not presented",
      severity: "medium",
      reason: "High-risk review did not present alternatives."
    });
  }

  if (riskContext.highSensitivity && input.presentedContext?.dataSensitivityPresented !== true) {
    signals.push({
      id: "data_sensitivity_context_missing",
      label: "Data sensitivity context missing",
      severity: "medium",
      reason: "The review did not present data sensitivity context for a high-sensitivity action."
    });
  }

  if (riskContext.irreversible && input.presentedContext?.reversibilityPresented !== true) {
    signals.push({
      id: "reversibility_context_missing",
      label: "Reversibility context missing",
      severity: "medium",
      reason: "The review did not present reversibility context for an irreversible action."
    });
  }

  if (
    highRisk &&
    response.decision === "approve" &&
    reason === "" &&
    response.editedProposal !== true &&
    response.askedQuestion !== true &&
    response.requestedEvidence !== true &&
    response.selectedAlternative !== true
  ) {
    signals.push({
      id: "passive_high_risk_approval",
      label: "Passive high-risk approval",
      severity: "high",
      reason: "High-risk approval did not include edits, questions, evidence requests, alternatives, or a reason."
    });
  }

  return signals;
}

function countPositiveSignals(
  input: HumanParticipationInput,
  policy: HumanParticipationPolicy,
  riskContext: RiskContext
): number {
  const response = input.humanResponse;

  if (response === undefined) {
    return 0;
  }

  let count = 0;

  if (hasReason(input)) {
    count += 1;
  }

  if (response.askedQuestion === true) {
    count += 1;
  }

  if (response.requestedEvidence === true) {
    count += 1;
  }

  if (response.selectedAlternative === true) {
    count += 1;
  }

  if (response.editedProposal === true) {
    count += 1;
  }

  if (response.decision === "reject" || response.decision === "request_revision" || response.decision === "escalate") {
    count += 1;
  }

  if (input.presentedContext?.riskSummary !== undefined) {
    count += 1;
  }

  if (input.presentedContext?.objectionsPresented === true) {
    count += 1;
  }

  if (riskContext.irreversible && input.presentedContext?.reversibilityPresented === true) {
    count += 1;
  }

  if (riskContext.highSensitivity && input.presentedContext?.dataSensitivityPresented === true) {
    count += 1;
  }

  const minReviewSeconds = riskContext.highRisk
    ? policy.minReviewSecondsForHighRisk ?? 30
    : policy.minReviewSecondsDefault ?? 5;

  if (response.responseTimeSeconds !== undefined && response.responseTimeSeconds >= minReviewSeconds) {
    count += 1;
  }

  return count;
}

function hasReason(input: HumanParticipationInput): boolean {
  return (input.humanResponse?.reason?.trim() ?? "") !== "";
}

function hasActiveEngagement(input: HumanParticipationInput): boolean {
  const response = input.humanResponse;

  return (
    response?.askedQuestion === true ||
    response?.requestedEvidence === true ||
    response?.selectedAlternative === true ||
    response?.editedProposal === true
  );
}
