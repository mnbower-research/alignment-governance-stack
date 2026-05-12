import type { GateDefinition } from "./gateTypes";

export const defaultGateDefinitions: GateDefinition[] = [
  {
    gateId: "email_gate",
    name: "Email Gate",
    category: "communication",
    description:
      "Routes external email and message actions through communication-specific review.",
    actionTypes: [
      "send_email",
      "reply_email",
      "forward_email",
      "external_message",
    ],
    tools: ["gmail", "email", "outlook"],
    riskNotes: [
      "External messages can create reputational, privacy, legal, or business commitment risk.",
    ],
    sixGateQuestionFocus: [
      "Is this action authorized?",
      "Is it within scope?",
      "Does it require human judgment?",
      "What proof remains?",
    ],
  },
  {
    gateId: "data_export_gate",
    name: "Data Export Gate",
    category: "data",
    description:
      "Routes data movement, export, database dump, and upload actions through data-specific review.",
    actionTypes: [
      "export_data",
      "download_data",
      "dump_database",
      "transfer_data",
      "upload_file",
    ],
    tools: ["database", "postgres", "mysql", "s3", "filesystem", "file_export"],
    riskNotes: [
      "Data movement can expose private, sensitive, or unauthorized records outside the intended scope.",
    ],
    sixGateQuestionFocus: [
      "Is it within scope?",
      "Who is accountable?",
      "Does it require human judgment?",
      "What proof remains?",
    ],
  },
  {
    gateId: "deployment_gate",
    name: "Deployment Gate",
    category: "deployment",
    description:
      "Routes deployment, release, merge, and CI/CD modification actions through deployment-specific review.",
    actionTypes: ["deploy", "production_deploy", "release", "merge", "modify_ci"],
    tools: ["github", "git", "ci", "cd", "terminal"],
    riskNotes: [
      "Deployment actions can affect production systems, users, availability, and supply-chain integrity.",
    ],
    sixGateQuestionFocus: [
      "Is this action authorized?",
      "Is it reversible?",
      "Who is accountable?",
      "What proof remains?",
    ],
  },
  {
    gateId: "cyber_gate",
    name: "Cyber Gate",
    category: "cyber",
    description:
      "Routes terminal, shell, secret access, permission, and infrastructure-risk actions through cyber-specific review.",
    actionTypes: [
      "run_command",
      "scan_network",
      "access_secret",
      "modify_permissions",
      "delete_infrastructure",
    ],
    tools: ["terminal", "shell", "powershell", "bash"],
    riskNotes: [
      "Cyber-capable commands can access credentials, scan systems, change permissions, or destroy infrastructure.",
    ],
    sixGateQuestionFocus: [
      "Is this action authorized?",
      "Is it within scope?",
      "Is it reversible?",
      "What proof remains?",
    ],
  },
  {
    gateId: "marketing_gate",
    name: "Marketing Gate",
    category: "marketing",
    description:
      "Routes public posting, social media, campaign, and outreach actions through marketing-specific review.",
    actionTypes: [
      "publish_post",
      "post_social",
      "draft_campaign",
      "external_outreach",
    ],
    tools: ["linkedin", "x", "twitter", "social_media", "buffer", "marketing"],
    riskNotes: [
      "Public-facing messages can affect reputation, positioning, and claim accuracy.",
    ],
    sixGateQuestionFocus: [
      "Is this action authorized?",
      "Does it require human judgment?",
      "Who is accountable?",
      "What proof remains?",
    ],
  },
  {
    gateId: "finance_gate",
    name: "Finance Gate",
    category: "finance",
    description:
      "Routes refund, invoice, price, payment, and money-transfer actions through finance-specific review.",
    actionTypes: [
      "issue_refund",
      "send_invoice",
      "change_price",
      "transfer_money",
      "approve_payment",
    ],
    tools: ["stripe", "paypal", "accounting", "bank", "finance"],
    riskNotes: [
      "Finance actions can move money, change obligations, or create financial commitments.",
    ],
    sixGateQuestionFocus: [
      "Is this action authorized?",
      "Is it reversible?",
      "Who is accountable?",
      "What proof remains?",
    ],
  },
  {
    gateId: "legal_gate",
    name: "Legal Gate",
    category: "legal",
    description:
      "Routes contract, legal claim, terms, and compliance-claim actions through legal-specific review.",
    actionTypes: [
      "approve_contract",
      "send_contract",
      "make_legal_claim",
      "accept_terms",
      "publish_compliance_claim",
    ],
    tools: ["contract", "legal", "docusign", "public_site"],
    riskNotes: [
      "Legal actions can create obligations, claims, or public statements that need qualified review.",
    ],
    sixGateQuestionFocus: [
      "Is this action authorized?",
      "Does it require human judgment?",
      "Who is accountable?",
      "What proof remains?",
    ],
  },
  {
    gateId: "hr_gate",
    name: "HR Gate",
    category: "hr",
    description:
      "Routes employee scoring, discipline, performance, termination, and scheduling actions through HR-specific review.",
    actionTypes: [
      "score_employee",
      "disciplinary_action",
      "performance_review",
      "terminate_employee",
      "change_schedule",
    ],
    tools: ["hr", "payroll", "workforce", "slack", "email"],
    riskNotes: [
      "HR actions can affect employment, dignity, contestability, and workplace accountability.",
    ],
    sixGateQuestionFocus: [
      "Is this action authorized?",
      "Is it within scope?",
      "Does it require human judgment?",
      "Who is accountable?",
      "What proof remains?",
    ],
  },
  {
    gateId: "metagate",
    name: "MetaGate",
    category: "governance",
    description:
      "Routes gate, policy, config, receipt deletion, and default-decision changes through governance-specific review.",
    actionTypes: [
      "disable_gate",
      "modify_policy",
      "unlock_policy",
      "delete_receipts",
      "change_default_decision",
    ],
    tools: ["aag", "config", "policy", "filesystem"],
    riskNotes: [
      "Governance actions can weaken or disable the controls that enforce review.",
    ],
    sixGateQuestionFocus: [
      "Is this action authorized?",
      "Who is accountable?",
      "Does it require human judgment?",
      "What proof remains?",
    ],
  },
  {
    gateId: "default_action_gate",
    name: "Default Action Gate",
    category: "general",
    description:
      "Fallback gate for proposed actions that do not match a specialized gate route.",
    actionTypes: [],
    tools: [],
    riskNotes: [
      "General actions still use the same core AAG decision model and detectors.",
    ],
    sixGateQuestionFocus: [
      "Is this action authorized?",
      "Is it within scope?",
      "Is it reversible?",
      "Who is accountable?",
      "Does it require human judgment?",
      "What proof remains?",
    ],
  },
];
