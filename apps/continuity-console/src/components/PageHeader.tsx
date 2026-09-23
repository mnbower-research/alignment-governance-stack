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
  const isLocalEvidence = mode === "local-evidence";

  return (
    <header className="page-header">
      <div className="page-title-block">
        <div className="mode-badge-row">
          <span className={`mode-badge ${isLocalEvidence ? "mode-evidence" : "mode-sample"}`}>
            {isLocalEvidence ? "LOCAL EVIDENCE" : "SAMPLE MODE"}
          </span>
          {isLocalEvidence ? <span className="mode-badge mode-readonly">READ ONLY</span> : null}
        </div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="header-controls">
        <label>
          Environment
          <span className="select-shell">
            <span className="control-dot" aria-hidden="true" />
          <select value={deployment.environment} onChange={() => undefined} aria-label="Environment">
            <option>{deployment.environment}</option>
          </select>
          </span>
        </label>
        <label>
          Deployment
          <span className="select-shell">
          <select value={deployment.name} onChange={() => undefined} aria-label="Deployment">
            <option>{deployment.name}</option>
          </select>
          </span>
        </label>
        <div className="scan-chip">
          <span>Last scan</span>
          <strong>{deployment.lastScanAt}</strong>
        </div>
        <div className="scan-chip">
          <span>Mode</span>
          <strong>{isLocalEvidence ? "Local Evidence" : "Sample"}</strong>
        </div>
        {confidence ? (
          <div className="scan-chip">
            <span>Evidence confidence</span>
            <strong>{confidence}</strong>
          </div>
        ) : null}
        <button type="button" className="icon-button" aria-label="Rescan local console data">
          <span aria-hidden="true">R</span>
          Rescan
        </button>
      </div>
    </header>
  );
}
