import type { ContinuityStatus, HealthStatus, RiskLevel } from "../types/continuity";

type BadgeTone = ContinuityStatus | HealthStatus | RiskLevel | "Requires Human Review" | string;

interface StatusBadgeProps {
  label: BadgeTone;
}

export function StatusBadge({ label }: StatusBadgeProps): JSX.Element {
  const normalized = label.toLowerCase().replaceAll(" ", "-").replaceAll("/", "");

  return <span className={`status-badge status-${normalized}`}>{label}</span>;
}
