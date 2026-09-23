import type { ReactNode } from "react";
import { MetricRing, Sparkline } from "./Charts";

interface KpiCardProps {
  label: string;
  value: ReactNode;
  detail: string;
  tone?: "blue" | "teal" | "green" | "amber" | "red" | "purple";
  icon?: string | undefined;
  status?: string | undefined;
  ringValue?: number | undefined;
  sparkline?: number[] | undefined;
  trend?: string | undefined;
}

export function KpiCard({
  label,
  value,
  detail,
  tone = "blue",
  icon,
  status,
  ringValue,
  sparkline,
  trend,
}: KpiCardProps): JSX.Element {
  return (
    <section className={`kpi-card tone-${tone}`}>
      <div className="kpi-card-top">
        {icon ? <span className={`icon-chip tone-${tone}`} aria-hidden="true">{icon}</span> : null}
        <p>{label}</p>
      </div>
      <div className="kpi-card-body">
        {ringValue !== undefined ? <MetricRing value={ringValue} tone={tone} label={`${label} ring`} /> : null}
        <div>
          <strong>{value}</strong>
          {status ? <em>{status}</em> : null}
        </div>
      </div>
      {sparkline ? <Sparkline data={sparkline} tone={tone} label={`${label} trend`} /> : null}
      <span>{detail}</span>
      {trend ? <small className="trend-line">{trend}</small> : null}
    </section>
  );
}
