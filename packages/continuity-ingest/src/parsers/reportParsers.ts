import type { ArtifactParser } from "../types.js";
import { createArtifact, isRecord, isString } from "../parserHelpers.js";

export const decisionClosureParser: ArtifactParser = {
  id: "ags.decision-closure-artifact",
  version: "0.1.0",
  canParse(input) {
    return isRecord(input) && isString(input["artifactId"]) && isRecord(input["action"]) && isRecord(input["executionBoundary"]) && isRecord(input["decision"]);
  },
  parse(input, context) {
    const record = input as Record<string, unknown>;
    const action = record["action"] as Record<string, unknown>;
    return [
      createArtifact(
        decisionClosureParser,
        context,
        "decision-closure-artifact",
        String(record["artifactId"]),
        input,
        `Decision Closure Artifact for ${String(action["summary"] ?? action["actionId"] ?? record["artifactId"])}`,
        isString(record["createdAt"]) ? record["createdAt"] : undefined,
      ),
    ];
  },
};

export const agencyFingerprintParser: ArtifactParser = {
  id: "ags.agency-fingerprint",
  version: "0.1.0",
  canParse(input) {
    return isRecord(input) && input["version"] === "agency-fingerprint/v0.1" && isString(input["fingerprintId"]) && isString(input["fingerprintHash"]);
  },
  parse(input, context) {
    const record = input as Record<string, unknown>;
    return [
      createArtifact(
        agencyFingerprintParser,
        context,
        "agency-fingerprint",
        String(record["fingerprintId"]),
        input,
        `Agency fingerprint ${String(record["fingerprintId"])} for agent ${String(record["agentId"] ?? "unknown")}`,
        isString(record["timestamp"]) ? record["timestamp"] : undefined,
      ),
    ];
  },
};

export const governanceMemoryParser: ArtifactParser = {
  id: "ags.governance-memory-report",
  version: "0.1.0",
  canParse(input) {
    return isRecord(input) && input["version"] === "ags.governance-memory.v1.0" && isString(input["id"]) && Array.isArray(input["patterns"]);
  },
  parse(input, context) {
    const record = input as Record<string, unknown>;
    return [
      createArtifact(
        governanceMemoryParser,
        context,
        "governance-memory-summary",
        String(record["id"]),
        input,
        `Governance Memory report with ${String(record["receiptCount"] ?? "unknown")} receipts`,
        isString(record["createdAt"]) ? record["createdAt"] : undefined,
      ),
    ];
  },
};

export const agencyChainParser: ArtifactParser = {
  id: "ags.agency-chain-map",
  version: "0.1.0",
  canParse(input) {
    return isRecord(input) && isString(input["chainId"]) && Array.isArray(input["links"]) && Array.isArray(input["issues"]) && isString(input["overallStatus"]);
  },
  parse(input, context) {
    const record = input as Record<string, unknown>;
    return [
      createArtifact(agencyChainParser, context, "agency-chain-report", String(record["chainId"]), input, `Agency Chain report ${String(record["overallStatus"])}`),
    ];
  },
};

export const alignmentGapParser: ArtifactParser = {
  id: "ags.alignment-gap-report",
  version: "0.1.0",
  canParse(input) {
    return isRecord(input) && (Array.isArray(input["gaps"]) || Array.isArray(input["findings"])) && (isString(input["reportId"]) || isString(input["id"]));
  },
  parse(input, context) {
    const record = input as Record<string, unknown>;
    return [
      createArtifact(alignmentGapParser, context, "alignment-gap-report", String(record["reportId"] ?? record["id"]), input, "Alignment Gap Detector report"),
    ];
  },
};

export const babelRiskParser: ArtifactParser = {
  id: "ags.babel-risk-report",
  version: "0.1.0",
  canParse(input) {
    return isRecord(input) && input["version"] === "babel-risk/v0.1" && isString(input["reportId"]);
  },
  parse(input, context) {
    const record = input as Record<string, unknown>;
    return [
      createArtifact(
        babelRiskParser,
        context,
        "babel-risk-report",
        String(record["reportId"]),
        input,
        isString(record["overallRisk"]) ? `Babel risk report: ${record["overallRisk"]}` : "Babel risk report",
        isString(record["generatedAt"]) ? record["generatedAt"] : undefined,
      ),
    ];
  },
};

export const babelVelocityParser: ArtifactParser = {
  id: "ags.babel-velocity-report",
  version: "0.1.0",
  canParse(input) {
    return isRecord(input) && input["version"] === "babel-velocity/v0.1" && isString(input["reportId"]);
  },
  parse(input, context) {
    const record = input as Record<string, unknown>;
    return [
      createArtifact(
        babelVelocityParser,
        context,
        "babel-velocity-report",
        String(record["reportId"]),
        input,
        isString(record["overallVelocityRisk"]) ? `Babel Velocity report: ${record["overallVelocityRisk"]}` : "Babel Velocity report",
        isString(record["generatedAt"]) ? record["generatedAt"] : undefined,
      ),
    ];
  },
};
