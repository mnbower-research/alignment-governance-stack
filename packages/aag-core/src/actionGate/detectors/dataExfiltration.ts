import type {
  ActionGateInput,
  GateDetector,
  GateDetectorResult,
} from "../types";
import { containsAny, getCommandText, getPayloadText } from "./cyberHelpers";

const dumpPatterns = [
  /\b(pg_dump|mysqldump|mongodump|redis-cli\s+--rdb|sqlite3\s+.*\.dump)\b/i,
  /\b(database dump|db dump|dump database|export database|dump table|export table)\b/i,
  /\b(tar|zip|7z|gzip)\b.*\b(data|database|db|backup|logs?|customer|users?)\b/i,
];

const externalTransferPatterns = [
  /\b(curl|wget|httpie)\b.*\b(-x\s+post|-d|--data|--upload-file|-t|put|post)\b/i,
  /\b(upload|post|send|exfiltrate|webhook|external endpoint)\b/i,
  /\bhttps?:\/\/(?!localhost|127\.0\.0\.1|0\.0\.0\.0)[^\s"'<>]+/i,
];

const internalTransferPatterns = [
  /\b(scp|rsync|sftp|ftp|nc|netcat|s3\s+cp|gsutil\s+cp|azcopy|rclone)\b/i,
  /\b(copy|archive|export|transfer)\b.*\b(data|database|db|backup|logs?|customer|users?)\b/i,
];

export const detectDataExfiltration: GateDetector = (
  input: ActionGateInput,
): GateDetectorResult => {
  const actionText = [getCommandText(input), getPayloadText(input)].join(" ");
  const hasDumpSignal = containsAny(actionText, dumpPatterns);
  const hasExternalTransfer =
    Boolean(input.proposedAction.externalFacing) ||
    containsAny(actionText, externalTransferPatterns);
  const hasInternalSuspiciousTransfer = containsAny(
    actionText,
    internalTransferPatterns,
  );

  if (hasDumpSignal && hasExternalTransfer) {
    return {
      type: "data_exfiltration",
      triggered: true,
      confidence: 0.96,
      severity: "critical",
      evidence: [
        "Proposed action combines database or bulk data dumping with an external-facing upload, post, webhook, or HTTP endpoint.",
      ],
      recommendedDecision: "block",
    };
  }

  if (hasInternalSuspiciousTransfer || hasDumpSignal) {
    return {
      type: "data_exfiltration",
      triggered: true,
      confidence: hasDumpSignal ? 0.86 : 0.8,
      severity: hasDumpSignal ? "high" : "medium",
      evidence: [
        "Proposed action resembles a bulk data dump, archive, copy, or transfer and should be approved before execution.",
      ],
      recommendedDecision: "require_approval",
    };
  }

  return {
    type: "data_exfiltration",
    triggered: false,
    confidence: 0,
    severity: "low",
    evidence: [],
    recommendedDecision: "allow",
  };
};
