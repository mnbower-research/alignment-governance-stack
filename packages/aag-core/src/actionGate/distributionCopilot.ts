import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { receiptVersion } from "./aagConfig";
import { attachApprovalAuthority } from "./approvalAuthority";
import { attachPolicyProvenance } from "./policyProvenance";
import { attachHashChainMetadata } from "./receiptHashChain";
import { sha256Stable } from "./stableHash";
import {
  appendWorkflowAction,
  createWorkflowActionId,
  defaultWorkflowDirectory,
  loadLatestWorkflowLedger,
  writeWorkflowLedgerUpdate,
} from "./workflowScopeLedger";

export type DistributionDecision =
  | "allow"
  | "revise_action"
  | "require_approval"
  | "block";

export type DistributionRiskLevel = "low" | "medium" | "high";

export type DistributionGoal =
  | "comment"
  | "repost"
  | "dm"
  | "original_post"
  | "save_for_later";

export type DistributionInput = {
  platform: string;
  goal: DistributionGoal;
  sourceText: string;
  draft?: string;
  includeRepoLink?: boolean;
  workflowId?: string;
};

export type DistributionReview = {
  decision: DistributionDecision;
  relevanceScore: number;
  platform: string;
  goal: string;
  summary: string;
  whyItMattersToAAG: string[];
  riskFlags: string[];
  whatNotToReveal: string[];
  safeComment?: string;
  safeRepost?: string;
  suggestedCTA?: string;
  reviewPacket: {
    proposedAction: string;
    riskLevel: DistributionRiskLevel;
    requiresHumanApproval: true;
    approvalReason: string;
  };
  sourceTextHash: string;
  draftHash?: string;
  workflowId?: string;
  createdAt: string;
};

export type DistributionLogPaths = {
  opportunities: string;
  reviewPackets: string;
  receipts: string;
  outcomes: string;
};

type DistributionRiskFlag =
  | "overclaim_risk"
  | "incident_claim_risk"
  | "spam_risk"
  | "roadmap_exposure_risk"
  | "legal_claim_risk"
  | "competitor_confusion_risk"
  | "aggressive_tagging_risk"
  | "irrelevant_to_aag"
  | "reveals_too_much"
  | "needs_human_review"
  | "ai_style_risk"
  | "em_dash_detected"
  | "platform_risk"
  | "specific_company_claim_risk"
  | "repo_link_risk";

const supportedGoals: DistributionGoal[] = [
  "comment",
  "repost",
  "dm",
  "original_post",
  "save_for_later",
];

const relevanceTerms = [
  "agentic ai",
  "ai agents",
  "autonomous agents",
  "governance",
  "grc",
  "compliance",
  "runtime controls",
  "execution",
  "workflow",
  "automation",
  "audit",
  "receipts",
  "logs",
  "traceability",
  "human oversight",
  "approval",
  "n8n",
  "langchain",
  "crewai",
  "zapier",
  "security",
  "permissions",
  "access control",
  "data exposure",
  "ai safety",
  "agent risk",
  "policy-as-code",
];

const subtractiveTerms = [
  "generic ai hype",
  "politics",
  "election",
  "personal drama",
  "meme",
  "dunk",
  "ratio",
  "hostile",
];

export function reviewDistributionInput(
  input: DistributionInput,
  options: { createdAt?: string } = {},
): DistributionReview {
  assertValidInput(input);

  const createdAt = options.createdAt ?? new Date().toISOString();
  const sourceTextHash = sha256Stable(input.sourceText);
  const draftHash = input.draft ? sha256Stable(input.draft) : undefined;
  const relevanceScore = scoreRelevance(input.sourceText, input.draft);
  const riskFlags = detectRiskFlags(input, relevanceScore);
  const decision = decideDistributionAction(input, relevanceScore, riskFlags);
  const whyItMattersToAAG = explainRelevance(input.sourceText, input.draft);
  const publicDrafts =
    decision === "block"
      ? {}
      : createSafeDrafts(input, riskFlags, decision);
  const reviewPacket = createDistributionReviewPacket(
    input,
    decision,
    riskFlags,
  );

  return {
    decision,
    relevanceScore,
    platform: input.platform,
    goal: input.goal,
    summary: summarizeOpportunity(input, relevanceScore),
    whyItMattersToAAG,
    riskFlags,
    whatNotToReveal: createWhatNotToReveal(riskFlags),
    ...publicDrafts,
    reviewPacket,
    sourceTextHash,
    ...(draftHash ? { draftHash } : {}),
    ...(input.workflowId ? { workflowId: input.workflowId } : {}),
    createdAt,
  };
}

export function writeDistributionLogs(
  review: DistributionReview,
  logDirectory = path.join(".aag", "distribution"),
  workflowDirectory = defaultWorkflowDirectory,
): DistributionLogPaths {
  mkdirSync(logDirectory, { recursive: true });

  const paths = {
    opportunities: path.join(logDirectory, "opportunities.jsonl"),
    reviewPackets: path.join(logDirectory, "review-packets.jsonl"),
    receipts: path.join(logDirectory, "receipts.jsonl"),
    outcomes: path.join(logDirectory, "outcomes.jsonl"),
  };

  ensureJsonlFile(paths.outcomes);
  const reviewWithPolicyProvenance = attachPolicyProvenance(review, {
    sourceType: "distribution",
    policyId: "distribution-copilot",
    policyName: "Distribution Copilot policy",
    policyVersion: receiptVersion,
    policySource: "Distribution Copilot policy",
    policyAppliedAt: review.createdAt,
    decisionBasis: [
      `decision:${review.decision}`,
      `relevanceScore:${review.relevanceScore}`,
      ...review.riskFlags.map((flag) => `riskFlag:${flag}`),
      ...review.whyItMattersToAAG,
      review.reviewPacket.approvalReason,
      `riskLevel:${review.reviewPacket.riskLevel}`,
    ],
    scopeBasis: [
      `platform:${review.platform}`,
      `goal:${review.goal}`,
      ...(review.workflowId ? [`workflowId:${review.workflowId}`] : []),
    ],
    snapshot: {
      riskFlags: review.riskFlags,
      reviewPacket: review.reviewPacket,
      whatNotToReveal: review.whatNotToReveal,
    },
  });
  const reviewWithApprovalAuthority = attachApprovalAuthority(
    reviewWithPolicyProvenance,
    {
      authorityId: "local-founder",
      authorityAppliedAt: review.createdAt,
      actionType: review.reviewPacket.proposedAction,
      target: review.platform.toLowerCase(),
      riskLevel: review.reviewPacket.riskLevel,
      scope: "distribution",
      irreversible: false,
      externalPosting: false,
      notes: [
        "Distribution Copilot records local review authority only; it does not post externally.",
      ],
    },
  );
  appendJsonl(
    paths.receipts,
    attachHashChainMetadata(reviewWithApprovalAuthority, {
      distributionReceiptsPath: paths.receipts,
      source:
        logDirectory === path.join(".aag", "distribution") ||
        path.resolve(logDirectory) === path.resolve(".aag", "distribution")
          ? "all"
          : "distribution",
    }),
  );
  appendJsonl(paths.opportunities, {
    createdAt: review.createdAt,
    platform: review.platform,
    goal: review.goal,
    relevanceScore: review.relevanceScore,
    decision: review.decision,
    summary: review.summary,
    sourceTextHash: review.sourceTextHash,
    ...(review.draftHash ? { draftHash: review.draftHash } : {}),
  });
  appendJsonl(paths.reviewPackets, {
    createdAt: review.createdAt,
    platform: review.platform,
    goal: review.goal,
    decision: review.decision,
    reviewPacket: review.reviewPacket,
    riskFlags: review.riskFlags,
    sourceTextHash: review.sourceTextHash,
    ...(review.draftHash ? { draftHash: review.draftHash } : {}),
  });

  if (review.workflowId) {
    attachDistributionReviewToWorkflow(review, workflowDirectory);
  }

  return paths;
}

export function formatDistributionReview(
  review: DistributionReview,
  receiptPath = path.join(".aag", "distribution", "receipts.jsonl"),
): string {
  const lines = [
    "AAG Distribution Copilot",
    "",
    `Platform: ${formatPlatform(review.platform)}`,
    `Goal: ${review.goal}`,
    `Relevance: ${review.relevanceScore}/10`,
    `Decision: ${review.decision}`,
    "",
    "Risk Flags:",
    ...formatList(review.riskFlags),
    "",
    "Why it matters to AAG:",
    ...formatList(review.whyItMattersToAAG),
  ];

  if (review.safeComment) {
    lines.push("", "Safe Comment:", review.safeComment);
  }

  if (review.safeRepost) {
    lines.push("", "Safe Repost:", review.safeRepost);
  }

  if (review.suggestedCTA) {
    lines.push("", "Suggested CTA:", review.suggestedCTA);
  }

  lines.push(
    "",
    "What Not To Reveal:",
    ...formatList(review.whatNotToReveal),
    "",
    "Review Packet:",
    `Proposed Action: ${review.reviewPacket.proposedAction}`,
    `Risk Level: ${review.reviewPacket.riskLevel}`,
    `Requires Human Approval: ${review.reviewPacket.requiresHumanApproval}`,
    `Approval Reason: ${review.reviewPacket.approvalReason}`,
    "",
    `Receipt written: ${formatDisplayPath(receiptPath)}`,
  );

  return lines.join("\n");
}

export function loadDistributionInput(inputPath: string): DistributionInput {
  const parsed = JSON.parse(readFileSync(inputPath, "utf8")) as unknown;
  return normalizeDistributionInput(parsed);
}

export function normalizeDistributionInput(value: unknown): DistributionInput {
  if (!value || typeof value !== "object") {
    throw new Error("Distribution input must be a JSON object.");
  }

  const record = value as Record<string, unknown>;
  const goal = record.goal;

  if (typeof goal !== "string" || !supportedGoals.includes(goal as DistributionGoal)) {
    throw new Error(
      `Unsupported goal. Supported goals: ${supportedGoals.join(", ")}.`,
    );
  }

  return {
    platform: stringField(record, "platform"),
    goal: goal as DistributionGoal,
    sourceText: stringField(record, "sourceText"),
    ...(typeof record.draft === "string" ? { draft: record.draft } : {}),
    ...(typeof record.includeRepoLink === "boolean"
      ? { includeRepoLink: record.includeRepoLink }
      : {}),
    ...(typeof record.workflowId === "string" && record.workflowId.trim()
      ? { workflowId: record.workflowId }
      : {}),
  };
}

function assertValidInput(input: DistributionInput): void {
  if (!input.platform.trim()) {
    throw new Error("platform is required.");
  }

  if (!supportedGoals.includes(input.goal)) {
    throw new Error(
      `Unsupported goal. Supported goals: ${supportedGoals.join(", ")}.`,
    );
  }

  if (!input.sourceText.trim()) {
    throw new Error("sourceText is required.");
  }
}

function stringField(record: Record<string, unknown>, field: string): string {
  const value = record[field];
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${field} must be a non-empty string.`);
  }

  return value;
}

function scoreRelevance(sourceText: string, draft = ""): number {
  const text = normalizeText(`${sourceText} ${draft}`);
  let score = 0;

  for (const term of relevanceTerms) {
    if (text.includes(term)) {
      score += term.includes(" ") ? 2 : 1;
    }
  }

  for (const term of subtractiveTerms) {
    if (text.includes(term)) {
      score -= 2;
    }
  }

  if (
    score > 0 &&
    !/(workflow|action|governance|approval|audit|agent|automation|control|security)/i.test(
      text,
    )
  ) {
    score -= 2;
  }

  return clamp(score, 1, 10);
}

function detectRiskFlags(
  input: DistributionInput,
  relevanceScore: number,
): DistributionRiskFlag[] {
  const sourceText = input.sourceText;
  const draft = input.draft ?? "";
  const combined = `${sourceText}\n${draft}`;
  const lower = normalizeText(combined);
  const flags: DistributionRiskFlag[] = [];

  if (relevanceScore <= 2) {
    flags.push("irrelevant_to_aag");
  }

  if (input.goal !== "save_for_later") {
    flags.push("platform_risk");
  }

  if (input.goal === "dm") {
    flags.push("needs_human_review", "platform_risk");
  }

  if (input.includeRepoLink || /github\.com|npmjs\.com|agent-action-gate/i.test(combined)) {
    flags.push("repo_link_risk", "needs_human_review");
  }

  if (draft.includes("—")) {
    flags.push("ai_style_risk", "em_dash_detected");
  }

  if (sourceText.includes("—")) {
    flags.push("ai_style_risk");
  }

  if (
    /(auto[- ]?(post|dm)|send this dm|dm everyone|mass dm|buy now|growth hack|go viral|follow me)/i.test(
      combined,
    )
  ) {
    flags.push("spam_risk");
  }

  if (
    /(guarantee[sd]?|guaranteed|100%|bank-grade|tamper-proof|unbreakable|official validation|would have prevented|could have prevented|prevented the incident|prevents all|ensures compliance|guarantees compliance)/i.test(
      combined,
    )
  ) {
    flags.push("overclaim_risk");
  }

  if (
    /(incident|breach|outage|leak|leaked|ransomware|exploit|postmortem|root cause|failure|crash)/i.test(
      combined,
    )
  ) {
    flags.push("incident_claim_risk", "needs_human_review");
  }

  if (
    /(gdpr|hipaa|sox|sec rule|the law|legal|regulator|regulatory|guarantees compliance|ensures compliance)/i.test(
      combined,
    )
  ) {
    flags.push("legal_claim_risk", "needs_human_review");
  }

  if (
    /(crowdstrike|openai|anthropic|microsoft|google|meta|salesforce|tesla|samsung|klarna|unitedhealth|okta)/i.test(
      combined,
    )
  ) {
    flags.push("specific_company_claim_risk", "needs_human_review");
  }

  if (/(metagate|auditability|incident prevention|security claim|runtime governance)/i.test(combined)) {
    flags.push("needs_human_review");
  }

  if (/(roadmap|private roadmap|secret|unannounced|internal plan|launch plan|metagate internals)/i.test(combined)) {
    flags.push("roadmap_exposure_risk", "reveals_too_much");
  }

  if (/(better than|unlike|beats|replace langchain|replace zapier|competitor|alternative to)/i.test(lower)) {
    flags.push("competitor_confusion_risk");
  }

  if (/(@[\w.-]+.*@[\w.-]+|tag everyone|tag the ceo|call them out|pile on|shame)/i.test(combined)) {
    flags.push("aggressive_tagging_risk");
  }

  if (/(game changer|revolutionary|crushes|10x|only platform|must-have|obviously|ship it now)/i.test(combined)) {
    flags.push("ai_style_risk");
  }

  return uniqueFlags(flags);
}

function decideDistributionAction(
  input: DistributionInput,
  relevanceScore: number,
  riskFlags: DistributionRiskFlag[],
): DistributionDecision {
  const combined = `${input.sourceText}\n${input.draft ?? ""}`;

  if (
    relevanceScore <= 2 ||
    riskFlags.includes("spam_risk") ||
    riskFlags.includes("aggressive_tagging_risk") ||
    hasBlockedOverclaim(combined) ||
    /(idiot|stupid|fraud|liar|scam artist|shame on)/i.test(combined) ||
    /(private roadmap|secret roadmap|unannounced roadmap|metagate internals)/i.test(
      combined,
    ) ||
    /(copy their exact wording|use their exact terminology|steal their tagline)/i.test(
      combined,
    )
  ) {
    return "block";
  }

  if (
    riskFlags.includes("incident_claim_risk") ||
    riskFlags.includes("legal_claim_risk") ||
    riskFlags.includes("specific_company_claim_risk") ||
    riskFlags.includes("repo_link_risk") ||
    input.goal === "dm" ||
    input.goal === "repost" ||
    input.goal === "original_post" ||
    /\b(aag|agent action gate|metagate)\b/i.test(input.draft ?? "")
  ) {
    return "require_approval";
  }

  if (
    riskFlags.includes("em_dash_detected") ||
    riskFlags.includes("ai_style_risk") ||
    riskFlags.includes("reveals_too_much") ||
    /(too vague|very excited|huge opportunity|massive|revolutionary)/i.test(
      input.draft ?? "",
    )
  ) {
    return "revise_action";
  }

  return "allow";
}

function hasBlockedOverclaim(text: string): boolean {
  return /(would have prevented|could have prevented|prevented the incident|guarantees compliance|guaranteed compliance|100% compliant|prevents all incidents|tamper-proof|unbreakable|bank-grade)/i.test(
    text,
  );
}

function explainRelevance(sourceText: string, draft = ""): string[] {
  const text = normalizeText(`${sourceText} ${draft}`);
  const reasons: string[] = [];

  if (/(agentic ai|ai agents|autonomous agents|agent risk)/i.test(text)) {
    reasons.push("Mentions agentic AI or agent risk");
  }

  if (/(governance|grc|compliance|policy-as-code)/i.test(text)) {
    reasons.push("Connects to governance or policy controls");
  }

  if (/(runtime controls|execution|workflow|automation|tools|act)/i.test(text)) {
    reasons.push("Discusses runtime controls or action workflows");
  }

  if (/(audit|receipts|logs|traceability)/i.test(text)) {
    reasons.push("Highlights receipts, logs, traceability, or audit evidence");
  }

  if (/(human oversight|approval|review)/i.test(text)) {
    reasons.push("Raises the need for human oversight before action");
  }

  if (/(security|permissions|access control|data exposure|ai safety)/i.test(text)) {
    reasons.push("Touches security, permissions, safety, or data exposure");
  }

  return reasons.length > 0 ? reasons : ["No strong connection to AAG was found"];
}

function summarizeOpportunity(
  input: DistributionInput,
  relevanceScore: number,
): string {
  const platform = formatPlatform(input.platform);
  const source = input.sourceText.trim().replace(/\s+/g, " ");
  const excerpt = source.length > 140 ? `${source.slice(0, 137)}...` : source;

  return `${platform} ${input.goal} opportunity scored ${relevanceScore}/10: ${excerpt}`;
}

function createSafeDrafts(
  input: DistributionInput,
  riskFlags: DistributionRiskFlag[],
  decision: DistributionDecision,
): Pick<DistributionReview, "safeComment" | "safeRepost" | "suggestedCTA"> {
  const isIncidentRisk = riskFlags.includes("incident_claim_risk");
  const isApprovalRisk = decision === "require_approval";
  const safeComment = isIncidentRisk
    ? "Useful reminder that agent governance has to be evaluated before action, not only after an incident. I would avoid mapping any one event to a single control, but the broader lesson is clear: agents need oversight at the point where they can influence real work."
    : "This is the shift I am seeing too. As AI systems move from chat to tools to agents, governance has to move closer to the point of action. Policies cannot only live in documents when systems can retrieve, recommend, automate, and act.";

  const safeRepost = isApprovalRisk
    ? "Agentic AI changes the risk surface. The issue is no longer only whether a model gives a bad answer, but whether it influences or triggers a real action that should have required oversight."
    : "This is why governed agentic workflows matter. The agent proposes, the gate evaluates, a human approves when needed, the receipt records, and audit verifies.";

  const suggestedCTA = input.includeRepoLink
    ? "Share the repo link only after confirming the context is relevant, specific, and safe for manual posting."
    : "Invite a focused conversation about pre-execution oversight for agentic workflows.";

  return {
    safeComment: removeEmDashes(safeComment),
    safeRepost: removeEmDashes(safeRepost),
    suggestedCTA: removeEmDashes(suggestedCTA),
  };
}

function createDistributionReviewPacket(
  input: DistributionInput,
  decision: DistributionDecision,
  riskFlags: DistributionRiskFlag[],
): DistributionReview["reviewPacket"] {
  return {
    proposedAction: proposedActionForGoal(input.goal),
    riskLevel: riskLevelForDecision(decision, riskFlags),
    requiresHumanApproval: true,
    approvalReason: approvalReasonForDecision(input, decision, riskFlags),
  };
}

function proposedActionForGoal(goal: DistributionGoal): string {
  switch (goal) {
    case "comment":
      return "comment_on_post";
    case "repost":
      return "repost_with_comment";
    case "dm":
      return "prepare_dm_for_manual_review";
    case "original_post":
      return "prepare_original_post";
    case "save_for_later":
      return "save_for_later";
  }
}

function workflowActionForGoal(goal: string): string {
  switch (goal) {
    case "comment":
      return "draft_comment";
    case "repost":
      return "draft_repost";
    case "dm":
      return "draft_dm";
    case "original_post":
      return "draft_original_post";
    case "save_for_later":
      return "save_opportunity";
    default:
      return "distribution_review";
  }
}

function riskLevelForDecision(
  decision: DistributionDecision,
  riskFlags: DistributionRiskFlag[],
): DistributionRiskLevel {
  if (
    decision === "block" &&
    riskFlags.includes("irrelevant_to_aag")
  ) {
    return "low";
  }

  if (
    decision === "block" ||
    riskFlags.includes("incident_claim_risk") ||
    riskFlags.includes("legal_claim_risk") ||
    riskFlags.includes("specific_company_claim_risk")
  ) {
    return "high";
  }

  if (decision === "require_approval" || decision === "revise_action") {
    return "medium";
  }

  return "low";
}

function approvalReasonForDecision(
  input: DistributionInput,
  decision: DistributionDecision,
  riskFlags: DistributionRiskFlag[],
): string {
  if (decision === "block") {
    return riskFlags.includes("irrelevant_to_aag")
      ? "Opportunity is not relevant enough for AAG distribution."
      : "Opportunity is unsafe for public action.";
  }

  if (riskFlags.includes("incident_claim_risk")) {
    return "Public incident framing requires careful human review.";
  }

  if (riskFlags.includes("repo_link_risk")) {
    return "Repo-link sharing requires manual review before posting.";
  }

  if (input.goal === "dm") {
    return "Direct outreach requires manual review before sending.";
  }

  if (decision === "require_approval") {
    return "Public product positioning requires manual review.";
  }

  if (decision === "revise_action") {
    return "Draft should be revised before manual posting.";
  }

  return "Ready for manual posting review. The tool will not publish automatically.";
}

function createWhatNotToReveal(riskFlags: DistributionRiskFlag[]): string[] {
  const items = [
    "MetaGate internals",
    "exact roadmap details",
    "claims that AAG prevented a specific incident",
    "private customer or deployment details",
  ];

  if (riskFlags.includes("legal_claim_risk")) {
    items.push("claims of guaranteed legal or compliance outcomes");
  }

  if (riskFlags.includes("specific_company_claim_risk")) {
    items.push("claims about what caused a named company incident");
  }

  if (riskFlags.includes("competitor_confusion_risk")) {
    items.push("competitor attacks or confusing comparisons");
  }

  return items;
}

function appendJsonl(filePath: string, value: unknown): void {
  appendFileSync(filePath, `${JSON.stringify(value)}\n`, "utf8");
}

function attachDistributionReviewToWorkflow(
  review: DistributionReview,
  workflowDirectory: string,
): void {
  if (!review.workflowId) {
    return;
  }

  const actionType = workflowActionForGoal(review.goal);
  const ledger = loadLatestWorkflowLedger(review.workflowId, workflowDirectory);
  const nextLedger = appendWorkflowAction({
    ledger,
    action: {
      actionId: createWorkflowActionId({
        workflowId: review.workflowId,
        actionType,
        target: review.platform,
        summary: review.summary,
      }),
      workflowId: review.workflowId,
      actionType,
      target: `${review.platform}:${review.goal}`,
      decision: review.decision,
      receiptId: review.sourceTextHash,
      riskFlags: review.riskFlags,
      summary: review.summary,
    },
  });
  const action = nextLedger.actions[nextLedger.actions.length - 1];

  if (action) {
    writeWorkflowLedgerUpdate(nextLedger, action, workflowDirectory);
  }
}

function ensureJsonlFile(filePath: string): void {
  if (!existsSync(filePath)) {
    writeFileSync(filePath, "", "utf8");
  }
}

function removeEmDashes(value: string): string {
  return value.replace(/—/g, ".");
}

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function formatList(items: string[]): string[] {
  if (items.length === 0) {
    return ["- none"];
  }

  return items.map((item) => `- ${item}`);
}

function formatPlatform(platform: string): string {
  if (platform.toLowerCase() === "linkedin") {
    return "LinkedIn";
  }

  return platform
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function formatDisplayPath(filePath: string): string {
  return filePath.replace(/\\/g, "/");
}

function uniqueFlags(flags: DistributionRiskFlag[]): DistributionRiskFlag[] {
  return Array.from(new Set(flags));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
