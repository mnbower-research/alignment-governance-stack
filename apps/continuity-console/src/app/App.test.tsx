import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { App } from "./App";

describe("Continuity Console app", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders the Overview dashboard", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "AGS Continuity Console" })).toBeTruthy();
    expect(screen.getByText("Governance Continuity Graph")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Critical Gaps" })).toBeTruthy();
  });

  it("navigates to Stack Map and opens layer and edge detail", async () => {
    const user = userEvent.setup();
    render(<App />);
    const navigation = screen.getByRole("navigation", { name: "Console navigation" });

    await user.click(within(navigation).getByRole("button", { name: "Stack Map" }));
    expect(screen.getByRole("heading", { name: "Stack Map" })).toBeTruthy();

    const runtimeLayer = screen.getByText("Business-Level Runtime Admissibility").closest("button");
    expect(runtimeLayer).toBeTruthy();
    await user.click(runtimeLayer as HTMLElement);
    expect(screen.getByText("business-level runtime admissibility is not configured")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: /Inspect edge from AAG/ }));
    expect(screen.getByText(/runtime decision adapter/i)).toBeTruthy();
  });

  it("registers a local plugin from the Plugins page", async () => {
    const user = userEvent.setup();
    render(<App />);
    const navigation = screen.getByRole("navigation", { name: "Console navigation" });

    await user.click(within(navigation).getByRole("button", { name: "Plugins" }));
    await user.type(screen.getByPlaceholderText("Local runtime decision adapter"), "Local Runtime Decision Adapter");
    await user.click(screen.getByRole("button", { name: "Add Plugin" }));

    expect(screen.getByText("Local Runtime Decision Adapter")).toBeTruthy();
    expect(screen.getByText("Locally registered Phase 1 sample plugin. Presence in the registry does not imply safety or enforcement.")).toBeTruthy();
  });

  it("renders Live Action Trace and updates the selected trace step", async () => {
    const user = userEvent.setup();
    render(<App />);
    const navigation = screen.getByRole("navigation", { name: "Console navigation" });

    await user.click(within(navigation).getByRole("button", { name: "Live Action Trace" }));
    expect(screen.getByRole("heading", { name: "Live Action Trace" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: /Runtime Permit Issued/ }));
    expect(screen.getAllByText("Permit issued").length).toBeGreaterThan(0);
    expect(screen.getByText("permit_7f31b6c9")).toBeTruthy();
  });

  it("updates Approval Queue state and records a local receipt", async () => {
    const user = userEvent.setup();
    render(<App />);
    const navigation = screen.getByRole("navigation", { name: "Console navigation" });

    await user.click(within(navigation).getByRole("button", { name: "Approval Queue" }));
    const firstApproval = screen.getByText("Create reviewed public changelog draft").closest("article");
    expect(firstApproval).toBeTruthy();

    await user.click(within(firstApproval as HTMLElement).getByRole("button", { name: "Allow" }));
    expect(within(firstApproval as HTMLElement).getByText("Allowed")).toBeTruthy();
    expect(screen.getByText("Local UI state changed to Allowed. No external action executed.")).toBeTruthy();
  });

  it("renders Human Agency Audit and Governance Memory pages", async () => {
    const user = userEvent.setup();
    render(<App />);
    const navigation = screen.getByRole("navigation", { name: "Console navigation" });

    await user.click(within(navigation).getByRole("button", { name: "Human Agency Audit" }));
    expect(screen.getByRole("heading", { name: "Human Agency Audit" })).toBeTruthy();
    expect(screen.getByText("Agency Preservation Dimensions")).toBeTruthy();

    await user.click(within(navigation).getByRole("button", { name: "Governance Memory" }));
    expect(screen.getByRole("heading", { name: "Governance Memory" })).toBeTruthy();
    expect(screen.getByText("Governance Recommendations")).toBeTruthy();
  });

  it("loads bundled Local Evidence Mode and makes approvals read-only", async () => {
    const user = userEvent.setup();
    window.fetch = async () =>
      ({
        ok: true,
        json: async () => ({
          schemaVersion: "ags.continuity-snapshot.v0.1",
          generatedAt: "2026-01-02T00:00:00.000Z",
          deployment: { id: "local", name: "Local Evidence", environment: "local" },
          artifacts: [],
          diagnostics: [],
        }),
      }) as Response;
    render(<App />);
    const navigation = screen.getByRole("navigation", { name: "Console navigation" });

    await user.click(within(navigation).getByRole("button", { name: "Settings" }));
    await user.click(screen.getByRole("button", { name: "Load bundled snapshot" }));
    expect(screen.getByText("Local Evidence Mode")).toBeTruthy();

    await user.click(within(navigation).getByRole("button", { name: "Approval Queue" }));
    expect(screen.getByText(/Read-only view in Local Evidence Mode/)).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "Allow" })[0]).toHaveProperty("disabled", true);
  });
});
