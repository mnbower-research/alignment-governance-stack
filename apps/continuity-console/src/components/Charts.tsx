interface BarDatum {
  label: string;
  value: number;
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
