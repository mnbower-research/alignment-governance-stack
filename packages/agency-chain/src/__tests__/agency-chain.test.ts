import { describe, expect, it } from "vitest";
import {
  adaptAgencyChainIssuesToAuditFindings,
  createAgencyChainMap,
  evaluateAgencyChain,
  summarizeAgencyChain,
  validateAgencyChainInput,
  type AgencyChainInput
} from "../index.js";

describe("agency chain mapper", () => {
  it("returns preserved for a strong chain", () => {
    const chain = evaluateAgencyChain(strongChain());

    expect(chain.overallStatus).toBe("preserved");
    expect(chain.issues).toHaveLength(0);
  });

  it("detects missing human authority", () => {
    const chain = evaluateAgencyChain({
      ...strongChain(),
      links: strongChain().links.filter((link) => link.type !== "human_authority")
    });

    expect(chain.issues.some((issue) => issue.id === "AC-001")).toBe(true);
  });

  it("detects approval without runtime binding", () => {
    const chain = evaluateAgencyChain({
      ...strongChain(),
      links: strongChain().links.filter((link) => link.type !== "runtime_permit")
    });

    expect(chain.overallStatus).toBe("weak");
    expect(chain.issues.some((issue) => issue.id === "AC-006" && issue.taxonomyId === "TG-003")).toBe(true);
  });

  it("detects execution without receipt", () => {
    const chain = evaluateAgencyChain({
      ...strongChain(),
      links: strongChain().links.filter((link) => link.type !== "receipt")
    });

    expect(chain.issues.some((issue) => issue.id === "AC-007" && issue.taxonomyId === "TG-005")).toBe(true);
  });

  it("detects tool access without policy scope", () => {
    const chain = evaluateAgencyChain({
      ...strongChain(),
      links: strongChain().links.filter(
        (link) => link.type !== "organizational_policy" && link.type !== "hard_boundary"
      )
    });

    expect(chain.issues.some((issue) => issue.id === "AC-003" && issue.taxonomyId === "TG-006")).toBe(true);
  });

  it("maps weak chain issues to TG taxonomy IDs", () => {
    const chain = evaluateAgencyChain(weakChain());
    const taxonomyIds = new Set(chain.issues.map((issue) => issue.taxonomyId));

    expect(chain.overallStatus).toBe("broken");
    expect(taxonomyIds.has("TG-001")).toBe(true);
    expect(taxonomyIds.has("TG-006")).toBe(true);
    expect(taxonomyIds.has("TG-005")).toBe(true);
  });

  it("adapts agency-chain issues to audit findings", () => {
    const chain = evaluateAgencyChain({
      ...strongChain(),
      links: strongChain().links.filter((link) => link.type !== "runtime_permit")
    });
    const findings = adaptAgencyChainIssuesToAuditFindings(chain.issues);

    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0]?.title).toContain("Agency Chain Gap");
    expect(findings.some((finding) => finding.taxonomyId === "TG-003")).toBe(true);
  });

  it("summarizes deterministically", () => {
    const chain = createAgencyChainMap(strongChain());

    expect(summarizeAgencyChain(chain)).toBe(summarizeAgencyChain(chain));
  });

  it("invalid input fails validation", () => {
    const result = validateAgencyChainInput({
      subject: {},
      links: [{ id: "bad", type: "unknown", label: "", status: "present" }]
    });

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

function strongChain(): AgencyChainInput {
  return {
    chainId: "strong-chain",
    auditMode: "workflow_review",
    subject: {
      organizationName: "ExampleCo",
      systemName: "Internal Report Agent",
      workflowName: "Internal draft report",
      auditScope: "Strong agency chain fixture"
    },
    description: "Agent drafts an internal report with scoped tools, review, runtime binding, receipts, and memory.",
    links: [
      link("human", "human_authority", "Product Owner stop authority", "Product Owner can stop, refuse, revise, halt, or escalate."),
      link("policy", "organizational_policy", "Internal report policy", "Draft-only internal reports are permitted within low-sensitivity scope."),
      link("hard-boundary", "hard_boundary", "External send hard boundary", "External delivery requires separate review."),
      link("agent", "agent_role", "Internal report drafting agent", "Agent role is scoped to draft-only report generation."),
      link("tool", "tool_access", "Read-only reporting tools", "Tool access is read-only for low-sensitivity data."),
      link("proposal", "proposed_action", "Draft internal report", "Proposed action is internal and draft-only."),
      link("approval", "approval_authority", "Product Owner approval authority", "Approver can stop, refuse, revise, halt, or escalate."),
      link("participation", "human_participation", "Meaningful review", "Reviewer receives context and can change outcome."),
      link("permit", "runtime_permit", "Scoped runtime permit", "Permit binds action, tool, target, authority, and time window."),
      link("execution", "execution_boundary", "Draft execution boundary", "Execution boundary is local draft generation only."),
      link("receipt", "receipt", "Governance receipt", "Receipt preserves proposal, approval, permit, execution, and outcome."),
      link("memory", "governance_memory", "Governance memory", "Receipt history is reviewed by humans for future improvements.")
    ],
    metadata: { recurringWorkflow: false }
  };
}

function weakChain(): AgencyChainInput {
  return {
    chainId: "weak-chain",
    auditMode: "workflow_review",
    subject: {
      organizationName: "ExampleCo",
      systemName: "Customer Email Agent",
      workflowName: "Customer-impacting email send",
      auditScope: "Weak agency chain fixture"
    },
    links: [
      link("agent", "agent_role", "Customer email agent", "Agent role can generate customer-impacting email."),
      link("tool", "tool_access", "Email send tool", "Tool access can send external customer-impacting email."),
      {
        ...link("proposal", "proposed_action", "Send customer-impacting email", "Proposed action is external and consequential."),
        metadata: { consequential: true }
      },
      {
        ...link("execution", "execution_boundary", "External email execution", "Execution boundary allows external customer-impacting send."),
        metadata: { consequential: true }
      }
    ],
    metadata: { recurringWorkflow: true }
  };
}

function link(
  id: string,
  type: AgencyChainInput["links"][number]["type"],
  label: string,
  description: string
): AgencyChainInput["links"][number] {
  return {
    id,
    type,
    label,
    status: "present",
    description,
    evidenceRefs: [{ id: `ev-${id}`, type: "manual_note", title: `${label} evidence` }]
  };
}
