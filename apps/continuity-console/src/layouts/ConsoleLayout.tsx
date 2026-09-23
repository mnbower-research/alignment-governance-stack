import type { ReactNode } from "react";
import type { PageId } from "../app/navigation";
import { navigationItems } from "../app/navigation";
import type { ConsoleDataMode } from "../lib/evidenceProjection";

interface ConsoleLayoutProps {
  activePage: PageId;
  onNavigate: (page: PageId) => void;
  mode: ConsoleDataMode;
  deploymentName: string;
  showTechnicalDetails: boolean;
  onTechnicalDetailsChange: (visible: boolean) => void;
  children: ReactNode;
}

export function ConsoleLayout({ activePage, onNavigate, mode, deploymentName, showTechnicalDetails, onTechnicalDetailsChange, children }: ConsoleLayoutProps): JSX.Element {
  const visibleNavigation = showTechnicalDetails
    ? navigationItems
    : navigationItems.filter((item) => ["home", "runs", "findings", "settings"].includes(item.id));
  return (
    <div className="console-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <img className="brand-mark" src="/ags-mark.svg" width="40" height="40" alt="" />
          <div className="brand-wordmark">
            <strong>AGS</strong>
            <small>Continuity Console</small>
          </div>
        </div>
        <nav aria-label="Console navigation">
          {visibleNavigation.map((item) => (
            <button
              type="button"
              key={item.id}
              className={activePage === item.id ? "active" : ""}
              onClick={() => onNavigate(item.id)}
            >
              <span className={`nav-icon icon-${item.icon}`} aria-hidden="true" />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <button
          type="button"
          className="technical-details-control"
          aria-pressed={showTechnicalDetails}
          onClick={() => onTechnicalDetailsChange(!showTechnicalDetails)}
        >
          <span aria-hidden="true">{showTechnicalDetails ? "−" : "+"}</span>
          {showTechnicalDetails ? "Hide technical details" : "Show technical details"}
        </button>
        <div className="sidebar-footer">
          <span>{mode === "local-evidence" ? "Local Evidence Mode" : "Sample Mode"}</span>
          <strong>{mode === "local-evidence" ? "Read-only imported snapshot" : "Demo deployment only"}</strong>
          <small>{deploymentName}</small>
        </div>
        <button type="button" className="collapse-control" aria-label="Collapse sidebar">
          <span aria-hidden="true">&lt;</span>
          Collapse
        </button>
      </aside>
      <main className="page-surface">{children}</main>
    </div>
  );
}
