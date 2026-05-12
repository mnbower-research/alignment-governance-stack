import type { ActionGateInput } from "../types";
import { defaultGateDefinitions } from "./defaultGates";
import type { GateDefinition, GateId, GateRoute } from "./gateTypes";

type RouteCandidate = {
  gateId: GateId;
  reason: string;
  matchedSignals: string[];
  confidence: number;
};

export function getDefaultGateDefinitions(): GateDefinition[] {
  return defaultGateDefinitions.map((gate) => ({
    ...gate,
    actionTypes: [...gate.actionTypes],
    tools: [...gate.tools],
    riskNotes: [...gate.riskNotes],
    sixGateQuestionFocus: [...gate.sixGateQuestionFocus],
  }));
}

export function getGateDefinition(
  gateId: GateId,
): GateDefinition | undefined {
  const gate = defaultGateDefinitions.find(
    (definition) => definition.gateId === gateId,
  );

  if (!gate) {
    return undefined;
  }

  return {
    ...gate,
    actionTypes: [...gate.actionTypes],
    tools: [...gate.tools],
    riskNotes: [...gate.riskNotes],
    sixGateQuestionFocus: [...gate.sixGateQuestionFocus],
  };
}

export function routeActionToGate(input: ActionGateInput): GateRoute {
  const actionType = normalize(input.proposedAction.actionType);
  const tool = normalize(input.proposedAction.tool);
  const target = normalize(input.proposedAction.target);
  const payloadText = normalize(JSON.stringify(input.proposedAction.payload ?? {}));
  const requestText = normalize(input.userRequest);
  const combined = [actionType, tool, target, payloadText, requestText].join(" ");

  const candidates: RouteCandidate[] = [
    buildGovernanceCandidate(actionType, tool, target, payloadText, combined),
    buildCyberCandidate(actionType, tool, target, payloadText, combined),
    buildDataCandidate(actionType, tool, target, payloadText, combined),
    buildEmailCandidate(actionType, tool, target, payloadText, combined),
    buildDeploymentCandidate(actionType, tool, target, payloadText, combined),
    buildMarketingCandidate(actionType, tool, target, payloadText, combined),
    buildFinanceCandidate(actionType, tool, target, payloadText, combined),
    buildLegalCandidate(actionType, tool, target, payloadText, combined),
    buildHrCandidate(actionType, tool, target, payloadText, combined),
  ].filter((candidate): candidate is RouteCandidate => candidate !== undefined);

  const candidate = candidates[0] ?? {
    gateId: "default_action_gate" as const,
    reason: "No specialized gate matched; using the default action gate.",
    matchedSignals: ["fallback:default_action_gate"],
    confidence: 0.55,
  };
  const definition = getRequiredGateDefinition(candidate.gateId);

  return {
    gateId: candidate.gateId,
    category: definition.category,
    reason: candidate.reason,
    matchedSignals: candidate.matchedSignals,
    confidence: candidate.confidence,
  };
}

function buildGovernanceCandidate(
  actionType: string,
  tool: string,
  target: string,
  payloadText: string,
  combined: string,
): RouteCandidate | undefined {
  const signals = collectSignals("metagate", [
    exactSignal("actionType", actionType, [
      "disable_gate",
      "modify_policy",
      "unlock_policy",
      "delete_receipts",
      "change_default_decision",
      "modify_config",
      "disable_receipts",
      "disable_audit",
      "delete_receipt",
    ]),
    exactSignal("tool", tool, ["aag", "config", "policy"]),
    includesSignal("target", target, [
      "aag.config",
      "policy",
      "receipt",
      ".aag",
      "gate",
    ]),
    includesSignal("payload", payloadText, [
      "disable gate",
      "unlock policy",
      "delete receipts",
      "defaultdecision",
      "default decision",
    ]),
    includesSignal("text", combined, [
      "weaken policy",
      "disable aag",
      "turn off aag",
      "delete receipts",
    ]),
  ]);

  return toCandidate(
    "metagate",
    signals,
    "Governance-sensitive action should route to MetaGate before other gates.",
    0.97,
  );
}

function buildCyberCandidate(
  actionType: string,
  tool: string,
  target: string,
  payloadText: string,
  combined: string,
): RouteCandidate | undefined {
  const signals = collectSignals("cyber_gate", [
    exactSignal("actionType", actionType, [
      "run_command",
      "scan_network",
      "access_secret",
      "modify_permissions",
      "delete_infrastructure",
    ]),
    exactSignal("tool", tool, ["terminal", "shell", "powershell", "bash"]),
    includesSignal("payload", payloadText, [
      "nmap",
      "scan",
      "chmod",
      "sudo",
      "secret",
      ".env",
      "terraform destroy",
    ]),
    includesSignal("target", target, ["subnet", "cluster", "infrastructure"]),
    includesSignal("text", combined, ["credential", "private key"]),
  ]);

  return toCandidate(
    "cyber_gate",
    signals,
    "Cyber-sensitive command, shell, secret, permission, or infrastructure signal matched.",
    0.91,
  );
}

function buildDataCandidate(
  actionType: string,
  tool: string,
  target: string,
  payloadText: string,
  combined: string,
): RouteCandidate | undefined {
  const signals = collectSignals("data_export_gate", [
    exactSignal("actionType", actionType, [
      "export_data",
      "export_private_data",
      "export_private_customer_data",
      "download_data",
      "dump_database",
      "transfer_data",
      "upload_file",
    ]),
    exactSignal("tool", tool, [
      "database",
      "postgres",
      "mysql",
      "s3",
      "filesystem",
      "file_export",
    ]),
    includesSignal("target", target, ["export", "dump", ".csv", ".zip"]),
    includesSignal("payload", payloadText, [
      "pg_dump",
      "export",
      "upload",
      "customer data",
      "private data",
    ]),
    includesSignal("text", combined, ["data export", "download data"]),
  ]);

  return toCandidate(
    "data_export_gate",
    signals,
    "Data movement, export, dump, transfer, or upload signal matched.",
    0.9,
  );
}

function buildEmailCandidate(
  actionType: string,
  tool: string,
  target: string,
  payloadText: string,
  combined: string,
): RouteCandidate | undefined {
  const signals = collectSignals("email_gate", [
    exactSignal("actionType", actionType, [
      "send_email",
      "reply_email",
      "forward_email",
      "external_message",
    ]),
    exactSignal("tool", tool, ["gmail", "email", "outlook"]),
    includesSignal("target", target, ["@", "customer", "recipient"]),
    includesSignal("payload", payloadText, ["subject", "body", "email"]),
    includesSignal("text", combined, ["send email", "reply email"]),
  ]);

  return toCandidate(
    "email_gate",
    signals,
    "External email or message signal matched.",
    0.88,
  );
}

function buildDeploymentCandidate(
  actionType: string,
  tool: string,
  target: string,
  payloadText: string,
  combined: string,
): RouteCandidate | undefined {
  const signals = collectSignals("deployment_gate", [
    exactSignal("actionType", actionType, [
      "deploy",
      "production_deploy",
      "release",
      "merge",
      "modify_ci",
    ]),
    exactSignal("tool", tool, ["github", "git", "ci", "cd"]),
    includesSignal("target", target, ["production", "main", "release"]),
    includesSignal("payload", payloadText, [
      "deploy",
      "release",
      "merge",
      "workflow",
      ".github",
    ]),
    includesSignal("text", combined, ["production deploy", "ci cd"]),
  ]);

  return toCandidate(
    "deployment_gate",
    signals,
    "Deployment, release, merge, or CI/CD signal matched.",
    0.87,
  );
}

function buildMarketingCandidate(
  actionType: string,
  tool: string,
  target: string,
  payloadText: string,
  combined: string,
): RouteCandidate | undefined {
  const signals = collectSignals("marketing_gate", [
    exactSignal("actionType", actionType, [
      "publish_post",
      "post_social",
      "draft_campaign",
      "external_outreach",
      "comment_on_post",
    ]),
    exactSignal("tool", tool, [
      "linkedin",
      "x",
      "twitter",
      "social_media",
      "buffer",
      "marketing",
    ]),
    includesSignal("target", target, ["linkedin", "twitter", "public"]),
    includesSignal("payload", payloadText, ["post", "campaign", "comment"]),
    includesSignal("text", combined, ["public post", "external outreach"]),
  ]);

  return toCandidate(
    "marketing_gate",
    signals,
    "Public posting, campaign, outreach, or social-media signal matched.",
    0.86,
  );
}

function buildFinanceCandidate(
  actionType: string,
  tool: string,
  target: string,
  payloadText: string,
  combined: string,
): RouteCandidate | undefined {
  const signals = collectSignals("finance_gate", [
    exactSignal("actionType", actionType, [
      "issue_refund",
      "send_invoice",
      "change_price",
      "transfer_money",
      "approve_payment",
    ]),
    exactSignal("tool", tool, ["stripe", "paypal", "accounting", "bank", "finance"]),
    includesSignal("target", target, ["invoice", "payment", "refund"]),
    includesSignal("payload", payloadText, ["refund", "invoice", "price", "payment"]),
    includesSignal("text", combined, ["transfer money", "approve payment"]),
  ]);

  return toCandidate(
    "finance_gate",
    signals,
    "Finance, payment, refund, invoice, or price-change signal matched.",
    0.88,
  );
}

function buildLegalCandidate(
  actionType: string,
  tool: string,
  target: string,
  payloadText: string,
  combined: string,
): RouteCandidate | undefined {
  const signals = collectSignals("legal_gate", [
    exactSignal("actionType", actionType, [
      "approve_contract",
      "send_contract",
      "make_legal_claim",
      "accept_terms",
      "publish_compliance_claim",
    ]),
    exactSignal("tool", tool, ["contract", "legal", "docusign", "public_site"]),
    includesSignal("target", target, ["contract", "terms", "compliance"]),
    includesSignal("payload", payloadText, ["contract", "legal", "terms"]),
    includesSignal("text", combined, ["legal claim", "compliance claim"]),
  ]);

  return toCandidate(
    "legal_gate",
    signals,
    "Contract, legal, terms, or compliance-claim signal matched.",
    0.88,
  );
}

function buildHrCandidate(
  actionType: string,
  tool: string,
  target: string,
  payloadText: string,
  combined: string,
): RouteCandidate | undefined {
  const signals = collectSignals("hr_gate", [
    exactSignal("actionType", actionType, [
      "score_employee",
      "disciplinary_action",
      "performance_review",
      "terminate_employee",
      "change_schedule",
    ]),
    exactSignal("tool", tool, ["hr", "payroll", "workforce"]),
    includesSignal("target", target, ["employee", "candidate", "worker"]),
    includesSignal("payload", payloadText, [
      "employee",
      "disciplinary",
      "performance",
      "terminate",
    ]),
    includesSignal("text", combined, ["performance review", "employee score"]),
  ]);

  return toCandidate(
    "hr_gate",
    signals,
    "HR, employee scoring, discipline, performance, termination, or scheduling signal matched.",
    0.88,
  );
}

function toCandidate(
  gateId: GateId,
  matchedSignals: string[],
  reason: string,
  confidence: number,
): RouteCandidate | undefined {
  if (matchedSignals.length === 0) {
    return undefined;
  }

  return {
    gateId,
    reason,
    matchedSignals,
    confidence: roundConfidence(
      Math.min(0.99, confidence + Math.min(0.08, matchedSignals.length * 0.01)),
    ),
  };
}

function collectSignals(
  gateId: GateId,
  signals: Array<string | undefined>,
): string[] {
  return signals
    .filter((signal): signal is string => Boolean(signal))
    .map((signal) => `${gateId}:${signal}`);
}

function exactSignal(
  field: string,
  value: string,
  matches: string[],
): string | undefined {
  return matches.includes(value) ? `${field}:${value}` : undefined;
}

function includesSignal(
  field: string,
  value: string,
  matches: string[],
): string | undefined {
  const match = matches.find((candidate) => value.includes(candidate));

  return match ? `${field}:${match}` : undefined;
}

function getRequiredGateDefinition(gateId: GateId): GateDefinition {
  const gate = getGateDefinition(gateId);

  if (!gate) {
    throw new Error(`Missing gate definition: ${gateId}`);
  }

  return gate;
}

function normalize(value: unknown): string {
  return typeof value === "string" ? value.toLowerCase() : "";
}

function roundConfidence(confidence: number): number {
  return Math.round(confidence * 100) / 100;
}
