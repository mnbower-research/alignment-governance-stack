import type { TheaterSignalTaxonomyEntry } from "./types.js";

export const THEATER_SIGNAL_TAXONOMY: readonly TheaterSignalTaxonomyEntry[] = [
  {
    id: "TG-001",
    title: "Missing Stop Authority",
    category: "authority",
    defaultSeverity: "high",
    description: "Available evidence does not demonstrate who can stop, pause, or reject an agentic action before execution.",
    whyItMatters: "Agentic governance needs an identified authority able to halt action when risk, scope, or evidence is unclear.",
    defaultRemediation:
      "Define named human stop authority for the agent workflow; bind stop authority to action class, tool scope, and escalation conditions.",
    defaultAuditQuestions: [
      "Who has explicit authority to stop this workflow before execution?",
      "Is stop authority documented separately from general approval authority?"
    ],
    recommendedRemediations: [
      "Define named human stop authority for the agent workflow; bind stop authority to action class, tool scope, and escalation conditions.",
      "Define stop authority by workflow, risk tier, and environment.",
      "Record stop decisions in receipts or equivalent audit evidence."
    ],
    mapsToControl: "Authority Map"
  },
  {
    id: "TG-002",
    title: "Rubber-Stamp Approval Risk",
    category: "approval_quality",
    defaultSeverity: "medium",
    description: "Approval evidence may show signoff without demonstrating meaningful review context, reasoning, or engagement.",
    whyItMatters: "Human review is stronger when reviewers receive risk context and provide a traceable basis for the decision.",
    defaultRemediation:
      "Add human participation quality criteria such as context, review time, explicit rationale, authority validation, and refusal ability.",
    defaultAuditQuestions: [
      "What evidence shows the reviewer saw objections, alternatives, and risk context?",
      "Does approval evidence include a reason or review artifact?"
    ],
    recommendedRemediations: [
      "Add human participation quality criteria such as context, review time, explicit rationale, authority validation, and refusal ability.",
      "Require reviewer context for high-risk actions.",
      "Capture decision reasons, review time, and requested changes for sensitive workflows."
    ],
    mapsToControl: "Human Participation"
  },
  {
    id: "TG-003",
    title: "Runtime Binding Not Demonstrated",
    category: "runtime_binding",
    defaultSeverity: "high",
    description: "Available evidence does not demonstrate that the executed action was bound to the exact permitted action.",
    whyItMatters: "A proposal can be reviewed correctly while execution later changes tool, target, scope, or environment.",
    defaultRemediation:
      "Add scoped, expiring execution permits bound to action, tool, target, authority, and time window.",
    defaultAuditQuestions: [
      "Is there a runtime permit that binds tool, target, action type, and environment?",
      "What evidence shows the runtime action matched the permit at execution time?"
    ],
    recommendedRemediations: [
      "Add scoped, expiring execution permits bound to action, tool, target, authority, and time window.",
      "Add deterministic runtime permit validation before execution.",
      "Store runtime binding results with receipts."
    ],
    mapsToControl: "Runtime Binding"
  },
  {
    id: "TG-004",
    title: "Hard Boundary Override Risk",
    category: "policy_boundary",
    defaultSeverity: "critical",
    description: "Available evidence suggests a hard policy boundary may be treated as overrideable by approval or role status.",
    whyItMatters: "Hard boundaries are intended to stop defined action classes rather than defer them to discretionary approval.",
    defaultRemediation:
      "Define hard boundaries that cannot be approved around; convert violations into review packets or blocks.",
    defaultAuditQuestions: [
      "Which policies are hard boundaries rather than approval-required rules?",
      "Can any role override a hard boundary, and where is that exception documented?"
    ],
    recommendedRemediations: [
      "Define hard boundaries that cannot be approved around; convert violations into review packets or blocks.",
      "Separate hard boundaries from approval-required rules in policy profiles.",
      "Add tests proving hard boundaries stop before approval routing."
    ],
    mapsToControl: "AAG"
  },
  {
    id: "TG-005",
    title: "Receipt Integrity Gap",
    category: "receipt_integrity",
    defaultSeverity: "high",
    description: "Available evidence does not demonstrate durable proof of proposal, decision, permit, execution match, and final outcome.",
    whyItMatters: "Governance claims are difficult to verify after the fact without complete and tamper-evident decision evidence.",
    defaultRemediation:
      "Add tamper-evident or signed receipts that preserve proposal, approval, decision, permit, execution, and outcome.",
    defaultAuditQuestions: [
      "Which receipt fields prove the proposal, decision, permit, and runtime match?",
      "Can receipt integrity be independently verified?"
    ],
    recommendedRemediations: [
      "Add tamper-evident or signed receipts that preserve proposal, approval, decision, permit, execution, and outcome.",
      "Record complete governance receipts for gated actions.",
      "Add hash verification or equivalent integrity checks for stored receipts."
    ],
    mapsToControl: "Receipts"
  },
  {
    id: "TG-006",
    title: "Policy / Authority Conflict",
    category: "authority",
    defaultSeverity: "high",
    description: "Policy requirements and authority evidence appear incomplete or inconsistent from the available inputs.",
    whyItMatters: "A governance gate needs consistent policy rules and scoped authority to determine whether approval is meaningful.",
    defaultRemediation:
      "Resolve conflicting policy and authority records before allowing delegated execution.",
    defaultAuditQuestions: [
      "Do policy approval requirements map to named roles or groups?",
      "Are role scopes aligned with tools, environments, data classes, and targets?"
    ],
    recommendedRemediations: [
      "Resolve conflicting policy and authority records before allowing delegated execution.",
      "Map each policy approval requirement to authority-map roles.",
      "Test high-risk workflows for missing or out-of-scope authority."
    ],
    mapsToControl: "Authority Map"
  },
  {
    id: "TG-007",
    title: "Proposal Laundering Risk",
    category: "proposal_integrity",
    defaultSeverity: "medium",
    description: "A proposal may be reframed in lower-risk language without demonstrating that the underlying action changed.",
    whyItMatters: "Governance review depends on the real action being visible, not only the lowest-risk description of it.",
    defaultRemediation:
      "Add PGDL objection checks that compare original intent to revised proposal and detect safer language preserving the higher-risk action.",
    defaultAuditQuestions: [
      "Does the proposal wording match the actual tool, target, and data movement?",
      "What objections or revisions show that risk-reducing language changed the action rather than only the label?"
    ],
    recommendedRemediations: [
      "Add PGDL objection checks that compare original intent to revised proposal and detect safer language preserving the higher-risk action.",
      "Compare original and resolved proposals before AAG review.",
      "Flag wording changes that reduce apparent risk without changing execution details."
    ],
    mapsToControl: "PGDL"
  },
  {
    id: "TG-008",
    title: "Target Creep Risk",
    category: "target_scope",
    defaultSeverity: "medium",
    description: "Available evidence suggests the target or scope may expand after review without a new governance decision.",
    whyItMatters: "A narrowly approved action can become materially different when targets, recipients, records, or environments expand.",
    defaultRemediation:
      "Bind target scope in the proposal, approval, runtime permit, and receipt.",
    defaultAuditQuestions: [
      "Are targets bound at permit time and checked at runtime?",
      "What prevents recipient, dataset, environment, or record-set expansion after approval?"
    ],
    recommendedRemediations: [
      "Bind target scope in the proposal, approval, runtime permit, and receipt.",
      "Bind targets and scopes in runtime permits.",
      "Require a new review when target scope expands."
    ],
    mapsToControl: "Runtime Binding"
  },
  {
    id: "TG-009",
    title: "Reversibility Misclassification",
    category: "reversibility",
    defaultSeverity: "medium",
    description: "The action may be classified as reversible without evidence showing practical rollback or containment.",
    whyItMatters: "Reversibility affects risk posture, approval routing, and whether additional controls are needed before execution.",
    defaultRemediation:
      "Require explicit reversibility evidence and classify irreversible or externally visible actions conservatively.",
    defaultAuditQuestions: [
      "What evidence supports the reversibility classification?",
      "Is rollback available for external-facing, destructive, or high-sensitivity actions?"
    ],
    recommendedRemediations: [
      "Require explicit reversibility evidence and classify irreversible or externally visible actions conservatively.",
      "Require documented rollback evidence for reversible classifications.",
      "Treat uncertain reversibility as requiring additional review."
    ],
    mapsToControl: "AAG"
  },
  {
    id: "TG-010",
    title: "Governance Memory Drift",
    category: "governance_memory",
    defaultSeverity: "medium",
    description: "Historical governance evidence may show repeated patterns that have not been translated into reviewed policy or control updates.",
    whyItMatters: "Receipt history is most useful when repeated findings become human-reviewed governance improvements.",
    defaultRemediation:
      "Keep memory recommendations human-reviewed only; prevent automatic policy mutation.",
    defaultAuditQuestions: [
      "Are repeated receipt patterns reviewed for policy, authority, or participation updates?",
      "Who approves changes suggested by governance memory?"
    ],
    recommendedRemediations: [
      "Keep memory recommendations human-reviewed only; prevent automatic policy mutation.",
      "Create a recurring review process for governance memory recommendations.",
      "Track which recommendations were accepted, rejected, or deferred."
    ],
    mapsToControl: "Governance Memory"
  },
  {
    id: "TG-011",
    title: "Human-in-the-Loop Theater",
    category: "human_participation",
    defaultSeverity: "medium",
    description: "Human participation is claimed, but available evidence does not demonstrate decision context, active review, or authority fit.",
    whyItMatters: "Human involvement alone does not demonstrate meaningful governance unless the person can understand and affect the decision.",
    defaultRemediation:
      "Require live human authority at the action boundary, including power to refuse, revise, halt, or escalate.",
    defaultAuditQuestions: [
      "What context was provided to the human reviewer?",
      "Could the reviewer reject, revise, or escalate the action?"
    ],
    recommendedRemediations: [
      "Require live human authority at the action boundary, including power to refuse, revise, halt, or escalate.",
      "Define required review context for high-risk actions.",
      "Preserve reviewer decisions, reasons, and escalation options in audit evidence."
    ],
    mapsToControl: "Human Participation"
  },
  {
    id: "TG-012",
    title: "Dashboard Without Enforcement",
    category: "dashboard_enforcement",
    defaultSeverity: "high",
    description: "Monitoring or dashboard evidence is present, but available evidence does not demonstrate enforcement before action execution.",
    whyItMatters: "Observability can support governance, but it does not by itself stop unauthorized or out-of-scope execution.",
    defaultRemediation:
      "Connect dashboard claims to pre-execution controls, runtime enforcement, and evidence-producing receipts.",
    defaultAuditQuestions: [
      "Which controls enforce decisions before execution rather than only displaying them?",
      "Can a dashboard alert block, pause, or route an action before it runs?"
    ],
    recommendedRemediations: [
      "Connect dashboard claims to pre-execution controls, runtime enforcement, and evidence-producing receipts.",
      "Map dashboard signals to enforcement controls and runtime gates.",
      "Add tests proving high-risk actions are stopped before execution when required."
    ],
    mapsToControl: "AAG"
  }
];

export function getTheaterSignalById(id: string): TheaterSignalTaxonomyEntry | undefined {
  return THEATER_SIGNAL_TAXONOMY.find((entry) => entry.id === id);
}

export function isValidTheaterSignalId(id: string): boolean {
  return getTheaterSignalById(id) !== undefined;
}
