import type { DeploymentManifest } from "../types/continuity";

interface PageHeaderProps {
  title: string;
  description: string;
  deployment: DeploymentManifest;
}

export function PageHeader({ title, description, deployment }: PageHeaderProps): JSX.Element {
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
        <button type="button" className="primary-button">
          Rescan
        </button>
      </div>
    </header>
  );
}
