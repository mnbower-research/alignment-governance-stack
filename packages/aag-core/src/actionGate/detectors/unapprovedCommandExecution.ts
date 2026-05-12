import type {
  ActionGateInput,
  GateDetector,
  GateDetectorResult,
} from "../types";
import { getCommandText, isTerminalLikeTool } from "./cyberHelpers";

export const detectUnapprovedCommandExecution: GateDetector = (
  input: ActionGateInput,
): GateDetectorResult => {
  if (input.context?.userApproved || !isTerminalLikeTool(input.proposedAction.tool)) {
    return {
      type: "unapproved_command_execution",
      triggered: false,
      confidence: 0,
      severity: "low",
      evidence: [],
      recommendedDecision: "allow",
    };
  }

  const commandText = getCommandText(input);

  return {
    type: "unapproved_command_execution",
    triggered: true,
    confidence: 0.86,
    severity: "high",
    evidence: [
      `Terminal-like tool \`${input.proposedAction.tool}\` would execute command text without recorded user approval.`,
      commandText
        ? `Command context: \`${truncate(commandText)}\`.`
        : "Command context is unavailable.",
    ],
    recommendedDecision: "require_approval",
  };
};

function truncate(value: string): string {
  return value.length > 160 ? `${value.slice(0, 157)}...` : value;
}
