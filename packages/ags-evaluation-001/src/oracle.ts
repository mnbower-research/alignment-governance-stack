import {
  type CanonicalAction,
  type JsonObject,
  type JsonValue,
  type OracleAssessment,
  type ScenarioManifestRecord
} from "./types.js";
import { canonicalSerialize } from "./schemas.js";

function objectValue(
  value: JsonValue | undefined,
  label: string
): JsonObject {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new Error(`Oracle expected object: ${label}`);
  }

  return value as JsonObject;
}

function arrayValue(
  value: JsonValue | undefined,
  label: string
): JsonValue[] {
  if (!Array.isArray(value)) {
    throw new Error(`Oracle expected array: ${label}`);
  }

  return value;
}

function stringValue(
  value: JsonValue | undefined,
  label: string
): string {
  if (typeof value !== "string") {
    throw new Error(`Oracle expected string: ${label}`);
  }

  return value;
}

function sameJson(
  left: JsonValue,
  right: JsonValue
): boolean {
  return (
    canonicalSerialize(left) ===
    canonicalSerialize(right)
  );
}

function actionSemantics(
  action: CanonicalAction | JsonObject
): JsonObject {
  return {
    id: action.id as JsonValue,
    userRequest: action.userRequest as JsonValue,
    tool: action.tool as JsonValue,
    actionType: action.actionType as JsonValue,
    target: action.target as JsonValue,
    environment: action.environment as JsonValue,
    reversible: action.reversible as JsonValue,
    externalFacing:
      action.externalFacing as JsonValue,
    dataSensitivity:
      action.dataSensitivity as JsonValue,
    requiresApproval:
      action.requiresApproval as JsonValue,
    metadata: action.metadata as JsonValue
  };
}

function delegationParts(
  scenario: ScenarioManifestRecord
): {
  baseline: JsonObject;
  current: JsonObject;
  baselineDelegation: JsonObject;
  currentDelegation: JsonObject;
  baselineHost: JsonObject;
  currentHost: JsonObject;
  proposal: JsonObject;
  permittedAction: JsonObject;
} {
  if (!scenario.delegation_state) {
    throw new Error(
      `${scenario.scenario_id}: missing delegation_state`
    );
  }

  const baseline = objectValue(
    scenario.delegation_state.baseline,
    "delegation_state.baseline"
  );

  const current = objectValue(
    scenario.delegation_state.current,
    "delegation_state.current"
  );

  const baselineDelegation = objectValue(
    baseline.delegation,
    "baseline.delegation"
  );

  const currentDelegation = objectValue(
    current.delegation,
    "current.delegation"
  );

  const baselineHost = objectValue(
    baseline.host,
    "baseline.host"
  );

  const currentHost = objectValue(
    current.host,
    "current.host"
  );

  const proposal = objectValue(
    baselineDelegation.proposal,
    "baseline.delegation.proposal"
  );

  const permittedActions = arrayValue(
    proposal.permittedActions,
    "proposal.permittedActions"
  );

  if (permittedActions.length !== 1) {
    throw new Error(
      `${scenario.scenario_id}: expected one permitted action`
    );
  }

  const permittedAction = objectValue(
    permittedActions[0],
    "proposal.permittedActions[0]"
  );

  return {
    baseline,
    current,
    baselineDelegation,
    currentDelegation,
    baselineHost,
    currentHost,
    proposal,
    permittedAction
  };
}

function finalTimeInsideAuthority(
  scenario: ScenarioManifestRecord
): boolean {
  const temporal = scenario.temporal_state;

  const now = Date.parse(
    stringValue(
      temporal.final_evaluation_time,
      "temporal_state.final_evaluation_time"
    )
  );

  const validFrom = Date.parse(
    stringValue(
      temporal.valid_from,
      "temporal_state.valid_from"
    )
  );

  const expiresAt = Date.parse(
    stringValue(
      temporal.expires_at,
      "temporal_state.expires_at"
    )
  );

  return (
    Number.isFinite(now) &&
    Number.isFinite(validFrom) &&
    Number.isFinite(expiresAt) &&
    now >= validFrom &&
    now < expiresAt
  );
}

function finalActionMatchesDelegation(
  scenario: ScenarioManifestRecord
): boolean {
  const { permittedAction } =
    delegationParts(scenario);

  return sameJson(
    actionSemantics(
      scenario.canonical_action
    ),
    actionSemantics(
      permittedAction
    )
  );
}

function useMatches(
  left: JsonObject,
  right: JsonObject
): boolean {
  return sameJson(left, right);
}

function admissionStateValid(
  context: JsonObject,
  evidence: JsonObject
): boolean {
  const evaluatedAt = Date.parse(
    stringValue(
      context.evaluatedAt,
      "context.evaluatedAt"
    )
  );

  const requestedUse = objectValue(
    context.requestedUse,
    "context.requestedUse"
  );

  const policy = objectValue(
    context.policy,
    "context.policy"
  );

  const trustedSources = arrayValue(
    policy.trustedSourceIds,
    "policy.trustedSourceIds"
  ).map(String);

  const trustedValidators = arrayValue(
    policy.trustedValidatorIds,
    "policy.trustedValidatorIds"
  ).map(String);

  const trustedAuthorities = arrayValue(
    policy.trustedAuthorityIds,
    "policy.trustedAuthorityIds"
  ).map(String);

  const materialArtifactIds = arrayValue(
    context.materialArtifactIds,
    "context.materialArtifactIds"
  ).map(String);

  const artifacts = arrayValue(
    evidence.artifacts,
    "evidence.artifacts"
  );

  const validationEvidence = arrayValue(
    evidence.validationEvidence,
    "evidence.validationEvidence"
  );

  for (const materialId of materialArtifactIds) {
    const artifactEntry = artifacts.find(
      (entry) =>
        objectValue(
          entry,
          "artifact"
        ).id === materialId
    );

    if (!artifactEntry) {
      return false;
    }

    const artifact = objectValue(
      artifactEntry,
      "artifact"
    );

    if (artifact.revoked === true) {
      return false;
    }

    const createdAt = Date.parse(
      stringValue(
        artifact.createdAt,
        "artifact.createdAt"
      )
    );

    const artifactExpiresAt = Date.parse(
      stringValue(
        artifact.expiresAt,
        "artifact.expiresAt"
      )
    );

    if (
      !Number.isFinite(evaluatedAt) ||
      evaluatedAt < createdAt ||
      evaluatedAt >= artifactExpiresAt
    ) {
      return false;
    }

    const provenance = objectValue(
      artifact.provenance,
      "artifact.provenance"
    );

    if (
      !trustedSources.includes(
        stringValue(
          provenance.sourceId,
          "artifact.provenance.sourceId"
        )
      )
    ) {
      return false;
    }

    const artifactHash = stringValue(
      artifact.contentHash,
      "artifact.contentHash"
    );

    const authorityId = stringValue(
      provenance.authorityId,
      "artifact.provenance.authorityId"
    );

    const relevantEvidence =
      validationEvidence
        .map((entry) =>
          objectValue(
            entry,
            "validationEvidence"
          )
        )
        .filter(
          (entry) =>
            entry.artifactId === materialId &&
            entry.contentHash === artifactHash
        );

    const evidenceIsFreshAndBound = (
      entry: JsonObject
    ): boolean => {
      const validatorId = stringValue(
        entry.validatorId,
        "validationEvidence.validatorId"
      );

      const evidenceAuthorityId =
        stringValue(
          entry.authorityId,
          "validationEvidence.authorityId"
        );

      const validatedAt = Date.parse(
        stringValue(
          entry.validatedAt,
          "validationEvidence.validatedAt"
        )
      );

      const expiresAt = Date.parse(
        stringValue(
          entry.expiresAt,
          "validationEvidence.expiresAt"
        )
      );

      const use = objectValue(
        entry.use,
        "validationEvidence.use"
      );

      return (
        trustedValidators.includes(
          validatorId
        ) &&
        trustedAuthorities.includes(
          evidenceAuthorityId
        ) &&
        evidenceAuthorityId ===
          authorityId &&
        Number.isFinite(validatedAt) &&
        Number.isFinite(expiresAt) &&
        validatedAt <= evaluatedAt &&
        evaluatedAt < expiresAt &&
        useMatches(
          use,
          requestedUse
        )
      );
    };

    const authorityValid =
      relevantEvidence.some(
        (entry) =>
          entry.kind === "authority" &&
          evidenceIsFreshAndBound(entry)
      );

    const validationValid =
      relevantEvidence.some(
        (entry) =>
          entry.kind === "validation" &&
          evidenceIsFreshAndBound(entry)
      );

    if (
      !authorityValid ||
      !validationValid
    ) {
      return false;
    }
  }

  return true;
}

function baselineAndCurrentAdmission(
  scenario: ScenarioManifestRecord
): {
  baselineValid: boolean;
  currentValid: boolean;
  contextChanged: boolean;
  evidenceChanged: boolean;
} {
  if (
    scenario.context_state === null &&
    scenario.evidence_state === null
  ) {
    return {
      baselineValid: true,
      currentValid: true,
      contextChanged: false,
      evidenceChanged: false
    };
  }

  if (
    !scenario.context_state ||
    !scenario.evidence_state
  ) {
    throw new Error(
      `${scenario.scenario_id}: partial context/evidence state`
    );
  }

  const baselineContext = objectValue(
    scenario.context_state.baseline,
    "context_state.baseline"
  );

  const currentContext = objectValue(
    scenario.context_state.current,
    "context_state.current"
  );

  const baselineEvidence = objectValue(
    scenario.evidence_state.baseline,
    "evidence_state.baseline"
  );

  const currentEvidence = objectValue(
    scenario.evidence_state.current,
    "evidence_state.current"
  );

  return {
    baselineValid:
      admissionStateValid(
        baselineContext,
        baselineEvidence
      ),

    currentValid:
      admissionStateValid(
        currentContext,
        currentEvidence
      ),

    contextChanged:
      !sameJson(
        baselineContext,
        currentContext
      ),

    evidenceChanged:
      !sameJson(
        baselineEvidence,
        currentEvidence
      )
  };
}

function delegationContinuityBroken(
  scenario: ScenarioManifestRecord
): boolean {
  const {
    baselineDelegation,
    currentDelegation,
    baselineHost,
    currentHost
  } = delegationParts(scenario);

  const currentProposal = objectValue(
    currentDelegation.proposal,
    "current.delegation.proposal"
  );

  const confirmation = objectValue(
    currentDelegation.confirmation,
    "current.delegation.confirmation"
  );

  const baselineConfirmation =
    objectValue(
      baselineDelegation.confirmation,
      "baseline.delegation.confirmation"
    );

  const delegationId = stringValue(
    currentProposal.id,
    "current.delegation.proposal.id"
  );

  const currentDigest = stringValue(
    currentDelegation.digest,
    "current.delegation.digest"
  );

  const establishedDigests =
    objectValue(
      currentHost.establishedDigests,
      "current.host.establishedDigests"
    );

  const hostDigest =
    establishedDigests[delegationId];

  if (hostDigest !== currentDigest) {
    return true;
  }

  const proposalDelegateId =
    stringValue(
      currentProposal.delegateId,
      "current.delegation.proposal.delegateId"
    );

  if (
    currentHost.delegateId !==
      proposalDelegateId ||
    scenario.delegation_state?.receivingDelegateId !==
      proposalDelegateId
  ) {
    return true;
  }

  const standingEvidence = arrayValue(
    objectValue(
      scenario.delegation_state?.current,
      "delegation_state.current"
    ).standingEvidence,
    "current.standingEvidence"
  );

  if (
    standingEvidence.some(
      (entry) =>
        objectValue(
          entry,
          "standingEvidence"
        ).delegationDigest !==
        currentDigest
    )
  ) {
    return true;
  }

  const baselineProposal =
    objectValue(
      baselineDelegation.proposal,
      "baseline.delegation.proposal"
    );

  if (
    !sameJson(
      baselineProposal,
      currentProposal
    ) &&
    sameJson(
      baselineConfirmation,
      confirmation
    )
  ) {
    return true;
  }

  if (
    !sameJson(
      baselineHost.establishedDigests as JsonValue,
      currentHost.establishedDigests as JsonValue
    ) &&
    hostDigest !== currentDigest
  ) {
    return true;
  }

  return false;
}
function assessment(
  decision: "PERMIT" | "DENY",
  primaryInvariant: string,
  transition: number | null
): OracleAssessment {
  return {
    decision,
    primary_invariant_family:
      primaryInvariant,
    first_invariant_divergence:
      decision === "PERMIT"
        ? null
        : primaryInvariant,
    divergence_transition_index:
      transition
  };
}

function requireSemanticCondition(
  scenario: ScenarioManifestRecord,
  condition: boolean,
  message: string
): void {
  if (!condition) {
    throw new Error(
      `${scenario.scenario_id}: independent oracle semantic check failed: ${message}`
    );
  }
}

function callerControlledAdmissionClaimPresent(
  scenario: ScenarioManifestRecord
): boolean {
  if (!scenario.context_state) {
    return false;
  }

  const claim =
    scenario.context_state
      .callerControlledClaim;

  return (
    typeof claim === "string" &&
    claim.length > 0
  );
}

function trustedAdmissionEvidenceNotInjected(
  scenario: ScenarioManifestRecord
): boolean {
  if (!scenario.context_state) {
    return false;
  }

  return (
    scenario.context_state
      .trustedAdmissionEvidenceInjected ===
    false
  );
}

function delegationRightsAreNone(
  scenario: ScenarioManifestRecord
): boolean {
  if (!scenario.delegation_state) {
    return false;
  }

  return (
    scenario.delegation_state
      .delegationRights === "none"
  );
}

export function assessOracle(
  scenario: ScenarioManifestRecord
): OracleAssessment {
  const insideTime =
    finalTimeInsideAuthority(scenario);

  const actionMatches =
    finalActionMatchesDelegation(scenario);

  const delegationBroken =
    delegationContinuityBroken(scenario);

  switch (scenario.scenario_family) {
    case "F1": {
      const admission =
        baselineAndCurrentAdmission(
          scenario
        );

      requireSemanticCondition(
        scenario,
        insideTime,
        "F1 final evaluation time must remain within authority."
      );

      requireSemanticCondition(
        scenario,
        actionMatches,
        "F1 final action must remain within the established delegated action."
      );

      requireSemanticCondition(
        scenario,
        admission.baselineValid &&
          admission.currentValid,
        "F1 baseline and current context admission states must remain valid."
      );

      requireSemanticCondition(
        scenario,
        !delegationBroken,
        "F1 delegation continuity must remain intact."
      );

      return assessment(
        "PERMIT",
        "none",
        null
      );
    }

    case "F2": {
      const admission =
        baselineAndCurrentAdmission(
          scenario
        );

      requireSemanticCondition(
        scenario,
        !insideTime,
        "F2 final evaluation time must be at or beyond expiration."
      );

      requireSemanticCondition(
        scenario,
        actionMatches,
        "F2 must not introduce a scope mutation."
      );

      requireSemanticCondition(
        scenario,
        admission.baselineValid &&
          admission.currentValid,
        "F2 context/evidence must remain valid."
      );

      requireSemanticCondition(
        scenario,
        !delegationBroken,
        "F2 must not introduce a delegation-continuity mutation."
      );

      return assessment(
        "DENY",
        "temporal validity",
        5
      );
    }

    case "F3": {
      const admission =
        baselineAndCurrentAdmission(
          scenario
        );

      requireSemanticCondition(
        scenario,
        insideTime,
        "F3 must remain temporally valid."
      );

      requireSemanticCondition(
        scenario,
        !actionMatches,
        "F3 final action must diverge from the established delegated action."
      );

      requireSemanticCondition(
        scenario,
        admission.baselineValid &&
          admission.currentValid,
        "F3 context/evidence must remain valid."
      );

      requireSemanticCondition(
        scenario,
        !delegationBroken,
        "F3 must not introduce a delegation-continuity mutation."
      );

      return assessment(
        "DENY",
        "scope",
        4
      );
    }

    case "F4": {
      const admission =
        baselineAndCurrentAdmission(
          scenario
        );

      requireSemanticCondition(
        scenario,
        insideTime,
        "F4 must remain temporally valid."
      );

      requireSemanticCondition(
        scenario,
        actionMatches,
        "F4 must not introduce a final-action scope mutation."
      );

      requireSemanticCondition(
        scenario,
        admission.baselineValid,
        "F4 baseline context admission must be valid."
      );

      requireSemanticCondition(
        scenario,
        !admission.currentValid,
        "F4 current context admission must be invalid after continuity substitution."
      );

      requireSemanticCondition(
        scenario,
        admission.contextChanged ||
          admission.evidenceChanged,
        "F4 must contain a context/evidence continuity change."
      );

      requireSemanticCondition(
        scenario,
        !delegationBroken,
        "F4 must not introduce a delegation-continuity mutation."
      );

      return assessment(
        "DENY",
        "context continuity",
        3
      );
    }

    case "F5": {
      const admission =
        baselineAndCurrentAdmission(
          scenario
        );

      requireSemanticCondition(
        scenario,
        insideTime,
        "F5 must remain temporally valid."
      );

      requireSemanticCondition(
        scenario,
        actionMatches,
        "F5 must not introduce a final-action scope mutation."
      );

      requireSemanticCondition(
        scenario,
        admission.baselineValid,
        "F5 baseline evidence/provenance state must be valid."
      );

      requireSemanticCondition(
        scenario,
        !admission.currentValid,
        "F5 current evidence/provenance state must be invalid."
      );

      requireSemanticCondition(
        scenario,
        admission.evidenceChanged,
        "F5 must contain an evidence/provenance change."
      );

      requireSemanticCondition(
        scenario,
        !callerControlledAdmissionClaimPresent(
          scenario
        ),
        "F5 must remain distinct from caller-controlled prior-admission claims."
      );

      requireSemanticCondition(
        scenario,
        !delegationBroken,
        "F5 must not introduce a delegation-continuity mutation."
      );

      return assessment(
        "DENY",
        "evidence/provenance",
        3
      );
    }

    case "F6": {
      const admission =
        baselineAndCurrentAdmission(
          scenario
        );

      requireSemanticCondition(
        scenario,
        insideTime,
        "F6 must remain temporally valid."
      );

      requireSemanticCondition(
        scenario,
        actionMatches,
        "F6 must not introduce a final-action scope mutation."
      );

      requireSemanticCondition(
        scenario,
        admission.baselineValid,
        "F6 baseline admission state must be valid."
      );

      requireSemanticCondition(
        scenario,
        !admission.currentValid,
        "F6 current admission state must be invalid."
      );

      requireSemanticCondition(
        scenario,
        callerControlledAdmissionClaimPresent(
          scenario
        ),
        "F6 must contain a caller-controlled prior-admission claim."
      );

      requireSemanticCondition(
        scenario,
        trustedAdmissionEvidenceNotInjected(
          scenario
        ),
        "F6 must not inject benchmark-trusted admission evidence."
      );

      requireSemanticCondition(
        scenario,
        !delegationBroken,
        "F6 must not introduce a delegation-continuity mutation."
      );

      return assessment(
        "DENY",
        "admission trust",
        3
      );
    }

    case "F8": {
      requireSemanticCondition(
        scenario,
        insideTime,
        "F8 must remain temporally valid."
      );

      requireSemanticCondition(
        scenario,
        actionMatches,
        "F8 must not introduce a final-action scope mutation."
      );

      requireSemanticCondition(
        scenario,
        delegationRightsAreNone(
          scenario
        ),
        "F8 delegationRights must remain none."
      );

      requireSemanticCondition(
        scenario,
        delegationBroken,
        "F8 must contain a delegation-continuity break."
      );

      return assessment(
        "DENY",
        "delegation",
        2
      );
    }
  }
}

export function storedOracleMatchesAssessment(
  scenario: ScenarioManifestRecord
): boolean {
  const independent =
    assessOracle(scenario);

  return (
    scenario.oracle_decision ===
      independent.decision &&
    scenario.primary_invariant_family ===
      independent.primary_invariant_family &&
    scenario
      .expected_first_invariant_divergence ===
      independent.first_invariant_divergence &&
    scenario
      .expected_divergence_transition ===
      independent.divergence_transition_index
  );
}