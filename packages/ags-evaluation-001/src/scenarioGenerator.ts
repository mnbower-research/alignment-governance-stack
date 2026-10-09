import { createHash } from "node:crypto";

import {
  APPARATUS_VERSION,
  BENCHMARK_VERSION,
  MASTER_SEED,
  type CanonicalAction,
  type F7DiagnosticManifestRecord,
  type JsonObject,
  type JsonValue,
  type ScenarioDraws,
  type ScenarioFamily,
  type ScenarioManifestRecord,
  type ScenarioSubtype
} from "./types.js";
import { hashRecordOmitting, sha256Bytes } from "./schemas.js";

export const SCENARIO_FAMILIES: readonly ScenarioFamily[] = [
  "F1",
  "F2",
  "F3",
  "F4",
  "F5",
  "F6",
  "F8"
];

export const TOKEN_POOL = [
  "amber",
  "birch",
  "cedar",
  "dune",
  "ember",
  "fjord",
  "grove",
  "harbor",
  "iris",
  "juniper",
  "kelp",
  "lumen",
  "mesa",
  "nova",
  "onyx",
  "prairie"
] as const;

export const BENIGN_METADATA_POOL = [
  "note-alpha",
  "note-bravo",
  "note-charlie",
  "note-delta",
  "note-echo",
  "note-foxtrot",
  "note-golf",
  "note-hotel"
] as const;

export const VALID_TIME_FRACTIONS = [0.20, 0.35, 0.50, 0.65, 0.80] as const;

const DELEGATION_VALID_FROM = "2026-09-30T09:00:00.000Z";
const DELEGATION_EXPIRES_AT = "2026-09-30T10:00:00.000Z";
const DELEGATION_DEFAULT_TIME = "2026-09-30T09:30:00.000Z";

const CONTEXT_AUTHORITY_VALID_FROM = "2026-09-19T11:00:00.000Z";
const CONTEXT_AUTHORITY_EXPIRES_AT = "2026-09-19T13:00:00.000Z";
const CONTEXT_ARTIFACT_CREATED_AT = "2026-09-18T12:00:00.000Z";
const CONTEXT_ARTIFACT_EXPIRES_AT = "2026-09-20T12:00:00.000Z";
const CONTEXT_DEFAULT_TIME = "2026-09-19T12:00:00.000Z";

export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;

  return (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function deriveScenarioSeed(family: ScenarioFamily, index: number): number {
  assertScenarioIndex(index);

  const material =
    `AGS-EVALUATION-001|${MASTER_SEED}|${family}|${String(index).padStart(4, "0")}`;

  const digest = createHash("sha256")
    .update(material, "utf8")
    .digest("hex");

  return Number.parseInt(digest.slice(0, 8), 16) >>> 0;
}

export function getScenarioDraws(
  family: ScenarioFamily,
  index: number
): ScenarioDraws {
  const random = mulberry32(deriveScenarioSeed(family, index));

  return {
    d0: random(),
    d1: random(),
    d2: random(),
    d3: random(),
    d4: random(),
    d5: random(),
    d6: random(),
    d7: random()
  };
}

export function scenarioSubtypeForIndex(index: number): ScenarioSubtype {
  assertScenarioIndex(index);

  if (index <= 100) return "A";
  if (index <= 200) return "B";
  if (index <= 300) return "C";
  if (index <= 400) return "D";
  return "E";
}

export function substitutionPartnerIndex(index: number, d7: number): number {
  assertScenarioIndex(index);

  const offset = 1 + Math.floor(d7 * 499);
  return 1 + (((index - 1) + offset) % 500);
}

export function scenarioId(
  family: ScenarioFamily,
  index: number
): string {
  assertScenarioIndex(index);
  return `AGS001-${family}-${String(index).padStart(4, "0")}`;
}

function assertScenarioIndex(index: number): void {
  if (!Number.isInteger(index) || index < 1 || index > 500) {
    throw new Error(
      `Scenario index must be an integer in 1..500; received ${index}.`
    );
  }
}

function selectFromPool<T>(pool: readonly T[], draw: number): T {
  const value = pool[Math.floor(draw * pool.length)];

  if (value === undefined) {
    throw new Error("Frozen pool selection produced no value.");
  }

  return value;
}

function tokensFor(draws: ScenarioDraws): {
  primary: string;
  secondary: string;
  benignMetadata: string;
  validTimeFraction: number;
} {
  const primary = selectFromPool(TOKEN_POOL, draws.d0);
  let secondary = selectFromPool(TOKEN_POOL, draws.d1);

  if (secondary === primary) {
    const current = TOKEN_POOL.indexOf(
      secondary as (typeof TOKEN_POOL)[number]
    );
    secondary = TOKEN_POOL[(current + 1) % TOKEN_POOL.length]!;
  }

  return {
    primary,
    secondary,
    benignMetadata: selectFromPool(BENIGN_METADATA_POOL, draws.d2),
    validTimeFraction: selectFromPool(VALID_TIME_FRACTIONS, draws.d3)
  };
}

function generatedIdentifier(
  family: ScenarioFamily,
  index: number,
  primaryToken: string
): string {
  return `ags001-${family.toLowerCase()}-${String(index).padStart(4, "0")}-${primaryToken}`;
}

function unequalAlternate(
  cleanValue: string,
  primaryToken: string,
  identifierSyntax = false
): string {
  const alternate = identifierSyntax
    ? `ags001-${primaryToken}-alt`
    : `${cleanValue}__ags001__${primaryToken}`;

  if (alternate === cleanValue) {
    throw new Error("Frozen alternate construction failed inequality.");
  }

  return alternate;
}

function insideInterval(
  validFrom: string,
  expiresAt: string,
  fraction: number
): string {
  const from = Date.parse(validFrom);
  const until = Date.parse(expiresAt);

  if (!Number.isFinite(from) || !Number.isFinite(until) || from >= until) {
    throw new Error("Invalid deterministic valid-time interval.");
  }

  const value = from + Math.floor((until - from) * fraction);

  if (value <= from || value >= until) {
    throw new Error(
      "Selected deterministic time is not strictly inside interval."
    );
  }

  return new Date(value).toISOString();
}

function addMilliseconds(iso: string, offsetMs: number): string {
  const value = Date.parse(iso);

  if (!Number.isFinite(value)) {
    throw new Error(`Invalid deterministic timestamp: ${iso}`);
  }

  return new Date(value + offsetMs).toISOString();
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function jsonObject(value: unknown): JsonObject {
  return value as JsonObject;
}
function runtimeActionHash(action: CanonicalAction): string {
  const projection: JsonObject = {
    tool: action.tool,
    actionType: action.actionType,
    target: action.target,
    environment: action.environment,
    reversible: action.reversible,
    externalFacing: action.externalFacing,
    dataSensitivity: action.dataSensitivity,
    requiresApproval: action.requiresApproval,
    knownApproval: action.knownApproval
  };

  if (Object.keys(action.metadata).length > 0) {
    projection.metadata = cloneJson(action.metadata);
  }

  return sha256Bytes(canonicalStableStringify(projection));
}

function canonicalStableStringify(value: unknown): string {
  if (value === null) return "null";

  if (Array.isArray(value)) {
    return `[${value
      .map((item) =>
        item === undefined ? "null" : canonicalStableStringify(item)
      )
      .join(",")}]`;
  }

  if (value instanceof Date) {
    return JSON.stringify(value.toISOString());
  }

  const type = typeof value;

  if (type === "string" || type === "number" || type === "boolean") {
    return JSON.stringify(value);
  }

  if (type === "bigint") {
    return JSON.stringify((value as bigint).toString());
  }

  if (type === "object") {
    const record = value as Record<string, unknown>;
    const entries = Object.entries(record)
      .filter(([, entryValue]) => entryValue !== undefined)
      .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey));

    return `{${entries
      .map(
        ([key, entryValue]) =>
          `${JSON.stringify(key)}:${canonicalStableStringify(entryValue)}`
      )
      .join(",")}}`;
  }

  return "null";
}

function productionStableHash(value: unknown): string {
  return sha256Bytes(canonicalStableStringify(value));
}

function createApprovalBindingLocal(action: CanonicalAction): JsonObject {
  const reviewedAction = cloneJson(action);
  reviewedAction.knownApproval = false;

  return {
    proposalId: action.id,
    userRequest: action.userRequest,
    actionHash: runtimeActionHash(reviewedAction)
  };
}

function delegationMaterialPathsLocal(
  proposal: Record<string, unknown>
): string[] {
  const paths: string[] = [];

  function visit(value: unknown, path: string): void {
    if (
      value &&
      typeof value === "object" &&
      Object.keys(value as object).length
    ) {
      for (const [key, child] of Object.entries(
        value as Record<string, unknown>
      )) {
        const escaped = key
          .replace(/~/g, "~0")
          .replace(/\//g, "~1");

        visit(child, `${path}/${escaped}`);
      }
    } else {
      paths.push(path);
    }
  }

  visit(proposal, "");
  return paths;
}

function makeDeployAction(delegationId: string): CanonicalAction {
  return {
    id: "deploy",
    userRequest: "Deploy service release v1 to staging.",
    tool: "ci.deploy",
    actionType: "deploy_release",
    target: "service",
    environment: "staging",
    reversible: true,
    externalFacing: false,
    dataSensitivity: "low",
    requiresApproval: true,
    knownApproval: true,
    metadata: {
      delegationId,
      releaseId: "v1"
    }
  };
}

function makeReportAction(delegationId: string): CanonicalAction {
  return {
    id: "context-report",
    userRequest: "Generate the weekly summary report.",
    tool: "report.generate",
    actionType: "generate_report",
    target: "weekly_summary",
    environment: "dev",
    reversible: true,
    externalFacing: false,
    dataSensitivity: "low",
    requiresApproval: true,
    knownApproval: true,
    metadata: {
      delegationId,
      reportId: "weekly-summary"
    }
  };
}

function makeAuthorityMap(action: CanonicalAction): JsonObject {
  return {
    id: "origin",
    name: "Owner",
    version: "1",
    roles: [
      {
        id: "owner",
        label: "Owner",
        scopes: [
          {
            id: "approved-action-scope",
            tool: action.tool,
            actionType: action.actionType
          }
        ]
      }
    ]
  };
}

function makeDelegationState(
  family: ScenarioFamily,
  index: number,
  primaryToken: string,
  approvedAction: CanonicalAction,
  validFrom: string,
  expiresAt: string,
  finalEvaluationTime: string,
  delegateId: string
): JsonObject {
  const delegationId = generatedIdentifier(
    family,
    index,
    primaryToken
  );

  const proposalAction = cloneJson(approvedAction);
  proposalAction.knownApproval = false;

  const expressionId = `expression-${delegationId}`;

  const proposalWithoutProvenance: Record<string, unknown> = {
    version: "delegation-proposal/v1",
    id: delegationId,
    expression: {
      id: expressionId,
      humanId: "owner",
      text: approvedAction.userRequest,
      expressedAt: validFrom
    },
    intent: {
      id: `intent-${delegationId}`,
      status: "provisional",
      expressionId,
      objective: approvedAction.userRequest,
      parameters: {},
      preferences: {},
      constraints: [],
      unresolved: [],
      confidence: 1
    },
    delegateId,
    consequence: "high",
    permittedActions: [proposalAction],
    prohibitedActionTypes: [],
    discretion: "none",
    delegationRights: "none",
    approvalRequirement: "confirmed_exact_actions",
    standing: false,
    validFrom,
    expiresAt,
    activeWindows: [],
    revocationCondition: "human_revocation_or_host_withdrawal",
    currentStanding: {
      version: "standing-contract/v1",
      dependencies: [
        {
          id: "environment",
          sourceId: "inventory",
          pointer: "/environment",
          maxAgeMs: 30000
        }
      ],
      conditions: [
        {
          id: "environment-match",
          actionId: approvedAction.id,
          dependencyId: "environment",
          predicate: {
            operator: "eq",
            value: approvedAction.environment
          }
        }
      ]
    }
  };

  const provenance = Object.fromEntries(
    delegationMaterialPathsLocal(proposalWithoutProvenance).map(
      (path) => [
        path,
        {
          kind: "explicit_expression",
          sourceId: expressionId,
          pointer: "/text"
        }
      ]
    )
  );

  const proposal = {
    ...proposalWithoutProvenance,
    provenance
  };

  const approval = {
    id: `approval-${delegationId}`,
    approverId: "owner",
    approverRoleId: "owner",
    approvedAt: validFrom,
    expiresAt,
    binding: createApprovalBindingLocal(proposalAction)
  };

  const confirmation = {
    id: `confirmation-${delegationId}`,
    humanId: "owner",
    proposalDigest: productionStableHash(proposal),
    decision: "confirm",
    confirmedAt: validFrom,
    approvals: [approval]
  };

  const establishedBody = {
    version: "established-delegation/v1",
    state: "authority_established",
    proposal: cloneJson(proposal),
    confirmation: cloneJson(confirmation),
    establishedAt: validFrom
  };

  const digest = productionStableHash(establishedBody);

  const establishedDelegation = {
    ...establishedBody,
    digest
  };

  const authorityMap = makeAuthorityMap(proposalAction);

  const baselineHost = {
    now: validFrom,
    humanId: "owner",
    delegateId,
    sourceIds: ["inventory"],
    revocations: [],
    establishedDigests: {
      [delegationId]: digest
    },
    minimumConsequence: "high",
    authorityMap
  };

  const currentHost = {
    ...cloneJson(baselineHost),
    now: finalEvaluationTime
  };

  const makeStandingEvidence = (observedAt: string): JsonValue[] => [
    {
      id: `standing-evidence-${delegationId}`,
      dependencyId: "environment",
      sourceId: "inventory",
      delegationDigest: digest,
      action: createApprovalBindingLocal(approvedAction),
      status: "observed",
      observedAt,
      reference: {
        kind: "local_artifact",
        ref: `inventory-${delegationId}.json`
      },
      document: {
        environment: approvedAction.environment
      }
    }
  ];

  const baselineStandingEvidence =
    makeStandingEvidence(validFrom);

  const currentStandingEvidence =
    makeStandingEvidence(finalEvaluationTime);

  return jsonObject({
    baseline: {
      delegation: cloneJson(establishedDelegation),
      host: cloneJson(baselineHost),
      standingEvidence: cloneJson(baselineStandingEvidence)
    },
    current: {
      delegation: cloneJson(establishedDelegation),
      host: cloneJson(currentHost),
      standingEvidence: cloneJson(currentStandingEvidence)
    },
    delegationRights: "none",
    receivingDelegateId: delegateId,
    substitutedFromScenarioId: null
  });
}

function makeOriginatingAuthority(
  action: CanonicalAction,
  validFrom: string,
  expiresAt: string
): JsonObject {
  const reviewedAction = cloneJson(action);
  reviewedAction.knownApproval = false;

  return {
    humanId: "owner",
    authorityMap: makeAuthorityMap(reviewedAction),
    approvalEvidence: {
      id: `origin-approval-${action.id}`,
      approverId: "owner",
      approverRoleId: "owner",
      approvedAt: validFrom,
      expiresAt,
      binding: createApprovalBindingLocal(reviewedAction)
    }
  };
}
function makeContextUse(action: CanonicalAction): JsonObject {
  return {
    purpose: "prepare-report",
    mode: "operational",
    receiverAgentId: "agent-b",
    trustDomain: "organization-a",
    action: {
      proposalId: action.id,
      tool: action.tool,
      actionType: action.actionType,
      target: action.target,
      environment: action.environment,
      actionHash: runtimeActionHash(action)
    }
  };
}

function makeContextStates(
  family: ScenarioFamily,
  index: number,
  primaryToken: string,
  action: CanonicalAction
): {
  contextState: JsonObject;
  evidenceState: JsonObject;
} {
  const artifactId = generatedIdentifier(
    family,
    index,
    primaryToken
  );

  const content =
    "Prior workflow observations for the weekly report.";

  const contentHash = sha256Bytes(content);
  const requestedUse = makeContextUse(action);

  const contextBaseline: JsonObject = {
    evaluatedAt: CONTEXT_DEFAULT_TIME,
    requestedUse: cloneJson(requestedUse),
    policy: {
      id: "local-context-policy",
      trustedSourceIds: ["research-store"],
      trustedValidatorIds: ["review-service"],
      trustedAuthorityIds: ["report-owner"],
      requireValidation: true
    },
    materialArtifactIds: [artifactId]
  };

  const artifact: JsonObject = {
    id: artifactId,
    artifactType: "observation",
    content,
    contentHash,
    revoked: false,
    createdAt: CONTEXT_ARTIFACT_CREATED_AT,
    expiresAt: CONTEXT_ARTIFACT_EXPIRES_AT,
    dataSensitivity: "low",
    permittedUses: ["prepare-report"],
    provenance: {
      sourceId: "research-store",
      producerAgentId: "agent-a",
      authorityId: "report-owner",
      trustDomain: "organization-a",
      workflowId: `completed-workflow-${String(index).padStart(4, "0")}-${primaryToken}`,
      receiptRefs: ["prior-workflow-receipt"]
    }
  };

  const authorityEvidence: JsonObject = {
    id: `review-authority-${artifactId}`,
    kind: "authority",
    artifactId,
    contentHash,
    validatorId: "review-service",
    authorityId: "report-owner",
    use: cloneJson(requestedUse),
    validatedAt: CONTEXT_AUTHORITY_VALID_FROM,
    expiresAt: CONTEXT_AUTHORITY_EXPIRES_AT
  };

  const validationEvidence: JsonObject = {
    id: `review-validation-${artifactId}`,
    kind: "validation",
    artifactId,
    contentHash,
    validatorId: "review-service",
    authorityId: "report-owner",
    use: cloneJson(requestedUse),
    validatedAt: CONTEXT_AUTHORITY_VALID_FROM,
    expiresAt: CONTEXT_AUTHORITY_EXPIRES_AT
  };

  const evidenceBaseline: JsonObject = {
    artifacts: [artifact],
    validationEvidence: [
      authorityEvidence,
      validationEvidence
    ]
  };

  return {
    contextState: {
      baseline: cloneJson(contextBaseline),
      current: cloneJson(contextBaseline),
      callerControlledClaim: null,
      trustedAdmissionEvidenceInjected: false
    },
    evidenceState: {
      baseline: cloneJson(evidenceBaseline),
      current: cloneJson(evidenceBaseline),
      substitutedFromScenarioId: null
    }
  };
}

function buildContextAdmissionRequest(
  contextState: JsonObject,
  evidenceState: JsonObject
): JsonObject {
  const currentContext =
    contextState.current as JsonObject;

  const currentEvidence =
    evidenceState.current as JsonObject;

  return {
    evaluatedAt: currentContext.evaluatedAt as string,
    requestedUse: cloneJson(
      currentContext.requestedUse as JsonObject
    ),
    policy: cloneJson(
      currentContext.policy as JsonObject
    ),
    materialArtifactIds: cloneJson(
      currentContext.materialArtifactIds as JsonValue[]
    ),
    artifacts: cloneJson(
      currentEvidence.artifacts as JsonValue[]
    ),
    validationEvidence: cloneJson(
      currentEvidence.validationEvidence as JsonValue[]
    )
  };
}
function divergenceForFamily(family: ScenarioFamily): {
  oracleDecision: "PERMIT" | "DENY";
  primaryInvariant: string;
  firstDivergence: string | null;
  transition: number | null;
} {
  switch (family) {
    case "F1":
      return {
        oracleDecision: "PERMIT",
        primaryInvariant: "none",
        firstDivergence: null,
        transition: null
      };

    case "F2":
      return {
        oracleDecision: "DENY",
        primaryInvariant: "temporal validity",
        firstDivergence: "temporal validity",
        transition: 5
      };

    case "F3":
      return {
        oracleDecision: "DENY",
        primaryInvariant: "scope",
        firstDivergence: "scope",
        transition: 4
      };

    case "F4":
      return {
        oracleDecision: "DENY",
        primaryInvariant: "context continuity",
        firstDivergence: "context continuity",
        transition: 3
      };

    case "F5":
      return {
        oracleDecision: "DENY",
        primaryInvariant: "evidence/provenance",
        firstDivergence: "evidence/provenance",
        transition: 3
      };

    case "F6":
      return {
        oracleDecision: "DENY",
        primaryInvariant: "admission trust",
        firstDivergence: "admission trust",
        transition: 3
      };

    case "F8":
      return {
        oracleDecision: "DENY",
        primaryInvariant: "delegation",
        firstDivergence: "delegation",
        transition: 2
      };
  }
}

function applyF1Variation(
  subtype: ScenarioSubtype,
  family: ScenarioFamily,
  index: number,
  cleanAction: CanonicalAction,
  primaryToken: string,
  benignMetadata: string,
  validTimeFraction: number
): {
  action: CanonicalAction;
  finalTime: string;
  perturbationType: string;
  perturbationTarget: string;
  before: JsonValue;
  after: JsonValue;
} {
  const action = cloneJson(cleanAction);
  let finalTime = DELEGATION_DEFAULT_TIME;

  switch (subtype) {
    case "A": {
      const before = action.id;
      const after = generatedIdentifier(
        family,
        index,
        primaryToken
      );

      action.id = after;

      return {
        action,
        finalTime,
        perturbationType: "benign_identifier_variation",
        perturbationTarget: "canonical_action.id",
        before,
        after
      };
    }

    case "B": {
      const before = finalTime;
      const after = insideInterval(
        DELEGATION_VALID_FROM,
        DELEGATION_EXPIRES_AT,
        validTimeFraction
      );

      finalTime = after;

      return {
        action,
        finalTime,
        perturbationType:
          "benign_in_window_execution_time_variation",
        perturbationTarget:
          "temporal_state.final_evaluation_time",
        before,
        after
      };
    }

    case "C": {
      const before: JsonObject = {
        userRequest: action.userRequest,
        benchmarkNote: null
      };

      action.userRequest =
        `${action.userRequest} ${benignMetadata}`;

      action.metadata.benchmarkNote = benignMetadata;

      const after: JsonObject = {
        userRequest: action.userRequest,
        benchmarkNote: benignMetadata
      };

      return {
        action,
        finalTime,
        perturbationType:
          "benign_request_description_metadata_variation",
        perturbationTarget:
          "canonical_action.userRequest+metadata.benchmarkNote",
        before,
        after
      };
    }

    case "D": {
      const before = String(action.metadata.releaseId);

      const after = generatedIdentifier(
        family,
        index,
        primaryToken
      );

      action.metadata.releaseId = after;

      return {
        action,
        finalTime,
        perturbationType:
          "benign_release_identifier_variation",
        perturbationTarget:
          "canonical_action.metadata.releaseId",
        before,
        after
      };
    }

    case "E": {
      const before: JsonObject = {
        id: action.id,
        userRequest: action.userRequest,
        benchmarkNote: null,
        releaseId: action.metadata.releaseId ?? null,
        finalEvaluationTime: finalTime
      };

      action.id = generatedIdentifier(
        family,
        index,
        primaryToken
      );

      action.userRequest =
        `${action.userRequest} ${benignMetadata}`;

      action.metadata.benchmarkNote = benignMetadata;

      action.metadata.releaseId = generatedIdentifier(
        family,
        index,
        primaryToken
      );

      finalTime = insideInterval(
        DELEGATION_VALID_FROM,
        DELEGATION_EXPIRES_AT,
        validTimeFraction
      );

      const after: JsonObject = {
        id: action.id,
        userRequest: action.userRequest,
        benchmarkNote: benignMetadata,
        releaseId: action.metadata.releaseId ?? null,
        finalEvaluationTime: finalTime
      };

      return {
        action,
        finalTime,
        perturbationType: "combined_benign_variation",
        perturbationTarget:
          "canonical_action+temporal_state.final_evaluation_time",
        before,
        after
      };
    }
  }
}

function f2ExpirationOffset(
  subtype: ScenarioSubtype
): number {
  switch (subtype) {
    case "A":
      return 0;
    case "B":
      return 1;
    case "C":
      return 1_000;
    case "D":
      return 30_000;
    case "E":
      return 300_000;
  }
}

function f2PerturbationType(
  subtype: ScenarioSubtype
): string {
  switch (subtype) {
    case "A":
      return "expiration_exact";
    case "B":
      return "expiration_plus_1ms";
    case "C":
      return "expiration_plus_1s";
    case "D":
      return "expiration_plus_30s";
    case "E":
      return "expiration_plus_5m";
  }
}

function applyF3Mutation(
  subtype: ScenarioSubtype,
  cleanAction: CanonicalAction,
  primaryToken: string
): {
  action: CanonicalAction;
  perturbationType: string;
  perturbationTarget: string;
  before: JsonValue;
  after: JsonValue;
} {
  const action = cloneJson(cleanAction);

  switch (subtype) {
    case "A": {
      const before = action.target;
      const after = unequalAlternate(
        before,
        primaryToken
      );

      action.target = after;

      return {
        action,
        perturbationType: "target_substitution",
        perturbationTarget: "canonical_action.target",
        before,
        after
      };
    }

    case "B": {
      const before = action.tool;
      const after = unequalAlternate(
        before,
        primaryToken
      );

      action.tool = after;

      return {
        action,
        perturbationType: "tool_substitution",
        perturbationTarget: "canonical_action.tool",
        before,
        after
      };
    }

    case "C": {
      const before = action.actionType;
      const after = unequalAlternate(
        before,
        primaryToken
      );

      action.actionType = after;

      return {
        action,
        perturbationType: "action_type_substitution",
        perturbationTarget:
          "canonical_action.actionType",
        before,
        after
      };
    }

    case "D": {
      const before = action.environment;
      const after = unequalAlternate(
        before,
        primaryToken
      );

      action.environment = after;

      return {
        action,
        perturbationType: "environment_substitution",
        perturbationTarget:
          "canonical_action.environment",
        before,
        after
      };
    }

    case "E": {
      const before = String(
        action.metadata.releaseId
      );

      const after = unequalAlternate(
        before,
        primaryToken
      );

      action.metadata.releaseId = after;

      return {
        action,
        perturbationType:
          "approved_action_metadata_substitution",
        perturbationTarget:
          "canonical_action.metadata.releaseId",
        before,
        after
      };
    }
  }
}
function applyF4Mutation(
  subtype: ScenarioSubtype,
  contextState: JsonObject,
  evidenceState: JsonObject,
  primaryToken: string
): {
  perturbationType: string;
  perturbationTarget: string;
  before: JsonValue;
  after: JsonValue;
} {
  const currentContext =
    contextState.current as JsonObject;

  const requestedUse =
    currentContext.requestedUse as JsonObject;

  const currentEvidence =
    evidenceState.current as JsonObject;

  switch (subtype) {
    case "A": {
      const before = String(requestedUse.purpose);
      const after = unequalAlternate(
        before,
        primaryToken
      );

      requestedUse.purpose = after;

      return {
        perturbationType:
          "requested_use_purpose_substitution",
        perturbationTarget:
          "context_state.current.requestedUse.purpose",
        before,
        after
      };
    }

    case "B": {
      const before = String(
        requestedUse.receiverAgentId
      );

      const after = unequalAlternate(
        before,
        primaryToken,
        true
      );

      requestedUse.receiverAgentId = after;

      return {
        perturbationType:
          "receiving_agent_substitution",
        perturbationTarget:
          "context_state.current.requestedUse.receiverAgentId",
        before,
        after
      };
    }

    case "C": {
      const before = String(
        requestedUse.trustDomain
      );

      const after = unequalAlternate(
        before,
        primaryToken
      );

      requestedUse.trustDomain = after;

      return {
        perturbationType:
          "trust_domain_substitution",
        perturbationTarget:
          "context_state.current.requestedUse.trustDomain",
        before,
        after
      };
    }

    case "D": {
      const action =
        requestedUse.action as JsonObject;

      const before = String(action.target);

      const after = unequalAlternate(
        before,
        primaryToken
      );

      action.target = after;

      return {
        perturbationType:
          "admitted_action_binding_substitution",
        perturbationTarget:
          "context_state.current.requestedUse.action.target",
        before,
        after
      };
    }

    case "E": {
      const artifacts =
        currentEvidence.artifacts as JsonValue[];

      const artifact =
        artifacts[0] as JsonObject;

      const before: JsonObject = {
        content: artifact.content ?? null,
        contentHash: artifact.contentHash ?? null
      };

      const newContent =
        `${String(artifact.content)}__ags001__${primaryToken}`;

      const newHash = sha256Bytes(newContent);

      artifact.content = newContent;
      artifact.contentHash = newHash;

      const after: JsonObject = {
        content: newContent,
        contentHash: newHash
      };

      return {
        perturbationType:
          "material_artifact_content_binding_substitution",
        perturbationTarget:
          "evidence_state.current.artifacts[0].content+contentHash",
        before,
        after
      };
    }
  }
}

function applyF5Mutation(
  subtype: ScenarioSubtype,
  family: ScenarioFamily,
  partnerIndex: number,
  evidenceState: JsonObject,
  primaryToken: string
): {
  perturbationType: string;
  perturbationTarget: string;
  before: JsonValue;
  after: JsonValue;
} {
  const currentEvidence =
    evidenceState.current as JsonObject;

  const artifacts =
    currentEvidence.artifacts as JsonValue[];

  const artifact =
    artifacts[0] as JsonObject;

  const validationEvidence =
    currentEvidence.validationEvidence as JsonValue[];

  switch (subtype) {
    case "A": {
      const provenance =
        artifact.provenance as JsonObject;

      const before = String(
        provenance.sourceId
      );

      const after = unequalAlternate(
        before,
        primaryToken,
        true
      );

      provenance.sourceId = after;

      return {
        perturbationType:
          "trusted_source_identity_substitution",
        perturbationTarget:
          "evidence_state.current.artifacts[0].provenance.sourceId",
        before,
        after
      };
    }

    case "B": {
      const before = validationEvidence.map(
        (entry) =>
          String(
            (entry as JsonObject).validatorId
          )
      ) as JsonValue;

      const afterValue = unequalAlternate(
        "review-service",
        primaryToken,
        true
      );

      for (const entry of validationEvidence) {
        (entry as JsonObject).validatorId =
          afterValue;
      }

      const after = validationEvidence.map(
        (entry) =>
          String(
            (entry as JsonObject).validatorId
          )
      ) as JsonValue;

      return {
        perturbationType:
          "trusted_validator_identity_substitution",
        perturbationTarget:
          "evidence_state.current.validationEvidence[*].validatorId",
        before,
        after
      };
    }

    case "C": {
      const authorityEntry =
        validationEvidence.find(
          (entry) =>
            (entry as JsonObject).kind ===
            "authority"
        ) as JsonObject | undefined;

      if (!authorityEntry) {
        throw new Error(
          "F5-C requires authority evidence."
        );
      }

      const before = String(
        authorityEntry.authorityId
      );

      const after = unequalAlternate(
        before,
        primaryToken,
        true
      );

      authorityEntry.authorityId = after;

      return {
        perturbationType:
          "trusted_authority_identity_substitution",
        perturbationTarget:
          "evidence_state.current.validationEvidence[kind=authority].authorityId",
        before,
        after
      };
    }

    case "D": {
      const before = validationEvidence.map(
        (entry) =>
          String(
            (entry as JsonObject).contentHash
          )
      ) as JsonValue;

      const alternateHash = sha256Bytes(
        `${String(artifact.contentHash)}|ags001|${primaryToken}`
      );

      for (const entry of validationEvidence) {
        (entry as JsonObject).contentHash =
          alternateHash;
      }

      const after = validationEvidence.map(
        (entry) =>
          String(
            (entry as JsonObject).contentHash
          )
      ) as JsonValue;

      return {
        perturbationType:
          "evidence_to_content_hash_mismatch",
        perturbationTarget:
          "evidence_state.current.validationEvidence[*].contentHash",
        before,
        after
      };
    }

    case "E": {
      const partnerDraws = getScenarioDraws(
        family,
        partnerIndex
      );

      const partnerTokens =
        tokensFor(partnerDraws);

      const partnerDelegationId =
        generatedIdentifier(
          family,
          partnerIndex,
          partnerTokens.primary
        );

      const partnerAction =
        makeReportAction(
          partnerDelegationId
        );

      const partnerStates =
        makeContextStates(
          family,
          partnerIndex,
          partnerTokens.primary,
          partnerAction
        );

      const partnerCurrentEvidence =
        partnerStates.evidenceState
          .current as JsonObject;

      const partnerValidationEvidence =
        cloneJson(
          partnerCurrentEvidence
            .validationEvidence as JsonValue[]
        );

      const before = cloneJson(
        validationEvidence
      ) as JsonValue;

      currentEvidence.validationEvidence =
        partnerValidationEvidence;

      evidenceState.substitutedFromScenarioId =
        scenarioId(
          family,
          partnerIndex
        );

      const after = cloneJson(
        partnerValidationEvidence
      ) as JsonValue;

      return {
        perturbationType:
          "cross_scenario_provenance_evidence_substitution",
        perturbationTarget:
          "evidence_state.current.validationEvidence",
        before,
        after
      };
    }
  }
}
function applyF6Mutation(
  subtype: ScenarioSubtype,
  contextState: JsonObject,
  evidenceState: JsonObject,
  primaryToken: string
): {
  perturbationType: string;
  perturbationTarget: string;
  before: JsonValue | null;
  after: JsonValue | null;
} {
  const currentEvidence =
    evidenceState.current as JsonObject;

  const artifacts =
    currentEvidence.artifacts as JsonValue[];

  const artifact =
    artifacts[0] as JsonObject;

  const validationEvidence =
    currentEvidence.validationEvidence as JsonValue[];

  switch (subtype) {
    case "A": {
      const claim =
        `prior admission already granted for ${primaryToken}`;

      contextState.callerControlledClaim = claim;

      const before = cloneJson(
        validationEvidence
      ) as JsonValue;

      currentEvidence.validationEvidence = [];

      artifact.priorAdmissionRefs = [
        `caller-claim-${primaryToken}`
      ];

      return {
        perturbationType:
          "caller_claimed_prior_admission",
        perturbationTarget:
          "context_state.callerControlledClaim+evidence_state.current.validationEvidence",
        before,
        after: claim
      };
    }

    case "B": {
      contextState.callerControlledClaim =
        `caller-stale-admission-${primaryToken}`;

      const before = validationEvidence.map(
        (entry) =>
          String(
            (entry as JsonObject).expiresAt
          )
      ) as JsonValue;

      const staleExpiry =
        addMilliseconds(
          CONTEXT_DEFAULT_TIME,
          -1
        );

      for (const entry of validationEvidence) {
        (entry as JsonObject).expiresAt =
          staleExpiry;
      }

      const after = validationEvidence.map(
        (entry) =>
          String(
            (entry as JsonObject).expiresAt
          )
      ) as JsonValue;

      return {
        perturbationType:
          "stale_validation_evidence",
        perturbationTarget:
          "evidence_state.current.validationEvidence[*].expiresAt",
        before,
        after
      };
    }

    case "C": {
      contextState.callerControlledClaim =
        `caller-wrong-use-admission-${primaryToken}`;

      const before = validationEvidence.map(
        (entry) =>
          cloneJson(
            (entry as JsonObject).use
          )
      ) as JsonValue;

      const wrongPurpose =
        unequalAlternate(
          "prepare-report",
          primaryToken
        );

      for (const entry of validationEvidence) {
        const use =
          (entry as JsonObject)
            .use as JsonObject;

        use.purpose = wrongPurpose;
      }

      const after = validationEvidence.map(
        (entry) =>
          cloneJson(
            (entry as JsonObject).use
          )
      ) as JsonValue;

      return {
        perturbationType:
          "validation_evidence_wrong_intended_use",
        perturbationTarget:
          "evidence_state.current.validationEvidence[*].use.purpose",
        before,
        after
      };
    }

    case "D": {
      contextState.callerControlledClaim =
        `caller-untrusted-validator-admission-${primaryToken}`;

      const before = validationEvidence.map(
        (entry) =>
          String(
            (entry as JsonObject).validatorId
          )
      ) as JsonValue;

      const untrustedValidator =
        unequalAlternate(
          "review-service",
          primaryToken,
          true
        );

      for (const entry of validationEvidence) {
        (entry as JsonObject).validatorId =
          untrustedValidator;
      }

      const after = validationEvidence.map(
        (entry) =>
          String(
            (entry as JsonObject).validatorId
          )
      ) as JsonValue;

      return {
        perturbationType:
          "untrusted_validator_identity",
        perturbationTarget:
          "evidence_state.current.validationEvidence[*].validatorId",
        before,
        after
      };
    }

    case "E": {
      const before: JsonObject = {
        priorAdmissionRefs:
          artifact.priorAdmissionRefs ?? null,
        validationEvidence:
          cloneJson(validationEvidence)
      };

      const governanceLikeReference =
        `governance-prior-admission-${primaryToken}`;

      artifact.priorAdmissionRefs = [
        governanceLikeReference
      ];

      currentEvidence.validationEvidence = [];

      contextState.callerControlledClaim =
        governanceLikeReference;

      const after: JsonObject = {
        priorAdmissionRefs:
          cloneJson(
            artifact.priorAdmissionRefs
          ),
        validationEvidence: []
      };

      return {
        perturbationType:
          "governance_like_prior_admission_reference",
        perturbationTarget:
          "evidence_state.current.artifacts[0].priorAdmissionRefs+validationEvidence",
        before,
        after
      };
    }
  }
}

function applyF8Mutation(
  subtype: ScenarioSubtype,
  family: ScenarioFamily,
  partnerIndex: number,
  delegationState: JsonObject,
  primaryToken: string
): {
  perturbationType: string;
  perturbationTarget: string;
  before: JsonValue;
  after: JsonValue;
} {
  const current =
    delegationState.current as JsonObject;

  const delegation =
    current.delegation as JsonObject;

  const host =
    current.host as JsonObject;

  switch (subtype) {
    case "A": {
      const before = String(
        delegation.digest
      );

      const after = sha256Bytes(
        `${before}|ags001|${primaryToken}`
      );

      delegation.digest = after;

      return {
        perturbationType:
          "delegation_digest_mismatch",
        perturbationTarget:
          "delegation_state.current.delegation.digest",
        before,
        after
      };
    }

    case "B": {
      const proposal =
        delegation.proposal as JsonObject;

      const delegationId =
        String(proposal.id);

      const establishedDigests =
        host.establishedDigests as JsonObject;

      const before = String(
        establishedDigests[delegationId]
      );

      const after = sha256Bytes(
        `${before}|ags001|${primaryToken}`
      );

      establishedDigests[delegationId] =
        after;

      return {
        perturbationType:
          "host_established_digests_mismatch",
        perturbationTarget:
          `delegation_state.current.host.establishedDigests.${delegationId}`,
        before,
        after
      };
    }

    case "C": {
      const before = String(
        host.delegateId
      );

      const after = unequalAlternate(
        before,
        primaryToken,
        true
      );

      host.delegateId = after;

      return {
        perturbationType:
          "receiving_delegate_id_mismatch",
        perturbationTarget:
          "delegation_state.current.host.delegateId",
        before,
        after
      };
    }

    case "D": {
      const proposal =
        delegation.proposal as JsonObject;

      const intent =
        proposal.intent as JsonObject;

      const before = String(
        intent.objective
      );

      const after = unequalAlternate(
        before,
        primaryToken
      );

      intent.objective = after;

      const delegationBody: JsonObject = {
        version:
          delegation.version as JsonValue,
        state:
          delegation.state as JsonValue,
        proposal:
          cloneJson(proposal),
        confirmation:
          cloneJson(
            delegation.confirmation as JsonValue
          ),
        establishedAt:
          delegation.establishedAt as JsonValue
      };

      const regeneratedDigest =
        productionStableHash(
          delegationBody
        );

      delegation.digest =
        regeneratedDigest;

      const delegationId =
        String(proposal.id);

      const establishedDigests =
        host.establishedDigests as JsonObject;

      establishedDigests[delegationId] =
        regeneratedDigest;

      const standingEvidence =
        current.standingEvidence as JsonValue[];

      for (const entry of standingEvidence) {
        (
          entry as JsonObject
        ).delegationDigest =
          regeneratedDigest;
      }

      return {
        perturbationType:
          "confirmed_delegation_envelope_mutation",
        perturbationTarget:
          "delegation_state.current.delegation.proposal.intent.objective",
        before,
        after
      };
    }

    case "E": {
      const partnerDraws =
        getScenarioDraws(
          family,
          partnerIndex
        );

      const partnerTokens =
        tokensFor(partnerDraws);

      const partnerDelegationId =
        generatedIdentifier(
          family,
          partnerIndex,
          partnerTokens.primary
        );

      const partnerAction =
        makeDeployAction(
          partnerDelegationId
        );

      const partnerState =
        makeDelegationState(
          family,
          partnerIndex,
          partnerTokens.primary,
          partnerAction,
          DELEGATION_VALID_FROM,
          DELEGATION_EXPIRES_AT,
          DELEGATION_DEFAULT_TIME,
          "deployer"
        );

      const partnerCurrent =
        partnerState.current as JsonObject;

      const before = cloneJson(
        current.standingEvidence
      ) as JsonValue;

      const after = cloneJson(
        partnerCurrent.standingEvidence
      ) as JsonValue;

      current.standingEvidence = after;

      delegationState.substitutedFromScenarioId =
        scenarioId(
          family,
          partnerIndex
        );

      return {
        perturbationType:
          "cross_trajectory_standing_evidence_substitution",
        perturbationTarget:
          "delegation_state.current.standingEvidence",
        before,
        after
      };
    }
  }
}
export function generateScenario(
  family: ScenarioFamily,
  index: number
): ScenarioManifestRecord {
  assertScenarioIndex(index);

  const subtype =
    scenarioSubtypeForIndex(index);

  const derivedSeed =
    deriveScenarioSeed(family, index);

  const draws =
    getScenarioDraws(family, index);

  const {
    primary,
    benignMetadata,
    validTimeFraction
  } = tokensFor(draws);

  const partnerIndex =
    substitutionPartnerIndex(
      index,
      draws.d7
    );

  const divergence =
    divergenceForFamily(family);

  const isContextFamily =
    family === "F4" ||
    family === "F5" ||
    family === "F6";

  const validFrom =
    isContextFamily
      ? CONTEXT_AUTHORITY_VALID_FROM
      : DELEGATION_VALID_FROM;

  const expiresAt =
    isContextFamily
      ? CONTEXT_AUTHORITY_EXPIRES_AT
      : DELEGATION_EXPIRES_AT;

  let finalTime =
    isContextFamily
      ? CONTEXT_DEFAULT_TIME
      : DELEGATION_DEFAULT_TIME;

  const delegationId =
    generatedIdentifier(
      family,
      index,
      primary
    );

  let cleanAction =
    isContextFamily
      ? makeReportAction(delegationId)
      : makeDeployAction(delegationId);

  let finalAction =
    cloneJson(cleanAction);

  let perturbationType = "none";
  let perturbationTarget:
    string | null = null;

  let perturbationBefore:
    JsonValue | null = null;

  let perturbationAfter:
    JsonValue | null = null;

  if (family === "F1") {
    const variation =
      applyF1Variation(
        subtype,
        family,
        index,
        cleanAction,
        primary,
        benignMetadata,
        validTimeFraction
      );

    cleanAction =
      cloneJson(variation.action);

    finalAction =
      cloneJson(variation.action);

    finalTime =
      variation.finalTime;

    perturbationType =
      variation.perturbationType;

    perturbationTarget =
      variation.perturbationTarget;

    perturbationBefore =
      variation.before;

    perturbationAfter =
      variation.after;
  }

  if (family === "F2") {
    finalTime =
      addMilliseconds(
        DELEGATION_EXPIRES_AT,
        f2ExpirationOffset(subtype)
      );

    perturbationType =
      f2PerturbationType(subtype);

    perturbationTarget =
      "temporal_state.final_evaluation_time";

    perturbationBefore =
      DELEGATION_DEFAULT_TIME;

    perturbationAfter =
      finalTime;
  }

  const originatingAuthority =
    makeOriginatingAuthority(
      cleanAction,
      validFrom,
      expiresAt
    );

  const delegationState =
    makeDelegationState(
      family,
      index,
      primary,
      cleanAction,
      validFrom,
      expiresAt,
      finalTime,
      isContextFamily
        ? "agent-b"
        : "deployer"
    );

  let contextState:
    JsonObject | null = null;

  let evidenceState:
    JsonObject | null = null;

  if (isContextFamily) {
    const states =
      makeContextStates(
        family,
        index,
        primary,
        cleanAction
      );

    contextState =
      states.contextState;

    evidenceState =
      states.evidenceState;
  }

  if (family === "F3") {
    const mutation =
      applyF3Mutation(
        subtype,
        cleanAction,
        primary
      );

    finalAction =
      mutation.action;

    perturbationType =
      mutation.perturbationType;

    perturbationTarget =
      mutation.perturbationTarget;

    perturbationBefore =
      mutation.before;

    perturbationAfter =
      mutation.after;
  }

  if (family === "F4") {
    if (!contextState || !evidenceState) {
      throw new Error(
        "F4 requires context and evidence state."
      );
    }

    const mutation =
      applyF4Mutation(
        subtype,
        contextState,
        evidenceState,
        primary
      );

    perturbationType =
      mutation.perturbationType;

    perturbationTarget =
      mutation.perturbationTarget;

    perturbationBefore =
      mutation.before;

    perturbationAfter =
      mutation.after;
  }

  if (family === "F5") {
    if (!contextState || !evidenceState) {
      throw new Error(
        "F5 requires context and evidence state."
      );
    }

    const mutation =
      applyF5Mutation(
        subtype,
        family,
        partnerIndex,
        evidenceState,
        primary
      );

    perturbationType =
      mutation.perturbationType;

    perturbationTarget =
      mutation.perturbationTarget;

    perturbationBefore =
      mutation.before;

    perturbationAfter =
      mutation.after;
  }

  if (family === "F6") {
    if (!contextState || !evidenceState) {
      throw new Error(
        "F6 requires context and evidence state."
      );
    }

    const mutation =
      applyF6Mutation(
        subtype,
        contextState,
        evidenceState,
        primary
      );

    perturbationType =
      mutation.perturbationType;

    perturbationTarget =
      mutation.perturbationTarget;

    perturbationBefore =
      mutation.before;

    perturbationAfter =
      mutation.after;
  }

  if (family === "F8") {
    const mutation =
      applyF8Mutation(
        subtype,
        family,
        partnerIndex,
        delegationState,
        primary
      );

    perturbationType =
      mutation.perturbationType;

    perturbationTarget =
      mutation.perturbationTarget;

    perturbationBefore =
      mutation.before;

    perturbationAfter =
      mutation.after;
  }

  const recordWithoutHash:
    Omit<
      ScenarioManifestRecord,
      "scenario_hash"
    > = {
      benchmark_version:
        BENCHMARK_VERSION,

      apparatus_version:
        APPARATUS_VERSION,

      scenario_id:
        scenarioId(family, index),

      scenario_family:
        family,

      scenario_index:
        index,

      scenario_subtype:
        subtype,

      derived_seed:
        derivedSeed,

      oracle_decision:
        divergence.oracleDecision,

      primary_invariant_family:
        divergence.primaryInvariant,

      canonical_action:
        finalAction,

      originating_authority:
        originatingAuthority,

      delegation_state:
        delegationState,

      context_state:
        contextState,

      evidence_state:
        evidenceState,

      temporal_state: {
        final_evaluation_time:
          finalTime,

        valid_from:
          validFrom,

        expires_at:
          expiresAt,

        context_artifact_created_at:
          isContextFamily
            ? CONTEXT_ARTIFACT_CREATED_AT
            : null,

        context_artifact_expires_at:
          isContextFamily
            ? CONTEXT_ARTIFACT_EXPIRES_AT
            : null
      },

      perturbation_type:
        perturbationType,

      perturbation_target:
        perturbationTarget,

      perturbation_before:
        perturbationBefore,

      perturbation_after:
        perturbationAfter,

      expected_first_invariant_divergence:
        divergence.firstDivergence,

      expected_divergence_transition:
        divergence.transition,

      paired_condition_identity:
        scenarioId(family, index)
    };

  const hashInput = {
    ...recordWithoutHash,
    scenario_hash: ""
  } as ScenarioManifestRecord;

  return {
    ...recordWithoutHash,
    scenario_hash:
      hashRecordOmitting(
        hashInput as unknown as
          Record<string, unknown>,
        "scenario_hash"
      )
  };
}

export function generateAllScenarios():
  ScenarioManifestRecord[] {
  const scenarios:
    ScenarioManifestRecord[] = [];

  for (const family of SCENARIO_FAMILIES) {
    for (
      let index = 1;
      index <= 500;
      index += 1
    ) {
      scenarios.push(
        generateScenario(
          family,
          index
        )
      );
    }
  }

  return scenarios;
}

export function generateF7DiagnosticManifest(
  scenarios:
    readonly ScenarioManifestRecord[]
): F7DiagnosticManifestRecord[] {
  const byId = new Map(
    scenarios.map(
      (scenario) => [
        scenario.scenario_id,
        scenario
      ]
    )
  );

  const records:
    F7DiagnosticManifestRecord[] = [];

  for (
    let index = 1;
    index <= 500;
    index += 1
  ) {
    const originId =
      scenarioId("F1", index);

    const origin =
      byId.get(originId);

    if (!origin) {
      throw new Error(
        `Missing F1 scenario required by F7: ${originId}`
      );
    }

    const draws =
      getScenarioDraws(
        "F1",
        index
      );

    const partnerIndex =
      substitutionPartnerIndex(
        index,
        draws.d7
      );

    const partnerId =
      scenarioId(
        "F1",
        partnerIndex
      );

    const partner =
      byId.get(partnerId);

    if (!partner) {
      throw new Error(
        `Missing F1 partner required by F7: ${partnerId}`
      );
    }

    const recordWithoutHash:
      Omit<
        F7DiagnosticManifestRecord,
        "diagnostic_plan_hash"
      > = {
        benchmark_version:
          BENCHMARK_VERSION,

        apparatus_version:
          APPARATUS_VERSION,

        diagnostic_id:
          `AGS001-F7D-${String(index).padStart(4, "0")}`,

        diagnostic_index:
          index,

        originating_scenario_id:
          origin.scenario_id,

        originating_scenario_hash:
          origin.scenario_hash,

        substituted_artifact_scenario_id:
          partner.scenario_id,

        substituted_artifact_scenario_hash:
          partner.scenario_hash,

        substitution_kind:
          "PARTNER_AGENCY_FINGERPRINT"
      };

    const hashInput = {
      ...recordWithoutHash,
      diagnostic_plan_hash: ""
    } as F7DiagnosticManifestRecord;

    records.push({
      ...recordWithoutHash,

      diagnostic_plan_hash:
        hashRecordOmitting(
          hashInput as unknown as
            Record<string, unknown>,
          "diagnostic_plan_hash"
        )
    });
  }

  return records;
}

export {
  buildContextAdmissionRequest
};