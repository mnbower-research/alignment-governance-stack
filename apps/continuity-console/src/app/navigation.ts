export type PageId =
  | "home"
  | "workbench"
  | "flows"
  | "runs"
  | "findings"
  | "approvals"
  | "plugins"
  | "audits"
  | "reports"
  | "settings"
  | "stack-map"
  | "human-agency-audit"
  | "governance-memory";

export interface NavigationItem {
  id: PageId;
  label: string;
  icon: string;
}

export const navigationItems: NavigationItem[] = [
  { id: "home", label: "Home", icon: "home" },
  { id: "workbench", label: "Workbench", icon: "workbench" },
  { id: "flows", label: "Flows", icon: "layers" },
  { id: "runs", label: "Runs", icon: "pulse" },
  { id: "findings", label: "Findings", icon: "alert" },
  { id: "approvals", label: "Approvals", icon: "review" },
  { id: "plugins", label: "Plugins", icon: "plugin" },
  { id: "audits", label: "Audits", icon: "agency" },
  { id: "reports", label: "Reports", icon: "report" },
  { id: "settings", label: "Settings", icon: "settings" },
];
