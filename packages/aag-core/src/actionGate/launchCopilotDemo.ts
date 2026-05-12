import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { evaluateAction } from "./evaluateAction";
import { printReviewPacket } from "./formatReviewPacket";
import { launchCopilotPolicyProfile } from "./policyProfiles";
import type {
  ActionGateInput,
  ActionGateResult,
  GateDecision,
  PolicyProfileResultMetadata,
  ReviewPacket,
} from "./types";
import {
  type DemoReceiptAction,
  type FinalOutcome,
  type HumanDecision,
  writeDemoReceipt,
} from "./writeReceipt";

type DataSensitivity = "low" | "medium" | "high";

export type LaunchAction = {
  id: string;
  title: string;
  proposedBy: string;
  tool: string;
  actionType: string;
  target: string;
  description: string;
  externalEffect: boolean;
  reversible: boolean;
  dataSensitivity: DataSensitivity;
  expectedDecision: GateDecision;
  rationale: string;
  payload: Record<string, unknown>;
  reviewPacket?: ReviewPacket;
};

export type DemoResult = {
  id: string;
  title: string;
  actionType: string;
  expectedDecision: GateDecision;
  actualDecision: GateDecision;
  pass: boolean;
  reason: string;
  humanDecision: HumanDecision;
  finalOutcome: FinalOutcome;
  primaryIssue: ActionGateResult["primaryIssue"];
  policyProfile?: PolicyProfileResultMetadata;
  reviewPacket?: ReviewPacket;
};

export type LaunchCopilotDemoRun = {
  actions: LaunchAction[];
  results: DemoResult[];
  auditLog: DemoReceiptAction[];
  summary: Record<GateDecision, number>;
  matchedExpected: number;
  receiptPath?: string;
};

type RunLaunchCopilotDemoOptions = {
  mode?: "example" | "cli";
  version?: string;
  printOutput?: boolean;
  printAuditLog?: boolean;
  writeReceipt?: boolean;
};

const defaultVersion = "1.1.1";
const policyProfile = launchCopilotPolicyProfile;

export function runLaunchCopilotDemo(
  options: RunLaunchCopilotDemoOptions = {},
): LaunchCopilotDemoRun {
  const mode = options.mode ?? "example";
  const version = options.version ?? defaultVersion;
  const printOutput = options.printOutput ?? true;
  const printAuditLog = options.printAuditLog ?? mode === "example";
  const actions = loadLaunchActions();
  const results: DemoResult[] = [];
  const auditLog: DemoReceiptAction[] = [];
  const summary: Record<GateDecision, number> = {
    allow: 0,
    require_approval: 0,
    revise_action: 0,
    block: 0,
  };

  if (printOutput) {
    printHeader(mode, version);
  }

  actions.forEach((action, index) => {
    const gateInput = toActionGateInput(action);
    const gateResult = evaluateAction(gateInput, { policyProfile });
    const reviewPacket = action.reviewPacket ?? gateResult.reviewPacket;
    const humanDecision = getHumanDecision(gateResult.decision);
    const finalOutcome = getFinalOutcome(gateResult.decision, humanDecision);
    const pass = gateResult.decision === action.expectedDecision;

    summary[gateResult.decision] += 1;

    const demoResult: DemoResult = {
      id: action.id,
      title: action.title,
      actionType: action.actionType,
      expectedDecision: action.expectedDecision,
      actualDecision: gateResult.decision,
      pass,
      reason: action.rationale,
      humanDecision,
      finalOutcome,
      primaryIssue: gateResult.primaryIssue,
      policyProfile: gateResult.policyProfile,
      reviewPacket,
    };

    results.push(demoResult);
    auditLog.push(
      toAuditLogEntry(
        action,
        gateResult,
        humanDecision,
        finalOutcome,
        reviewPacket,
      ),
    );

    if (printOutput) {
      printActionResult(index + 1, demoResult);
    }
  });

  const matchedExpected = results.filter((result) => result.pass).length;
  let receiptPath: string | undefined;

  if (options.writeReceipt) {
    receiptPath = writeDemoReceipt({
      command: "demo",
      policyProfile,
      summary: {
        ...summary,
        total: actions.length,
        matchedExpected,
      },
      actions: auditLog,
    });
  }

  if (printOutput) {
    printSummary(actions.length, summary, matchedExpected);

    if (receiptPath) {
      console.log("");
      console.log("Receipts written to:");
      console.log(`${path.dirname(receiptPath).replace(/\\/g, "/")}/`);
    }

    if (printAuditLog) {
      console.log("");
      console.log("Audit log entries:");
      console.log(JSON.stringify(auditLog, null, 2));
    }
  }

  return {
    actions,
    results,
    auditLog,
    summary,
    matchedExpected,
    receiptPath,
  };
}

function loadLaunchActions(): LaunchAction[] {
  const actionsPath = getLaunchActionsPath();
  const parsed: unknown = JSON.parse(readFileSync(actionsPath, "utf8"));

  if (!Array.isArray(parsed) || !parsed.every(isLaunchAction)) {
    throw new Error("examples/launch-copilot/actions.json has an invalid shape.");
  }

  return parsed;
}

function getLaunchActionsPath(): string {
  const candidates = [
    path.join(process.cwd(), "examples", "launch-copilot", "actions.json"),
    path.join(__dirname, "..", "..", "examples", "launch-copilot", "actions.json"),
  ];

  const actionsPath = candidates.find((candidate) => existsSync(candidate));

  if (!actionsPath) {
    throw new Error("Unable to find examples/launch-copilot/actions.json.");
  }

  return actionsPath;
}

function printHeader(mode: "example" | "cli", version: string): void {
  if (mode === "cli") {
    console.log(`Agent Action Gate CLI v${version}`);
    console.log("Running Launch Copilot demo");
  } else {
    console.log("Launch Copilot Demo");
    console.log(`Version: ${version}`);
  }

  console.log(`Policy Profile: ${policyProfile.id} — ${policyProfile.name}`);
  console.log("====================");
  console.log("");
}

function printActionResult(index: number, result: DemoResult): void {
  console.log(`${index}. Action: ${result.title}`);
  console.log(`Expected decision: ${result.expectedDecision}`);
  console.log(`Actual decision: ${result.actualDecision}`);

  if (result.policyProfile?.matchedRule && result.policyProfile.decision) {
    console.log(
      `Policy rule: ${result.policyProfile.matchedRule} -> ${result.policyProfile.decision}`,
    );
    console.log(`Policy reason: ${result.policyProfile.reason}`);
  }

  if (result.actualDecision === "require_approval") {
    console.log(`Human review: ${result.humanDecision}`);
  }

  console.log(`Result: ${result.pass ? "PASS" : "FAIL"}`);
  console.log(`Reason: ${result.reason}`);

  if (result.reviewPacket) {
    printReviewPacket(result.reviewPacket);
  }

  console.log("");
}

function printSummary(
  actionCount: number,
  summary: Record<GateDecision, number>,
  matchedExpected: number,
): void {
  console.log("Summary:");
  console.log(`${actionCount} actions evaluated`);
  console.log(`${summary.allow} allowed`);
  console.log(`${summary.require_approval} required approval`);
  console.log(`${summary.revise_action} revised`);
  console.log(`${summary.block} blocked`);
  console.log(`${matchedExpected}/${actionCount} matched expected decisions`);
}

function isLaunchAction(value: unknown): value is LaunchAction {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.proposedBy === "string" &&
    typeof value.tool === "string" &&
    typeof value.actionType === "string" &&
    typeof value.target === "string" &&
    typeof value.description === "string" &&
    typeof value.externalEffect === "boolean" &&
    typeof value.reversible === "boolean" &&
    isDataSensitivity(value.dataSensitivity) &&
    isGateDecision(value.expectedDecision) &&
    typeof value.rationale === "string" &&
    isRecord(value.payload) &&
    (value.reviewPacket === undefined || isReviewPacket(value.reviewPacket))
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isDataSensitivity(value: unknown): value is DataSensitivity {
  return value === "low" || value === "medium" || value === "high";
}

function isGateDecision(value: unknown): value is GateDecision {
  return (
    value === "allow" ||
    value === "require_approval" ||
    value === "revise_action" ||
    value === "block"
  );
}

function isReviewPacket(value: unknown): value is ReviewPacket {
  return (
    isRecord(value) &&
    typeof value.proposedAction === "string" &&
    typeof value.riskReason === "string" &&
    typeof value.reviewerQuestion === "string"
  );
}

function toActionGateInput(action: LaunchAction): ActionGateInput {
  return {
    userRequest: `Govern this Launch Copilot business action: ${action.description}`,
    agentPlan:
      "Propose launch workflow actions, but let Agent Action Gate decide whether execution is allowed.",
    proposedAction: {
      tool: action.tool,
      actionType: action.actionType,
      target: action.target,
      payload: action.payload,
      reversible: action.reversible,
      externalFacing: action.externalEffect,
    },
    sourceProfile: {
      systemObjective:
        "Support business launch work without bypassing meaningful human oversight.",
      approvalRequiredFor: [
        "external",
        "public",
        "send",
        "publish",
        "export",
        "delete",
      ],
      nonNegotiables: [
        "Do not delete lead records without special approval.",
        "Do not expose private lead data or PII.",
      ],
    },
    context: {
      userApproved: false,
      environment: action.externalEffect ? "production" : "dev",
      workflowId: "launch-copilot-demo",
      authorizedTargets: ["local_draft", "local_lead_record"],
      authorizedActionTypes: ["draft_private_outreach", "add_lead_note"],
    },
  };
}

function getHumanDecision(decision: GateDecision): HumanDecision {
  if (decision === "require_approval") {
    return "approved";
  }

  if (decision === "allow") {
    return "not_required";
  }

  return "not_requested";
}

function getFinalOutcome(
  decision: GateDecision,
  humanDecision: HumanDecision,
): FinalOutcome {
  if (decision === "allow") {
    return "simulated_execution";
  }

  if (decision === "require_approval" && humanDecision === "approved") {
    return "simulated_execution_after_approval";
  }

  if (decision === "revise_action") {
    return "needs_revision";
  }

  return "stopped_by_gate";
}

function toAuditLogEntry(
  action: LaunchAction,
  gateResult: ActionGateResult,
  humanDecision: HumanDecision,
  finalOutcome: FinalOutcome,
  reviewPacket: ReviewPacket | undefined,
): DemoReceiptAction {
  return {
    timestamp: new Date().toISOString(),
    proposedAction: {
      id: action.id,
      title: action.title,
      proposedBy: action.proposedBy,
      actionType: action.actionType,
      target: action.target,
    },
    gateDecision: gateResult.decision,
    humanDecision,
    finalOutcome,
    primaryIssue: gateResult.primaryIssue,
    policyProfile: gateResult.policyProfile,
    reason: action.rationale,
    reviewPacket,
  };
}
