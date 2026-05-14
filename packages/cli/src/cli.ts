#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { runDogfoodCommand } from "./commands/dogfood.js";
import { runEvalCommand } from "./commands/eval.js";
import { runGovernCommand } from "./commands/govern.js";
import { runHelpCommand } from "./commands/help.js";
import { runMemoryCommand } from "./commands/memory.js";
import { runRedTeamCommand } from "./commands/redteam.js";
import { runReceiptCommand } from "./commands/receipt.js";

export interface CliResult {
  exitCode: number;
  stdout: string;
  stderr?: string;
}

export function runCli(args: string[]): CliResult {
  const [command, ...rest] = args;

  try {
    if (command === undefined || command === "help" || command === "--help" || command === "-h") {
      return runHelpCommand();
    }

    if (command === "version" || command === "--version" || command === "-v") {
      return {
        exitCode: 0,
        stdout: `${readPackageVersion()}\n`
      };
    }

    if (command === "eval") {
      return runEvalCommand(rest);
    }

    if (command === "dogfood") {
      return runDogfoodCommand(rest);
    }

    if (command === "redteam") {
      return runRedTeamCommand(rest);
    }

    if (command === "govern") {
      return runGovernCommand(rest);
    }

    if (command === "receipt") {
      return runReceiptCommand(rest);
    }

    if (command === "memory") {
      return runMemoryCommand(rest);
    }

    return {
      exitCode: 1,
      stdout: "",
      stderr: `Unknown command: ${command}\n\n${runHelpCommand().stdout}`
    };
  } catch (error) {
    return {
      exitCode: 1,
      stdout: "",
      stderr: `${formatError(error)}\n`
    };
  }
}

export function main(args: string[] = process.argv.slice(2)): void {
  const result = runCli(args);

  if (result.stdout.length > 0) {
    process.stdout.write(result.stdout);
  }

  if (result.stderr !== undefined && result.stderr.length > 0) {
    process.stderr.write(result.stderr);
  }

  process.exitCode = result.exitCode;
}

function readPackageVersion(): string {
  const packageJsonUrl = new URL("../package.json", import.meta.url);
  const packageJson = JSON.parse(readFileSync(packageJsonUrl, "utf8")) as { version?: unknown };

  if (typeof packageJson.version !== "string") {
    throw new Error("CLI package version is missing from package.json.");
  }

  return packageJson.version;
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown CLI error.";
}

const currentFilePath = fileURLToPath(import.meta.url);
const invokedFilePath = process.argv[1];

if (invokedFilePath !== undefined && currentFilePath === invokedFilePath) {
  main();
}
