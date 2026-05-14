import {
  analyzeReceiptHistory,
  summarizeGovernanceMemory
} from "@alignment-governance-stack/governance-memory";
import type { GovernanceReceipt } from "@alignment-governance-stack/receipts";
import type { CliResult } from "../cli.js";
import { readJsonFile } from "../io/readJsonFile.js";

export function runMemoryCommand(args: string[]): CliResult {
  const [receiptHistoryPath] = args;

  if (receiptHistoryPath === undefined) {
    return {
      exitCode: 1,
      stdout: "",
      stderr: "Missing receipts file. Usage: ags memory <receipts.json>\n"
    };
  }

  const receipts = readJsonFile<GovernanceReceipt[]>(receiptHistoryPath);
  const report = analyzeReceiptHistory({ receipts });

  return {
    exitCode: 0,
    stdout: `${summarizeGovernanceMemory(report)}\n`
  };
}
