import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  createEffectiveAagConfig,
  type EffectiveAagConfig,
  defaultReceiptDirectory,
  receiptVersion,
} from "./aagConfig";
import {
  attachApprovalAuthority,
  type ApprovalAuthorityInput,
} from "./approvalAuthority";
import { actionGateDetectors } from "./evaluateAction";
import type { GovernanceCheckResult } from "./governanceWeakening";
import type { MetaGateDecision, MetaGateInput } from "./metaGate";
import { defaultPolicyProfile, getPolicyProfileById } from "./policyProfiles";
import {
  attachPolicyProvenance,
  type AttachPolicyProvenanceContext,
} from "./policyProvenance";
import { attachHashChainMetadata } from "./receiptHashChain";
import { signReceipt } from "./receipts/signReceipt";
import { loadSigningKeypair } from "./receipts/signingKeys";
import { sha256Stable } from "./stableHash";
import type {
  ActionGateInput,
  ActionGateResult,
  GateDecision,
  PolicyProfile,
  PolicyProfileResultMetadata,
  ReviewPacket,
} from "./types";

export type HumanDecision = "approved" | "not_required" | "not_requested";

export type FinalOutcome =
  | "simulated_execution"
  | "simulated_execution_after_approval"
  | "stopped_by_gate"
  | "needs_revision"
  | "not_executed";

type EvaluationReceiptParams = {
  command: "evaluate";
  input: ActionGateInput;
  result: ActionGateResult;
  reason: string;
  humanDecision: HumanDecision;
  finalOutcome: FinalOutcome;
  sourceFile?: string;
  policyProfile?: PolicyProfile;
  receiptDirectory?: string;
  approvalAuthority?: ApprovalAuthorityInput;
};

type DemoReceiptParams = {
  command: "demo";
  policyProfile: PolicyProfile;
  summary: Record<GateDecision, number> & {
    total: number;
    matchedExpected: number;
  };
  actions: DemoReceiptAction[];
  receiptDirectory?: string;
  approvalAuthority?: ApprovalAuthorityInput;
};

type GovernanceReceiptParams = {
  command: "check-config-change";
  previousConfig: EffectiveAagConfig;
  nextConfig: EffectiveAagConfig;
  result: GovernanceCheckResult;
  policyProfile?: PolicyProfile;
  receiptDirectory?: string;
  approvalAuthority?: ApprovalAuthorityInput;
};

type MetaGateReceiptParams = {
  command: "metagate" | "check-config-change";
  input: MetaGateInput;
  decision: MetaGateDecision;
  previousConfig?: EffectiveAagConfig;
  nextConfig?: EffectiveAagConfig;
  policyProfile?: PolicyProfile;
  receiptDirectory?: string;
  approvalAuthority?: ApprovalAuthorityInput;
};

export type DemoReceiptAction = {
  timestamp: string;
  proposedAction: {
    id: string;
    title: string;
    proposedBy: string;
    actionType: string;
    target: string;
  };
  gateDecision: GateDecision;
  reason: string;
  primaryIssue: ActionGateResult["primaryIssue"];
  policyProfile?: PolicyProfileResultMetadata;
  reviewPacket?: ReviewPacket;
  finalOutcome: FinalOutcome;
  humanDecision: HumanDecision;
};

export function writeEvaluationReceipt(params: EvaluationReceiptParams): string {
  const createdAt = new Date().toISOString();
  const effectivePolicyProfile = getEffectivePolicyProfile(
    params.input,
    params.policyProfile,
  );
  const configHash = createConfigHash({
    receiptDirectory: params.receiptDirectory,
  });
  const policyHash = sha256Stable(effectivePolicyProfile);
  const receipt = {
    receiptVersion,
    createdAt,
    timestamp: createdAt,
    configHash,
    policyHash,
    command: params.command,
    policyProfile: params.result.policyProfile,
    proposedAction: summarizeAction(params.input),
    decision: params.result.decision,
    gateDecision: params.result.decision,
    reason: params.reason,
    primaryIssue: params.result.primaryIssue,
    policyMetadata: params.result.policyProfile,
    reviewPacket: params.result.reviewPacket,
    finalOutcome: params.finalOutcome,
    humanDecision: params.humanDecision,
    sourceFile: params.sourceFile,
  };
  const filename = `${toFilenameTimestamp(createdAt)}-${safeSegment(
    params.input.proposedAction.actionType,
  )}.json`;

  return writeJsonReceipt(
    receipt,
    filename,
    params.receiptDirectory,
    {
      sourceType: "profile",
      profile: effectivePolicyProfile,
      result: params.result,
      policyHash,
      configHash,
      policyAppliedAt: createdAt,
      scopeBasis: [
        ...(params.input.context?.workflowId
          ? [`workflowId:${params.input.context.workflowId}`]
          : []),
        ...(params.input.context?.environment
          ? [`environment:${params.input.context.environment}`]
          : []),
      ],
    },
    {
      authorityAppliedAt: createdAt,
      actionType: params.input.proposedAction.actionType,
      target: params.input.proposedAction.target,
      riskLevel: params.result.riskLevel,
      scope: params.input.context?.workflowId ? "workflow" : "local",
      irreversible: params.input.proposedAction.reversible === false,
      externalPosting: params.input.proposedAction.externalFacing === true,
      ...params.approvalAuthority,
    },
  );
}

export function writeDemoReceipt(params: DemoReceiptParams): string {
  const createdAt = new Date().toISOString();
  const policyMetadata: PolicyProfileResultMetadata = {
    id: params.policyProfile.id,
    name: params.policyProfile.name,
  };
  const configHash = createConfigHash({
    receiptDirectory: params.receiptDirectory,
  });
  const policyHash = sha256Stable(params.policyProfile);
  const receipt = {
    receiptVersion,
    createdAt,
    timestamp: createdAt,
    configHash,
    policyHash,
    command: params.command,
    policyProfile: policyMetadata,
    proposedAction: {
      title: "Launch Copilot demo",
      actionType: "launch_copilot_demo",
    },
    decision: "allow" as GateDecision,
    gateDecision: "allow" as GateDecision,
    reason: "Launch Copilot demo evaluated all sample actions.",
    primaryIssue: null,
    policyMetadata,
    reviewPacket: undefined,
    finalOutcome:
      params.summary.matchedExpected === params.summary.total
        ? "simulated_execution"
        : "needs_revision",
    humanDecision: "not_required",
    summary: params.summary,
    actions: params.actions,
  };
  const filename = `${toFilenameTimestamp(createdAt)}-launch-copilot-demo.json`;

  return writeJsonReceipt(
    receipt,
    filename,
    params.receiptDirectory,
    {
      sourceType: "profile",
      profile: params.policyProfile,
      policyHash,
      configHash,
      policyAppliedAt: createdAt,
      matchedRules: params.actions
        .map((action) => action.policyProfile?.matchedRule)
        .filter((rule): rule is string => Boolean(rule)),
      decisionBasis: [
        "decision:allow",
        "Launch Copilot demo evaluated all sample actions.",
        `matchedExpected:${params.summary.matchedExpected}`,
        `total:${params.summary.total}`,
      ],
    },
    {
      ...params.approvalAuthority,
      authorityId: params.approvalAuthority?.authorityId ?? "local-founder",
      authorityAppliedAt: createdAt,
      actionType: "launch_copilot_demo",
      target: "demo",
      riskLevel: "low",
      scope: "demo",
      irreversible: false,
      externalPosting: false,
    },
  );
}

export function writeGovernanceReceipt(params: GovernanceReceiptParams): string {
  const createdAt = new Date().toISOString();
  const previousConfigHash = createConfigHash({
    config: params.previousConfig,
  });
  const nextConfigHash = createConfigHash({
    config: params.nextConfig,
  });
  const policyHash = createPolicyHash(
    params.policyProfile ?? defaultPolicyProfile,
  );
  const receipt = {
    receiptVersion,
    receiptType: "governance_change",
    createdAt,
    timestamp: createdAt,
    command: params.command,
    decision: params.result.decision,
    governanceChangeType: params.result.governanceChangeType,
    configHash: nextConfigHash,
    policyHash,
    previousConfigHash,
    nextConfigHash,
    locked: params.result.locked,
    ...(params.previousConfig.lockReason
      ? { lockReason: params.previousConfig.lockReason }
      : {}),
    detectorsTriggered: params.result.detectorsTriggered,
    changes: params.result.changes,
    previousConfig: summarizeGovernanceConfig(params.previousConfig),
    nextConfig: summarizeGovernanceConfig(params.nextConfig),
  };
  const filename = `${toFilenameTimestamp(createdAt)}-governance-change.json`;

  return writeJsonReceipt(
    receipt,
    filename,
    params.receiptDirectory,
    {
      sourceType: "metagate",
      policyId: "metagate",
      policyName: "MetaGate policy",
      policySource: "MetaGate policy",
      policyHash,
      configHash: nextConfigHash,
      policyAppliedAt: createdAt,
      matchedRules: params.result.detectorsTriggered,
      decisionBasis: [
        `decision:${params.result.decision}`,
        `locked:${params.result.locked}`,
        ...params.result.changes,
      ],
      snapshot: {
        previousConfigHash,
        nextConfigHash,
        governanceChangeType: params.result.governanceChangeType,
      },
    },
    {
      ...params.approvalAuthority,
      authorityAppliedAt: createdAt,
      actionType: params.result.governanceChangeType,
      target: "aag.config.json",
      riskLevel: params.result.decision === "allow" ? "medium" : "high",
      scope: "governance",
      irreversible: true,
      externalPosting: false,
    },
  );
}

export function writeMetaGateReceipt(params: MetaGateReceiptParams): string {
  const createdAt = new Date().toISOString();
  const previousConfigHash = params.previousConfig
    ? createConfigHash({ config: params.previousConfig })
    : undefined;
  const nextConfigHash = params.nextConfig
    ? createConfigHash({ config: params.nextConfig })
    : undefined;
  const configHash =
    nextConfigHash ??
    previousConfigHash ??
    createConfigHash({
      receiptDirectory: params.receiptDirectory,
    });
  const policyHash = createPolicyHash(
    params.policyProfile ?? defaultPolicyProfile,
  );
  const receipt = {
    receiptVersion,
    receiptType: "metagate_decision",
    metaGate: true,
    command: params.command,
    actionType: params.input.actionType,
    target: params.input.target,
    createdAt,
    timestamp: createdAt,
    decision: params.decision.decision,
    configHash,
    policyHash,
    ...(previousConfigHash ? { previousConfigHash } : {}),
    ...(nextConfigHash ? { nextConfigHash } : {}),
    locked: params.decision.locked,
    ...(params.input.requestedBy
      ? { requestedBy: params.input.requestedBy }
      : {}),
    ...(params.input.reason ? { reason: params.input.reason } : {}),
    detectorsTriggered: params.decision.detectorsTriggered,
    reasons: params.decision.reasons,
  };
  const filename = `${toFilenameTimestamp(createdAt)}-metagate-decision.json`;

  return writeJsonReceipt(
    receipt,
    filename,
    params.receiptDirectory,
    {
      sourceType: "metagate",
      policyId: "metagate",
      policyName: "MetaGate policy",
      policySource: "MetaGate policy",
      policyHash,
      configHash,
      policyAppliedAt: createdAt,
      matchedRules: params.decision.detectorsTriggered,
      decisionBasis: [
        `decision:${params.decision.decision}`,
        `locked:${params.decision.locked}`,
        ...params.decision.reasons,
      ],
      snapshot: {
        previousConfigHash,
        nextConfigHash,
        actionType: params.input.actionType,
        target: params.input.target,
        governanceChangeType: params.decision.governanceChangeType,
      },
    },
    {
      ...params.approvalAuthority,
      authorityAppliedAt: createdAt,
      actionType: params.input.actionType,
      target: params.input.target,
      riskLevel: params.decision.decision === "allow" ? "medium" : "high",
      scope: "governance",
      irreversible: true,
      externalPosting: false,
    },
  );
}

function writeJsonReceipt(
  receipt: unknown,
  filename: string,
  receiptDirectory = defaultReceiptDirectory,
  policyProvenanceContext: AttachPolicyProvenanceContext = {},
  approvalAuthorityContext: ApprovalAuthorityInput = {},
): string {
  mkdirSync(receiptDirectory, { recursive: true });

  const receiptPath = path.join(receiptDirectory, filename);
  const receiptWithPolicyProvenance = attachPolicyProvenance(
    receipt,
    policyProvenanceContext,
  );
  const receiptWithApprovalAuthority = attachApprovalAuthority(
    receiptWithPolicyProvenance,
    approvalAuthorityContext,
  );
  const chainedReceipt = attachHashChainMetadata(receiptWithApprovalAuthority, {
    receiptsDir: receiptDirectory,
    source:
      receiptDirectory === defaultReceiptDirectory ||
      path.resolve(receiptDirectory) === path.resolve(defaultReceiptDirectory)
        ? "all"
        : "receipts",
  });
  const signingKeypair = loadSigningKeypair();
  const finalReceipt = signingKeypair
    ? signReceipt(chainedReceipt, signingKeypair)
    : chainedReceipt;

  writeFileSync(
    receiptPath,
    `${JSON.stringify(finalReceipt, null, 2)}\n`,
    "utf8",
  );

  return receiptPath;
}

function summarizeAction(input: ActionGateInput): Record<string, unknown> {
  return {
    tool: input.proposedAction.tool,
    actionType: input.proposedAction.actionType,
    target: input.proposedAction.target,
    reversible: input.proposedAction.reversible,
    externalFacing: input.proposedAction.externalFacing,
  };
}

export function createConfigHash(options: {
  config?: EffectiveAagConfig | Record<string, unknown>;
  receiptDirectory?: string;
} = {}): string {
  return sha256Stable(
    options.config ??
      createEffectiveAagConfig({
        receiptDirectory: options.receiptDirectory,
        detectorIds: actionGateDetectors.map((detector) => detector.name),
      }),
  );
}

export function createPolicyHash(policyProfile: PolicyProfile): string {
  return sha256Stable(policyProfile);
}

function summarizeGovernanceConfig(
  config: EffectiveAagConfig,
): Record<string, unknown> {
  return {
    version: config.version,
    locked: config.locked,
    lockReason: config.lockReason,
    lockedAt: config.lockedAt,
    lockedBy: config.lockedBy,
    defaultDecision: config.defaultDecision,
    enabled: config.enabled,
    receipts: config.receipts,
    receiptDirectory: config.receiptDirectory,
    detectorCount: config.detectors.length,
  };
}

function getEffectivePolicyProfile(
  input: ActionGateInput,
  policyProfile: PolicyProfile | undefined,
): PolicyProfile {
  return (
    policyProfile ??
    input.policyProfile ??
    getPolicyProfileById(input.policyProfileId) ??
    defaultPolicyProfile
  );
}

function toFilenameTimestamp(timestamp: string): string {
  return timestamp.replace(/[:.]/g, "-");
}

function safeSegment(value: string | undefined): string {
  if (!value) {
    return "action";
  }

  const segment = value
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return segment || "action";
}
