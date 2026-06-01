import type { DeploymentManifest } from "../types/continuity";
import type { ConsoleDataMode, EvidenceConfidence } from "../lib/evidenceProjection";

interface PageHeaderProps {
  title: string;
  description: string;
  deployment: DeploymentManifest;
  mode?: ConsoleDataMode | undefined;
  confidence?: EvidenceConfidence | undefined;
}

export function PageHeader({ title, description, deployment, mode = "sample", confidence }: PageHeaderProps): JSX.Element {
  return (
    <header className="page-header">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="header-controls">
        <label>
          Environment
          <select value={deployment.environment} onChange={() => undefined}>
            <option>{deployment.environment}</option>
          </select>
        </label>
        <label>
          Deployment
          <select value={deployment.name} onChange={() => undefined}>
            <option>{deployment.name}</option>
          </select>
        </label>
        <div className="scan-chip">
          <span>Last scan</span>
          <strong>{deployment.lastScanAt}</strong>
        </div>
        <div className="scan-chip">
          <span>Mode</span>
          <strong>{mode === "local-evidence" ? "Local Evidence" : "Sample"}</strong>
        </div>
        {confidence ? (
          <div className="scan-chip">
            <span>Evidence confidence</span>
            <strong>{confidence}</strong>
          </div>
        ) : null}
        <button type="button" className="primary-button">
          Rescan
        </button>
      </div>
    </header>
  );
}
