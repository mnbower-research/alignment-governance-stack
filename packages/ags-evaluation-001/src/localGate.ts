import { createHash } from "node:crypto";
import { canonicalSerialize } from "./schemas.js";
import {
  type CanonicalAction,
  type JsonObject,
  type JsonValue,
  type ScenarioManifestRecord
} from "./types.js";

export interface LocalGateResult {
  decision: "ALLOW" | "DENY";
  failedChecks: string[];
}

function objectValue(
  value: JsonValue | undefined
): JsonObject | null {
  if (
    value === null ||
    value === undefined ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return null;
  }

  return value as JsonObject;
}

function arrayValue(
  value: JsonValue | undefined
): JsonValue[] | null {
  return Array.isArray(value)
    ? value
    : null;
}

function nonEmptyString(
  value: JsonValue | undefined
): value is string {
  return (
    typeof value === "string" &&
    value.length > 0
  );
}

function validTime(
  value: JsonValue | undefined
): number | null {
  if (typeof value !== "string") {
    return null;
  }

  const parsed = Date.parse(value);

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

function sha256(
  value: string
): string {
  return `sha256:${createHash("sha256")
    .update(value, "utf8")
    .digest("hex")}`;
}

function localActionHash(
  action: CanonicalAction
): string {
  const projection: JsonObject = {
    tool: action.tool,
    actionType: action.actionType,
    target: action.target,
    environment: action.environment,
    reversible: action.reversible,
    externalFacing: action.externalFacing,
    dataSensitivity: action.dataSensitivity,
    requiresApproval: action.requiresApproval,
    knownApproval: false
  };

  if (Object.keys(action.metadata).length > 0) {
    projection.metadata =
      structuredClone(action.metadata);
  }

  return sha256(
    canonicalSerialize(projection)
  );
}

function directActionCompatible(
  candidate: JsonObject,
  finalAction: CanonicalAction
): boolean {
  const fields = [
    "id",
    "userRequest",
    "tool",
    "actionType",
    "target",
    "environment",
    "reversible",
    "externalFacing",
    "dataSensitivity",
    "requiresApproval"
  ] as const;

  for (const field of fields) {
    if (
      canonicalSerialize(
        candidate[field] ?? null
      ) !==
      canonicalSerialize(
        finalAction[field] as JsonValue
      )
    ) {
      return false;
    }
  }

  return (
    canonicalSerialize(
      candidate.metadata ?? null
    ) ===
    canonicalSerialize(
      finalAction.metadata
    )
  );
}

function stringArray(
  value: JsonValue | undefined
): string[] | null {
  const array = arrayValue(value);

  if (
    !array ||
    array.some(
      (entry) => typeof entry !== "string"
    )
  ) {
    return null;
  }

  return array as string[];
}

export function runLocalGate(
  scenario: ScenarioManifestRecord
): LocalGateResult {
  const failedChecks: string[] = [];
  const action = scenario.canonical_action;
  const finalTime =
    validTime(
      scenario.temporal_state
        .final_evaluation_time
    );

  if (finalTime === null) {
    failedChecks.push(
      "D_INVALID_FINAL_EVALUATION_TIME"
    );
  }

  for (const field of [
    "id",
    "userRequest",
    "tool",
    "actionType",
    "target",
    "environment"
  ] as const) {
    if (!nonEmptyString(action[field])) {
      failedChecks.push(
        `A_FINAL_ACTION_${field.toUpperCase()}`
      );
    }
  }

  if (
    action.requiresApproval === true &&
    action.knownApproval !== true
  ) {
    failedChecks.push(
      "A_REQUIRED_APPROVAL_NOT_KNOWN"
    );
  }

  if (scenario.originating_authority) {
    const authority =
      scenario.originating_authority;

    const humanId =
      authority.humanId;

    const approval =
      objectValue(
        authority.approvalEvidence
      );

    const authorityMap =
      objectValue(
        authority.authorityMap
      );

    if (approval) {
      if (
        !nonEmptyString(humanId) ||
        approval.approverId !== humanId
      ) {
        failedChecks.push(
          "B_APPROVER_IDENTITY_MISMATCH"
        );
      }

      if (
        !nonEmptyString(
          approval.approverRoleId
        )
      ) {
        failedChecks.push(
          "B_APPROVER_ROLE_MISSING"
        );
      }

      const approvedAt =
        validTime(approval.approvedAt);

      const approvalExpiresAt =
        validTime(approval.expiresAt);

      if (
        finalTime === null ||
        approvedAt === null ||
        finalTime < approvedAt
      ) {
        failedChecks.push(
          "B_APPROVAL_NOT_YET_VALID"
        );
      }

      if (
        finalTime === null ||
        approvalExpiresAt === null ||
        finalTime >= approvalExpiresAt
      ) {
        failedChecks.push(
          "B_APPROVAL_EXPIRED"
        );
      }

      const binding =
        objectValue(approval.binding);

      if (
        !binding ||
        binding.proposalId !== action.id ||
        binding.userRequest !==
          action.userRequest ||
        binding.actionHash !==
          localActionHash(action)
      ) {
        failedChecks.push(
          "B_APPROVAL_BINDING_MISMATCH"
        );
      }

      if (authorityMap) {
        const roles =
          arrayValue(authorityMap.roles);

        const role =
          roles?.find((entry) => {
            const candidate =
              objectValue(entry);

            return (
              candidate !== null &&
              candidate.id ===
                approval.approverRoleId
            );
          });

        const roleObject =
          role === undefined
            ? null
            : objectValue(role);

        if (!roleObject) {
          failedChecks.push(
            "C_CURRENT_ROLE_MISSING"
          );
        } else {
          const scopes =
            arrayValue(roleObject.scopes);

          const scopeMatch =
            scopes?.some((entry) => {
              const scope =
                objectValue(entry);

              return (
                scope !== null &&
                scope.tool === action.tool &&
                scope.actionType ===
                  action.actionType
              );
            }) ?? false;

          if (!scopeMatch) {
            failedChecks.push(
              "C_AUTHORITY_SCOPE_MISMATCH"
            );
          }
        }
      }
    }
  }

  if (
    scenario.context_state !== null ||
    scenario.evidence_state !== null
  ) {
    if (
      scenario.context_state === null ||
      scenario.evidence_state === null
    ) {
      failedChecks.push(
        "E_INCOMPLETE_CONTEXT_PRESENTATION"
      );
    } else {
      const currentContext =
        objectValue(
          scenario.context_state.current
        );

      const currentEvidence =
        objectValue(
          scenario.evidence_state.current
        );

      if (
        !currentContext ||
        !currentEvidence
      ) {
        failedChecks.push(
          "E_INVALID_CONTEXT_PRESENTATION"
        );
      } else {
        const requestedUse =
          objectValue(
            currentContext.requestedUse
          );

        const policy =
          objectValue(
            currentContext.policy
          );

        const requestedAction =
          requestedUse
            ? objectValue(
                requestedUse.action
              )
            : null;

        if (
          !requestedUse ||
          requestedUse.mode !==
            "operational"
        ) {
          failedChecks.push(
            "E_CONTEXT_MODE"
          );
        }

        if (
          !requestedUse ||
          !nonEmptyString(
            requestedUse.purpose
          )
        ) {
          failedChecks.push(
            "E_CONTEXT_PURPOSE"
          );
        }

        if (
          !requestedUse ||
          !nonEmptyString(
            requestedUse.receiverAgentId
          )
        ) {
          failedChecks.push(
            "E_CONTEXT_RECEIVER"
          );
        }

        if (
          !requestedUse ||
          !nonEmptyString(
            requestedUse.trustDomain
          )
        ) {
          failedChecks.push(
            "E_CONTEXT_TRUST_DOMAIN"
          );
        }

        for (const field of [
          "tool",
          "actionType",
          "target",
          "environment"
        ] as const) {
          if (
            !requestedAction ||
            requestedAction[field] !==
              action[field]
          ) {
            failedChecks.push(
              `E_CONTEXT_ACTION_${field.toUpperCase()}`
            );
          }
        }

        const materialIds =
          stringArray(
            currentContext
              .materialArtifactIds
          ) ?? [];

        const artifacts =
          arrayValue(
            currentEvidence.artifacts
          ) ?? [];

        const artifactObjects =
          artifacts
            .map((entry) =>
              objectValue(entry)
            )
            .filter(
              (
                entry
              ): entry is JsonObject =>
                entry !== null
            );

        const materialArtifacts =
          materialIds.map((id) =>
            artifactObjects.find(
              (artifact) =>
                artifact.id === id
            )
          );

        if (
          materialArtifacts.some(
            (artifact) =>
              artifact === undefined
          )
        ) {
          failedChecks.push(
            "E_MATERIAL_ARTIFACT_MISSING"
          );
        }

        const trustedSources =
          policy
            ? stringArray(
                policy.trustedSourceIds
              )
            : null;

        const trustedAuthorities =
          policy
            ? stringArray(
                policy.trustedAuthorityIds
              )
            : null;

        for (
          const artifact of
          materialArtifacts
        ) {
          if (!artifact) {
            continue;
          }

          const provenance =
            objectValue(
              artifact.provenance
            );

          if (
            trustedSources !== null &&
            (
              !provenance ||
              typeof provenance.sourceId !==
                "string" ||
              !trustedSources.includes(
                provenance.sourceId
              )
            )
          ) {
            failedChecks.push(
              "E_UNTRUSTED_ARTIFACT_SOURCE"
            );
          }

          if (
            trustedAuthorities !== null &&
            (
              !provenance ||
              typeof provenance.authorityId !==
                "string" ||
              !trustedAuthorities.includes(
                provenance.authorityId
              )
            )
          ) {
            failedChecks.push(
              "E_UNTRUSTED_ARTIFACT_AUTHORITY"
            );
          }

          if (
            artifact.revoked === true
          ) {
            failedChecks.push(
              "E_ARTIFACT_REVOKED"
            );
          }

          if (
            artifact.expiresAt !==
              undefined
          ) {
            const artifactExpiry =
              validTime(
                artifact.expiresAt
              );

            if (
              finalTime === null ||
              artifactExpiry === null ||
              finalTime >=
                artifactExpiry
            ) {
              failedChecks.push(
                "E_ARTIFACT_EXPIRED"
              );
            }
          }

          const permittedUses =
            stringArray(
              artifact.permittedUses
            );

          if (
            !requestedUse ||
            typeof requestedUse.purpose !==
              "string" ||
            !permittedUses ||
            !permittedUses.includes(
              requestedUse.purpose
            )
          ) {
            failedChecks.push(
              "E_PURPOSE_NOT_PERMITTED"
            );
          }
        }

        if (
          policy?.requireValidation ===
          true
        ) {
          const evidence =
            arrayValue(
              currentEvidence
                .validationEvidence
            ) ?? [];

          if (evidence.length === 0) {
            failedChecks.push(
              "F_VALIDATION_EVIDENCE_MISSING"
            );
          }

          const trustedValidators =
            stringArray(
              policy
                .trustedValidatorIds
            ) ?? [];

          const trustedAuthorityIds =
            stringArray(
              policy
                .trustedAuthorityIds
            ) ?? [];

          for (const entry of evidence) {
            const record =
              objectValue(entry);

            if (!record) {
              failedChecks.push(
                "F_INVALID_VALIDATION_RECORD"
              );
              continue;
            }

            if (
              typeof record.validatorId !==
                "string" ||
              !trustedValidators.includes(
                record.validatorId
              )
            ) {
              failedChecks.push(
                "F_UNTRUSTED_VALIDATOR"
              );
            }

            if (
              typeof record.authorityId !==
                "string" ||
              !trustedAuthorityIds.includes(
                record.authorityId
              )
            ) {
              failedChecks.push(
                "F_UNTRUSTED_VALIDATION_AUTHORITY"
              );
            }

            const artifact =
              typeof record.artifactId ===
                "string"
                ? materialArtifacts.find(
                    (candidate) =>
                      candidate?.id ===
                      record.artifactId
                  )
                : undefined;

            if (!artifact) {
              failedChecks.push(
                "F_VALIDATION_ARTIFACT_MISMATCH"
              );
            } else if (
              record.contentHash !==
              artifact.contentHash
            ) {
              failedChecks.push(
                "F_CONTENT_HASH_MISMATCH"
              );
            }

            const validatedAt =
              validTime(
                record.validatedAt
              );

            const evidenceExpiry =
              validTime(
                record.expiresAt
              );

            if (
              finalTime === null ||
              validatedAt === null ||
              finalTime < validatedAt
            ) {
              failedChecks.push(
                "F_VALIDATION_NOT_YET_VALID"
              );
            }

            if (
              finalTime === null ||
              evidenceExpiry === null ||
              finalTime >=
                evidenceExpiry
            ) {
              failedChecks.push(
                "F_VALIDATION_EXPIRED"
              );
            }

            const use =
              objectValue(record.use);

            if (
              !use ||
              !requestedUse ||
              use.purpose !==
                requestedUse.purpose ||
              use.mode !==
                requestedUse.mode ||
              use.receiverAgentId !==
                requestedUse
                  .receiverAgentId ||
              use.trustDomain !==
                requestedUse.trustDomain
            ) {
              failedChecks.push(
                "F_VALIDATION_USE_MISMATCH"
              );
            }

            const useAction =
              use
                ? objectValue(
                    use.action
                  )
                : null;

            for (const field of [
              "tool",
              "actionType",
              "target",
              "environment"
            ] as const) {
              if (
                !useAction ||
                !requestedAction ||
                useAction[field] !==
                  requestedAction[field]
              ) {
                failedChecks.push(
                  `F_VALIDATION_ACTION_${field.toUpperCase()}`
                );
              }
            }
          }
        }
      }
    }
  }

  if (scenario.delegation_state) {
    const current =
      objectValue(
        scenario.delegation_state.current
      );

    const delegation =
      current
        ? objectValue(
            current.delegation
          )
        : null;

    const host =
      current
        ? objectValue(current.host)
        : null;

    const proposal =
      delegation
        ? objectValue(
            delegation.proposal
          )
        : null;

    const receivingDelegateId =
      scenario.delegation_state
        .receivingDelegateId;

    if (
      !proposal ||
      !nonEmptyString(proposal.id)
    ) {
      failedChecks.push(
        "G_DELEGATION_ID_MISSING"
      );
    }

    if (
      !host ||
      !nonEmptyString(
        host.delegateId
      ) ||
      !nonEmptyString(
        receivingDelegateId
      ) ||
      host.delegateId !==
        receivingDelegateId
    ) {
      failedChecks.push(
        "G_DELEGATE_IDENTITY_MISMATCH"
      );
    }

    if (
      scenario.delegation_state
        .delegationRights !== "none"
    ) {
      failedChecks.push(
        "G_DELEGATION_RIGHTS"
      );
    }

    if (proposal) {
      const validFrom =
        validTime(proposal.validFrom);

      const expiresAt =
        validTime(proposal.expiresAt);

      if (
        finalTime === null ||
        validFrom === null ||
        finalTime < validFrom
      ) {
        failedChecks.push(
          "G_DELEGATION_NOT_YET_VALID"
        );
      }

      if (
        finalTime === null ||
        expiresAt === null ||
        finalTime >= expiresAt
      ) {
        failedChecks.push(
          "G_DELEGATION_EXPIRED"
        );
      }

      const permittedActions =
        arrayValue(
          proposal.permittedActions
        ) ?? [];

      const locallyCompatible =
        permittedActions.some(
          (entry) => {
            const candidate =
              objectValue(entry);

            return (
              candidate !== null &&
              directActionCompatible(
                candidate,
                action
              )
            );
          }
        );

      if (!locallyCompatible) {
        failedChecks.push(
          "G_PERMITTED_ACTION_MISMATCH"
        );
      }
    }
  }

  return {
    decision:
      failedChecks.length === 0
        ? "ALLOW"
        : "DENY",
    failedChecks
  };
}
