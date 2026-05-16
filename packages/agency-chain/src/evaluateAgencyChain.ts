import type {
  AgencyChainInput,
  AgencyChainIssue,
  AgencyChainLink,
  AgencyChainLinkType,
  AgencyChainMap,
  AgencyChainOverallStatus,
  AgencyChainValidationResult
} from "./types.js";

const linkTypes: readonly AgencyChainLinkType[] = [
  "human_authority",
  "organizational_policy",
  "hard_boundary",
  "agent_role",
  "tool_access",
  "proposed_action",
  "approval_authority",
  "human_participation",
  "runtime_permit",
  "execution_boundary",
  "receipt",
  "governance_memory"
];

const linkStatuses = ["present", "weak", "missing", "not_applicable", "requires_verification"] as const;
const auditModes = [
  "public_source_review",
  "client_provided_evidence_review",
  "internal_self_audit",
  "workflow_review"
] as const;

export function createAgencyChainMap(input: AgencyChainInput): AgencyChainMap {
  const validation = validateAgencyChainInput(input);
  if (!validation.valid) {
    throw new Error(validation.errors.map((error) => `${error.path}: ${error.message}`).join("\n"));
  }

  const links = input.links;
  const issues = evaluateAgencyChainIssues(input);

  return {
    subject: input.subject,
    auditMode: input.auditMode ?? "workflow_review",
    chainId: input.chainId ?? createChainId(input.subject.auditScope),
    description: input.description ?? input.subject.auditScope,
    links,
    issues,
    overallStatus: calculateOverallStatus(links, issues),
    ...(input.createdAt !== undefined ? { createdAt: input.createdAt } : {}),
    ...(input.metadata !== undefined ? { metadata: input.metadata } : {})
  };
}

export function evaluateAgencyChain(input: AgencyChainInput): AgencyChainMap {
  return createAgencyChainMap(input);
}

export function validateAgencyChainInput(input: unknown): AgencyChainValidationResult {
  const errors: Array<{ path: string; message: string }> = [];

  if (!isRecord(input)) {
    return { valid: false, errors: [{ path: "$", message: "Agency chain input must be an object." }] };
  }

  if (!isRecord(input.subject)) {
    errors.push({ path: "$.subject", message: "subject is required." });
  } else if (typeof input.subject.auditScope !== "string" || input.subject.auditScope.trim().length === 0) {
    errors.push({ path: "$.subject.auditScope", message: "auditScope is required." });
  }

  if (input.auditMode !== undefined && (typeof input.auditMode !== "string" || !auditModes.includes(input.auditMode as never))) {
    errors.push({ path: "$.auditMode", message: `auditMode must be one of: ${auditModes.join(", ")}.` });
  }

  if (!Array.isArray(input.links)) {
    errors.push({ path: "$.links", message: "links array is required." });
  } else {
    input.links.forEach((link, index) => validateLink(link, `$.links[${index}]`, errors));
  }

  return { valid: errors.length === 0, errors };
}

function validateLink(link: unknown, path: string, errors: Array<{ path: string; message: string }>): void {
  if (!isRecord(link)) {
    errors.push({ path, message: "link must be an object." });
    return;
  }

  requireString(link, "id", `${path}.id`, errors);
  requireString(link, "label", `${path}.label`, errors);

  if (typeof link.type !== "string" || !linkTypes.includes(link.type as AgencyChainLinkType)) {
    errors.push({ path: `${path}.type`, message: `type must be one of: ${linkTypes.join(", ")}.` });
  }

  if (typeof link.status !== "string" || !linkStatuses.includes(link.status as never)) {
    errors.push({ path: `${path}.status`, message: `status must be one of: ${linkStatuses.join(", ")}.` });
  }
}

function evaluateAgencyChainIssues(input: AgencyChainInput): AgencyChainIssue[] {
  const links = input.links;
  const issues: AgencyChainIssue[] = [];
  const hasExecutionBoundary = hasLink(links, "execution_boundary");
  const hasProposedAction = hasLink(links, "proposed_action");
  const ongoingWorkflow = input.metadata?.recurringWorkflow === true || input.metadata?.ongoingWorkflow === true;

  if (!hasLink(links, "human_authority")) {
    issues.push({
      id: "AC-001",
      title: "Missing Human Authority",
      severity: hasExecutionBoundary ? "critical" : "high",
      confidence: "high",
      linkType: "human_authority",
      observation: "The agency chain does not demonstrate a human authority link for the reviewed workflow.",
      whyItMatters: "Delegated agentic work should preserve a traceable human or organizational authority source.",
      auditQuestion: "Who owns the intent, authority, and escalation path for this agent workflow?",
      recommendedRemediation: "Name the accountable human authority and bind that authority to workflow scope, tool access, and escalation conditions."
    });
  }

  if (!hasStopAuthority(links)) {
    issues.push({
      id: "AC-002",
      title: "Missing Stop Authority",
      severity: "high",
      confidence: "medium",
      linkType: "approval_authority",
      observation: "The agency chain does not demonstrate a clear stop, refuse, revise, halt, or escalation authority.",
      whyItMatters: "Agency is weakened when review exists but the reviewer cannot change the outcome before execution.",
      auditQuestion: "Who can stop, refuse, revise, halt, or escalate this action before execution?",
      recommendedRemediation: "Define named stop authority and document when that authority applies.",
      taxonomyId: "TG-001"
    });
  }

  if (hasLink(links, "tool_access") && !hasLink(links, "organizational_policy") && !hasLink(links, "hard_boundary")) {
    const issue: AgencyChainIssue = {
      id: "AC-003",
      title: "Tool Access Without Policy Scope",
      severity: "high",
      confidence: "high",
      linkType: "tool_access",
      observation: "Tool access is present, but no organizational policy or hard boundary link constrains that access.",
      whyItMatters: "Tool access should be scoped by policy so delegated action cannot expand beyond authorized use.",
      auditQuestion: "Which policy or hard boundary constrains the agent tool access?",
      recommendedRemediation: "Add policy constraints and hard boundaries for tool access, targets, data sensitivity, and environment.",
      taxonomyId: "TG-006"
    };
    const linkId = firstLinkId(links, "tool_access");
    if (linkId !== undefined) {
      issue.linkId = linkId;
    }
    issues.push(issue);
  }

  if (hasProposedAction && !hasLink(links, "agent_role")) {
    const issue: AgencyChainIssue = {
      id: "AC-004",
      title: "Proposed Action Without Agent Role",
      severity: "medium",
      confidence: "high",
      linkType: "proposed_action",
      observation: "A proposed action is present, but the chain does not demonstrate a defined agent role.",
      whyItMatters: "A proposed action should be traceable to a role with defined scope and limits.",
      auditQuestion: "What agent role is authorized to propose this action?",
      recommendedRemediation: "Define the agent role, allowed action classes, and authority boundaries before evaluating proposed actions.",
      taxonomyId: "TG-006"
    };
    const linkId = firstLinkId(links, "proposed_action");
    if (linkId !== undefined) {
      issue.linkId = linkId;
    }
    issues.push(issue);
  }

  if (hasLink(links, "approval_authority") && !hasLink(links, "human_participation")) {
    issues.push({
      id: "AC-005",
      title: "Approval Without Participation Quality",
      severity: "medium",
      confidence: "medium",
      linkType: "human_participation",
      observation: "Approval authority is present, but meaningful human participation is not demonstrated.",
      whyItMatters: "Approval is stronger when the reviewer receives context and can actively affect the action.",
      auditQuestion: "What evidence shows the approver reviewed context and could affect the outcome?",
      recommendedRemediation: "Add human participation evidence including context, rationale, authority validation, and refusal ability.",
      taxonomyId: "TG-002"
    });
  }

  if (hasLink(links, "approval_authority") && !hasLink(links, "runtime_permit")) {
    issues.push({
      id: "AC-006",
      title: "Approval Without Runtime Binding",
      severity: "high",
      confidence: "high",
      linkType: "runtime_permit",
      observation:
        "The agency chain includes approval authority, but does not demonstrate a runtime permit binding the approved action to action, tool, target, authority, and time window.",
      whyItMatters: "Approval can drift if the exact runtime action is not bound before execution.",
      auditQuestion: "What runtime permit proves the approved action is the exact action that can execute?",
      recommendedRemediation: "Add scoped, expiring runtime permits bound to action, tool, target, authority, and time window.",
      taxonomyId: "TG-003"
    });
  }

  if (!hasLink(links, "approval_authority") && hasExecutionBoundary && !hasLink(links, "runtime_permit")) {
    issues.push({
      id: "AC-006",
      title: "Execution Boundary Without Runtime Binding",
      severity: "high",
      confidence: "high",
      linkType: "runtime_permit",
      observation:
        "The agency chain includes an execution boundary, but does not demonstrate a runtime permit binding the action to action, tool, target, authority, and time window.",
      whyItMatters: "External or consequential execution can drift if the exact runtime action is not bound before execution.",
      auditQuestion: "What runtime permit proves the action is authorized for this exact execution boundary?",
      recommendedRemediation: "Add scoped, expiring runtime permits bound to action, tool, target, authority, and time window.",
      taxonomyId: "TG-003"
    });
  }

  if (hasExecutionBoundary && !hasLink(links, "receipt")) {
    issues.push({
      id: "AC-007",
      title: "Execution Without Receipt",
      severity: "high",
      confidence: "high",
      linkType: "receipt",
      observation: "An execution boundary is present, but the chain does not demonstrate receipt proof.",
      whyItMatters: "Proof should remain after consequential execution or execution denial.",
      auditQuestion: "What receipt proves proposal, approval, permit, execution boundary, and outcome?",
      recommendedRemediation: "Add receipts that preserve proposal, approval, decision, permit, execution boundary, and outcome.",
      taxonomyId: "TG-005"
    });
  }

  if (hasLink(links, "runtime_permit") && !hasLink(links, "receipt")) {
    issues.push({
      id: "AC-008",
      title: "Runtime Permit Without Receipt",
      severity: "medium",
      confidence: "high",
      linkType: "receipt",
      observation: "A runtime permit is present, but receipt proof is not demonstrated.",
      whyItMatters: "Runtime authorization should leave durable evidence that can be reviewed later.",
      auditQuestion: "Where is the receipt that records the runtime permit and final outcome?",
      recommendedRemediation: "Store runtime permits and validation outcomes in governance receipts.",
      taxonomyId: "TG-005"
    });
  }

  if ((isConsequential(links, "proposed_action") || isConsequential(links, "execution_boundary")) && !hasLink(links, "hard_boundary")) {
    issues.push({
      id: "AC-009",
      title: "Hard Boundary Missing For Consequential Action",
      severity: "high",
      confidence: "medium",
      linkType: "hard_boundary",
      observation: "A consequential action is present, but no hard boundary link is demonstrated.",
      whyItMatters: "Consequential actions need explicit non-negotiable boundaries before discretionary approval.",
      auditQuestion: "Which hard boundary constrains this consequential action class?",
      recommendedRemediation: "Define hard boundaries that cannot be approved around for consequential action classes.",
      taxonomyId: "TG-004"
    });
  }

  if (ongoingWorkflow && !hasLink(links, "governance_memory")) {
    issues.push({
      id: "AC-010",
      title: "Governance Memory Not Demonstrated",
      severity: "medium",
      confidence: "medium",
      linkType: "governance_memory",
      observation: "The workflow appears recurring or ongoing, but governance memory is not demonstrated.",
      whyItMatters: "Recurring workflows should preserve patterns for human-reviewed governance improvement.",
      auditQuestion: "How are repeated decisions reviewed for governance memory and human-approved improvement?",
      recommendedRemediation: "Add human-reviewed governance memory for recurring workflows and prevent automatic policy mutation.",
      taxonomyId: "TG-010"
    });
  }

  const participationLinks = links.filter((link) => link.type === "human_participation" && link.status !== "not_applicable");
  for (const link of participationLinks) {
    if (indicatesNoOutcomeChange(link)) {
      const issue: AgencyChainIssue = {
        id: "AC-011",
        title: "Human Review Cannot Change Outcome",
        severity: "high",
        confidence: "medium",
        linkType: "human_participation",
        linkId: link.id,
        observation: "Human participation is present, but available notes indicate no refusal, revision, halt, or escalation path.",
        whyItMatters: "Human review preserves agency only when the reviewer can affect the action boundary.",
        auditQuestion: "Can the human reviewer refuse, revise, halt, or escalate the action before execution?",
        recommendedRemediation: "Require live human authority at the action boundary, including power to refuse, revise, halt, or escalate.",
        taxonomyId: "TG-011"
      };
      if (link.evidenceRefs !== undefined) {
        issue.evidenceRefs = link.evidenceRefs;
      }
      issues.push(issue);
    }
  }

  if (hasInsufficientEvidence(links)) {
    issues.push({
      id: "AC-012",
      title: "Chain Evidence Insufficient",
      severity: "medium",
      confidence: "medium",
      linkType: "receipt",
      observation: "Multiple agency-chain links are missing evidence or require verification.",
      whyItMatters: "Auditors need enough evidence to distinguish demonstrated controls from unsupported claims.",
      auditQuestion: "Which evidence artifacts demonstrate each agency-chain link?",
      recommendedRemediation: "Attach evidence references to key authority, policy, approval, runtime, execution, receipt, and memory links.",
      taxonomyId: "TG-012"
    });
  }

  return issues;
}

function calculateOverallStatus(links: AgencyChainLink[], issues: AgencyChainIssue[]): AgencyChainOverallStatus {
  const missingOrVerificationCount = links.filter(
    (link) => link.status === "missing" || link.status === "requires_verification"
  ).length;
  const hasExecutionBoundary = hasLink(links, "execution_boundary");
  const missingHumanAuthority = issues.some((issue) => issue.id === "AC-001");

  if (issues.some((issue) => issue.severity === "critical") || (missingHumanAuthority && hasExecutionBoundary)) {
    return "broken";
  }

  if (!hasExecutionBoundary && missingOrVerificationCount >= Math.max(3, Math.ceil(links.length / 2))) {
    return "insufficient_evidence";
  }

  if (issues.some((issue) => issue.severity === "high")) {
    return "weak";
  }

  if (
    issues.some((issue) => issue.severity === "medium") ||
    links.filter((link) => link.status === "requires_verification").length >= 2
  ) {
    return "partially_preserved";
  }

  return "preserved";
}

function hasLink(links: AgencyChainLink[], type: AgencyChainLinkType): boolean {
  return links.some((link) => link.type === type && link.status === "present");
}

function firstLinkId(links: AgencyChainLink[], type: AgencyChainLinkType): string | undefined {
  return links.find((link) => link.type === type)?.id;
}

function hasStopAuthority(links: AgencyChainLink[]): boolean {
  return links.some((link) => {
    if ((link.type !== "approval_authority" && link.type !== "human_authority") || link.status !== "present") {
      return false;
    }

    const searchable = [link.label, link.description, ...(link.notes ?? [])].join(" ").toLowerCase();
    return ["stop", "refuse", "revise", "halt", "escalate"].some((term) => searchable.includes(term));
  });
}

function isConsequential(links: AgencyChainLink[], type: AgencyChainLinkType): boolean {
  return links.some((link) => {
    if (link.type !== type || link.status === "not_applicable") {
      return false;
    }

    if (link.metadata?.consequential === true || link.metadata?.highSensitivity === true) {
      return true;
    }

    const searchable = [link.label, link.description, ...(link.notes ?? [])].join(" ").toLowerCase();
    return ["consequential", "high-sensitivity", "high sensitivity", "external", "customer-impacting"].some((term) =>
      searchable.includes(term)
    );
  });
}

function indicatesNoOutcomeChange(link: AgencyChainLink): boolean {
  if (
    link.metadata?.canRefuse === false ||
    link.metadata?.canRevise === false ||
    link.metadata?.canHalt === false ||
    link.metadata?.canEscalate === false ||
    link.metadata?.canChangeOutcome === false
  ) {
    return true;
  }

  const searchable = [link.label, link.description, ...(link.notes ?? [])].join(" ").toLowerCase();
  return [
    "cannot refuse",
    "cannot revise",
    "cannot halt",
    "cannot escalate",
    "cannot change outcome",
    "no refusal",
    "no revise",
    "no halt",
    "no escalation"
  ].some((term) => searchable.includes(term));
}

function hasInsufficientEvidence(links: AgencyChainLink[]): boolean {
  const evidenceNeededLinks = links.filter((link) => link.status !== "not_applicable");
  if (evidenceNeededLinks.length === 0) {
    return true;
  }

  const weakEvidenceCount = evidenceNeededLinks.filter(
    (link) =>
      link.status === "requires_verification" ||
      link.status === "missing" ||
      link.evidenceRefs === undefined ||
      link.evidenceRefs.length === 0
  ).length;

  return weakEvidenceCount >= Math.max(4, Math.ceil(evidenceNeededLinks.length / 2));
}

function createChainId(auditScope: string): string {
  const slug = auditScope
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 48)
    .replace(/^-|-$/g, "");

  return `agency-chain-${slug.length > 0 ? slug : "local-review"}`;
}

function requireString(
  value: Record<string, unknown>,
  key: string,
  path: string,
  errors: Array<{ path: string; message: string }>
): void {
  if (typeof value[key] !== "string" || (value[key] as string).trim().length === 0) {
    errors.push({ path, message: `${key} is required.` });
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
