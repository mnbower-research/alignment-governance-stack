import type { ArtifactParser } from "../types.js";
import { createArtifact, hasAgentActionShape, isRecord, isString } from "../parserHelpers.js";

function decisionLike(value: unknown, allowed: string[]): boolean {
  return isString(value) && allowed.includes(value);
}

export const pgdlPacketParser: ArtifactParser = {
  id: "ags.pgdl-packet",
  version: "0.1.0",
  canParse(input) {
    return (
      isRecord(input) &&
      hasAgentActionShape(input["originalProposal"]) &&
      Array.isArray(input["objections"]) &&
      decisionLike(input["decision"], ["forward_to_aag", "revise_before_aag", "escalate_to_human", "reject_before_aag"]) &&
      isString(input["reasonForDecision"])
    );
  },
  parse(input, context) {
    const record = input as Record<string, unknown>;
    const proposal = record["originalProposal"] as Record<string, unknown>;
    return [
      createArtifact(
        pgdlPacketParser,
        context,
        "pgdl-review-packet",
        isString(proposal["id"]) ? proposal["id"] : context.sha256,
        input,
        `PGDL ${String(record["decision"])} for proposal ${String(proposal["id"] ?? "unknown")}`,
      ),
    ];
  },
};

export const aagPacketParser: ArtifactParser = {
  id: "ags.aag-packet",
  version: "0.1.0",
  canParse(input) {
    return (
      isRecord(input) &&
      hasAgentActionShape(input["proposal"]) &&
      Array.isArray(input["detectorResults"]) &&
      decisionLike(input["decision"], ["allow", "require_approval", "revise_action", "block"]) &&
      isString(input["reasonForDecision"])
    );
  },
  parse(input, context) {
    const record = input as Record<string, unknown>;
    const proposal = record["proposal"] as Record<string, unknown>;
    return [
      createArtifact(
        aagPacketParser,
        context,
        "aag-decision",
        `${String(proposal["id"] ?? context.sha256)}:${String(record["decision"])}`,
        input,
        `AAG ${String(record["decision"])} for proposal ${String(proposal["id"] ?? "unknown")}`,
      ),
    ];
  },
};

export const runtimePermitParser: ArtifactParser = {
  id: "ags.runtime-permit",
  version: "0.1.0",
  canParse(input) {
    return (
      isRecord(input) &&
      isString(input["id"]) &&
      isString(input["proposalId"]) &&
      isString(input["actionHash"]) &&
      hasAgentActionShape(input["allowedAction"]) &&
      input["source"] === "aag" &&
      input["aagDecision"] === "allow"
    );
  },
  parse(input, context) {
    const record = input as Record<string, unknown>;
    return [
      createArtifact(
        runtimePermitParser,
        context,
        "runtime-permit",
        String(record["id"]),
        input,
        `Runtime permit ${String(record["id"])} for proposal ${String(record["proposalId"])}`,
        isString(record["issuedAt"]) ? record["issuedAt"] : undefined,
      ),
    ];
  },
};

export const runtimeBindingResultParser: ArtifactParser = {
  id: "ags.runtime-binding-result",
  version: "0.1.0",
  canParse(input) {
    return (
      isRecord(input) &&
      decisionLike(input["decision"], ["execution_allowed", "execution_denied"]) &&
      typeof input["allowed"] === "boolean" &&
      Array.isArray(input["failures"]) &&
      isString(input["reasonForDecision"])
    );
  },
  parse(input, context) {
    const record = input as Record<string, unknown>;
    const permit = isRecord(record["permit"]) ? record["permit"] : {};
    return [
      createArtifact(
        runtimeBindingResultParser,
        context,
        "runtime-binding-result",
        isString(permit["id"]) ? permit["id"] : context.sha256,
        input,
        `Runtime binding ${String(record["decision"])}: ${String(record["reasonForDecision"])}`,
      ),
    ];
  },
};

export const receiptParser: ArtifactParser = {
  id: "ags.receipt",
  version: "0.1.0",
  canParse(input) {
    return (
      isRecord(input) &&
      input["version"] === "ags.receipt.v0.1" &&
      isString(input["id"]) &&
      hasAgentActionShape(input["originalProposal"]) &&
      isString(input["finalDecision"]) &&
      isString(input["receiptHash"])
    );
  },
  parse(input, context) {
    const record = input as Record<string, unknown>;
    return [
      createArtifact(
        receiptParser,
        context,
        "receipt",
        String(record["id"]),
        input,
        `Receipt ${String(record["id"])} recorded final decision ${String(record["finalDecision"])}`,
        isString(record["createdAt"]) ? record["createdAt"] : undefined,
      ),
    ];
  },
};

export const receiptArrayParser: ArtifactParser = {
  id: "ags.receipt-array",
  version: "0.1.0",
  canParse(input) {
    return Array.isArray(input) && input.length > 0 && input.every((item) => receiptParser.canParse(item, ""));
  },
  parse(input, context) {
    return (input as unknown[]).flatMap((item) => receiptParser.parse(item, context));
  },
};
