import type { TheaterSignalTaxonomyEntry } from "./types.js";

export const THEATER_SIGNAL_TAXONOMY: readonly TheaterSignalTaxonomyEntry[] = [
  {
    id: "TG-001",
    title: "Missing Stop Authority",
    category: "authority",
    defaultSeverity: "high",
    description: "Available evidence does not demonstrate who can stop, pause, or reject an agentic action before execution.",
    whyItMatters: "Agentic governance needs an identified authority able to halt action when risk, scope, or evidence is unclear.",
    defaultAuditQuestions: [
      "Who has explicit authority to stop this workflow before execution?",
      "Is stop authority documented separately from general approval authority?"
    ],
    recommendedRemediations: [
      "Define stop authority by workflow, risk tier, and environment.",
      "Record stop decisions in receipts or equivalent audit evidence."
    ]
  },
  {
    id: "TG-002",
    title: "Rubber-Stamp Approval Risk",
    category: "approval_quality",
    defaultSeverity: "medium",
    description: "Approval evidence may show signoff without demonstrating meaningful review context, reasoning, or engagement.",
    whyItMatters: "Human review is stronger when reviewers receive risk context and provide a traceable basis for the decision.",
    defaultAuditQuestions: [
      "What evidence shows the reviewer saw objections, alternatives, and risk context?",
      "Does approval evidence include a reason or review artifact?"
    ],
    recommendedRemediations: [
      "Require reviewer context for high-risk actions.",
      "Capture decision reasons, review time, and requested changes for sensitive workflows."
    ]
  },
  {
    id: "TG-003",
    title: "Runtime Binding Not Demonstrated",
    category: "runtime_binding",
    defaultSeverity: "high",
    description: "Available evidence does not demonstrate that the executed action was bound to the exact permitted action.",
    whyItMatters: "A proposal can be reviewed correctly while execution later changes tool, target, scope, or environment.",
    defaultAuditQuestions: [
      "Is there a runtime permit that binds tool, target, action type, and environment?",
      "What evidence shows the runtime action matched the permit at execution time?"
    ],
    recommendedRemediations: [
      "Add deterministic runtime permit validation before execution.",
      "Store runtime binding results with receipts."
    ]
  },
  {
    id: "TG-004",
    title: "Hard Boundary Override Risk",
    category: "policy_boundary",
    defaultSeverity: "critical",
    description: "Available evidence suggests a hard policy boundary may be treated as overrideable by approval or role status.",
    whyItMatters: "Hard boundaries are intended to stop defined action classes rather than defer them to discretionary approval.",
    defaultAuditQuestions: [
      "Which policies are hard boundaries rather than approval-required rules?",
      "Can any role override a hard boundary, and where is that exception documented?"
    ],
    recommendedRemediations: [
      "Separate hard boundaries from approval-required rules in policy profiles.",
      "Add tests proving hard boundaries stop before approval routing."
    ]
  },
  {
    id: "TG-005",
    title: "Receipt Integrity Gap",
    category: "receipt_integrity",
    defaultSeverity: "high",
    description: "Available evidence does not demonstrate durable proof of proposal, decision, permit, execution match, and final outcome.",
    whyItMatters: "Governance claims are difficult to verify after the fact without complete and tamper-evident decision evidence.",
    defaultAuditQuestions: [
      "Which receipt fields prove the proposal, decision, permit, and runtime match?",
      "Can receipt integrity be independently verified?"
    ],
    recommendedRemediations: [
      "Record complete governance receipts for gated actions.",
      "Add hash verification or equivalent integrity checks for stored receipts."
    ]
  },
  {
    id: "TG-006",
    title: "Policy / Authority Conflict",
    category: "authority",
    defaultSeverity: "high",
    description: "Policy requirements and authority evidence appear incomplete or inconsistent from the available inputs.",
    whyItMatters: "A governance gate needs consistent policy rules and scoped authority to determine whether approval is meaningful.",
    defaultAuditQuestions: [
      "Do policy approval requirements map to named roles or groups?",
      "Are role scopes aligned with tools, environments, data classes, and targets?"
    ],
    recommendedRemediations: [
      "Map each policy approval requirement to authority-map roles.",
      "Test high-risk workflows for missing or out-of-scope authority."
    ]
  },
  {
    id: "TG-007",
    title: "Proposal Laundering Risk",
    category: "proposal_integrity",
    defaultSeverity: "medium",
    description: "A proposal may be reframed in lower-risk language without demonstrating that the underlying action changed.",
    whyItMatters: "Governance review depends on the real action being visible, not only the lowest-risk description of it.",
    defaultAuditQuestions: [
      "Does the proposal wording match the actual tool, target, and data movement?",
      "What objections or revisions show that risk-reducing language changed the action rather than only the label?"
    ],
    recommendedRemediations: [
      "Compare original and resolved proposals before AAG review.",
      "Flag wording changes that reduce apparent risk without changing execution details."
    ]
  },
  {
    id: "TG-008",
    title: "Target Creep Risk",
    category: "target_scope",
    defaultSeverity: "medium",
    description: "Available evidence suggests the target or scope may expand after review without a new governance decision.",
    whyItMatters: "A narrowly approved action can become materially different when targets, recipients, records, or environments expand.",
    defaultAuditQuestions: [
      "Are targets bound at permit time and checked at runtime?",
      "What prevents recipient, dataset, environment, or record-set expansion after approval?"
    ],
    recommendedRemediations: [
      "Bind targets and scopes in runtime permits.",
      "Require a new review when target scope expands."
    ]
  },
  {
    id: "TG-009",
    title: "Reversibility Misclassification",
    category: "reversibility",
    defaultSeverity: "medium",
    description: "The action may be classified as reversible without evidence showing practical rollback or containment.",
    whyItMatters: "Reversibility affects risk posture, approval routing, and whether additional controls are needed before execution.",
    defaultAuditQuestions: [
      "What evidence supports the reversibility classification?",
      "Is rollback available for external-facing, destructive, or high-sensitivity actions?"
    ],
    recommendedRemediations: [
      "Require documented rollback evidence for reversible classifications.",
      "Treat uncertain reversibility as requiring additional review."
    ]
  },
  {
    id: "TG-010",
    title: "Governance Memory Drift",
    category: "governance_memory",
    defaultSeverity: "medium",
    description: "Historical governance evidence may show repeated patterns that have not been translated into reviewed policy or control updates.",
    whyItMatters: "Receipt history is most useful when repeated findings become human-reviewed governance improvements.",
    defaultAuditQuestions: [
      "Are repeated receipt patterns reviewed for policy, authority, or participation updates?",
      "Who approves changes suggested by governance memory?"
    ],
    recommendedRemediations: [
      "Create a recurring review process for governance memory recommendations.",
      "Track which recommendations were accepted, rejected, or deferred."
    ]
  },
  {
    id: "TG-011",
    title: "Human-in-the-Loop Theater",
    category: "human_participation",
    defaultSeverity: "medium",
    description: "Human participation is claimed, but available evidence does not demonstrate decision context, active review, or authority fit.",
    whyItMatters: "Human involvement alone does not demonstrate meaningful governance unless the person can understand and affect the decision.",
    defaultAuditQuestions: [
      "What context was provided to the human reviewer?",
      "Could the reviewer reject, revise, or escalate the action?"
    ],
    recommendedRemediations: [
      "Define required review context for high-risk actions.",
      "Preserve reviewer decisions, reasons, and escalation options in audit evidence."
    ]
  },
  {
    id: "TG-012",
    title: "Dashboard Without Enforcement",
    category: "dashboard_enforcement",
    defaultSeverity: "high",
    description: "Monitoring or dashboard evidence is present, but available evidence does not demonstrate enforcement before action execution.",
    whyItMatters: "Observability can support governance, but it does not by itself stop unauthorized or out-of-scope execution.",
    defaultAuditQuestions: [
      "Which controls enforce decisions before execution rather than only displaying them?",
      "Can a dashboard alert block, pause, or route an action before it runs?"
    ],
    recommendedRemediations: [
      "Map dashboard signals to enforcement controls and runtime gates.",
      "Add tests proving high-risk actions are stopped before execution when required."
    ]
  }
];

export function getTheaterSignalById(id: string): TheaterSignalTaxonomyEntry | undefined {
  return THEATER_SIGNAL_TAXONOMY.find((entry) => entry.id === id);
}

export function isValidTheaterSignalId(id: string): boolean {
  return getTheaterSignalById(id) !== undefined;
}
