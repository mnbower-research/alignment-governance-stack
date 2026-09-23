import type { ContextAdmissionRequest } from "@alignment-governance-stack/shared-types";

export interface ContextAdmissionInputValidation {
  valid: boolean;
  errors: string[];
}

const record = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const string = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;
const strings = (v: unknown): boolean => Array.isArray(v) && v.every(string) && new Set(v).size === v.length;
const date = (v: unknown): boolean => {
  if (!string(v) || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?(?:Z|[+-]\d\d:\d\d)$/.test(v) || !Number.isFinite(Date.parse(v))) return false;
  const [year, month, day] = v.slice(0, 10).split("-").map(Number) as [number, number, number];
  const calendar = new Date(`${v.slice(0, 10)}T00:00:00Z`);
  return calendar.getUTCFullYear() === year && calendar.getUTCMonth() + 1 === month && calendar.getUTCDate() === day && Number(v.slice(11, 13)) < 24;
};
const hash = (v: unknown): boolean => typeof v === "string" && /^sha256:[a-f0-9]{64}$/.test(v);

export function validateContextAdmissionRequest(input: unknown): ContextAdmissionInputValidation {
  const errors: string[] = [];
  const check = (valid: boolean, path: string): void => { if (!valid) errors.push(`Invalid ${path}.`); };
  const keys = (value: Record<string, unknown>, allowed: string[], path: string): void => {
    for (const key of Object.keys(value)) check(allowed.includes(key), `${path}.${key} (unknown field)`);
  };
  const optional = (v: Record<string, unknown>, key: string, test: (value: unknown) => boolean, path: string): void => {
    if (v[key] !== undefined) check(test(v[key]), `${path}.${key}`);
  };
  const scope = (v: unknown, path: string): void => {
    if (!record(v)) { check(false, path); return; }
    keys(v, ["purpose", "mode", "receiverAgentId", "trustDomain", "action"], path);
    for (const key of ["purpose", "receiverAgentId", "trustDomain"]) check(string(v[key]), `${path}.${key}`);
    check(["reference", "operational", "governance_instruction", "approval_reuse"].includes(String(v.mode)), `${path}.mode`);
    if (v.action !== undefined) {
      if (!record(v.action)) check(false, `${path}.action`);
      else {
        const actionKeys = ["proposalId", "tool", "actionType", "target", "environment"];
        keys(v.action, [...actionKeys, "actionHash"], `${path}.action`);
        for (const key of actionKeys) check(string(v.action[key]), `${path}.action.${key}`);
        optional(v.action, "actionHash", hash, `${path}.action`);
      }
    }
  };
  if (!record(input)) return { valid: false, errors: ["Context admission request must be an object."] };
  keys(input, ["artifacts", "materialArtifactIds", "requestedUse", "evaluatedAt", "policy", "validationEvidence"], "request");
  check(date(input.evaluatedAt), "evaluatedAt");
  scope(input.requestedUse, "requestedUse");
  if (!record(input.policy)) check(false, "policy");
  else {
    keys(input.policy, ["id", "trustedSourceIds", "trustedValidatorIds", "trustedAuthorityIds", "requireValidation", "requireAuthority", "requireIntegrity"], "policy");
    check(string(input.policy.id), "policy.id");
    for (const key of ["trustedSourceIds", "trustedValidatorIds", "trustedAuthorityIds"]) check(strings(input.policy[key]), `policy.${key}`);
    for (const key of ["requireValidation", "requireAuthority", "requireIntegrity"]) optional(input.policy, key, v => typeof v === "boolean", "policy");
  }
  check(strings(input.materialArtifactIds) && (input.materialArtifactIds as unknown[]).length > 0, "materialArtifactIds");
  if (!Array.isArray(input.artifacts) || input.artifacts.length === 0) check(false, "artifacts");
  else {
    const ids = new Set<string>();
    input.artifacts.forEach((artifact: unknown, i: number) => {
      const path = `artifacts[${i}]`;
      if (!record(artifact)) { check(false, path); return; }
      keys(artifact, ["id", "artifactType", "contentHash", "content", "provenance", "createdAt", "expiresAt", "revoked", "dataSensitivity", "permittedUses", "parentArtifactIds", "transformations", "validationStatus", "priorAdmissionRefs"], path);
      check(string(artifact.id), `${path}.id`);
      if (string(artifact.id)) { check(!ids.has(artifact.id), `${path}.id (duplicate)`); ids.add(artifact.id); }
      check(string(artifact.artifactType), `${path}.artifactType`);
      optional(artifact, "content", v => typeof v === "string", path);
      optional(artifact, "contentHash", hash, path);
      for (const key of ["createdAt", "expiresAt"]) optional(artifact, key, date, path);
      optional(artifact, "revoked", v => typeof v === "boolean", path);
      optional(artifact, "dataSensitivity", v => ["low", "medium", "high"].includes(String(v)), path);
      optional(artifact, "validationStatus", v => ["unvalidated", "validated", "invalid"].includes(String(v)), path);
      for (const key of ["permittedUses", "parentArtifactIds", "priorAdmissionRefs"]) optional(artifact, key, strings, path);
      if (artifact.provenance !== undefined) {
        if (!record(artifact.provenance)) check(false, `${path}.provenance`);
        else {
          keys(artifact.provenance, ["sourceId", "producerAgentId", "authorityId", "authorityExpiresAt", "workflowId", "taskId", "trustDomain", "receiptRefs", "fingerprintRefs", "authorityRefs"], `${path}.provenance`);
          for (const key of ["sourceId", "producerAgentId", "authorityId", "workflowId", "taskId", "trustDomain"]) optional(artifact.provenance, key, string, `${path}.provenance`);
          optional(artifact.provenance, "authorityExpiresAt", date, `${path}.provenance`);
          for (const key of ["receiptRefs", "fingerprintRefs", "authorityRefs"]) optional(artifact.provenance, key, strings, `${path}.provenance`);
        }
      }
      if (artifact.transformations !== undefined) {
        if (!Array.isArray(artifact.transformations)) check(false, `${path}.transformations`);
        else artifact.transformations.forEach((t: unknown, j: number) => {
          const tp = `${path}.transformations[${j}]`;
          if (!record(t)) { check(false, tp); return; }
          keys(t, ["id", "type", "parentArtifactIds", "performedBy", "occurredAt"], tp);
          check(string(t.id) && string(t.type) && strings(t.parentArtifactIds), tp);
          optional(t, "performedBy", string, tp);
          optional(t, "occurredAt", date, tp);
        });
      }
    });
  }
  if (input.validationEvidence !== undefined) {
    if (!Array.isArray(input.validationEvidence)) check(false, "validationEvidence");
    else {
      const ids = new Set<string>();
      input.validationEvidence.forEach((v: unknown, i: number) => {
        const path = `validationEvidence[${i}]`;
        if (!record(v)) { check(false, path); return; }
        keys(v, ["id", "kind", "artifactId", "contentHash", "validatorId", "authorityId", "use", "validatedAt", "expiresAt", "revoked"], path);
        for (const key of ["id", "artifactId", "validatorId"]) check(string(v[key]), `${path}.${key}`);
        if (string(v.id)) { check(!ids.has(v.id), `${path}.id (duplicate)`); ids.add(v.id); }
        check(["integrity", "validation", "authority", "domain_transfer"].includes(String(v.kind)), `${path}.kind`);
        check(hash(v.contentHash), `${path}.contentHash`);
        check(date(v.validatedAt) && date(v.expiresAt), `${path}.validity`);
        optional(v, "authorityId", string, path);
        optional(v, "revoked", value => typeof value === "boolean", path);
        scope(v.use, `${path}.use`);
      });
    }
  }
  return { valid: errors.length === 0, errors };
}

export function assertContextAdmissionRequest(input: unknown): asserts input is ContextAdmissionRequest {
  const result = validateContextAdmissionRequest(input);
  if (!result.valid) throw new Error(result.errors.join("\n"));
}
