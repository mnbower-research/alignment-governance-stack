import { useMemo, useState } from "react";
import { ConsoleLayout } from "../layouts/ConsoleLayout";
import { readStoredPlugins } from "../lib/pluginStorage";
import { clearStoredSnapshot, readStoredSnapshot, writeStoredSnapshot } from "../lib/snapshotStorage";
import { projectSnapshot } from "../lib/evidenceProjection";
import type { ContinuitySnapshot } from "@alignment-governance-stack/continuity-ingest";
import {
  governanceMemorySignals,
  governanceRecommendations,
  humanAgencyAudit,
  sampleApprovalRequests,
  sampleDeployment,
  sampleTrace,
} from "../data/sampleDeployment";
import { ApprovalQueuePage } from "../pages/ApprovalQueuePage";
import { ContinuityGapsPage } from "../pages/ContinuityGapsPage";
import { GovernanceMemoryPage } from "../pages/GovernanceMemoryPage";
import { HumanAgencyAuditPage } from "../pages/HumanAgencyAuditPage";
import { LiveActionTracePage } from "../pages/LiveActionTracePage";
import { OverviewPage } from "../pages/OverviewPage";
import { PluginsPage } from "../pages/PluginsPage";
import { ReportsPage } from "../pages/ReportsPage";
import { SettingsPage } from "../pages/SettingsPage";
import { StackMapPage } from "../pages/StackMapPage";
import type { PageId } from "./navigation";
import type { PluginManifest } from "../types/continuity";

export function App(): JSX.Element {
  const [activePage, setActivePage] = useState<PageId>("overview");
  const [snapshot, setSnapshot] = useState<ContinuitySnapshot | null>(() => readStoredSnapshot());
  const [plugins, setPlugins] = useState<PluginManifest[]>(() => {
    const storedPlugins = readStoredPlugins();
    return [...storedPlugins, ...sampleDeployment.plugins.filter((plugin) => !storedPlugins.some((stored) => stored.id === plugin.id))];
  });

  const sampleWithPlugins = useMemo(() => ({ ...sampleDeployment, plugins }), [plugins]);
  const projection = useMemo(() => (snapshot ? projectSnapshot(snapshot) : null), [snapshot]);
  const mode = projection ? "local-evidence" : "sample";
  const deployment = projection?.deployment ?? sampleWithPlugins;

  function loadSnapshot(nextSnapshot: ContinuitySnapshot): void {
    writeStoredSnapshot(nextSnapshot);
    setSnapshot(nextSnapshot);
  }

  function clearSnapshot(): void {
    clearStoredSnapshot();
    setSnapshot(null);
  }

  function renderPage(): JSX.Element {
    switch (activePage) {
      case "overview":
        return (
          <OverviewPage
            deployment={deployment}
            mode={mode}
            confidence={projection?.confidence}
            artifactCount={snapshot?.artifacts.length}
            diagnosticCount={snapshot?.diagnostics.length}
          />
        );
      case "stack-map":
        return (
          <StackMapPage
            deployment={deployment}
            mode={mode}
            confidence={projection?.confidence}
            artifactsByLayer={projection?.artifactsByLayer}
          />
        );
      case "plugins":
        return <PluginsPage deployment={deployment} plugins={plugins} setPlugins={setPlugins} />;
      case "live-action-trace":
        return <LiveActionTracePage deployment={deployment} trace={sampleTrace} importedTrace={projection?.trace} mode={mode} confidence={projection?.confidence} />;
      case "approval-queue":
        return <ApprovalQueuePage deployment={deployment} initialRequests={sampleApprovalRequests} mode={mode} confidence={projection?.confidence} />;
      case "human-agency-audit":
        return (
          <HumanAgencyAuditPage
            deployment={deployment}
            audit={humanAgencyAudit}
            mode={mode}
            confidence={projection?.confidence}
            evidenceCounts={{
              authority: snapshot?.artifacts.filter((artifact) => artifact.kind === "authority-map").length ?? 0,
              participation: snapshot?.artifacts.filter((artifact) => artifact.kind === "human-participation-quality").length ?? 0,
              agencyChain: snapshot?.artifacts.filter((artifact) => artifact.kind === "agency-chain-report").length ?? 0,
              fingerprint: snapshot?.artifacts.filter((artifact) => artifact.kind === "agency-fingerprint").length ?? 0,
            }}
          />
        );
      case "governance-memory":
        return (
          <GovernanceMemoryPage
            deployment={deployment}
            signals={governanceMemorySignals}
            recommendations={governanceRecommendations}
            mode={mode}
            confidence={projection?.confidence}
            importedMemoryArtifacts={snapshot?.artifacts.filter((artifact) => artifact.kind === "governance-memory-summary")}
          />
        );
      case "continuity-gaps":
        return <ContinuityGapsPage deployment={deployment} gaps={projection?.gaps ?? sampleDeployment.findings.map((finding) => ({
          id: finding.id,
          severity: finding.severity,
          category: "Missing Evidence",
          title: finding.title,
          description: finding.description,
          affectedLayerIds: finding.affectedLayerIds,
          recommendation: finding.recommendation,
        }))} mode={mode} confidence={projection?.confidence} />;
      case "reports":
        return <ReportsPage deployment={deployment} snapshot={snapshot} gaps={projection?.gaps ?? []} mode={mode} confidence={projection?.confidence} />;
      case "settings":
        return (
          <SettingsPage
            deployment={deployment}
            snapshot={snapshot}
            mode={mode}
            confidence={projection?.confidence}
            onSnapshotLoad={loadSnapshot}
            onSnapshotClear={clearSnapshot}
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
