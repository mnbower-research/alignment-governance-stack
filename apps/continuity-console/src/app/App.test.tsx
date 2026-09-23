import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { ContinuitySnapshot } from "@alignment-governance-stack/continuity-ingest";
import { governanceRecommendations } from "../data/sampleDeployment";
import { App } from "./App";

const originalFetch = window.fetch;

const proposal = {
  id: "proposal-ui-001",
  userRequest: "Draft an internal release note",
  tool: "local-doc-writer",
  actionType: "create_draft",
  target: "docs/release.md",
  environment: "local",
  reversible: true,
  externalFacing: false,
  dataSensitivity: "low",
  requiresApproval: false,
  knownApproval: false,
  metadata: {
    workflowId: "workflow-ui",
  },
};

function localSnapshot(): ContinuitySnapshot {
  return {
    schemaVersion: "ags.continuity-snapshot.v0.1",
    generatedAt: "2026-01-02T00:00:00.000Z",
    deployment: { id: "local", name: "Local Evidence", environment: "local" },
    artifacts: [
      {
        id: "pgdl-review-packet:proposal-ui-001",
        kind: "pgdl-review-packet",
        provenance: {
          sourcePath: "examples/ui/pgdl.json",
          fileName: "pgdl.json",
          sha256: "a".repeat(64),
          importedAt: "2026-01-02T00:00:00.000Z",
          parserId: "ags.pgdl-packet",
          parserVersion: "0.1.0",
        },
        correlation: { proposalId: "proposal-ui-001", workflowId: "workflow-ui" },
        summary: "PGDL forward_to_aag for proposal proposal-ui-001",
        payload: { originalProposal: proposal, objections: [], decision: "forward_to_aag", reasonForDecision: "Internal draft reviewed." },
        warnings: [],
      },
    ],
    diagnostics: [
      {
        severity: "warning",
        code: "continuity-chain.missing-artifact",
        message: "Proposal proposal-ui-001 has no imported aag-decision artifact.",
        sourcePath: "examples/ui/pgdl.json",
      },
      {
        severity: "error",
        code: "artifact.malformed-json",
        message: "Expected property name or '}' in JSON.",
        sourcePath: "examples/ui/malformed.json",
      },
    ],
  };
}

function mockBundledSnapshot(snapshot: ContinuitySnapshot): void {
  window.fetch = async () =>
    ({
      ok: true,
      json: async () => snapshot,
    }) as Response;
}

describe("Continuity Console operator shell", () => {
  afterEach(() => {
    cleanup();
    window.fetch = originalFetch;
  });

  beforeEach(() => {
    window.localStorage.clear();
  });

  it("defaults to simple navigation and reveals every technical page on request", async () => {
    const user = userEvent.setup();
    render(<App />);
    const navigation = screen.getByRole("navigation", { name: "Console navigation" });

    for (const label of ["Home", "Runs", "Findings", "Settings"]) {
      expect(within(navigation).getByRole("button", { name: label })).toBeTruthy();
    }
    expect(within(navigation).queryByRole("button", { name: "Workbench" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Show technical details" }));
    for (const label of ["Home", "Workbench", "Flows", "Runs", "Findings", "Approvals", "Plugins", "Audits", "Reports", "Settings"]) {
      expect(within(navigation).getByRole("button", { name: label })).toBeTruthy();
    }
    expect(screen.getByRole("button", { name: "Hide technical details" })).toBeTruthy();
  });

  it("separates the Home overview from the four-question Runs review", async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByRole("heading", { name: "Home" })).toBeTruthy();
    expect(screen.getByText("SAMPLE MODE")).toBeTruthy();
    expect(screen.getByLabelText("Evidence overview")).toBeTruthy();
    expect(screen.getByText("Active evidence")).toBeTruthy();
    expect(screen.getByText("Start a review")).toBeTruthy();
    expect(screen.queryByText("What did the agent want to do?")).toBeNull();
    expect(screen.queryByText("What the governance checks mean")).toBeNull();
    const homeFindings = Array.from(document.querySelectorAll(".operator-finding")).map(element => element.textContent);
    await user.click(screen.getByRole("button", { name: "Review runs" }));
    expect(screen.getByRole("heading", { name: "Runs" })).toBeTruthy();
    expect(screen.queryByLabelText("Evidence overview")).toBeNull();
    for (const question of ["What did the agent want to do?", "Was it allowed?", "Did it do only what was allowed?", "Can we prove what happened?"]) {
      expect(screen.getByText(question)).toBeTruthy();
    }
    expect(Array.from(document.querySelectorAll(".operator-finding")).map(element => element.textContent)).toEqual(homeFindings);
    await user.click(within(screen.getByRole("navigation")).getByRole("button", { name: "Home" }));
    expect(screen.getByText("Receipt is incomplete")).toBeTruthy();
    expect(screen.queryByLabelText("Home primary indicators")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Show technical details" }));
    const kpiRegion = screen.getByLabelText("Home primary indicators");
    expect(kpiRegion.querySelectorAll(".kpi-card")).toHaveLength(4);
    expect(screen.getByText("Governance Health")).toBeTruthy();
    expect(screen.getByText("Flows Needing Attention")).toBeTruthy();
    expect(screen.getByText("Priority Findings")).toBeTruthy();
    expect(screen.getByText("Human Review Load")).toBeTruthy();
    expect(screen.getByText("Governance Coverage")).toBeTruthy();
    expect(document.querySelectorAll(".coverage-row")).toHaveLength(12);
    expect(screen.getByText("Recent Activity")).toBeTruthy();
    expect(screen.getByText("View advanced architecture")).toBeTruthy();
  });

  it("counts Priority Findings as critical plus high and opens advanced architecture from Home", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Show technical details" }));
    const kpiRegion = screen.getByLabelText("Home primary indicators");
    const priorityCard = within(kpiRegion).getByText("Priority Findings").closest("section");
    expect(priorityCard).toBeTruthy();
    expect(within(priorityCard as HTMLElement).getByText("3")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "View advanced architecture" }));
    expect(screen.getByRole("heading", { name: "Advanced Architecture Map" })).toBeTruthy();
  });

  it("loads Local Evidence Mode and keeps material import failures visible", async () => {
    const user = userEvent.setup();
    mockBundledSnapshot(localSnapshot());
    render(<App />);
    const navigation = screen.getByRole("navigation", { name: "Console navigation" });

    await user.click(within(navigation).getByRole("button", { name: "Settings" }));
    await user.click(screen.getByRole("button", { name: "Load bundled snapshot" }));
    await user.click(within(navigation).getByRole("button", { name: "Home" }));

    expect(screen.getByText("LOCAL EVIDENCE")).toBeTruthy();
    expect(screen.getByText("READ ONLY")).toBeTruthy();
    expect(screen.getByText("Malformed local evidence artifact")).toBeTruthy();
    expect(screen.getByText("Material findings")).toBeTruthy();
    const homeFindings = Array.from(document.querySelectorAll(".operator-finding")).map(element => element.textContent);
    await user.click(screen.getByRole("button", { name: "Review runs" }));
    expect(Array.from(document.querySelectorAll(".operator-finding")).map(element => element.textContent)).toEqual(homeFindings);
  });

  it("keeps empty Local Evidence Home distinct from sample content", async () => {
    const user = userEvent.setup();
    mockBundledSnapshot({ ...localSnapshot(), artifacts: [], diagnostics: [] });
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Import evidence" }));
    await user.click(screen.getByRole("button", { name: "Load bundled snapshot" }));
    await user.click(within(screen.getByRole("navigation")).getByRole("button", { name: "Home" }));
    expect(screen.getByText(/No imported records are available/)).toBeTruthy();
    expect(screen.queryByText("Built-in sample")).toBeNull();
    expect(screen.queryByText("What did the agent want to do?")).toBeNull();
    expect(screen.getByText("Material findings")).toBeTruthy();
  });

  it("renders Flows workflow cards and the ten-stage governed sequence", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Show technical details" }));
    const navigation = screen.getByRole("navigation", { name: "Console navigation" });

    await user.click(within(navigation).getByRole("button", { name: "Flows" }));
    expect(screen.getByRole("heading", { name: "Flows" })).toBeTruthy();
    expect(screen.getByText("Governed Workflows")).toBeTruthy();
    expect(screen.getByText("Open flow summary")).toBeTruthy();
    expect(screen.getByText("Workflow name")).toBeTruthy();
    expect(screen.getByText("Workflow ID")).toBeTruthy();
    expect(screen.getByText("Purpose")).toBeTruthy();
    expect(screen.getAllByText("Current operator verdict").length).toBeGreaterThan(0);
    expect(screen.getByText("Strongest continuity gap")).toBeTruthy();
    expect(screen.getByText("Next inspection")).toBeTruthy();
    expect(screen.getByText("Human authority")).toBeTruthy();
    expect(screen.getByText("Policy boundary")).toBeTruthy();
    expect(screen.getByText("Agent proposal")).toBeTruthy();
    expect(screen.getAllByText("Human Agency Audit").length).toBeGreaterThan(0);
    const sequence = screen.getByLabelText("Read-only governed workflow sequence");
    expect(sequence.querySelectorAll(".governed-sequence-stage")).toHaveLength(10);
  });

  it("renders the Workbench sample preview without approval or execution controls", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Show technical details" }));
    const navigation = screen.getByRole("navigation", { name: "Console navigation" });

    await user.click(within(navigation).getByRole("button", { name: "Workbench" }));
    const main = screen.getByRole("main");

    expect(screen.getByRole("heading", { name: "Workbench" })).toBeTruthy();
    expect(within(main).getByText("Sample-data preview only.")).toBeTruthy();
    expect(within(main).getByText(/No live agents, external execution, approval write-back/)).toBeTruthy();
    expect(within(main).getByText("Assignments")).toBeTruthy();
    expect(within(main).getByText("Prepare release-note draft for human review")).toBeTruthy();
    expect(within(main).getByText("Review Queue")).toBeTruthy();
    expect(within(main).getByText("Create reviewed public changelog draft")).toBeTruthy();
    expect(within(main).getAllByText("Governance Path").length).toBeGreaterThan(0);
    expect(within(main).getAllByText("Identity verification").length).toBeGreaterThan(0);
    expect(within(main).getAllByText("Runtime permit state").length).toBeGreaterThan(0);
    expect(within(main).getAllByText("pending human review").length).toBeGreaterThan(0);

    const advisoryBadge = within(main).getAllByText("Advisory").at(0);
    const bindingBadge = within(main).getAllByText("Binding").at(0);
    expect(advisoryBadge).toBeTruthy();
    expect(bindingBadge).toBeTruthy();
    expect(advisoryBadge?.className).toContain("status-advisory");
    expect(bindingBadge?.className).toContain("status-binding");

    expect(within(main).getAllByText("Operational status").length).toBeGreaterThan(0);
    expect(within(main).getAllByText("Governance status").length).toBeGreaterThan(0);
    expect(within(main).getByText("Recent Governed Activity")).toBeTruthy();
    expect(within(main).getByText("Governance Memory recommendation generated")).toBeTruthy();
    expect(within(main).queryByRole("button", { name: /approve|reject|allow|block|execute|connect/i })).toBeNull();
    expect(within(main).queryByText("Connected agents")).toBeNull();
    expect(within(main).queryByText("Implemented interoperability")).toBeNull();
  });

  it("renders Findings with plain-language labels and expandable technical details", async () => {
    const user = userEvent.setup();
    mockBundledSnapshot(localSnapshot());
    render(<App />);
    const navigation = screen.getByRole("navigation", { name: "Console navigation" });

    await user.click(within(navigation).getByRole("button", { name: "Settings" }));
    await user.click(screen.getByRole("button", { name: "Load bundled snapshot" }));
    await user.click(within(navigation).getByRole("button", { name: "Findings" }));

    expect(screen.getByRole("heading", { name: "Findings" })).toBeTruthy();
    expect(screen.getAllByText("Required control missing").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Parser diagnostic").length).toBeGreaterThan(0);
    expect(screen.getByText("Recommended remediation")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "View in architecture" }));
    expect(screen.getByRole("heading", { name: "Advanced Architecture Map" })).toBeTruthy();
  });

  it("renders Runs with an operator verdict and imported trace rendering", async () => {
    const user = userEvent.setup();
    mockBundledSnapshot(localSnapshot());
    render(<App />);
    const navigation = screen.getByRole("navigation", { name: "Console navigation" });

    await user.click(within(navigation).getByRole("button", { name: "Settings" }));
    await user.click(screen.getByRole("button", { name: "Load bundled snapshot" }));
    await user.click(within(navigation).getByRole("button", { name: "Runs" }));

    expect(screen.getByRole("heading", { name: "Runs" })).toBeTruthy();
    expect(screen.getByText("Can we prove what happened?")).toBeTruthy();
    expect(screen.getByText("Not completely")).toBeTruthy();
    expect(screen.queryByText("Imported Trace Timeline")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Show technical details" }));
    expect(screen.getByText("Run Verdict")).toBeTruthy();
    expect(screen.getByText("Evidence validation failed")).toBeTruthy();
    expect(screen.getByText("Imported Trace Timeline")).toBeTruthy();
  });

  it("keeps Local Evidence approvals read-only", async () => {
    const user = userEvent.setup();
    mockBundledSnapshot(localSnapshot());
    render(<App />);
    const navigation = screen.getByRole("navigation", { name: "Console navigation" });

    await user.click(within(navigation).getByRole("button", { name: "Settings" }));
    await user.click(screen.getByRole("button", { name: "Load bundled snapshot" }));
    await user.click(screen.getByRole("button", { name: "Show technical details" }));
    await user.click(within(navigation).getByRole("button", { name: "Approvals" }));

    expect(screen.getByRole("heading", { name: "Approvals" })).toBeTruthy();
    expect(screen.getByText("Read-only evidence mode. Approval execution is intentionally disabled.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Allow" })).toBeNull();
    expect(screen.getByText(/No current approval queue is imported/)).toBeTruthy();
  });

  it("does not display sample memory or registry claims in Local Evidence Mode", async () => {
    const user = userEvent.setup(); mockBundledSnapshot(localSnapshot()); render(<App />);
    const navigation = screen.getByRole("navigation", { name: "Console navigation" });
    await user.click(within(navigation).getByRole("button", { name: "Settings" }));
    await user.click(screen.getByRole("button", { name: "Load bundled snapshot" }));
    await user.click(screen.getByRole("button", { name: "Show technical details" }));
    await user.click(within(navigation).getByRole("button", { name: "Audits" }));
    await user.click(screen.getByRole("button", { name: "Open Governance Memory" }));
    expect(screen.getByText("No Governance Memory summary artifact was imported.")).toBeTruthy();
    for (const recommendation of governanceRecommendations) expect(screen.queryByText(recommendation.title)).toBeNull();
    await user.click(within(navigation).getByRole("button", { name: "Plugins" }));
    expect(screen.getByText(/No installed-plugin inventory was imported/)).toBeTruthy();
    expect(screen.queryByText("Installed Plugins")).toBeNull();
  });

  it("renders Audits hub links to Human Agency Audit, Governance Memory, and Advanced Architecture Map", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Show technical details" }));
    const navigation = screen.getByRole("navigation", { name: "Console navigation" });

    await user.click(within(navigation).getByRole("button", { name: "Audits" }));
    expect(screen.getByRole("heading", { name: "Audits" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Open Human Agency Audit" }));
    expect(screen.getByRole("heading", { name: "Human Agency Audit" })).toBeTruthy();

    await user.click(within(navigation).getByRole("button", { name: "Audits" }));
    await user.click(screen.getByRole("button", { name: "Open Governance Memory" }));
    expect(screen.getByRole("heading", { name: "Governance Memory" })).toBeTruthy();

    await user.click(within(navigation).getByRole("button", { name: "Audits" }));
    await user.click(screen.getByRole("button", { name: "Open Advanced Architecture Map" }));
    expect(screen.getByRole("heading", { name: "Advanced Architecture Map" })).toBeTruthy();
  });

  it("renders Reports and Settings from the simplified navigation", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "Show technical details" }));
    const navigation = screen.getByRole("navigation", { name: "Console navigation" });

    await user.click(within(navigation).getByRole("button", { name: "Reports" }));
    expect(screen.getByText("Export Continuity Snapshot JSON")).toBeTruthy();

    await user.click(within(navigation).getByRole("button", { name: "Settings" }));
    expect(screen.getByText("Current Data Source")).toBeTruthy();
    expect(screen.getByText("Upload Snapshot JSON")).toBeTruthy();
  });

  it("smoke renders practical responsive widths", async () => {
    const user = userEvent.setup();
    for (const width of [1440, 1280, 1024, 768, 390]) {
      Object.defineProperty(window, "innerWidth", { value: width, configurable: true });
      render(<App />);
      const navigation = screen.getByRole("navigation", { name: "Console navigation" });
      expect(screen.getByRole("heading", { name: "Home" })).toBeTruthy();
      await user.click(screen.getByRole("button", { name: "Show technical details" }));
      await user.click(within(navigation).getByRole("button", { name: "Flows" }));
      expect(screen.getByRole("heading", { name: "Flows" })).toBeTruthy();
      cleanup();
    }
  });
});
