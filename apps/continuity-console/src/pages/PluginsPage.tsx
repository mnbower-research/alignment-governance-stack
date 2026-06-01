import { useMemo, useState } from "react";
import { DetailList } from "../components/DetailList";
import { PageHeader } from "../components/PageHeader";
import { Panel } from "../components/Panel";
import { StatusBadge } from "../components/StatusBadge";
import { writeStoredPlugins } from "../lib/pluginStorage";
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
}

export function PluginsPage({ deployment, plugins, setPlugins }: PluginsPageProps): JSX.Element {
  const [selectedPlugin, setSelectedPlugin] = useState<PluginManifest | null>(plugins[0] ?? null);
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [layerFilter, setLayerFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [manifestText, setManifestText] = useState("");
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState<AdapterCategory>("Policy Adapter");

  const filteredPlugins = useMemo(
    () =>
      plugins.filter((plugin) => {
        const matchesCategory = categoryFilter === "All" || plugin.adapterCategory === categoryFilter;
        const matchesLayer = layerFilter === "All" || plugin.layersCovered.includes(layerFilter);
        const matchesStatus = statusFilter === "All" || plugin.integrationStatus === statusFilter;
        return matchesCategory && matchesLayer && matchesStatus;
      }),
    [categoryFilter, layerFilter, plugins, statusFilter],
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

  return (
    <>
      <PageHeader
        title="Plugins"
        description="Local registry for manually adding and viewing plugin manifests. This is not a marketplace and does not certify plugin safety."
        deployment={deployment}
      />
      <section className="plugin-page-grid">
        <Panel title="Installed Plugins" eyebrow="local registry">
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
          </div>
          <div className="plugin-card-list large">
            {filteredPlugins.map((plugin) => (
              <button type="button" className="plugin-card selectable" key={plugin.id} onClick={() => setSelectedPlugin(plugin)}>
                <div>
                  <h3>{plugin.name}</h3>
                  <p>{plugin.description}</p>
                </div>
                <StatusBadge label={plugin.integrationStatus} />
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
              <DetailList
                items={[
                  ["ID", selectedPlugin.id],
                  ["Version", selectedPlugin.version],
                  ["Vendor", selectedPlugin.vendor],
                  ["Layers covered", selectedPlugin.layersCovered],
                  ["Inputs received", selectedPlugin.inputsReceived],
                  ["Outputs returned", selectedPlugin.outputsReturned],
                  ["Permissions required", selectedPlugin.permissionsRequired],
                  ["Actions allowed", selectedPlugin.actionsAllowed],
                  ["Actions prohibited", selectedPlugin.actionsProhibited],
                  ["Authority source", selectedPlugin.authoritySource],
                  ["Failure behavior", selectedPlugin.failureBehavior],
                  ["Evidence generated", selectedPlugin.evidenceGenerated],
                  ["Reversibility", selectedPlugin.reversibility],
                  ["Revocation path", selectedPlugin.revocationPath],
                  ["Upstream assumptions", selectedPlugin.upstreamAssumptions],
                  ["Downstream guarantees", selectedPlugin.downstreamGuarantees],
                  ["Health", selectedPlugin.healthStatus],
                  ["Integration status", selectedPlugin.integrationStatus],
                  ["Test status", selectedPlugin.testStatus],
                  ["Red-team status", selectedPlugin.redTeamStatus],
                  ["Last verified", selectedPlugin.lastVerifiedAt],
                ]}
              />
            </Panel>
          ) : null}
        </div>
      </section>
    </>
  );
}
