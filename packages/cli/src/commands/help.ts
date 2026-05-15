import type { CliResult } from "../cli.js";

export function runHelpCommand(): CliResult {
  return {
    exitCode: 0,
    stdout: [
      "Alignment Governance Stack CLI",
      "",
      "Commands:",
      "  ags help",
      "  ags version",
      "  ags eval",
      "  ags dogfood",
      "  ags redteam",
      "  ags gaps <input.json> [--json]",
      "  ags govern <input.json> [--json]",
      "  ags memory <receipts.json>",
      "  ags receipt verify <receipt.json>",
      "  ags receipt hash <receipt.json>",
      ""
    ].join("\n")
  };
}
