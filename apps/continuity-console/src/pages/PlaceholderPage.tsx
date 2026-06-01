import { PageHeader } from "../components/PageHeader";
import { Panel } from "../components/Panel";
import type { DeploymentManifest } from "../types/continuity";

interface PlaceholderPageProps {
  deployment: DeploymentManifest;
  title: string;
  description: string;
  bullets: string[];
}

export function PlaceholderPage({ deployment, title, description, bullets }: PlaceholderPageProps): JSX.Element {
  return (
    <>
      <PageHeader title={title} description={description} deployment={deployment} />
      <Panel title={`${title} Foundation`} eyebrow="Phase 1 placeholder">
        <div className="placeholder-content">
          <p>{description}</p>
          <ul>
            {bullets.map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>
        </div>
      </Panel>
    </>
  );
}
