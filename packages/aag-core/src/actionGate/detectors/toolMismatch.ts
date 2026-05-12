import type {
  ActionGateInput,
  GateDetector,
  GateDetectorResult,
} from "../types";

type ToolExpectation = {
  actionPattern: RegExp;
  description: string;
  toolPattern: RegExp;
};

const destructiveMismatchPattern =
  /\b(delete|remove|destroy|drop|purge|wipe|erase|terminate|charge|bill|deploy|release|write|modify|update|edit|rename|move|migrate|migration)\b/i;

const expectations: ToolExpectation[] = [
  {
    actionPattern: /\b(send|email|message|notify|slack|sms)\b/i,
    description: "email, messaging, notification, Slack, SMS, or mail tool",
    toolPattern: /\b(email|mail|gmail|smtp|slack|sms|message|notify|twilio)\b/i,
  },
  {
    actionPattern: /\b(delete|remove|write|modify|update|edit|rename|move|read|open file|file)\b/i,
    description: "filesystem, file, shell, terminal, editor, or storage tool",
    toolPattern: /\b(file|filesystem|fs|shell|terminal|editor|storage|disk)\b/i,
  },
  {
    actionPattern: /\b(deploy|release|rollback)\b/i,
    description: "deployment, CI, cloud, infrastructure, shell, or terminal tool",
    toolPattern:
      /\b(deploy|ci|cd|cloud|vercel|netlify|aws|gcp|azure|k8s|kubernetes|terraform|shell|terminal|cli)\b/i,
  },
  {
    actionPattern: /\b(charge|bill|refund|invoice|payment)\b/i,
    description: "billing, Stripe, payment, or finance tool",
    toolPattern: /\b(stripe|billing|payment|finance|invoice|charge)\b/i,
  },
  {
    actionPattern: /\b(search|browse|fetch|scrape|open url|visit)\b/i,
    description: "browser, web, search, HTTP, or request tool",
    toolPattern: /\b(browser|web|search|http|request|fetch|curl)\b/i,
  },
  {
    actionPattern: /\b(query|sql|database|migrate|migration)\b/i,
    description: "database, SQL, ORM, Prisma, migration, or shell tool",
    toolPattern: /\b(db|database|sql|postgres|mysql|sqlite|prisma|orm|migration|shell|terminal)\b/i,
  },
];

export const detectToolMismatch: GateDetector = (
  input: ActionGateInput,
): GateDetectorResult => {
  const actionText = [
    input.proposedAction.actionType,
    input.proposedAction.target,
    stringifyPayload(input.proposedAction.payload),
  ]
    .filter(Boolean)
    .join(" ")
    .replace(/[_-]/g, " ");
  const tool = input.proposedAction.tool;
  const expectation = expectations.find((item) =>
    item.actionPattern.test(actionText),
  );

  if (!expectation || expectation.toolPattern.test(tool)) {
    return {
      type: "tool_mismatch",
      triggered: false,
      confidence: 0,
      severity: "low",
      evidence: [],
      recommendedDecision: "allow",
    };
  }

  const severity =
    destructiveMismatchPattern.test(actionText) ||
    input.proposedAction.reversible === false
      ? "critical"
      : "medium";

  return {
    type: "tool_mismatch",
    triggered: true,
    confidence: severity === "critical" ? 0.9 : 0.78,
    severity,
    evidence: [
      `Action type \`${input.proposedAction.actionType}\` expects an ${expectation.description}, but proposed tool is \`${tool}\`.`,
    ],
    recommendedDecision: "revise_action",
  };
};

function stringifyPayload(payload: Record<string, unknown> | undefined): string {
  if (!payload) {
    return "";
  }

  try {
    return JSON.stringify(payload);
  } catch {
    return "";
  }
}
