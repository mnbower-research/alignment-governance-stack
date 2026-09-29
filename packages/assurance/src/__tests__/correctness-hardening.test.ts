import { expect, it } from "vitest";
import { evaluateAssurance } from "../index.js";
import { fixture, attest } from "./fixtures.js";

it("does not reuse assurance for changed execution metadata", () => {
  const { action, input } = fixture();
  action.metadata = { payload: { amount: 25 } };
  input.attestations = [attest(action, input)];
  expect(evaluateAssurance(action, input).decision).toBe("satisfied");
  expect(evaluateAssurance({ ...action, metadata: { payload: { amount: 250 } } }, input).decision).not.toBe("satisfied");
});
