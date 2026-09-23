import { useEffect, useMemo, useRef, useState } from "react";
import { validateSnapshotEvidence } from "@alignment-governance-stack/continuity-ingest/browser";
import { ConsoleLayout } from "../layouts/ConsoleLayout";
import { readStoredPlugins } from "../lib/pluginStorage";
import { clearStoredSnapshot, readStoredSnapshot, writeStoredSnapshot } from "../lib/snapshotStorage";
import { projectSnapshot, type EvidenceGapFinding } from "../lib/evidenceProjection";
import { buildImportedOperatorSummary, buildSampleOperatorSummary } from "../lib/operatorSummary";
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
import { AuditsPage } from "../pages/AuditsPage";
import { ContinuityGapsPage } from "../pages/ContinuityGapsPage";
import { FlowsPage } from "../pages/FlowsPage";
import { GovernanceMemoryPage } from "../pages/GovernanceMemoryPage";
import { HumanAgencyAuditPage } from "../pages/HumanAgencyAuditPage";
import { LiveActionTracePage } from "../pages/LiveActionTracePage";
import { OverviewPage } from "../pages/OverviewPage";
import { PluginsPage } from "../pages/PluginsPage";
import { ReportsPage } from "../pages/ReportsPage";
import { SettingsPage } from "../pages/SettingsPage";
import { StackMapPage } from "../pages/StackMapPage";
import { WorkbenchPage } from "../pages/WorkbenchPage";
import type { PageId } from "./navigation";
import type { PluginManifest } from "../types/continuity";

export function App(): JSX.Element {
  const [activePage, setActivePage] = useState<PageId>("home");
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [storedSnapshot] = useState(() => readStoredSnapshot());
  const [snapshot, setSnapshot] = useState<ContinuitySnapshot | null>(null);
  const [loadingEvidence, setLoadingEvidence] = useState(storedSnapshot !== null);
  const loadGeneration = useRef(0);
  useEffect(() => {
    if (storedSnapshot) void loadSnapshot(async () => storedSnapshot);
  }, [storedSnapshot]);
  const [plugins, setPlugins] = useState<PluginManifest[]>(() => {
    const storedPlugins = readStoredPlugins();
    return [...storedPlugins, ...sampleDeployment.plugins.filter((plugin) => !storedPlugins.some((stored) => stored.id === plugin.id))];
  });

  const sampleWithPlugins = useMemo(() => ({ ...sampleDeployment, plugins }), [plugins]);
  const projection = useMemo(() => (snapshot ? projectSnapshot(snapshot) : null), [snapshot]);
  const mode = projection ? "local-evidence" : "sample";
  const deployment = projection?.deployment ?? sampleWithPlugins;
  const gaps = projection?.gaps ?? sampleDeployment.findings.map((finding): EvidenceGapFinding => ({
    id: finding.id,
    severity: finding.severity,
    category: "Layer Evidence",
    status: "Open",
    confidence: "Partial",
    sourceMode: "Sample Mode",
    title: finding.title,
    description: finding.description,
    affectedLayerIds: finding.affectedLayerIds,
    evidenceBasis: "Sample Mode typed demo finding.",
    missingRequirement: "Sample data models the gap for UI review only.",
    likelyRisk: "The demo finding illustrates the operator workflow and is not imported evidence.",
    recommendation: finding.recommendation,
    firstDetectedAt: sampleDeployment.lastScanAt,
    lastDetectedAt: sampleDeployment.lastScanAt,
  }));
  const operatorSummary = projection
    ? buildImportedOperatorSummary(projection.trace, gaps)
    : buildSampleOperatorSummary(sampleTrace, gaps);

  function setTechnicalDetails(visible: boolean): void {
    setShowTechnicalDetails(visible);
    if (!visible && !["home", "runs", "findings", "settings"].includes(activePage)) setActivePage("home");
  }

  async function loadSnapshot(read: () => Promise<ContinuitySnapshot>): Promise<boolean> {
    const generation = ++loadGeneration.current;
    try {
      const nextSnapshot = await read();
      if (generation !== loadGeneration.current) return false;
      const validated = await validateSnapshotEvidence(nextSnapshot);
      if (generation !== loadGeneration.current) return false;
      writeStoredSnapshot(validated);
      setSnapshot(validated);
      setLoadingEvidence(false);
      return true;
    } catch (error) {
      if (generation !== loadGeneration.current) return false;
      const failedSnapshot: ContinuitySnapshot = { schemaVersion: "ags.continuity-snapshot.v0.1", generatedAt: "Unknown", deployment: { id: "invalid-import", name: "Invalid local evidence", environment: "local" }, artifacts: [], diagnostics: [{ severity: "error", code: "artifact.parser-error", message: error instanceof Error ? error.message : "Local evidence could not be validated." }] };
      // A refresh must not silently restore evidence from before a failed replacement.
      try { writeStoredSnapshot(failedSnapshot); } catch { /* The visible diagnostic still applies if storage is unavailable. */ }
      setSnapshot(failedSnapshot);
      setLoadingEvidence(false);
      return false;
    }
  }

  function clearSnapshot(): void {
    ++loadGeneration.current;
    setLoadingEvidence(false);
    clearStoredSnapshot();
    setSnapshot(null);
  }

  if (loadingEvidence) return <p>Validating local evidence?</p>;

  function renderPage(): JSX.Element {
    switch (activePage) {
      case "home":
        return (
          <OverviewPage
            deployment={deployment}
            mode={mode}
            confidence={projection?.confidence}
            artifactCount={snapshot?.artifacts.length}
            diagnosticCount={snapshot?.diagnostics.length}
            snapshot={snapshot}
            gaps={gaps}
            trace={sampleTrace}
            approvals={sampleApprovalRequests}
            operatorSummary={operatorSummary}
            showTechnicalDetails={showTechnicalDetails}
            onNavigate={setActivePage}
          />
        );
      case "flows":
        return (
          <FlowsPage
            deployment={deployment}
            mode={mode}
            confidence={projection?.confidence}
            trace={sampleTrace}
            importedTrace={projection?.trace}
            gaps={gaps}
            onNavigate={setActivePage}
          />
        );
      case "workbench":
        return <WorkbenchPage deployment={deployment} mode={mode} confidence={projection?.confidence} />;
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
        return <PluginsPage deployment={deployment} plugins={plugins} setPlugins={setPlugins} mode={mode} confidence={projection?.confidence} />;
      case "runs":
        return <LiveActionTracePage deployment={deployment} trace={sampleTrace} importedTrace={projection?.trace} mode={mode} confidence={projection?.confidence} operatorSummary={operatorSummary} showTechnicalDetails={showTechnicalDetails} onNavigate={setActivePage} />;
      case "approvals":
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
      case "findings":
        return <ContinuityGapsPage deployment={deployment} gaps={gaps} mode={mode} confidence={projection?.confidence} onViewArchitecture={() => setActivePage("stack-map")} />;
      case "audits":
        return <AuditsPage deployment={deployment} mode={mode} confidence={projection?.confidence} onNavigate={setActivePage} />;
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
    <ConsoleLayout activePage={activePage} onNavigate={setActivePage} mode={mode} deploymentName={deployment.name} showTechnicalDetails={showTechnicalDetails} onTechnicalDetailsChange={setTechnicalDetails}>
      {renderPage()}
    </ConsoleLayout>
  );
}
