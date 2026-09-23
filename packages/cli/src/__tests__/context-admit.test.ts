import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { runCli } from "../cli.js";

const fixture = (name: string): string => fileURLToPath(new URL(`../../../../examples/context-admission/${name}.json`, import.meta.url));
describe("context-admit CLI", () => {
  it("renders human-readable and JSON admission evidence", () => {
    expect(runCli(["context-admit", fixture("valid-temporal-relay")]).stdout).toContain("Context Admission: admit");
    const result = runCli(["context-admit", fixture("valid-temporal-relay"), "--json"]);
    expect(result.exitCode).toBe(0);
    expect(JSON.parse(result.stdout).decision).toBe("admit");
  });
  it("uses exit 1 for denied admission, and 2 for invalid input", () => {
    expect(runCli(["context-admit", fixture("revoked-artifact")]).exitCode).toBe(1);
    expect(runCli(["context-admit"]).exitCode).toBe(2);
    expect(runCli(["context-admit", fixture("does-not-exist")]).exitCode).toBe(2);
    expect(runCli(["context-admit", fixture("valid-temporal-relay"), "--unknown"]).exitCode).toBe(2);
    expect(runCli(["context-admit", fixture("low-risk-reference")]).exitCode).toBe(0);
  });
});
