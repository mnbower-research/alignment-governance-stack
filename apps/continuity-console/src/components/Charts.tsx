interface BarDatum {
  label: string;
  value: number;
}

type ChartTone = "blue" | "teal" | "green" | "amber" | "red" | "purple";

function toneColor(tone: ChartTone = "blue"): string {
  return {
    blue: "#4b8cff",
    teal: "#1cc8bd",
    green: "#39c979",
    amber: "#f0b84c",
    red: "#ff6175",
    purple: "#a682ff",
  }[tone];
}

export function MetricRing({ value, tone = "blue", label }: { value: number; tone?: ChartTone; label: string }): JSX.Element {
  const normalized = Math.max(0, Math.min(100, value));

  return (
    <span
      className="metric-ring"
      role="img"
      aria-label={`${label}: ${normalized}%`}
      style={{
        background: `conic-gradient(${toneColor(tone)} ${normalized * 3.6}deg, rgba(125, 147, 178, 0.16) 0deg)`,
      }}
    >
      <i />
    </span>
  );
}

export function Sparkline({ data, tone = "blue", label }: { data: number[]; tone?: ChartTone; label: string }): JSX.Element {
  const maxValue = Math.max(...data, 1);
  const minValue = Math.min(...data, 0);
  const range = Math.max(maxValue - minValue, 1);
  const points = data
    .map((value, index) => {
      const x = data.length === 1 ? 0 : (index / (data.length - 1)) * 120;
      const y = 38 - ((value - minValue) / range) * 32;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg className="sparkline" viewBox="0 0 120 42" role="img" aria-label={label}>
      <polyline points={points} style={{ stroke: toneColor(tone) }} />
    </svg>
  );
}

export function MiniBarChart({ data }: { data: BarDatum[] }): JSX.Element {
  const maxValue = Math.max(...data.map((datum) => datum.value), 1);

  return (
    <div className="bar-chart">
      {data.map((datum) => (
        <div className="bar-row" key={datum.label}>
          <span>{datum.label}</span>
          <div>
            <i style={{ width: `${Math.max(8, (datum.value / maxValue) * 100)}%` }} />
          </div>
          <strong>{datum.value}</strong>
        </div>
      ))}
    </div>
  );
}

export function TrendLineChart({ series }: { series: Array<{ label: string; values: number[]; tone: ChartTone }> }): JSX.Element {
  const allValues = series.flatMap((item) => item.values);
  const maxValue = Math.max(...allValues, 1);
  const minValue = Math.min(...allValues, 0);
  const range = Math.max(maxValue - minValue, 1);

  return (
    <div className="trend-chart">
      <svg viewBox="0 0 640 220" role="img" aria-label="Governance Memory trend chart">
        {[0, 1, 2, 3].map((line) => (
          <line key={line} x1="30" x2="620" y1={34 + line * 46} y2={34 + line * 46} />
        ))}
        {series.map((item) => {
          const points = item.values
            .map((value, index) => {
              const x = 34 + (index / Math.max(item.values.length - 1, 1)) * 578;
              const y = 186 - ((value - minValue) / range) * 150;
              return `${x},${y}`;
            })
            .join(" ");

          return <polyline key={item.label} points={points} style={{ stroke: toneColor(item.tone) }} />;
        })}
      </svg>
      <div className="trend-legend">
        {series.map((item) => (
          <span key={item.label}><i style={{ background: toneColor(item.tone) }} />{item.label}</span>
        ))}
      </div>
    </div>
  );
}

export function Heatmap({ rows }: { rows: Array<{ label: string; values: number[] }> }): JSX.Element {
  return (
    <div className="heatmap" role="img" aria-label="Continuity timeline heatmap">
      {rows.map((row) => (
        <div className="heatmap-row" key={row.label}>
          <span>{row.label}</span>
          {row.values.map((value, index) => (
            <i
              key={`${row.label}-${index}`}
              className={`heat-${Math.max(0, Math.min(4, Math.floor(value / 25)))}`}
              title={`${row.label}: ${value}%`}
            />
          ))}
          <strong>{row.values.at(-1)}%</strong>
        </div>
      ))}
    </div>
  );
}

export function RadarChart({ data }: { data: BarDatum[] }): JSX.Element {
  const center = 92;
  const radius = 70;
  const points = data
    .map((datum, index) => {
      const angle = (Math.PI * 2 * index) / data.length - Math.PI / 2;
      const scaledRadius = radius * (datum.value / 100);
      return `${center + Math.cos(angle) * scaledRadius},${center + Math.sin(angle) * scaledRadius}`;
    })
    .join(" ");

  return (
    <div className="radar-wrap">
      <svg viewBox="0 0 184 184" role="img" aria-label="Agency Preservation Dimensions radar chart">
        <circle cx={center} cy={center} r="70" />
        <circle cx={center} cy={center} r="48" />
        <circle cx={center} cy={center} r="26" />
        <polygon points={points} />
      </svg>
      <div className="radar-legend">
        {data.map((datum) => (
          <span key={datum.label}>
            {datum.label} <strong>{datum.value}</strong>
          </span>
        ))}
      </div>
    </div>
  );
}
