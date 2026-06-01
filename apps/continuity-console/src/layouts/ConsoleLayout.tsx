import type { ReactNode } from "react";
import type { PageId } from "../app/navigation";
import { navigationItems } from "../app/navigation";

interface ConsoleLayoutProps {
  activePage: PageId;
  onNavigate: (page: PageId) => void;
  children: ReactNode;
}

export function ConsoleLayout({ activePage, onNavigate, children }: ConsoleLayoutProps): JSX.Element {
  return (
    <div className="console-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <span>AGS</span>
          <div>
            <strong>Continuity Console</strong>
            <small>Local-first operator view</small>
          </div>
        </div>
        <nav aria-label="Console navigation">
          {navigationItems.map((item) => (
            <button
              type="button"
              key={item.id}
              className={activePage === item.id ? "active" : ""}
              onClick={() => onNavigate(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <span>Phase 1</span>
          <strong>Sample deployment only</strong>
        </div>
      </aside>
      <main className="page-surface">{children}</main>
    </div>
  );
}
