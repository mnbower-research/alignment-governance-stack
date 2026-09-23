import type { ArtifactParser } from "./types.js";
import { contextAdmissionParser } from "./parsers/contextAdmissionParser.js";
import {
  aagPacketParser,
  pgdlPacketParser,
  receiptArrayParser,
  receiptParser,
  runtimeBindingResultParser,
  runtimePermitParser,
} from "./parsers/coreParsers.js";
import {
  agencyChainParser,
  agencyFingerprintParser,
  alignmentGapParser,
  babelRiskParser,
  babelVelocityParser,
  decisionClosureParser,
  governanceMemoryParser,
} from "./parsers/reportParsers.js";
import { authorityMapParser, humanParticipationParser, policyProfileParser } from "./parsers/configParsers.js";

export const defaultParsers: ArtifactParser[] = [
  contextAdmissionParser,
  pgdlPacketParser,
  aagPacketParser,
  runtimePermitParser,
  runtimeBindingResultParser,
  receiptParser,
  receiptArrayParser,
  decisionClosureParser,
  agencyFingerprintParser,
  governanceMemoryParser,
  agencyChainParser,
  alignmentGapParser,
  babelRiskParser,
  babelVelocityParser,
  policyProfileParser,
  authorityMapParser,
  humanParticipationParser,
];

export function findParser(input: unknown, sourcePath: string, parsers: ArtifactParser[] = defaultParsers): ArtifactParser | undefined {
  return parsers.find((parser) => parser.canParse(input, sourcePath));
}
