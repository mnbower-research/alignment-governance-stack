import {
  hashGovernanceReceipt,
  verifyGovernanceReceipt,
  type GovernanceReceipt
} from "@alignment-governance-stack/receipts";
import type { CliResult } from "../cli.js";
import { formatReceiptVerification } from "../format/formatReceiptVerification.js";
import { readJsonFile } from "../io/readJsonFile.js";

export function runReceiptCommand(args: string[]): CliResult {
  const [subcommand, receiptPath] = args;

  if (subcommand !== "verify" && subcommand !== "hash") {
    return {
      exitCode: 1,
      stdout: "",
      stderr: "Unknown receipt command. Usage: ags receipt verify <receipt.json> | ags receipt hash <receipt.json>\n"
    };
  }

  if (receiptPath === undefined) {
    return {
      exitCode: 1,
      stdout: "",
      stderr: `Missing receipt file. Usage: ags receipt ${subcommand} <receipt.json>\n`
    };
  }

  const receipt = readJsonFile<GovernanceReceipt>(receiptPath);

  if (subcommand === "hash") {
    return {
      exitCode: 0,
      stdout: `${hashGovernanceReceipt(receipt)}\n`
    };
  }

  const verification = verifyGovernanceReceipt(receipt);

  return {
    exitCode: verification.valid ? 0 : 2,
    stdout: `${formatReceiptVerification(verification)}\n`
  };
}
