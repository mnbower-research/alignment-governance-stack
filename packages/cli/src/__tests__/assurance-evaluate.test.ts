import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";
import { runCli } from "../index.js";
it("evaluates assurance examples without claiming execution authority", () => {
  for (const [name, code] of [["low-risk", 0], ["high-risk", 0], ["denial-history", 1]] as const) {
    const result = runCli(["assurance-evaluate", fileURLToPath(new URL(`../../../../examples/assurance/${name}.json`, import.meta.url)), "--json"]);
    expect(result.exitCode).toBe(code); expect(JSON.parse(result.stdout).version).toBe("assurance-evidence/v0.1");
  }
  expect(runCli(["assurance-evaluate"]).exitCode).toBe(2);
});
