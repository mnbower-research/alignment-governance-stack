import type { NormalizedAgsArtifact } from "@alignment-governance-stack/continuity-ingest";
import type { OperatorMaterialFinding } from "./operatorSummary";
const record = (v: unknown): Record<string, unknown> | undefined => v !== null && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : undefined;
const denied = new Set(["block", "refuse", "reject", "execution_denied", "reject_before_aag", "rejected_before_gate", "blocked_by_aag", "blocked_by_policy", "policy_invalid"]);
const pending = new Set(["require_approval", "require_human_review", "require_validation", "request_revision", "revise_action", "revision_required_by_aag", "escalate", "escalate_to_human", "escalated_before_gate", "insufficient_human_participation", "approval_required_by_authority", "approval_required_by_aag"]);
/** Read supplied material facts, including nested histories. Never evaluate policy or issue authorization. */
export function materialEvidenceFindings(artifacts: NormalizedAgsArtifact[]): OperatorMaterialFinding[] {
  const results = new Map<string, OperatorMaterialFinding>();
  const add = (title: string, explanation: string, tone: "danger" | "warning" = "danger"): void => {
    const id = `material:${title}:${explanation}`;
    results.set(id, { id, title, explanation, tone });
  };
  const visit = (value: unknown, path: string): void => {
    if (Array.isArray(value)) { value.forEach((v,i) => visit(v, `${path}[${i}]`)); return; }
    const r = record(value); if (!r) return;
    const reviewed = record(r.proposal) ?? record(r.proposalSentToAag) ?? record(r.originalProposal);
    if (reviewed?.assuranceRequirement && ["allow", "allowed_by_aag", "execution_allowed"].includes(String(r.finalDecision ?? r.decision)) && !r.assurance)
      add("Mandatory assurance evidence missing", `${path}: the action requires assurance but the positive decision contains no assurance record.`);
    if (r.version === "assurance-evidence/v0.1") {
      if (r.decision !== "satisfied") add("Required assurance not satisfied", `${path}: ${r.decision}. Assurance does not grant authority.`, r.decision === "blocked" ? "danger" : "warning");
      if (Array.isArray(r.unresolvedDenialIds) && r.unresolvedDenialIds.length) add("Unresolved validator refusals", `${path}: ${r.unresolvedDenialIds.join(", ")}. Later approvals do not erase these refusals.`);
      if (r.decision === "satisfied" && (typeof r.validUntil !== "string" || Date.parse(r.validUntil) <= Date.now())) add("Historical assurance expired", `${path}: the recorded assurance does not establish current validity.`, "warning");
      for (const f of Array.isArray(r.findings) ? r.findings : []) { const finding = record(f); if (finding) add("Assurance finding", `${path}: ${finding.code}: ${finding.reason}`, "warning"); }
      // The report explicitly distinguishes resolved refusal history from active refusals.
      return;
    }
    const decision = typeof r.decision === "string" ? r.decision : record(r.decision)?.outcome;
    if (denied.has(String(decision))) add("Denial recorded", `${path}: ${decision}. ${r.reasonForDecision ?? r.reason ?? record(r.decision)?.reason ?? "Inspect the supplied decision."}`);
    if (denied.has(String(r.finalDecision))) add("Denial recorded", `${path}: ${r.finalDecision}. ${r.reasonForDecision ?? "Inspect the supplied final decision."}`);
    if (r.allowed === false && r.decision !== "execution_denied" || r.integrityStatus === "invalid" || r.suggestedDecision === "block") add("Blocking evidence recorded", `${path}: supplied evidence denies the action or has invalid integrity.`);
    if (pending.has(String(decision))) add("Human review or validation unresolved", `${path}: ${decision}. ${r.reasonForDecision ?? r.reason ?? "Further review is required."}`, "warning");
    if (pending.has(String(r.finalDecision))) add("Human review or validation unresolved", `${path}: ${r.finalDecision}. ${r.reasonForDecision ?? "Further review is required."}`, "warning");
    if (r.valid === false || r.authorityValid === false || r.meaningful === false) add("Authority or review not established", `${path}: ${r.decision ?? "invalid authority/review"}. ${Array.isArray(r.reasons) ? r.reasons.join(" ") : r.authorityReason ?? "The supplied validation failed."}`);
    if (r.triggered === true && r.recommendedDecision === "block") add("Blocking detector evidence", `${path}: ${r.reason ?? r.detector ?? "A detector recommends blocking."}`);
    if (r.decision === "execution_denied" && r.allowed === true || r.decision === "execution_allowed" && r.allowed === false) add("Contradictory runtime result", `${path}: decision and allowed flag disagree.`);
    if (r.allowed === true && Array.isArray(r.failures) && r.failures.length) add("Runtime failures recorded", `${path}: ${r.failures.map(f => record(f)?.code ?? "unknown failure").join(", ")}.`);
    if (typeof r.issuedAt === "string" && typeof r.expiresAt === "string" && Date.parse(r.expiresAt) <= Date.parse(r.issuedAt)) add("Impossible permit chronology", `${path}: permit expiry is at or before issuance.`);
    const runtime = record(r.runtimeAction); const permit = record(r.permit); const allowed = record(permit?.allowedAction);
    // A supplied downstream denial is normal enforcement, not a contradiction with AAG's earlier allow.
    if (runtime && allowed && r.finalDecision !== "execution_denied") {
      const keys = ["tool", "actionType", "target", "environment", "reversible", "externalFacing", "dataSensitivity", "executionConstraints"];
      if (keys.some(k => stable(runtime[k]) !== stable(allowed[k]))) add("Runtime action differs from permit", `${path}: supplied runtime action does not match the reviewed permit constraints.`);
    }
    if (r.executed === true || r.success === true) add("Execution claim is not independently verified", `${path}: a supplied success/execution claim does not establish external execution proof.`, "warning");
    for (const [key, child] of Object.entries(r)) visit(child, `${path}.${key}`);
  };
  for (const artifact of artifacts) {
    visit(artifact.payload, artifact.provenance.sourcePath);
    for (const warning of artifact.warnings) add("Imported artifact warning", `${artifact.provenance.sourcePath}: ${warning}`, "warning");
  }
  return [...results.values()];
}
function stable(v: unknown): string | undefined {
  return JSON.stringify(v, (_key, value: unknown) => { const r = record(value); return r ? Object.fromEntries(Object.keys(r).sort().map(k => [k,r[k]])) : value; });
}
