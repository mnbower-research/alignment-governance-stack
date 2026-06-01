interface DetailListProps {
  items: Array<[string, string | string[] | number | boolean]>;
}

export function DetailList({ items }: DetailListProps): JSX.Element {
  return (
    <dl className="detail-list">
      {items.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{Array.isArray(value) ? (value.length > 0 ? value.join(", ") : "None") : String(value)}</dd>
        </div>
      ))}
    </dl>
  );
}
