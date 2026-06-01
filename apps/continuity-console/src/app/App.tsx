import { useMemo, useState } from "react";
import { ConsoleLayout } from "../layouts/ConsoleLayout";
import { readStoredPlugins } from "../lib/pluginStorage";
import {
  governanceMemorySignals,
  governanceRecommendations,
  humanAgencyAudit,
  sampleApprovalRequests,
  sampleDeployment,
  sampleTrace,
} from "../data/sampleDeployment";
import { ApprovalQueuePage } from "../pages/ApprovalQueuePage";
import { GovernanceMemoryPage } from "../pages/GovernanceMemoryPage";
import { HumanAgencyAuditPage } from "../pages/HumanAgencyAuditPage";
import { LiveActionTracePage } from "../pages/LiveActionTracePage";
import { OverviewPage } from "../pages/OverviewPage";
import { PlaceholderPage } from "../pages/PlaceholderPage";
import { PluginsPage } from "../pages/PluginsPage";
import { StackMapPage } from "../pages/StackMapPage";
import type { PageId } from "./navigation";
import type { PluginManifest } from "../types/continuity";

export function App(): JSX.Element {
  const [activePage, setActivePage] = useState<PageId>("overview");
  const [plugins, setPlugins] = useState<PluginManifest[]>(() => {
    const storedPlugins = readStoredPlugins();
    return [...storedPlugins, ...sampleDeployment.plugins.filter((plugin) => !storedPlugins.some((stored) => stored.id === plugin.id))];
  });

  const deployment = useMemo(() => ({ ...sampleDeployment, plugins }), [plugins]);

  function renderPage(): JSX.Element {
    switch (activePage) {
      case "overview":
        return <OverviewPage deployment={deployment} />;
      case "stack-map":
        return <StackMapPage deployment={deployment} />;
      case "plugins":
        return <PluginsPage deployment={deployment} plugins={plugins} setPlugins={setPlugins} />;
      case "live-action-trace":
        return <LiveActionTracePage deployment={deployment} trace={sampleTrace} />;
      case "approval-queue":
        return <ApprovalQueuePage deployment={deployment} initialRequests={sampleApprovalRequests} />;
      case "human-agency-audit":
        return <HumanAgencyAuditPage deployment={deployment} audit={humanAgencyAudit} />;
      case "governance-memory":
        return (
          <GovernanceMemoryPage
            deployment={deployment}
            signals={governanceMemorySignals}
            recommendations={governanceRecommendations}
          />
        );
      case "continuity-gaps":
        return (
          <PlaceholderPage
            deployment={deployment}
            title="Continuity Gaps"
            description="Prioritized gap review for missing, partial, degraded, and weak continuity edges."
            bullets={["Group gaps by governance layer", "Track remediation ownership", "Keep mapped status separate from enforced status"]}
          />
        );
      case "reports":
        return (
          <PlaceholderPage
            deployment={deployment}
            title="Reports"
            description="Future export surface for audit-ready continuity summaries and evidence packets."
            bullets={["Export deployment posture", "Attach receipt evidence", "Avoid unsupported production validation claims"]}
          />
        );
      case "settings":
        return (
          <PlaceholderPage
            deployment={deployment}
            title="Settings"
            description="Local-only configuration surface for Phase 1 console preferences and deployment sample metadata."
            bullets={["No accounts or auth", "No hosted SaaS settings", "No external agent integrations"]}
          />
        );
    }
  }

  return (
    <ConsoleLayout activePage={activePage} onNavigate={setActivePage}>
      {renderPage()}
    </ConsoleLayout>
  );
}
