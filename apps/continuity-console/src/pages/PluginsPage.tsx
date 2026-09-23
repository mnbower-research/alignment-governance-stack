import { useMemo, useState } from "react";
import { DetailList } from "../components/DetailList";
import { PageHeader } from "../components/PageHeader";
import { Panel } from "../components/Panel";
import { StatusBadge } from "../components/StatusBadge";
import { writeStoredPlugins } from "../lib/pluginStorage";
import type { ConsoleDataMode, EvidenceConfidence } from "../lib/evidenceProjection";
import type { AdapterCategory, DeploymentManifest, PluginManifest } from "../types/continuity";

const adapterCategories: AdapterCategory[] = [
  "Substrate Adapter",
  "Policy Adapter",
  "Orchestration Adapter",
  "Deliberation Adapter",
  "Runtime Decision Adapter",
  "Execution-Control Adapter",
  "Execution Adapter",
  "Human Interface Adapter",
  "Observability Adapter",
  "Receipt / Audit Adapter",
  "Governance Memory Adapter",
];

interface PluginsPageProps {
  deployment: DeploymentManifest;
  plugins: PluginManifest[];
  setPlugins: (plugins: PluginManifest[]) => void;
  mode?: ConsoleDataMode | undefined;
  confidence?: EvidenceConfidence | undefined;
}

export function PluginsPage({ deployment, plugins, setPlugins, mode = "sample", confidence }: PluginsPageProps): JSX.Element {
  const [selectedPlugin, setSelectedPlugin] = useState<PluginManifest | null>(plugins[0] ?? null);
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [layerFilter, setLayerFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [healthFilter, setHealthFilter] = useState("All");
  const [manifestText, setManifestText] = useState("");
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState<AdapterCategory>("Policy Adapter");

  const filteredPlugins = useMemo(
    () =>
      plugins.filter((plugin) => {
        const matchesCategory = categoryFilter === "All" || plugin.adapterCategory === categoryFilter;
        const matchesLayer = layerFilter === "All" || plugin.layersCovered.includes(layerFilter);
        const matchesStatus = statusFilter === "All" || plugin.integrationStatus === statusFilter;
        const matchesHealth = healthFilter === "All" || plugin.healthStatus === healthFilter;
        return matchesCategory && matchesLayer && matchesStatus && matchesHealth;
      }),
    [categoryFilter, healthFilter, layerFilter, plugins, statusFilter],
  );

  function updatePlugins(nextPlugins: PluginManifest[]): void {
    setPlugins(nextPlugins);
    writeStoredPlugins(nextPlugins);
  }

  function addPlugin(): void {
    if (!formName.trim()) {
      return;
    }

    const newPlugin: PluginManifest = {
      id: `local-${formName.toLowerCase().replaceAll(" ", "-")}-${Date.now()}`,
      name: formName.trim(),
      version: "0.1.0",
      vendor: "Local",
      description: "Locally registered Phase 1 sample plugin. Presence in the registry does not imply safety or enforcement.",
      adapterCategory: formCategory,
      layersCovered: ["layer-7"],
      inputsReceived: ["sample manifest"],
      outputsReturned: ["sample registry entry"],
      permissionsRequired: ["local browser storage"],
      actionsAllowed: ["display plugin metadata"],
      actionsProhibited: ["execute actions", "claim integration"],
      authoritySource: "Local operator declaration",
      failureBehavior: "Fail closed until verified.",
      evidenceGenerated: ["local registration record"],
      reversibility: "Can be removed from browser storage.",
      revocationPath: "Clear local registry entry.",
      upstreamAssumptions: ["operator supplied accurate metadata"],
      downstreamGuarantees: ["none until tested"],
      healthStatus: "Warning",
      integrationStatus: "Declared",
      testStatus: "Untested",
      redTeamStatus: "Not red-teamed",
      lastVerifiedAt: "Not verified",
    };

    updatePlugins([newPlugin, ...plugins]);
    setSelectedPlugin(newPlugin);
    setFormName("");
  }

  function importManifest(): void {
    try {
      const parsed = JSON.parse(manifestText) as PluginManifest;
      if (!parsed.id || !parsed.name || !parsed.adapterCategory) {
        return;
      }

      updatePlugins([parsed, ...plugins.filter((plugin) => plugin.id !== parsed.id)]);
      setSelectedPlugin(parsed);
      setManifestText("");
    } catch {
      setManifestText(manifestText);
    }
  }

  if (mode === "local-evidence") return <>
    <PageHeader title="Plugins" description="Imported evidence does not establish installed plugins or live integration health." deployment={deployment} mode={mode} confidence={confidence} />
    <Panel title="Plugin Evidence" eyebrow="not demonstrated"><p>No installed-plugin inventory was imported. The sample and browser registry are available only in Sample Mode.</p></Panel>
  </>;

  return (
    <>
      <PageHeader
        title="Plugins"
        description="Local registry for manually adding and viewing plugin manifests. This is not a marketplace and does not certify plugin safety."
        deployment={deployment}
        mode={mode}
        confidence={confidence}
      />
      <section className="plugin-page-grid">
        <Panel title="Registered Manifests" eyebrow="local registry">
          <div className="filter-row">
            <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
              <option>All</option>
              {adapterCategories.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
            <select value={layerFilter} onChange={(event) => setLayerFilter(event.target.value)}>
              <option>All</option>
              {deployment.layers.map((layer) => (
                <option key={layer.id} value={layer.id}>
                  {layer.order}. {layer.shortName}
                </option>
              ))}
            </select>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option>All</option>
              {["Declared", "Mapped", "Connected", "Observed", "Enforced", "Evidenced", "Tested", "Red-Teamed"].map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
            <select value={healthFilter} onChange={(event) => setHealthFilter(event.target.value)}>
              <option>All</option>
              {["Healthy", "Warning", "Degraded", "Offline"].map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </div>
          <div className="plugin-card-list large">
            {filteredPlugins.map((plugin) => (
              <button type="button" className="plugin-card selectable" key={plugin.id} onClick={() => setSelectedPlugin(plugin)}>
                <span className="plugin-icon" aria-hidden="true">{plugin.name.slice(0, 1)}</span>
                <div>
                  <h3>{plugin.name}</h3>
                  <p>{plugin.adapterCategory} - {plugin.layersCovered.length} layers - last verified {plugin.lastVerifiedAt}</p>
                </div>
                <StatusBadge label={plugin.healthStatus} />
                <StatusBadge label={plugin.integrationStatus} />
                <span aria-hidden="true">&gt;</span>
              </button>
            ))}
          </div>
        </Panel>
        <div className="side-stack">
          <Panel title="Add Plugin" eyebrow="manual registration">
            <div className="form-grid">
              <label>
                Plugin name
                <input value={formName} onChange={(event) => setFormName(event.target.value)} placeholder="Local runtime decision adapter" />
              </label>
              <label>
                Adapter category
                <select value={formCategory} onChange={(event) => setFormCategory(event.target.value as AdapterCategory)}>
                  {adapterCategories.map((category) => (
                    <option key={category}>{category}</option>
                  ))}
                </select>
              </label>
              <button type="button" className="primary-button" onClick={addPlugin}>
                Add Plugin
              </button>
            </div>
            <div className="manifest-import">
              <label>
                JSON manifest import
                <textarea value={manifestText} onChange={(event) => setManifestText(event.target.value)} placeholder='{"id":"local-plugin","name":"Local Plugin",...}' />
              </label>
              <button type="button" onClick={importManifest}>
                Import Manifest
              </button>
            </div>
          </Panel>
          {selectedPlugin ? (
            <Panel title="Plugin Detail" eyebrow={selectedPlugin.adapterCategory}>
              <div className="detail-section-grid">
                <DetailList items={[["Identity", `${selectedPlugin.name} ${selectedPlugin.version}`], ["Vendor", selectedPlugin.vendor], ["Category", selectedPlugin.adapterCategory]]} />
                <DetailList items={[["Scope", selectedPlugin.layersCovered], ["Permissions", selectedPlugin.permissionsRequired], ["Inputs", selectedPlugin.inputsReceived], ["Outputs", selectedPlugin.outputsReturned]]} />
                <DetailList items={[["Evidence", selectedPlugin.evidenceGenerated], ["Failure Behavior", selectedPlugin.failureBehavior], ["Reversibility", selectedPlugin.reversibility], ["Revocation", selectedPlugin.revocationPath]]} />
                <DetailList items={[["Assumptions", selectedPlugin.upstreamAssumptions], ["Guarantees", selectedPlugin.downstreamGuarantees], ["Test Status", selectedPlugin.testStatus], ["Red-Team Status", selectedPlugin.redTeamStatus], ["Last Verified", selectedPlugin.lastVerifiedAt]]} />
              </div>
            </Panel>
          ) : null}
        </div>
      </section>
    </>
  );
}
