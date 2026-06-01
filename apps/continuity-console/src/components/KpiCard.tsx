import type { ReactNode } from "react";

interface KpiCardProps {
  label: string;
  value: ReactNode;
  detail: string;
  tone?: "blue" | "teal" | "green" | "amber" | "red" | "purple";
}

export function KpiCard({ label, value, detail, tone = "blue" }: KpiCardProps): JSX.Element {
  return (
    <section className={`kpi-card tone-${tone}`}>
      <p>{label}</p>
      <strong>{value}</strong>
      <span>{detail}</span>
    </section>
  );
}
