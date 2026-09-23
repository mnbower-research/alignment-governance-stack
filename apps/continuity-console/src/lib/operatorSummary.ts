import { hasVerifiedReceipt } from "@alignment-governance-stack/continuity-ingest/browser";
import type { NormalizedAgsArtifact } from "@alignment-governance-stack/continuity-ingest";
import type { EvidenceGapFinding, ImportedTrace } from "./evidenceProjection";
import type { GovernedActionTrace } from "../types/continuity";
import { materialEvidenceFindings } from "./materialEvidence";

export type OperatorAnswerTone = "positive" | "warning" | "danger" | "unknown";

export interface OperatorAnswer {
  question: string;
  answer: string;
  explanation: string;
  tone: OperatorAnswerTone;
}

export interface OperatorStageExplanation {
  stage: "Context Admission" | "PGDL" | "AAG" | "Runtime Binding" | "Receipt";
  label: string;
  explanation: string;
  tone: OperatorAnswerTone;
}

export interface OperatorMaterialFinding {
  id: string;
  title: string;
  explanation: string;
  tone: Exclude<OperatorAnswerTone, "positive">;
}

export interface OperatorSummary {
  answers: [OperatorAnswer, OperatorAnswer, OperatorAnswer, OperatorAnswer];
  stages: OperatorStageExplanation[];
  findings: OperatorMaterialFinding[];
}

const blockedDecisions = new Set(["block", "blocked_by_aag", "blocked_by_policy", "reject_before_aag", "rejected_before_gate", "execution_denied", "policy_invalid"]);
const approvalDecisions = new Set(["require_approval", "approval_required_by_aag", "approval_required_by_authority"]);
const escalationDecisions = new Set(["escalate_to_human", "escalated_before_gate", "insufficient_human_participation"]);
const revisionDecisions = new Set(["revise_action", "revision_required_by_aag", "revise_before_aag"]);

function record(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function decisionFrom(artifact: NormalizedAgsArtifact | undefined): string | undefined {
  const payload = record(artifact?.payload);
  return stringValue(payload?.finalDecision) ?? stringValue(payload?.decision) ?? stringValue(record(payload?.decision)?.outcome);
}

function materialGapFindings(gaps: EvidenceGapFinding[]): OperatorMaterialFinding[] {
  return gaps
    .map((gap) => ({
      id: gap.id,
      title: gap.title,
      explanation: gap.description,
      tone: gap.severity === "Critical" || gap.severity === "High" ? "danger" : "warning",
    }));
}

function deduplicate(findings: OperatorMaterialFinding[]): OperatorMaterialFinding[] {
  return [...new Map(findings.map((finding) => [finding.id, finding])).values()];
}

function stageFromDecision(stage: OperatorStageExplanation["stage"], decision: string | undefined, missingExplanation: string): OperatorStageExplanation {
  if (!decision) return { stage, label: "Not proven", explanation: missingExplanation, tone: "unknown" };
  if (blockedDecisions.has(decision) || decision === "reject") return { stage, label: "Stopped", explanation: `${stage} stopped the action (${decision}).`, tone: "danger" };
  if (approvalDecisions.has(decision) || escalationDecisions.has(decision) || decision === "require_human_review") return { stage, label: "Human review needed", explanation: `${stage} required a person to review the action (${decision}).`, tone: "warning" };
  if (revisionDecisions.has(decision) || decision === "require_validation" || decision === "admit_restricted") return { stage, label: "Changed or restricted", explanation: `${stage} required a change or restriction (${decision}).`, tone: "warning" };
  if (["allow", "allowed_by_aag", "execution_allowed", "forward_to_aag", "admit"].includes(decision)) return { stage, label: "Passed", explanation: `${stage} recorded a passing decision (${decision}).`, tone: "positive" };
  return { stage, label: "Recorded", explanation: `${stage} recorded ${decision}.`, tone: "unknown" };
}

function importedAction(trace: ImportedTrace): string {
  const requests = new Set<string>();
  for (const event of trace.events) {
    if (event.missing || !event.artifact) continue;
    const payload = record(event.artifact.payload);
    const proposal = record(payload?.proposal) ?? record(payload?.originalProposal);
    const request = stringValue(proposal?.userRequest);
    const actionType = stringValue(proposal?.actionType);
    const target = stringValue(proposal?.target);
    if (request) requests.add(target ? `${request} Target: ${target}.` : request);
    else if (actionType) requests.add(target ? `${actionType} on ${target}.` : actionType);
  }
  return [...requests].sort().join(" | ") || trace.requestedAction;
}

function contextStage(trace: ImportedTrace, now: string): OperatorStageExplanation {
  const contexts = trace.contextAdmissions ?? [];
  if (contexts.length === 0) return { stage: "Context Admission", label: "Not demonstrated", explanation: "No imported Context Admission evidence shows whether inherited information was safe and current for this use.", tone: "unknown" };
  const decisions = contexts.map((artifact) => decisionFrom(artifact));
  if (decisions.some((decision) => decision === "reject")) return stageFromDecision("Context Admission", "reject", "");
  if (decisions.some((decision) => decision === "require_human_review")) return stageFromDecision("Context Admission", "require_human_review", "");
  if (decisions.some((decision) => decision === "require_validation" || decision === "admit_restricted")) return stageFromDecision("Context Admission", decisions.find((decision) => decision === "require_validation") ?? "admit_restricted", "");
  const expired = contexts.some(a => {
    const value = record(a.payload)?.validUntil;
    return typeof value !== "string" || !Number.isFinite(Date.parse(value)) || Date.parse(value) <= Date.parse(now);
  });
  if (expired) return { stage: "Context Admission", label: "Historical admission expired or validity unknown", explanation: "This historical admission does not establish current permission. Review the recorded validity window.", tone: "warning" };
  if (decisions.every((decision) => decision === "admit")) return { stage: "Context Admission", label: "Admitted at the recorded time", explanation: "The imported record says the inherited information was admitted for this exact receiving use. This did not approve execution.", tone: "positive" };
  return { stage: "Context Admission", label: "Unclear", explanation: "Imported Context Admission evidence does not establish an admitted receiving use.", tone: "unknown" };
}

function contextFindings(trace: ImportedTrace): OperatorMaterialFinding[] {
  return (trace.contextAdmissions ?? []).flatMap((artifact) => {
    const payload = record(artifact.payload);
    const findings = Array.isArray(payload?.findings) ? payload.findings : [];
    return findings.map((value, index): OperatorMaterialFinding | null => {
      const finding = record(value);
      const code = stringValue(finding?.code);
      const reason = stringValue(finding?.reason);
      const decision = stringValue(finding?.decision);
      if (!code || !reason) return null;
      return {
        id: `${artifact.id}:${code}:${index}`,
        title: contextFindingTitle(code),
        explanation: reason,
        tone: decision === "reject" || code === "context_expired" || code === "context_revoked" ? "danger" : "warning",
      };
    }).filter((finding): finding is OperatorMaterialFinding => finding !== null);
  });
}

function contextFindingTitle(code: string): string {
  const titles: Record<string, string> = {
    provenance_missing: "The information's origin is unknown",
    source_unknown: "The information came from an unrecognized source",
    context_expired: "The inherited information has expired",
    context_revoked: "The inherited information was revoked",
    authority_stale: "The authority behind the information is stale",
    authority_not_demonstrated: "Authority to use the information was not demonstrated",
    integrity_missing: "The information's integrity was not proven",
    integrity_mismatch: "The information does not match its recorded digest",
    lineage_gap: "Part of the information history is missing",
    validation_missing: "Current validation is missing",
    revocation_unknown: "Current revocation status is unknown",
    sensitivity_missing: "Data sensitivity was not classified",
    action_binding_missing: "The information was not bound to this exact action",
  };
  return titles[code] ?? code.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());
}

export function buildImportedOperatorSummary(trace: ImportedTrace, gaps: EvidenceGapFinding[], now = new Date().toISOString()): OperatorSummary {
  const artifacts = trace.events.flatMap(event => event.artifact ? [event.artifact] : []);
  const ofKind = (kind: NormalizedAgsArtifact["kind"]) => artifacts.filter(a => a.kind === kind);
  const aags = ofKind("aag-decision");
  const pgdls = ofKind("pgdl-review-packet");
  const receipts = ofKind("receipt");
  const bindings = ofKind("runtime-binding-result");
  const context = contextStage(trace, now);
  const material = materialEvidenceFindings(artifacts);
  const findings: OperatorMaterialFinding[] = [...material, ...contextFindings(trace), ...materialGapFindings(gaps)];
  const stageFindings = (stage: OperatorStageExplanation, id: string): void => {
    if (stage.tone !== "positive") findings.push({ id, title: stage.label, explanation: stage.explanation, tone: stage.tone });
  };
  const stagesFor = (stage: "PGDL" | "AAG", items: NormalizedAgsArtifact[]): OperatorStageExplanation[] => items.map((a, index) => {
    let result = stageFromDecision(stage, decisionFrom(a), "No decision imported.");
    const payload = record(a.payload);
    if (stage === "PGDL" && decisionFrom(a) === "revise_before_aag" && payload?.resolvedProposal &&
        aags.some(g => decisionFrom(g) === "allow" && sameReviewedAction(record(g.payload)?.proposal, payload.resolvedProposal)))
      result = { stage, label: "Revision reviewed", explanation: "The resolved proposal reached AAG. The original revision remains in the technical record.", tone: "positive" };
    stageFindings(result, `${stage}:${a.id}:${index}`);
    return result;
  });
  const pgdlStages = stagesFor("PGDL", pgdls);
  const aagStages = stagesFor("AAG", aags);
  const worst = (stage: "PGDL" | "AAG", items: OperatorStageExplanation[]): OperatorStageExplanation =>
    [...items].sort((a,b) => ({ danger: 0, warning: 1, unknown: 2, positive: 3 }[a.tone] - { danger: 0, warning: 1, unknown: 2, positive: 3 }[b.tone]))[0]
      ?? stageFromDecision(stage, undefined, `No ${stage} decision imported.`);
  const pgdl = worst("PGDL", pgdlStages);
  const aag = worst("AAG", aagStages);
  const receiptDecisions = receipts.map(decisionFrom);
  const validReceipts = receipts.length > 0 && receipts.every(a => hasVerifiedReceipt(a.payload));
  const finalDenied = receiptDecisions.some(d => blockedDecisions.has(d ?? ""));
  const finalUnresolved = receiptDecisions.some(d => !blockedDecisions.has(d ?? "") && !["execution_allowed", "allowed_by_aag"].includes(d ?? ""));
  const bindingDenied = bindings.some(a => record(a.payload)?.allowed === false || record(a.payload)?.decision === "execution_denied");
  const stageDenied = pgdl.tone === "danger" || aag.tone === "danger" || context.tone === "danger";
  const denied = finalDenied || stageDenied || bindingDenied || material.some(f => f.tone === "danger");
  const importErrors = trace.validationErrors === true || gaps.some(g => g.category === "Parser Diagnostic" || g.category === "Import Diagnostic");
  const multiple = (trace.proposalIds?.length ?? 1) > 1;
  const runtimeIncomplete = receiptDecisions.includes("execution_allowed") && (!bindings.length || !artifacts.some(a => a.kind === "runtime-permit"));
  if (runtimeIncomplete) findings.push({ id: "missing-runtime-authorization", title: "Runtime authorization evidence is incomplete", explanation: "The receipt claims execution was allowed, but its permit or runtime validation is missing.", tone: "warning" });
  const unresolved = finalUnresolved || runtimeIncomplete || pgdl.tone !== "positive" || aag.tone !== "positive" || context.tone === "warning" || importErrors || multiple || !validReceipts || material.some(f => f.tone === "warning");
  const allowed = denied ? "No" : unresolved ? "Not yet proven" : "Yes, at the recorded time";
  const receipt: OperatorStageExplanation = !receipts.length
    ? { stage: "Receipt", label: "Missing", explanation: "No receipt was imported.", tone: "danger" }
    : !validReceipts ? { stage: "Receipt", label: "Unverified", explanation: "Receipt integrity has not been verified. A hash string alone is not proof.", tone: "warning" }
    : { stage: "Receipt", label: finalDenied ? "Denial recorded" : "Decision recorded", explanation: `Integrity-checked receipt records: ${[...new Set(receiptDecisions)].join(", ")}. Hash validity does not establish semantic consistency or external execution.`, tone: finalDenied ? "danger" : "unknown" };
  const binding: OperatorStageExplanation = { stage: "Runtime Binding", label: bindingDenied ? "Mismatch blocked" : bindings.length ? "Authorization check recorded" : "Not proven",
    explanation: bindingDenied ? "A supplied runtime action was denied. This is not proof it executed." : "Runtime Binding checks an action before execution; a passing check does not prove the action ran.", tone: bindingDenied ? "danger" : "unknown" };
  stageFindings(context, "operator-context");
  stageFindings(receipt, "operator-receipt");
  if (bindingDenied) stageFindings(binding, "operator-binding");
  if (!finalDenied) {
    if (!pgdls.length) stageFindings(pgdl, "missing-pgdl");
    if (!aags.length) stageFindings(aag, "missing-aag");
  }
  if (multiple) findings.push({ id: "multiple-runs", title: "Multiple proposals imported", explanation: "All findings are preserved. These records cannot establish a single authorized execution.", tone: "warning" });
  const decisionsByKind = new Map<string, Set<string>>();
  for (const a of artifacts) {
    const key = `${a.correlation.proposalId}:${a.kind}`;
    const values = decisionsByKind.get(key) ?? new Set<string>();
    const decision = decisionFrom(a);
    if (decision) values.add(decision);
    decisionsByKind.set(key, values);
  }
  const reviewedActions = artifacts.flatMap(a => {
    const value = record(a.payload);
    const action = a.kind === "pgdl-review-packet" ? value?.resolvedProposal ?? value?.originalProposal
      : a.kind === "aag-decision" ? value?.proposal
      : a.kind === "runtime-permit" ? value?.allowedAction
      : a.kind === "runtime-binding-result" ? record(value?.permit)?.allowedAction
      : a.kind === "receipt" ? value?.proposalSentToAag ?? record(value?.aag)?.proposal : undefined;
    return action ? [action] : [];
  });
  const actionConflict = reviewedActions.some(action => !sameReviewedAction(action, reviewedActions[0]));
  const coherentRuntimeDenial = receipts.every(a => {
    const r = record(a.payload); const binding = record(r?.runtimeBinding);
    return r?.finalDecision === "execution_denied" && binding?.decision === "execution_denied" && binding.allowed === false;
  });
  const conflict = actionConflict || [...decisionsByKind.values()].some(values => values.size > 1) ||
    (finalDenied && !coherentRuntimeDenial && (aags.some(a => decisionFrom(a) === "allow") || bindings.some(a => record(a.payload)?.allowed === true))) ||
    material.some(f => ["Contradictory runtime result", "Impossible permit chronology", "Runtime action differs from permit", "Runtime failures recorded"].includes(f.title)) ||
    (stageDenied && receiptDecisions.some(d => d === "execution_allowed"));
  if (conflict) findings.push({ id: "conflicting-decisions", title: "Governance records conflict", explanation: "Competing decisions have no explicit superseding decision link. Denials remain effective in this view.", tone: "danger" });
  const completeDenial = validReceipts && finalDenied && !conflict && !importErrors && !multiple;
  const proof = completeDenial ? "Complete decision evidence" : "Not completely";
  return {
    answers: [
      { question: "What did the agent want to do?", answer: importedAction(trace), explanation: `Proposal ${trace.proposalId}.`, tone: "unknown" },
      { question: "Was it allowed?", answer: conflict && !denied ? "Not yet proven" : allowed, explanation: denied ? "The supplied governance record contains a denial." : unresolved ? "The supplied evidence does not resolve every required governance decision." : "The verified receipt records historical permission; it grants no current permission.", tone: denied ? "danger" : unresolved || conflict ? "warning" : "positive" },
      { question: "Did it do only what was allowed?", answer: "Not proven", explanation: "These governance artifacts do not independently establish that an external action occurred or what it did.", tone: "unknown" },
      { question: "Can we prove what happened?", answer: proof, explanation: completeDenial ? "The verified receipt completely records the denial. It makes no claim of completed execution." : conflict ? "The imported decisions conflict." : "Decision evidence and execution evidence are distinct. External execution remains unproven.", tone: completeDenial ? "positive" : "warning" },
    ],
    stages: [context, pgdl, aag, binding, receipt], findings: deduplicate(findings),
  };
}

function sameReviewedAction(left: unknown, right: unknown): boolean {
  const a = record(left); const b = record(right);
  if (!a || !b) return false;
  const fields = ["id", "userRequest", "tool", "actionType", "target", "environment", "reversible", "externalFacing", "dataSensitivity", "requiresApproval", "knownApproval", "executionConstraints"];
  const stable = (v: unknown): string => JSON.stringify(v, (_key, value: unknown) => {
    const r = record(value); return r ? Object.fromEntries(Object.keys(r).sort().map(k => [k,r[k]])) : value;
  });
  return fields.every(k => stable(a[k]) === stable(b[k]));
}

export function buildSampleOperatorSummary(trace: GovernedActionTrace, gaps: EvidenceGapFinding[]): OperatorSummary {
  const pgdlEvent = trace.events.find((event) => event.label.includes("PGDL"));
  const aagEvent = trace.events.find((event) => event.label.includes("AAG"));
  const bindingEvent = trace.events.find((event) => event.label.includes("Execution Matched Permit"));
  const receiptEvent = trace.events.find((event) => event.label.includes("Receipt"));
  const receiptComplete = receiptEvent !== undefined && !["Partial", "Missing", "Not Demonstrated"].includes(receiptEvent.status);
  const stages: OperatorStageExplanation[] = [
    { stage: "Context Admission", label: "Not part of this sample", explanation: "This sample does not claim that inherited context was used.", tone: "unknown" },
    { stage: "PGDL", label: pgdlEvent ? "Revised" : "Not demonstrated", explanation: pgdlEvent ? "The proposal was narrowed after an objection before authorization." : "No PGDL review is shown.", tone: pgdlEvent ? "warning" : "unknown" },
    { stage: "AAG", label: aagEvent ? "Human approval required" : "Not demonstrated", explanation: aagEvent ? "The action required release-owner approval before a permit could be issued." : "No AAG decision is shown.", tone: aagEvent ? "warning" : "unknown" },
    { stage: "Runtime Binding", label: bindingEvent ? "Exact match" : "Not proven", explanation: bindingEvent ? "The sample says the tool, target, scope, and payload matched the permit." : "No runtime match is shown.", tone: bindingEvent ? "positive" : "unknown" },
    { stage: "Receipt", label: receiptComplete ? "Complete" : "Incomplete", explanation: receiptComplete ? "The sample receipt is complete." : "The sample receipt is partial and still needs review.", tone: receiptComplete ? "positive" : "warning" },
  ];
  const findings = deduplicate([
    ...materialGapFindings(gaps),
    ...(trace.risks ?? []).map((risk) => ({
      id: `sample-risk:${risk.title}`,
      title: risk.title,
      explanation: risk.explanation,
      tone: risk.severity === "Critical" || risk.severity === "High" ? "danger" as const : "warning" as const,
    })),
    ...(!receiptComplete ? [{ id: "sample-partial-receipt", title: "Receipt is incomplete", explanation: "The sample receipt is marked partial, so the action cannot be treated as fully proven.", tone: "warning" as const }] : []),
  ]);
  return {
    answers: [
      { question: "What did the agent want to do?", answer: trace.requestedAction, explanation: `Target: ${trace.target}. Scope: ${trace.scope}.`, tone: "positive" },
      { question: "Was it allowed?", answer: "Not proven", explanation: "Sample events illustrate governance decisions; they do not establish permission for a real action. Inspect the recorded sample decisions below.", tone: "unknown" },
      { question: "Did it do only what was allowed?", answer: "Not proven", explanation: "A sample runtime match illustrates an authorization check. It does not prove that an action executed.", tone: "unknown" },
      { question: "Can we prove what happened?", answer: "Not completely", explanation: "Sample data is illustrative evidence only. " + stages[4]!.explanation, tone: "warning" },
    ],
    stages,
    findings,
  };
}
