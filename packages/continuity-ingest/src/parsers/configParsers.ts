import type { ArtifactParser } from "../types.js";
import { createArtifact, isRecord, isString } from "../parserHelpers.js";

export const policyProfileParser: ArtifactParser = {
  id: "ags.policy-profile",
  version: "0.1.0",
  canParse(input) {
    return isRecord(input) && isString(input["id"]) && isString(input["name"]) && isString(input["version"]) && isString(input["defaultMode"]);
  },
  parse(input, context) {
    const record = input as Record<string, unknown>;
    return [
      createArtifact(
        policyProfileParser,
        context,
        Array.isArray(record["hardBoundaries"]) && record["hardBoundaries"].length > 0 ? "hard-boundary-profile" : "policy-profile",
        String(record["id"]),
        input,
        `Policy profile ${String(record["name"])}`,
      ),
    ];
  },
};

export const authorityMapParser: ArtifactParser = {
  id: "ags.authority-map",
  version: "0.1.0",
  canParse(input) {
    return isRecord(input) && isString(input["id"]) && isString(input["name"]) && isString(input["version"]) && Array.isArray(input["roles"]);
  },
  parse(input, context) {
    const record = input as Record<string, unknown>;
    return [createArtifact(authorityMapParser, context, "authority-map", String(record["id"]), input, `Authority map ${String(record["name"])}`)];
  },
};

export const humanParticipationParser: ArtifactParser = {
  id: "ags.human-participation-quality",
  version: "0.1.0",
  canParse(input) {
    return (
      isRecord(input) &&
      isString(input["decision"]) &&
      typeof input["meaningful"] === "boolean" &&
      Array.isArray(input["signals"]) &&
      Array.isArray(input["reasons"]) &&
      isString(input["recommendedAction"])
    );
  },
  parse(input, context) {
    const record = input as Record<string, unknown>;
    return [
      createArtifact(
        humanParticipationParser,
        context,
        "human-participation-quality",
        String(record["decision"]),
        input,
        `Human Participation Quality: ${String(record["decision"])}`,
      ),
    ];
  },
};
