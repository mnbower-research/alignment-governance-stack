import { readFileSync } from "node:fs";

export function readJsonFile<T = unknown>(filePath: string): T {
  try {
    return JSON.parse(readFileSync(filePath, "utf8")) as T;
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      throw new Error(`Could not read JSON file: ${filePath} does not exist.`);
    }

    if (error instanceof SyntaxError) {
      throw new Error(`Could not parse JSON file: ${filePath}. ${error.message}`);
    }

    if (error instanceof Error) {
      throw new Error(`Could not read JSON file: ${filePath}. ${error.message}`);
    }

    throw new Error(`Could not read JSON file: ${filePath}.`);
  }
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
