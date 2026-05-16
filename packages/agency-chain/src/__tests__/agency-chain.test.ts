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
    expect(taxonomyIds.has("TG-003")).toBe(true);
    expect(taxonomyIds.has("TG-006")).toBe(true);
    expect(taxonomyIds.has("TG-005")).toBe(true);
  });

  it("evaluates the strong content-publishing chain without high or critical issues", () => {
    const chain = evaluateAgencyChain(contentPublishingStrongChain());

    expect(["preserved", "partially_preserved"]).toContain(chain.overallStatus);
    expect(chain.issues.some((issue) => issue.severity === "high" || issue.severity === "critical")).toBe(false);
  });

  it("evaluates the weak content-publishing chain as weak or broken", () => {
    const chain = evaluateAgencyChain(contentPublishingWeakChain());
    const taxonomyIds = new Set(chain.issues.map((issue) => issue.taxonomyId));

    expect(["weak", "broken"]).toContain(chain.overallStatus);
    expect(taxonomyIds.has("TG-001")).toBe(true);
    expect(taxonomyIds.has("TG-003")).toBe(true);
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

function contentPublishingStrongChain(): AgencyChainInput {
  return {
    ...strongChain(),
    chainId: "content-publishing-strong-chain",
    subject: {
      organizationName: "Alignment Governance Stack",
      systemName: "Content Publishing Agent",
      workflowName: "Reviewed AGS v1.6.0 public release note",
      auditScope: "Strong content publishing agency-chain fixture"
    },
    links: [
      link("human", "human_authority", "Public claim authority", "Reviewer can stop, refuse, revise, halt, or escalate."),
      link("policy", "organizational_policy", "Public claim policy", "Policy constrains unsupported public claims and external publishing."),
      link("hard-boundary", "hard_boundary", "Public overclaim boundary", "External public claims require review and evidence."),
      link("agent", "agent_role", "Content Publishing Agent", "Agent drafts and proposes reviewed public release content."),
      link("tool", "tool_access", "Scoped publishing tools", "Tool access is scoped to draft and reviewed publish targets."),
      {
        ...link("proposal", "proposed_action", "Reviewed AGS v1.6.0 release note", "Proposed action is external and reviewed."),
        metadata: { consequential: true }
      },
      link("approval", "approval_authority", "Public claim reviewer", "Reviewer can stop, refuse, revise, halt, or escalate."),
      link("participation", "human_participation", "Meaningful public-claim review", "Reviewer receives context and can change outcome."),
      link("permit", "runtime_permit", "Target-bound runtime permit", "Permit binds action, tool, target, authority, and time window."),
      {
        ...link("execution", "execution_boundary", "External publishing boundary", "Execution boundary is exact reviewed target only."),
        metadata: { consequential: true }
      },
      link("receipt", "receipt", "Publishing governance receipt", "Receipt preserves proposal, review, permit, execution, and outcome."),
      link("memory", "governance_memory", "Public claim memory review", "Memory recommendations require human review.")
    ],
    metadata: { recurringWorkflow: true }
  };
}

function contentPublishingWeakChain(): AgencyChainInput {
  return {
    chainId: "content-publishing-weak-chain",
    auditMode: "workflow_review",
    subject: {
      organizationName: "Alignment Governance Stack",
      systemName: "Content Publishing Agent",
      workflowName: "Unreviewed AGS v1.6.0 public post",
      auditScope: "Weak content publishing agency-chain fixture"
    },
    links: [
      link("agent", "agent_role", "Content Publishing Agent", "Agent can draft and attempt public release text."),
      link("tool", "tool_access", "External publishing tools", "Tool access includes public publishing targets."),
      {
        ...link("proposal", "proposed_action", "External AGS v1.6.0 announcement", "Proposed action is external and consequential."),
        metadata: { consequential: true }
      },
      {
        ...link("execution", "execution_boundary", "Public post execution", "Execution boundary includes external public publishing."),
        metadata: { consequential: true }
      }
    ],
    metadata: { recurringWorkflow: true }
  };
}
