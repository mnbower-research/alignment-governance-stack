import type { ArtifactKind } from "./types.js";

export const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const text = (v: unknown): boolean => typeof v === "string" && v.trim().length > 0;
const date = (v: unknown): boolean => typeof v === "string" && Number.isFinite(Date.parse(v));
const texts = (v: unknown): boolean => Array.isArray(v) && v.every(text);
const fields = (r: Record<string, unknown>, keys: string[]): boolean => keys.every(k => text(r[k]));
const objects = (v: unknown): v is Record<string, unknown>[] => Array.isArray(v) && v.every(record);
export function actionShape(v: unknown): boolean {
  return record(v) && fields(v, ["id", "userRequest", "tool", "actionType", "target", "environment"]) &&
    ["reversible", "externalFacing", "requiresApproval", "knownApproval"].every(k => typeof v[k] === "boolean") &&
    ["low", "medium", "high"].includes(String(v.dataSensitivity)) && record(v.metadata);
}
/** Shared structural boundary for raw parsers and normalized browser imports. Decisions are inspected separately, never reauthorized. */
export function assertArtifactShape(kind: ArtifactKind, value: unknown): void {
  if (!record(value)) throw new Error(`Malformed ${kind} payload.`);
  const r = value;
  let valid = false;
  switch (kind) {
    case "pgdl-review-packet": valid = actionShape(r.originalProposal) && objects(r.objections) && r.objections.every(o => fields(o, ["category", "message", "severity", "question", "reason", "suggestedRevision"])) &&
      ["forward_to_aag", "revise_before_aag", "escalate_to_human", "reject_before_aag"].includes(String(r.decision)) && text(r.reasonForDecision) &&
      (r.resolvedProposal === undefined || actionShape(r.resolvedProposal)); break;
    case "aag-decision": valid = actionShape(r.proposal) && objects(r.detectorResults) && r.detectorResults.every(d => fields(d, ["detector", "severity", "reason"]) && typeof d.triggered === "boolean" && ["allow", "block", "require_approval", "revise_action"].includes(String(d.recommendedDecision))) &&
      ["allow", "require_approval", "revise_action", "block"].includes(String(r.decision)) && text(r.reasonForDecision) && typeof r.receiptRequired === "boolean"; break;
    case "runtime-permit": valid = fields(r, ["id", "proposalId", "actionHash"]) && actionShape(r.allowedAction) && date(r.issuedAt) &&
      (r.expiresAt === undefined || date(r.expiresAt)) && r.source === "aag" && r.aagDecision === "allow"; break;
    case "runtime-binding-result": valid = ["execution_allowed", "execution_denied"].includes(String(r.decision)) && typeof r.allowed === "boolean" && objects(r.failures) && text(r.reasonForDecision); break;
    case "receipt": valid = r.version === "ags.receipt.v0.1" && fields(r, ["id", "receiptHash", "finalDecision", "reasonForDecision"]) && date(r.createdAt) && actionShape(r.originalProposal); break;
    case "context-admission": valid = r.version === "context-admission/v0.1"; break; // Strict shape and digest checked by Context Admission.
    case "agency-fingerprint": valid = r.version === "agency-fingerprint/v0.1" && fields(r, ["fingerprintId", "fingerprintHash", "delegatedBy", "agentId", "actionHash"]) && date(r.timestamp) && (text(r.subjectHumanId) || text(r.subjectOrganizationId)); break;
    case "decision-closure-artifact": valid = fields(r, ["artifactId"]) && date(r.createdAt) && record(r.action) && fields(r.action, ["actionId", "actionType", "summary", "toolName", "target"]) && record(r.executionBoundary) && record(r.authority) && typeof r.authority.authorityValid === "boolean" && record(r.decision) && ["allow", "escalate", "refuse", "revise_action", "require_approval", "block"].includes(String(r.decision.outcome)) && text(r.decision.reason) && record(r.conditions) && record(r.proof) && record(r.auditSummary); break;
    case "human-participation-quality": valid = text(r.decision) && typeof r.meaningful === "boolean" && Array.isArray(r.signals) && texts(r.reasons) && text(r.recommendedAction); break;
    case "authority-map": valid = fields(r, ["id", "name", "version"]) && objects(r.roles) && r.roles.every(v => record(v) && text(v.id) && objects(v.scopes)); break;
    case "policy-profile": case "hard-boundary-profile": valid = fields(r, ["id", "name", "version"]) && ["permissive", "balanced", "strict"].includes(String(r.defaultMode)) && ["tools", "environments", "approvalRules", "hardBoundaries", "dataSensitivity"].every(k => r[k] === undefined || objects(r[k])); break;
    case "governance-memory-summary": valid = r.version === "ags.governance-memory.v1.0" && text(r.id) && objects(r.patterns) && typeof r.receiptCount === "number" && date(r.createdAt); break;
    case "agency-chain-report": valid = fields(r, ["chainId", "overallStatus"]) && objects(r.links) && objects(r.issues); break;
    case "alignment-gap-report": valid = (text(r.reportId) || text(r.id)) && (objects(r.gaps) || objects(r.findings)); break;
    case "babel-risk-report": valid = r.version === "babel-risk/v0.1" && text(r.reportId) && text(r.overallRisk); break;
    case "babel-velocity-report": valid = r.version === "babel-velocity/v0.1" && text(r.reportId) && text(r.overallVelocityRisk); break;
    case "unknown": throw new Error("Unknown evidence cannot establish governance state.");
  }
  if (!valid) throw new Error(`Incomplete or malformed ${kind} evidence.`);
}

/** Check canonical nested stage envelopes, including those inside metadata/history. */
export function assertNestedShapes(value: unknown): void {
  if (!record(value) && !Array.isArray(value)) return;
  const kinds: Record<string, ArtifactKind> = { pgdl: "pgdl-review-packet", aag: "aag-decision", permit: "runtime-permit", runtimeBinding: "runtime-binding-result", contextAdmission: "context-admission" };
  for (const [key, child] of Object.entries(value)) {
    if (kinds[key] && child !== undefined) assertArtifactShape(kinds[key]!, child);
    assertNestedShapes(child);
  }
}
