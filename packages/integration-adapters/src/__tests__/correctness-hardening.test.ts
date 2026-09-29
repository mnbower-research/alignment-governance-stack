import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createN8nWebhookResponse, mapGovernanceResultToN8nResponse, mapN8nActionToProposal } from "../index.js";
import { evaluateGovernedRuntimeActionWithReceipt } from "@alignment-governance-stack/governance-core";

const proposal = {
  id: "report", userRequest: "Summarize a local report", tool: "report.generate",
  actionType: "generate_report", target: "local-report", environment: "dev",
  reversible: true, externalFacing: false, dataSensitivity: "low" as const,
  requiresApproval: false, knownApproval: false, metadata: {}
};

it("does not tell n8n to proceed on authorization without runtime binding", () => {
  const response = createN8nWebhookResponse({ proposal: {
    id: "report", userRequest: "Summarize a local report", tool: "report.generate",
    actionType: "generate_report", target: "local-report", environment: "dev",
    reversible: true, externalFacing: false, dataSensitivity: "low",
    requiresApproval: false, knownApproval: false, metadata: {}
  } });
  expect(response.json.decision).toBe("allowed_by_aag");
  expect(response.json.allowed).toBe(false);
  expect(response.json.nextStep).toBe("stop");
});

it("requires supporting runtime binding even when a result claims execution_allowed", () => {
  const result = evaluateGovernedRuntimeActionWithReceipt({ proposal });
  result.governance.finalDecision = "execution_allowed";
  expect(mapGovernanceResultToN8nResponse(result).json.allowed).toBe(false);
  expect(mapGovernanceResultToN8nResponse(result).json.nextStep).toBe("stop");
});

it("preserves mandatory assurance through normalization and refuses missing assurance", () => {
  const required = { ...proposal, assuranceRequirement: { policyId: "review", policyVersion: "1" } };
  const mapped = mapN8nActionToProposal({ proposal: required, runtimeAction: required });
  expect(mapped.proposal.assuranceRequirement).toEqual(required.assuranceRequirement);
  expect(mapped.runtimeAction?.assuranceRequirement).toEqual(required.assuranceRequirement);
  expect(createN8nWebhookResponse({ proposal: required, runtimeAction: required }).json.allowed).toBe(false);
});

it("allows exact runtime binding and denies metadata payload substitution", () => {
  const approved = { ...proposal, metadata: { payload: { recipient: "reviewer" } } };
  expect(createN8nWebhookResponse({ proposal: approved, runtimeAction: approved }).json.nextStep).toBe("proceed");
  const changed = { ...approved, metadata: { payload: { recipient: "outsider" } } };
  expect(createN8nWebhookResponse({ proposal: approved, runtimeAction: changed }).json.nextStep).toBe("stop");
});

it("forwards supplied context and assurance instead of silently dropping controls", () => {
  const contextAdmission = JSON.parse(readFileSync(new URL("../../../../examples/context-admission/valid-temporal-relay.json", import.meta.url), "utf8"));
  const { assurance } = JSON.parse(readFileSync(new URL("../../../../examples/assurance/low-risk.json", import.meta.url), "utf8"));
  const mapped = mapN8nActionToProposal({ proposal, contextAdmission, assurance });
  expect(mapped.contextAdmission).toBe(contextAdmission);
  expect(mapped.assurance).toBe(assurance);
  contextAdmission.artifacts[0].revoked = true;
  expect(createN8nWebhookResponse({ proposal, runtimeAction: proposal, contextAdmission }).json.allowed).toBe(false);
});
