import type { HumanParticipationPolicy } from "./types.js";

export const defaultParticipationPolicy: HumanParticipationPolicy = {
  id: "default-human-participation-policy",
  name: "Default Human Participation Policy",
  version: "human.participation.v0.6",
  minReasonLengthForHighRisk: 20,
  minReviewSecondsForHighRisk: 30,
  minReviewSecondsDefault: 5,
  requireReasonForHighRisk: true,
  requireContextForHighRisk: true,
  requireAlternativesForHighRisk: false,
  requireObjectionsForHighRisk: true
};

