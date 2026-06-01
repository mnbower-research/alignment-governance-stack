export type PageId =
  | "overview"
  | "stack-map"
  | "continuity-gaps"
  | "live-action-trace"
  | "approval-queue"
  | "human-agency-audit"
  | "governance-memory"
  | "plugins"
  | "reports"
  | "settings";

export interface NavigationItem {
  id: PageId;
  label: string;
}

export const navigationItems: NavigationItem[] = [
  { id: "overview", label: "Overview" },
  { id: "stack-map", label: "Stack Map" },
  { id: "continuity-gaps", label: "Continuity Gaps" },
  { id: "live-action-trace", label: "Live Action Trace" },
  { id: "approval-queue", label: "Approval Queue" },
  { id: "human-agency-audit", label: "Human Agency Audit" },
  { id: "governance-memory", label: "Governance Memory" },
  { id: "plugins", label: "Plugins" },
  { id: "reports", label: "Reports" },
  { id: "settings", label: "Settings" },
];
