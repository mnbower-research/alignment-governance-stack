import type { AuthorityMap } from "@alignment-governance-stack/authority-map";
import type { PolicyProfile } from "@alignment-governance-stack/policy-profiles";
import type { GovernanceReceipt } from "@alignment-governance-stack/receipts";
import type { RuntimePermit } from "@alignment-governance-stack/runtime-binding";
import type {
  AagPacket,
  AgentActionProposal,
  PgdlObjectionCategory,
  PgdlPacket
} from "@alignment-governance-stack/shared-types";
import { getTheaterSignalById } from "./taxonomy.js";
import type {
  AuditEvidenceRef,
  AuditFinding,
  AuditSeverity,
  GovernanceContinuityInput,
  GovernanceContinuitySummary
} from "./types.js";

export type ContinuityFindingDimension =
  | "authority_continuity"
  | "receipt_continuity"
  | "human_review_continuity"
  | "scope_stability"
  | "policy_reality_fit"
  | "governance_maturity";

export interface GovernanceContinuityOptions {
  requireReceiptHashChain?: boolean;
  requireReceiptHash?: boolean;
  requireSignaturePlaceholder?: boolean;
  highRiskFastApprovalThresholdMs?: number;
  excessiveApproverCategoryThreshold?: number;
  minHistoryForTrend?: number;
}

export type AgentReceipt = GovernanceReceipt | MinimalAgentReceipt;

export interface MinimalAgentReceipt {
  id: string;
  createdAt?: string;
  previousReceiptHash?: string;
  receiptHash?: string;
  signature?: string;
  proposalId?: string;
  originalProposal?: AgentActionProposal;
  proposal?: AgentActionProposal;
  resolvedProposal?: AgentActionProposal;
  runtimeAction?: AgentActionProposal;
  aag?: AagPacket | MinimalAagDecisionPacket;
  pgdl?: PgdlPacket | MinimalPgdlReviewPacket;
  permit?: RuntimePermit | MinimalRuntimePermit;
  permitId?: string;
  finalDecision?: string;
  finalOutcome?: string;
  outcome?: string;
  executedAt?: string;
  approvedAt?: string;
  approvedBy?: ApprovalActor;
  approvals?: ApprovalRecord[];
  requiredApprovalRoleIds?: string[];
  metadata?: Record<string, unknown>;
}

export type AagDecisionPacket = AagPacket | MinimalAagDecisionPacket;

export interface MinimalAagDecisionPacket {
  id?: string;
  proposal?: AgentActionProposal;
  proposalId?: string;
  decision: string;
  reasonForDecision?: string;
  createdAt?: string;
  metadata?: Record<string, unknown>;
}

export type PgdlReviewPacket = PgdlPacket | MinimalPgdlReviewPacket;

export interface MinimalPgdlReviewPacket {
  id?: string;
  proposalId?: string;
  originalProposal?: AgentActionProposal;
  resolvedProposal?: AgentActionProposal;
  objections?: Array<{
    category?: PgdlObjectionCategory | string;
    message?: string;
    severity?: string;
    reason?: string;
  }>;
  decision: string;
  reasonForDecision?: string;
  internalizedPrinciple?: string;
  createdAt?: string;
  metadata?: Record<string, unknown>;
}

export interface MinimalRuntimePermit {
  id: string;
  proposalId?: string;
  allowedAction?: AgentActionProposal;
  issuedAt?: string;
  expiresAt?: string;
  source?: string;
  aagDecision?: string;
  metadata?: Record<string, unknown>;
}

export interface MinimalAuthorityMap {
  id?: string;
  name?: string;
  version?: string;
  roles?: AuthorityRoleRecord[];
  fallbackRoleIds?: string[];
  metadata?: Record<string, unknown>;
}

export type GovernanceAuthorityMap = AuthorityMap | MinimalAuthorityMap;

export interface AuthorityRoleRecord {
  id: string;
  label?: string;
  active?: boolean;
  stale?: boolean;
  scopes?: Array<{
    id?: string;
    tool?: string;
    actionType?: string;
    environment?: string;
  }>;
  metadata?: Record<string, unknown>;
}

export interface MinimalGovernancePolicy {
  id: string;
  name?: string;
  version?: string;
  approvalRules?: Array<{
    id: string;
    when?: Partial<AgentActionProposal>;
    requiresApproval: boolean;
    approverRole?: string;
    reason?: string;
  }>;
  tools?: Array<{
    tool: string;
    allowed?: boolean;
    requiresApproval?: boolean;
  }>;
  environments?: Array<{
    environment: string;
    requiresApprovalForIrreversible?: boolean;
    requiresApprovalForExternalFacing?: boolean;
    requiresApprovalForHighSensitivity?: boolean;
  }>;
  metadata?: Record<string, unknown>;
}

export type GovernancePolicy = PolicyProfile | MinimalGovernancePolicy;

export interface WorkflowRecord {
  id: string;
  name?: string;
  actionType?: string;
  tool?: string;
  environment?: string;
  expectedApprovalRequired?: boolean;
  policyId?: string;
  createdAt?: string;
  metadata?: Record<string, unknown>;
}

export interface ApprovalActor {
  id?: string;
  roleId?: string;
  name?: string;
}

export interface ApprovalRecord {
  id?: string | undefined;
  approverId?: string | undefined;
  approverRoleId?: string | undefined;
  approvedAt?: string | undefined;
  requestedAt?: string | undefined;
  approvalKind?: string | undefined;
  reason?: string | undefined;
  contextProvided?: boolean | undefined;
  metadata?: Record<string, unknown>;
}

export interface GovernanceContinuityFindingResult {
  findings: AuditFinding[];
  summary: GovernanceContinuitySummary;
}

interface NormalizedGovernanceEvent {
  id: string;
  createdAt?: string | undefined;
  proposalId?: string | undefined;
  proposal?: AgentActionProposal | undefined;
  actionType?: string | undefined;
  tool?: string | undefined;
  target?: string | undefined;
  environment?: string | undefined;
  externalFacing?: boolean | undefined;
  reversible?: boolean | undefined;
  dataSensitivity?: string | undefined;
  requiresApproval?: boolean | undefined;
  knownApproval?: boolean | undefined;
  decision?: string | undefined;
  finalDecision?: string | undefined;
  finalOutcome?: string | undefined;
  permitId?: string | undefined;
  hasPermit: boolean;
  hasReceiptHash: boolean;
  hasPreviousReceiptHash: boolean;
  hasSignaturePlaceholder: boolean;
  executedAt?: string | undefined;
  approvedAt?: string | undefined;
  approvalRecords: ApprovalRecord[];
  approverIds: string[];
  approverRoleIds: string[];
  requiredApprovalRoleIds: string[];
  metadata: Record<string, unknown>;
}

const DEFAULT_OPTIONS = {
  requireReceiptHashChain: true,
  requireReceiptHash: true,
  requireSignaturePlaceholder: false,
  highRiskFastApprovalThresholdMs: 10_000,
  excessiveApproverCategoryThreshold: 3,
  minHistoryForTrend: 3
} as const;

export function createGovernanceContinuityFindings(
  input: GovernanceContinuityInput,
  generatedAt = new Date().toISOString()
): GovernanceContinuityFindingResult {
  const options = { ...DEFAULT_OPTIONS, ...coerceOptions(input.options) };
  const receipts = (input.receipts ?? []) as AgentReceipt[];
  const decisions = (input.decisions ?? []) as AagDecisionPacket[];
  const pgdlReviews = (input.pgdlReviews ?? []) as PgdlReviewPacket[];
  const permits = (input.permits ?? []) as Array<RuntimePermit | MinimalRuntimePermit>;
  const authorityMap = input.authorityMap as GovernanceAuthorityMap | undefined;
  const policies = input.policies as GovernancePolicy[] | undefined;
  const workflows = (input.workflows ?? []) as WorkflowRecord[];

  const receiptEvents = normalizeReceipts(receipts);
  const decisionEvents = normalizeDecisions(decisions);
  const allEvents = sortEvents([...receiptEvents, ...decisionEvents]);
  const receiptTimeWindow = timeWindow(receiptEvents);
  const dimensionsChecked: ContinuityFindingDimension[] = [
    "authority_continuity",
    "receipt_continuity",
    "human_review_continuity",
    "scope_stability",
    "policy_reality_fit",
    "governance_maturity"
  ];
  const findings = [
    ...authorityContinuityFindings(receiptEvents, authorityMap, options),
    ...receiptContinuityFindings(receiptEvents, permits, options),
    ...humanReviewContinuityFindings(receiptEvents, decisions, pgdlReviews, options),
    ...scopeStabilityFindings(allEvents, decisions, pgdlReviews),
    ...policyRealityFitFindings(receiptEvents, decisionEvents, policies, authorityMap, workflows),
    ...governanceMaturityFindings(allEvents, decisions, pgdlReviews, options)
  ];

  return {
    findings,
    summary: {
      generatedAt,
      summary:
        findings.length === 0
          ? "Continuity checks did not add findings from the supplied governance history. This is not a certification; it only means these deterministic checks found no temporal drift signals."
          : `Continuity checks added ${findings.length} finding(s) about whether governance evidence remained coherent over time.`,
      dimensionsChecked,
      findingsAdded: findings.length,
      evidence: {
        receiptsAnalyzed: receipts.length,
        decisionsAnalyzed: decisions.length,
        pgdlReviewsAnalyzed: pgdlReviews.length,
        permitsAnalyzed: permits.length,
        workflowsAnalyzed: workflows.length,
        ...(receiptTimeWindow === undefined ? {} : { timeWindow: receiptTimeWindow })
      }
    }
  };
}

function authorityContinuityFindings(
  events: NormalizedGovernanceEvent[],
  authorityMap: GovernanceAuthorityMap | undefined,
  options: Required<GovernanceContinuityOptions>
): AuditFinding[] {
  const knownRoles = authorityRoleIds(authorityMap);
  const staleRoles = staleAuthorityRoleIds(authorityMap);
  const fallbackRoles = fallbackRoleIds(authorityMap);
  const approverCategoryCounts = new Map<string, Set<string>>();

  for (const event of events) {
    const category = `${event.tool ?? "unknown"}:${event.actionType ?? "unknown"}:${event.environment ?? "unknown"}`;
    for (const approverId of event.approverIds) {
      const categories = approverCategoryCounts.get(approverId) ?? new Set<string>();
      categories.add(category);
      approverCategoryCounts.set(approverId, categories);
    }
  }

  return [
    authorityMap === undefined && events.length > 0
      ? finding({
          id: "continuity-authority-001",
          taxonomyId: "TG-006",
          dimension: "authority_continuity",
          severity: "medium",
          title: "Authority continuity cannot be compared to an authority map",
          observation: "Governance history was supplied, but no active authority map was provided for comparison.",
          evidenceIds: [],
          recommendation: "Supply the active authority map with role scopes when running governance continuity checks."
        })
      : undefined,
    findingForRefs({
      id: "continuity-authority-002",
      taxonomyId: "TG-006",
      dimension: "authority_continuity",
      severity: "high",
      title: "Approval history references roles outside the authority map",
      observation: "Actual approval history includes approver roles that are not listed in the supplied authority map.",
      evidenceIds: events
        .filter((event) => knownRoles.size > 0 && event.approverRoleIds.some((roleId) => !knownRoles.has(roleId)))
        .map((event) => event.id),
      recommendation: "Review the authority map and approval workflow before treating these approvals as authority evidence."
    }),
    findingForRefs({
      id: "continuity-authority-003",
      taxonomyId: "TG-006",
      dimension: "authority_continuity",
      severity: "medium",
      title: "Stale approvers still appear in approval evidence",
      observation: "Approval history references roles marked stale or inactive.",
      evidenceIds: events
        .filter((event) => event.approverRoleIds.some((roleId) => staleRoles.has(roleId)))
        .map((event) => event.id),
      recommendation: "Remove stale approvers from active approval paths or re-authorize them explicitly."
    }),
    findingForRefs({
      id: "continuity-authority-004",
      taxonomyId: "TG-006",
      dimension: "authority_continuity",
      severity: "high",
      title: "Required approval roles are missing from receipt evidence",
      observation: "Receipts indicate required authority roles, but approval evidence does not show a matching role.",
      evidenceIds: events
        .filter(
          (event) =>
            event.requiredApprovalRoleIds.length > 0 &&
            !event.requiredApprovalRoleIds.some((roleId) => event.approverRoleIds.includes(roleId))
        )
        .map((event) => event.id),
      recommendation: "Require receipts to record the role that satisfied each required authority check."
    }),
    findingForRefs({
      id: "continuity-authority-005",
      taxonomyId: "TG-006",
      dimension: "authority_continuity",
      severity: "medium",
      title: "Fallback approval is repeated",
      observation: "Fallback approval roles appear repeatedly, which can blur normal authority boundaries.",
      evidenceIds: events
        .filter((event) => event.approverRoleIds.some((roleId) => fallbackRoles.has(roleId)))
        .map((event) => event.id),
      minimumRefs: 2,
      recommendation: "Review whether fallback approval is becoming the default path and add explicit role coverage where needed."
    }),
    findingForRefs({
      id: "continuity-authority-006",
      taxonomyId: "TG-001",
      dimension: "authority_continuity",
      severity: "medium",
      title: "Approval authority is concentrated across many action categories",
      observation: "The same approver appears across many action categories, which may indicate authority ambiguity or bottlenecking.",
      evidenceIds: [...approverCategoryCounts.entries()]
        .filter(([, categories]) => categories.size > options.excessiveApproverCategoryThreshold)
        .map(([approverId]) => approverId),
      recommendation: "Separate approval responsibility by workflow, risk class, or policy scope."
    })
  ].filter(isFinding);
}

function receiptContinuityFindings(
  events: NormalizedGovernanceEvent[],
  permits: Array<RuntimePermit | MinimalRuntimePermit>,
  options: Required<GovernanceContinuityOptions>
): AuditFinding[] {
  const knownPermitIds = new Set(permits.map((permit) => stringValue(asRecord(permit).id)).filter(isString));
  const missingHashRefs = options.requireReceiptHash
    ? events.filter((event) => !event.hasReceiptHash).map((event) => event.id)
    : [];
  const missingPreviousHashRefs =
    options.requireReceiptHashChain && events.length > 1
      ? events.slice(1).filter((event) => !event.hasPreviousReceiptHash).map((event) => event.id)
      : [];
  const missingSignatureRefs = options.requireSignaturePlaceholder
    ? events.filter((event) => !event.hasSignaturePlaceholder).map((event) => event.id)
    : [];

  return [
    events.length === 0
      ? finding({
          id: "continuity-receipt-001",
          taxonomyId: "TG-005",
          dimension: "receipt_continuity",
          severity: "medium",
          title: "No receipt history supplied for continuity review",
          observation: "No receipts were supplied, so the report cannot reconstruct governance continuity over time.",
          evidenceIds: [],
          recommendation: "Preserve receipts for governed actions before relying on trend-level governance conclusions."
        })
      : undefined,
    findingForRefs({
      id: "continuity-receipt-002",
      taxonomyId: "TG-003",
      dimension: "receipt_continuity",
      severity: "high",
      title: "Executed consequential actions lack linked permits",
      observation: "One or more executed consequential actions do not preserve a runtime permit reference.",
      evidenceIds: events
        .filter((event) => isExecuted(event) && isConsequential(event) && !event.hasPermit)
        .map((event) => event.id),
      recommendation: "Link each executed consequential action receipt to the runtime permit that authorized the exact action."
    }),
    findingForRefs({
      id: "continuity-receipt-003",
      taxonomyId: "TG-003",
      dimension: "receipt_continuity",
      severity: "medium",
      title: "Receipts reference permits outside the supplied permit set",
      observation: "Receipt history includes permit references that could not be matched to supplied runtime permits.",
      evidenceIds: events
        .filter((event) => event.permitId !== undefined && knownPermitIds.size > 0 && !knownPermitIds.has(event.permitId))
        .map((event) => event.id),
      recommendation: "Keep permit records and receipts in the same evidence bundle."
    }),
    findingForRefs({
      id: "continuity-receipt-004",
      taxonomyId: "TG-005",
      dimension: "receipt_continuity",
      severity: "medium",
      title: "Receipts are missing final outcomes",
      observation: "Receipt continuity is weakened because final decisions or outcomes are absent.",
      evidenceIds: events
        .filter((event) => event.finalDecision === undefined && event.finalOutcome === undefined)
        .map((event) => event.id),
      recommendation: "Record the final allowed, blocked, revised, escalated, or executed outcome in every receipt."
    }),
    findingForRefs({
      id: "continuity-receipt-005",
      taxonomyId: "TG-005",
      dimension: "receipt_continuity",
      severity: missingHashRefs.length + missingPreviousHashRefs.length > events.length ? "high" : "medium",
      title: "Receipt hash continuity is incomplete",
      observation: "One or more receipts are missing receipt hashes or expected previous receipt hash links.",
      evidenceIds: [...missingHashRefs, ...missingPreviousHashRefs],
      recommendation: "Preserve receipt hashes and previousReceiptHash links where a hash chain is expected."
    }),
    findingForRefs({
      id: "continuity-receipt-006",
      taxonomyId: "TG-005",
      dimension: "receipt_continuity",
      severity: "low",
      title: "Receipt signature evidence is not demonstrated",
      observation: "The continuity options require signature evidence or a placeholder, but some receipts do not include it.",
      evidenceIds: missingSignatureRefs,
      recommendation: "Add explicit signature status metadata so reviewers can distinguish unsigned receipts from missing evidence."
    })
  ].filter(isFinding);
}

function humanReviewContinuityFindings(
  events: NormalizedGovernanceEvent[],
  decisions: AagDecisionPacket[],
  pgdlReviews: PgdlReviewPacket[],
  options: Required<GovernanceContinuityOptions>
): AuditFinding[] {
  const requireApprovalDecisionCount = decisions.filter((decision) => asRecord(decision).decision === "require_approval").length;

  return [
    findingForRefs({
      id: "continuity-review-001",
      taxonomyId: "TG-011",
      dimension: "human_review_continuity",
      severity: "high",
      title: "Approval evidence appears after execution",
      observation: "Human approval evidence appears after the action execution timestamp, weakening the chance to refuse or revise before commitment.",
      evidenceIds: events
        .filter((event) => {
          const delta = timeDeltaMs(event.executedAt, event.approvedAt);
          return delta !== undefined && delta > 0;
        })
        .map((event) => event.id),
      recommendation: "Enforce approval-before-execution ordering in workflow orchestration and runtime binding."
    }),
    findingForRefs({
      id: "continuity-review-002",
      taxonomyId: "TG-002",
      dimension: "human_review_continuity",
      severity: "medium",
      title: "High-risk approvals are unusually fast",
      observation: "High-risk actions were approved inside the configured fast-approval threshold.",
      evidenceIds: events
        .filter((event) => {
          if (!isHighRisk(event)) {
            return false;
          }
          const requestedAt = event.approvalRecords[0]?.requestedAt ?? event.createdAt;
          const delta = timeDeltaMs(requestedAt, event.approvedAt);
          return delta !== undefined && delta >= 0 && delta <= options.highRiskFastApprovalThresholdMs;
        })
        .map((event) => event.id),
      recommendation: "Require risk context and deliberate review expectations for high-risk action classes."
    }),
    findingForRefs({
      id: "continuity-review-003",
      taxonomyId: "TG-002",
      dimension: "human_review_continuity",
      severity: "medium",
      title: "Approval context is not demonstrated",
      observation: "High-risk approvals do not show enough context or recorded rationale for review.",
      evidenceIds: events
        .filter(
          (event) =>
            isHighRisk(event) &&
            event.approvalRecords.length > 0 &&
            event.approvalRecords.every((approval) => approval.contextProvided === false || approval.reason === undefined)
        )
        .map((event) => event.id),
      recommendation: "Record reviewer context, risk summary, and reason before accepting high-risk approvals."
    }),
    findingForRefs({
      id: "continuity-review-004",
      taxonomyId: "TG-011",
      dimension: "human_review_continuity",
      severity: "high",
      title: "High-risk actions proceed without valid approval evidence",
      observation: "Receipt history indicates high-risk execution where known approval is not demonstrated.",
      evidenceIds: events
        .filter((event) => isExecuted(event) && isHighRisk(event) && event.knownApproval !== true)
        .map((event) => event.id),
      recommendation: "Require valid approval evidence before runtime permits can authorize high-risk execution."
    }),
    findingForRefs({
      id: "continuity-review-005",
      taxonomyId: "TG-002",
      dimension: "human_review_continuity",
      severity: "medium",
      title: "Require-approval decisions are repeatedly approved without revision",
      observation: "AAG required approval, but subsequent receipt patterns show approvals without meaningful proposal revision.",
      evidenceIds: events
        .filter(
          (event) =>
            event.decision === "require_approval" &&
            event.knownApproval === true &&
            event.finalDecision !== undefined &&
            !event.finalDecision.toLowerCase().includes("revis")
        )
        .map((event) => event.id),
      minimumRefs: Math.max(2, requireApprovalDecisionCount),
      recommendation: "Audit whether approval is acting as discernment or as a mechanical pass-through."
    }),
    findingForRefs({
      id: "continuity-review-006",
      taxonomyId: "TG-011",
      dimension: "human_review_continuity",
      severity: "high",
      title: "Escalation closure is not preserved before execution",
      observation: "PGDL escalation evidence exists, but matching receipts indicate execution continued without preserving escalation closure.",
      evidenceIds: pgdlReviews
        .map((review, index) => {
          const record = asRecord(review);
          if (record.decision !== "escalate_to_human") {
            return undefined;
          }
          const proposalId = stringValue(record.proposalId) ?? stringValue(asRecord(record.originalProposal).id);
          const matchingExecution = events.find(
            (event) => event.proposalId === proposalId && isExecuted(event) && event.finalDecision !== "escalated"
          );
          return matchingExecution?.id ?? `pgdl-review-${index + 1}`;
        })
        .filter(isString),
      recommendation: "Require explicit human escalation closure before any matching action can proceed."
    })
  ].filter(isFinding);
}

function scopeStabilityFindings(
  events: NormalizedGovernanceEvent[],
  decisions: AagDecisionPacket[],
  pgdlReviews: PgdlReviewPacket[]
): AuditFinding[] {
  const scopedEvents = events.filter((event) => event.proposal !== undefined);
  if (scopedEvents.length < 2) {
    return [];
  }

  const midpoint = Math.max(1, Math.floor(scopedEvents.length / 2));
  const early = scopedEvents.slice(0, midpoint);
  const late = scopedEvents.slice(midpoint);
  const earlyRisk = average(early.map(riskScore));
  const lateRisk = average(late.map(riskScore));
  const repeatedReasons = repeatedUnsafeReasons(decisions, pgdlReviews);

  return [
    lateRisk - earlyRisk >= 2
      ? finding({
          id: "continuity-scope-001",
          taxonomyId: "TG-008",
          dimension: "scope_stability",
          severity: "medium",
          title: "Workflow risk increases over time",
          observation: "Later governed events show materially higher scope or consequence than earlier events.",
          evidenceIds: late.map((event) => event.id),
          recommendation: "Review whether the workflow's approved action class has expanded beyond its intended risk envelope."
        })
      : undefined,
    findingForRefs({
      id: "continuity-scope-002",
      taxonomyId: "TG-008",
      dimension: "scope_stability",
      severity: "high",
      title: "Draft or review workflow drifts toward send or publish actions",
      observation: "Earlier actions are draft or review oriented, while later actions include send or publish behavior.",
      evidenceIds: late
        .filter(
          (event) =>
            actionIncludes(event.actionType, ["send", "publish"]) &&
            early.some((item) => actionIncludes(item.actionType, ["draft", "review"]))
        )
        .map((event) => event.id),
      recommendation: "Separate draft/review workflows from external send or publish workflows with explicit approval boundaries."
    }),
    findingForRefs({
      id: "continuity-scope-003",
      taxonomyId: "TG-008",
      dimension: "scope_stability",
      severity: "medium",
      title: "Internal workflow drifts toward external-facing action",
      observation: "Later events include external-facing actions after earlier internal-only behavior.",
      evidenceIds: late
        .filter((event) => event.externalFacing === true && early.some((item) => item.externalFacing === false))
        .map((event) => event.id),
      recommendation: "Require policy and authority review before internal workflows gain external-facing scope."
    }),
    findingForRefs({
      id: "continuity-scope-004",
      taxonomyId: "TG-009",
      dimension: "scope_stability",
      severity: "medium",
      title: "Read or reversible workflow drifts toward write or irreversible action",
      observation: "Later events show write, modify, delete, or irreversible behavior after earlier lower-impact activity.",
      evidenceIds: late
        .filter(
          (event) =>
            (actionIncludes(event.actionType, ["write", "update", "modify", "delete"]) &&
              early.some((item) => actionIncludes(item.actionType, ["read", "review"]))) ||
            (event.reversible === false && early.some((item) => item.reversible === true))
        )
        .map((event) => event.id),
      recommendation: "Review workflow scope, tool permissions, and runtime permits before allowing widened action classes."
    }),
    findingForRefs({
      id: "continuity-scope-005",
      taxonomyId: "TG-008",
      dimension: "scope_stability",
      severity: "medium",
      title: "Tool scope widens over time",
      observation: "Later events use tools not observed in the earlier workflow window.",
      evidenceIds: widenedTools(early, late),
      recommendation: "Require explicit policy and authority coverage for newly introduced tools."
    }),
    findingForRefs({
      id: "continuity-scope-006",
      taxonomyId: "TG-010",
      dimension: "scope_stability",
      severity: "medium",
      title: "Repeated unsafe proposal patterns continue",
      observation: "Decision and PGDL history repeats the same block, revision, escalation, or objection reasons.",
      evidenceIds: repeatedReasons,
      recommendation: "Turn repeated objection patterns into revised workflow constraints or targeted eval cases after human review."
    })
  ].filter(isFinding);
}

function policyRealityFitFindings(
  receiptEvents: NormalizedGovernanceEvent[],
  decisionEvents: NormalizedGovernanceEvent[],
  policies: GovernancePolicy[] | undefined,
  authorityMap: GovernanceAuthorityMap | undefined,
  workflows: WorkflowRecord[]
): AuditFinding[] {
  const activePolicies = policies ?? [];
  const repeatedReviseRefs = repeatedReviseByReason(decisionEvents);

  return [
    activePolicies.length === 0 && (receiptEvents.length > 0 || decisionEvents.length > 0)
      ? finding({
          id: "continuity-policy-001",
          taxonomyId: "TG-006",
          dimension: "policy_reality_fit",
          severity: "low",
          title: "Policy inputs not supplied for continuity comparison",
          observation: "The report can inspect receipts and decisions but cannot compare them to written policy.",
          evidenceIds: [],
          recommendation: "Supply active governance policy profiles for policy-reality continuity checks."
        })
      : undefined,
    findingForRefs({
      id: "continuity-policy-002",
      taxonomyId: "TG-006",
      dimension: "policy_reality_fit",
      severity: "high",
      title: "Policy requires approval but history shows allow or execution without approval evidence",
      observation: "Written policy requires approval for matching actions, but receipt history does not demonstrate approval before allow or execution.",
      evidenceIds: receiptEvents
        .filter((event) => event.proposal !== undefined)
        .filter((event) => activePolicies.some((policy) => policyRequiresApproval(policy, event.proposal!)))
        .filter((event) => (event.decision === "allow" || event.finalDecision === "allow" || isExecuted(event)) && !event.knownApproval)
        .map((event) => event.id),
      recommendation: "Align AAG, runtime binding, and workflow orchestration with approval requirements in policy."
    }),
    findingForRefs({
      id: "continuity-policy-003",
      taxonomyId: "TG-006",
      dimension: "policy_reality_fit",
      severity: "high",
      title: "Workflow bypasses expected review",
      observation: "Workflow records require approval, but matching receipt history shows execution without known approval.",
      evidenceIds: workflows.flatMap((workflow) =>
        workflow.expectedApprovalRequired === true
          ? receiptEvents
              .filter(
                (event) =>
                  event.tool === workflow.tool &&
                  event.actionType === workflow.actionType &&
                  isExecuted(event) &&
                  !event.knownApproval
              )
              .map((event) => event.id)
          : []
      ),
      recommendation: "Block execution for review-required workflow records unless valid approval evidence is linked."
    }),
    findingForRefs({
      id: "continuity-policy-004",
      taxonomyId: "TG-010",
      dimension: "policy_reality_fit",
      severity: "medium",
      title: "Same policy gap repeatedly causes revise-action decisions",
      observation: "AAG repeatedly asks for revision for the same reason, suggesting written policy or workflow affordances may be incomplete.",
      evidenceIds: repeatedReviseRefs,
      recommendation: "Review repeated revise reasons and update policy or workflow templates after human approval."
    }),
    findingForRefs({
      id: "continuity-policy-005",
      taxonomyId: "TG-006",
      dimension: "policy_reality_fit",
      severity: "medium",
      title: "Agents repeatedly propose actions outside supplied policy boundaries",
      observation: "Receipt history includes actions that are not covered by the supplied policy profiles.",
      evidenceIds: receiptEvents
        .filter((event) => event.proposal !== undefined && activePolicies.length > 0)
        .filter((event) => !activePolicies.some((policy) => policyMentionsProposal(policy, event.proposal!)))
        .map((event) => event.id),
      minimumRefs: 2,
      recommendation: "Add explicit policy coverage or block unsupported action classes until reviewed."
    }),
    findingForRefs({
      id: "continuity-policy-006",
      taxonomyId: "TG-006",
      dimension: "policy_reality_fit",
      severity: "medium",
      title: "Authority map does not cover actual action categories",
      observation: "Actual receipt categories do not appear covered by any authority-map scope.",
      evidenceIds: uncoveredAuthorityCategories(authorityMap, receiptEvents),
      recommendation: "Update the authority map after human review or restrict workflows to covered categories."
    })
  ].filter(isFinding);
}

function governanceMaturityFindings(
  events: NormalizedGovernanceEvent[],
  decisions: AagDecisionPacket[],
  pgdlReviews: PgdlReviewPacket[],
  options: Required<GovernanceContinuityOptions>
): AuditFinding[] {
  if (events.length < options.minHistoryForTrend) {
    return [];
  }

  const repeatedObjectionRefs = repeatedPgdlObjections(pgdlReviews);
  const repeatedAagReasonRefs = repeatedAagReasons(decisions);
  const metadataWeakRefs = events
    .filter(
      (event) =>
        event.proposalId === undefined ||
        event.tool === undefined ||
        event.actionType === undefined ||
        event.target === undefined ||
        (event.decision === undefined && event.finalDecision === undefined)
    )
    .map((event) => event.id);

  return [
    findingForRefs({
      id: "continuity-maturity-001",
      taxonomyId: "TG-010",
      dimension: "governance_maturity",
      severity: "medium",
      title: "PGDL objections repeat over time",
      observation: "The same PGDL objection categories recur, suggesting prior governance feedback has not become workflow structure.",
      evidenceIds: repeatedObjectionRefs,
      recommendation: "Convert repeated PGDL objections into safer proposal templates, policy examples, or targeted evals after human review."
    }),
    findingForRefs({
      id: "continuity-maturity-002",
      taxonomyId: "TG-010",
      dimension: "governance_maturity",
      severity: "medium",
      title: "AAG block or revision reasons repeat over time",
      observation: "AAG continues to block or revise actions for similar reasons, indicating repeated boundary failures.",
      evidenceIds: repeatedAagReasonRefs,
      recommendation: "Add pre-gate constraints or agent instructions that prevent repeat proposal failures before AAG."
    }),
    findingForRefs({
      id: "continuity-maturity-003",
      taxonomyId: "TG-005",
      dimension: "governance_maturity",
      severity: "low",
      title: "Decision metadata completeness is weak",
      observation: "Receipt and decision metadata does not consistently preserve enough fields for trend analysis.",
      evidenceIds: metadataWeakRefs,
      recommendation: "Make proposal id, tool, action type, target, approval requirement, sensitivity, and decision fields mandatory."
    })
  ].filter(isFinding);
}

function findingForRefs(input: {
  id: string;
  taxonomyId: string;
  dimension: ContinuityFindingDimension;
  severity: AuditSeverity;
  title: string;
  observation: string;
  evidenceIds: string[];
  recommendation: string;
  minimumRefs?: number;
}): AuditFinding | undefined {
  const minimumRefs = input.minimumRefs ?? 1;
  if (input.evidenceIds.length < minimumRefs) {
    return undefined;
  }

  return finding(input);
}

function finding(input: {
  id: string;
  taxonomyId: string;
  dimension: ContinuityFindingDimension;
  severity: AuditSeverity;
  title: string;
  observation: string;
  evidenceIds: string[];
  recommendation: string;
}): AuditFinding {
  const taxonomyEntry = getRequiredTaxonomyEntry(input.taxonomyId);
  const evidenceRefs = [...new Set(input.evidenceIds)].sort().map(toContinuityEvidenceRef);

  return {
    id: input.id,
    taxonomyId: input.taxonomyId,
    title: input.title,
    severity: input.severity,
    confidence: evidenceRefs.length > 0 ? "medium" : "low",
    status: evidenceRefs.length > 0 ? "requires_verification" : "not_demonstrated",
    summary: `Continuity check for ${input.dimension.replace(/_/g, " ")}.`,
    observation: input.observation,
    whyItMatters: taxonomyEntry.whyItMatters,
    auditQuestions: taxonomyEntry.defaultAuditQuestions,
    recommendedRemediations: [input.recommendation, ...taxonomyEntry.recommendedRemediations],
    evidenceRefs,
    relatedControls: [taxonomyEntry.category]
  };
}

function toContinuityEvidenceRef(id: string): AuditEvidenceRef {
  return {
    id: `continuity-evidence-${safeId(id)}`,
    type: id.startsWith("receipt") || id.includes("receipt") ? "receipt" : "manual_note",
    title: `Continuity evidence: ${id}`
  };
}

function getRequiredTaxonomyEntry(taxonomyId: string) {
  const taxonomyEntry = getTheaterSignalById(taxonomyId);
  if (taxonomyEntry === undefined) {
    throw new Error(`Missing taxonomy entry: ${taxonomyId}`);
  }
  return taxonomyEntry;
}

function normalizeReceipts(receipts: AgentReceipt[]): NormalizedGovernanceEvent[] {
  return receipts.map((receipt, index) => normalizeReceipt(receipt, index));
}

function normalizeReceipt(receipt: AgentReceipt, index: number): NormalizedGovernanceEvent {
  const record = asRecord(receipt);
  const proposal = firstProposal(record);
  const permit = asRecord(record.permit);
  const aag = asRecord(record.aag);
  const metadata = asRecord(record.metadata);
  const approvalRecords = approvalRecordsFrom(record, metadata);
  const approvedActor = asRecord(record.approvedBy);
  const approvedAt = stringValue(record.approvedAt) ?? firstStringFromApprovals(approvalRecords, "approvedAt");
  const permitId = stringValue(record.permitId) ?? stringValue(permit.id);
  const decision = stringValue(aag.decision) ?? stringValue(record.decision);

  return {
    id: stringValue(record.id) ?? `receipt-${index + 1}`,
    createdAt: stringValue(record.createdAt),
    proposalId:
      stringValue(record.proposalId) ??
      stringValue(permit.proposalId) ??
      stringValue(aag.proposalId) ??
      proposal?.id,
    proposal,
    actionType: proposal?.actionType,
    tool: proposal?.tool,
    target: proposal?.target,
    environment: proposal?.environment,
    externalFacing: proposal?.externalFacing,
    reversible: proposal?.reversible,
    dataSensitivity: proposal?.dataSensitivity,
    requiresApproval: proposal?.requiresApproval,
    knownApproval: proposal?.knownApproval,
    decision,
    finalDecision: stringValue(record.finalDecision),
    finalOutcome: stringValue(record.finalOutcome) ?? stringValue(record.outcome),
    permitId,
    hasPermit: permitId !== undefined,
    hasReceiptHash: stringValue(record.receiptHash) !== undefined,
    hasPreviousReceiptHash: stringValue(record.previousReceiptHash) !== undefined,
    hasSignaturePlaceholder:
      stringValue(record.signature) !== undefined ||
      stringValue(metadata.signature) !== undefined ||
      stringValue(metadata.signaturePlaceholder) !== undefined,
    executedAt: stringValue(record.executedAt) ?? stringValue(metadata.executedAt),
    approvedAt,
    approvalRecords,
    approverIds: [
      ...approvalRecords.map((approval) => approval.approverId),
      stringValue(approvedActor.id),
      stringValue(metadata.approverId)
    ].filter(isString),
    approverRoleIds: [
      ...approvalRecords.map((approval) => approval.approverRoleId),
      stringValue(approvedActor.roleId),
      stringValue(metadata.approverRoleId)
    ].filter(isString),
    requiredApprovalRoleIds: requiredApprovalRoleIdsFrom(record, metadata),
    metadata
  };
}

function normalizeDecisions(decisions: AagDecisionPacket[]): NormalizedGovernanceEvent[] {
  return decisions.map((decision, index) => {
    const record = asRecord(decision);
    const proposal = firstProposal(record);
    const metadata = asRecord(record.metadata);

    return {
      id: stringValue(record.id) ?? `decision-${index + 1}`,
      createdAt: stringValue(record.createdAt),
      proposalId: stringValue(record.proposalId) ?? proposal?.id,
      proposal,
      actionType: proposal?.actionType,
      tool: proposal?.tool,
      target: proposal?.target,
      environment: proposal?.environment,
      externalFacing: proposal?.externalFacing,
      reversible: proposal?.reversible,
      dataSensitivity: proposal?.dataSensitivity,
      requiresApproval: proposal?.requiresApproval,
      knownApproval: proposal?.knownApproval,
      decision: stringValue(record.decision),
      finalDecision: undefined,
      finalOutcome: undefined,
      permitId: undefined,
      hasPermit: false,
      hasReceiptHash: false,
      hasPreviousReceiptHash: false,
      hasSignaturePlaceholder: false,
      executedAt: undefined,
      approvedAt: undefined,
      approvalRecords: [],
      approverIds: [],
      approverRoleIds: [],
      requiredApprovalRoleIds: requiredApprovalRoleIdsFrom(record, metadata),
      metadata
    };
  });
}

function sortEvents(events: NormalizedGovernanceEvent[]): NormalizedGovernanceEvent[] {
  return [...events].sort((left, right) => {
    const leftTime = left.createdAt ?? "";
    const rightTime = right.createdAt ?? "";
    return leftTime.localeCompare(rightTime) || left.id.localeCompare(right.id);
  });
}

function approvalRecordsFrom(record: Record<string, unknown>, metadata: Record<string, unknown>): ApprovalRecord[] {
  const direct = Array.isArray(record.approvals) ? record.approvals : [];
  const meta = Array.isArray(metadata.approvals) ? metadata.approvals : [];
  const approvalValidation = asRecord(record.approvalValidation);
  const approvalEvidence = asRecord(approvalValidation).approvalEvidence;
  const evidence = approvalEvidence === undefined ? [] : [approvalEvidence];

  return [...direct, ...meta, ...evidence].map((approval) => {
    const approvalRecord = asRecord(approval);
    return {
      id: stringValue(approvalRecord.id),
      approverId: stringValue(approvalRecord.approverId),
      approverRoleId: stringValue(approvalRecord.approverRoleId),
      approvedAt: stringValue(approvalRecord.approvedAt),
      requestedAt: stringValue(approvalRecord.requestedAt),
      approvalKind: stringValue(approvalRecord.approvalKind),
      reason: stringValue(approvalRecord.reason),
      contextProvided:
        typeof approvalRecord.contextProvided === "boolean"
          ? approvalRecord.contextProvided
          : typeof asRecord(approvalRecord.metadata).contextProvided === "boolean"
            ? (asRecord(approvalRecord.metadata).contextProvided as boolean)
            : undefined,
      metadata: asRecord(approvalRecord.metadata)
    };
  });
}

function requiredApprovalRoleIdsFrom(record: Record<string, unknown>, metadata: Record<string, unknown>): string[] {
  const direct = Array.isArray(record.requiredApprovalRoleIds) ? record.requiredApprovalRoleIds : [];
  const meta = Array.isArray(metadata.requiredApprovalRoleIds) ? metadata.requiredApprovalRoleIds : [];
  const approvalValidation = asRecord(record.approvalValidation);
  const requiredAuthority = asRecord(approvalValidation.requiredAuthority);
  const suggestedRoles = Array.isArray(requiredAuthority.suggestedRoles) ? requiredAuthority.suggestedRoles : [];

  return [...new Set([...direct, ...meta, ...suggestedRoles].map((value) => stringValue(value)).filter(isString))].sort();
}

function firstProposal(record: Record<string, unknown>): AgentActionProposal | undefined {
  const candidates = [
    record.originalProposal,
    record.proposal,
    record.resolvedProposal,
    record.runtimeAction,
    asRecord(record.aag).proposal,
    asRecord(record.permit).allowedAction
  ];

  return candidates.find(isProposal);
}

function isProposal(value: unknown): value is AgentActionProposal {
  const record = asRecord(value);
  return (
    stringValue(record.id) !== undefined &&
    stringValue(record.tool) !== undefined &&
    stringValue(record.actionType) !== undefined &&
    stringValue(record.target) !== undefined
  );
}

function authorityRoleIds(authorityMap: GovernanceAuthorityMap | undefined): Set<string> {
  const roles = arrayValue(asRecord(authorityMap).roles);
  return new Set(roles.map((role) => stringValue(asRecord(role).id)).filter(isString));
}

function staleAuthorityRoleIds(authorityMap: GovernanceAuthorityMap | undefined): Set<string> {
  const roles = arrayValue(asRecord(authorityMap).roles);
  return new Set(
    roles
      .filter((role) => {
        const record = asRecord(role);
        const metadata = asRecord(record.metadata);
        return record.active === false || record.stale === true || metadata.stale === true;
      })
      .map((role) => stringValue(asRecord(role).id))
      .filter(isString)
  );
}

function fallbackRoleIds(authorityMap: GovernanceAuthorityMap | undefined): Set<string> {
  const record = asRecord(authorityMap);
  const metadata = asRecord(record.metadata);
  return new Set([...arrayValue(record.fallbackRoleIds), ...arrayValue(metadata.fallbackRoleIds)].map(stringValue).filter(isString));
}

function isExecuted(event: NormalizedGovernanceEvent): boolean {
  const final = `${event.finalDecision ?? ""} ${event.finalOutcome ?? ""}`.toLowerCase();
  return event.executedAt !== undefined || final.includes("execut") || final.includes("allowed");
}

function isConsequential(event: NormalizedGovernanceEvent): boolean {
  return (
    event.externalFacing === true ||
    event.reversible === false ||
    event.dataSensitivity === "high" ||
    event.requiresApproval === true ||
    actionRisk(event.actionType) >= 2
  );
}

function isHighRisk(event: NormalizedGovernanceEvent): boolean {
  return (
    event.dataSensitivity === "high" ||
    event.externalFacing === true ||
    event.reversible === false ||
    actionRisk(event.actionType) >= 3 ||
    event.requiresApproval === true
  );
}

function actionRisk(actionType: string | undefined): number {
  const value = (actionType ?? "").toLowerCase();
  if (["delete", "publish", "send", "execute", "deploy", "transfer", "write"].some((term) => value.includes(term))) {
    return value.includes("draft") ? 1 : 3;
  }
  if (["update", "modify", "create", "post"].some((term) => value.includes(term))) {
    return 2;
  }
  if (["draft", "read", "review", "summarize", "classify"].some((term) => value.includes(term))) {
    return 0;
  }
  return 1;
}

function riskScore(event: NormalizedGovernanceEvent): number {
  let score = actionRisk(event.actionType);
  if (event.externalFacing === true) score += 2;
  if (event.reversible === false) score += 2;
  if (event.dataSensitivity === "medium") score += 1;
  if (event.dataSensitivity === "high") score += 2;
  return score;
}

function policyRequiresApproval(policy: GovernancePolicy, proposal: AgentActionProposal): boolean {
  const record = asRecord(policy);
  const matchingTool = arrayValue(record.tools).find((tool) => asRecord(tool).tool === proposal.tool);
  if (matchingTool !== undefined && asRecord(matchingTool).requiresApproval === true) {
    return true;
  }

  const matchingEnvironment = arrayValue(record.environments).find(
    (environment) => asRecord(environment).environment === proposal.environment
  );
  if (matchingEnvironment !== undefined) {
    const environmentRecord = asRecord(matchingEnvironment);
    if (proposal.externalFacing && environmentRecord.requiresApprovalForExternalFacing === true) return true;
    if (!proposal.reversible && environmentRecord.requiresApprovalForIrreversible === true) return true;
    if (proposal.dataSensitivity === "high" && environmentRecord.requiresApprovalForHighSensitivity === true) return true;
  }

  return arrayValue(record.approvalRules).some((rule) => {
    const ruleRecord = asRecord(rule);
    return ruleRecord.requiresApproval === true && proposalMatches(proposal, asRecord(ruleRecord.when));
  });
}

function policyMentionsProposal(policy: GovernancePolicy, proposal: AgentActionProposal): boolean {
  const record = asRecord(policy);
  return (
    arrayValue(record.tools).some((tool) => asRecord(tool).tool === proposal.tool) ||
    arrayValue(record.environments).some((environment) => asRecord(environment).environment === proposal.environment) ||
    arrayValue(record.approvalRules).some((rule) => {
      const when = asRecord(asRecord(rule).when);
      return when.tool === proposal.tool || when.actionType === proposal.actionType || when.environment === proposal.environment;
    })
  );
}

function proposalMatches(proposal: AgentActionProposal, when: Record<string, unknown>): boolean {
  return Object.entries(when).every(([key, expected]) => expected === undefined || asRecord(proposal)[key] === expected);
}

function uncoveredAuthorityCategories(
  authorityMap: GovernanceAuthorityMap | undefined,
  events: NormalizedGovernanceEvent[]
): string[] {
  const roles = arrayValue(asRecord(authorityMap).roles);
  const scopes = roles.flatMap((role) => arrayValue(asRecord(role).scopes));
  if (scopes.length === 0) {
    return [];
  }

  return events
    .filter((event) => event.proposal !== undefined)
    .filter(
      (event) =>
        !scopes.some((scope) => {
          const record = asRecord(scope);
          return (
            (record.tool === undefined || record.tool === event.tool) &&
            (record.actionType === undefined || record.actionType === event.actionType) &&
            (record.environment === undefined || record.environment === event.environment)
          );
        })
    )
    .map((event) => event.id);
}

function repeatedReviseByReason(events: NormalizedGovernanceEvent[]): string[] {
  const counts = new Map<string, number>();
  for (const event of events) {
    if (event.decision !== "revise_action") {
      continue;
    }
    const reason = normalizeReason(stringValue(event.metadata.reasonForDecision) ?? event.decision);
    counts.set(reason, (counts.get(reason) ?? 0) + 1);
  }
  return repeatedKeys(counts);
}

function repeatedUnsafeReasons(decisions: AagDecisionPacket[], pgdlReviews: PgdlReviewPacket[]): string[] {
  const counts = new Map<string, number>();
  for (const decision of decisions) {
    const record = asRecord(decision);
    if (record.decision === "block" || record.decision === "revise_action") {
      const key = normalizeReason(stringValue(record.reasonForDecision));
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  for (const review of pgdlReviews) {
    const record = asRecord(review);
    if (record.decision === "revise_before_aag" || record.decision === "reject_before_aag" || record.decision === "escalate_to_human") {
      for (const objection of arrayValue(record.objections)) {
        const objectionRecord = asRecord(objection);
        const key = normalizeReason(
          stringValue(objectionRecord.category) ??
            stringValue(objectionRecord.reason) ??
            stringValue(objectionRecord.message)
        );
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
  }

  return repeatedKeys(counts);
}

function repeatedPgdlObjections(pgdlReviews: PgdlReviewPacket[]): string[] {
  const counts = new Map<string, number>();
  for (const review of pgdlReviews) {
    for (const objection of arrayValue(asRecord(review).objections)) {
      const category = stringValue(asRecord(objection).category) ?? "unspecified_objection";
      counts.set(category, (counts.get(category) ?? 0) + 1);
    }
  }
  return repeatedKeys(counts);
}

function repeatedAagReasons(decisions: AagDecisionPacket[]): string[] {
  const counts = new Map<string, number>();
  for (const decision of decisions) {
    const record = asRecord(decision);
    if (record.decision !== "block" && record.decision !== "revise_action") {
      continue;
    }
    const reason = normalizeReason(stringValue(record.reasonForDecision));
    counts.set(reason, (counts.get(reason) ?? 0) + 1);
  }
  return repeatedKeys(counts);
}

function repeatedKeys(counts: Map<string, number>): string[] {
  return [...counts.entries()]
    .filter(([, count]) => count >= 2)
    .map(([key]) => key)
    .sort();
}

function widenedTools(early: NormalizedGovernanceEvent[], late: NormalizedGovernanceEvent[]): string[] {
  const earlyTools = new Set(early.map((event) => event.tool).filter(isString));
  return late.filter((event) => event.tool !== undefined && !earlyTools.has(event.tool)).map((event) => event.id);
}

function timeWindow(events: NormalizedGovernanceEvent[]): { start?: string; end?: string } | undefined {
  const timestamps = events.map((event) => event.createdAt).filter(isString).sort();
  if (timestamps.length === 0) {
    return undefined;
  }
  return { start: timestamps[0]!, end: timestamps[timestamps.length - 1]! };
}

function timeDeltaMs(start: string | undefined, end: string | undefined): number | undefined {
  if (start === undefined || end === undefined) {
    return undefined;
  }
  const startMs = Date.parse(start);
  const endMs = Date.parse(end);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
    return undefined;
  }
  return endMs - startMs;
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function firstStringFromApprovals(approvals: ApprovalRecord[], key: keyof ApprovalRecord): string | undefined {
  return approvals.map((approval) => approval[key]).find(isString);
}

function actionIncludes(actionType: string | undefined, terms: string[]): boolean {
  const value = (actionType ?? "").toLowerCase();
  return terms.some((term) => value.includes(term));
}

function normalizeReason(value: string | undefined): string {
  return (value ?? "unspecified_reason").toLowerCase().replace(/\s+/g, "_").slice(0, 80);
}

function safeId(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "continuity";
}

function coerceOptions(value: Record<string, unknown> | undefined): Partial<GovernanceContinuityOptions> {
  const record = asRecord(value);
  return {
    ...(typeof record.requireReceiptHashChain === "boolean"
      ? { requireReceiptHashChain: record.requireReceiptHashChain }
      : {}),
    ...(typeof record.requireReceiptHash === "boolean" ? { requireReceiptHash: record.requireReceiptHash } : {}),
    ...(typeof record.requireSignaturePlaceholder === "boolean"
      ? { requireSignaturePlaceholder: record.requireSignaturePlaceholder }
      : {}),
    ...(typeof record.highRiskFastApprovalThresholdMs === "number"
      ? { highRiskFastApprovalThresholdMs: record.highRiskFastApprovalThresholdMs }
      : {}),
    ...(typeof record.excessiveApproverCategoryThreshold === "number"
      ? { excessiveApproverCategoryThreshold: record.excessiveApproverCategoryThreshold }
      : {}),
    ...(typeof record.minHistoryForTrend === "number" ? { minHistoryForTrend: record.minHistoryForTrend } : {})
  };
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function isString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isFinding(value: AuditFinding | undefined): value is AuditFinding {
  return value !== undefined;
}
